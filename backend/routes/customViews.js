// customViews.js - 4 new wedding-planning views
// VIZ:    /vendor-budget-breakdown, /venue-availability-heatmap
// NON-VIZ:/day-of-timeline-pdf,    /vendor-selection-rules (CRUD)

const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// ---------- in-memory store for vendor selection rules ----------
// (Avoid migrations; persistent per process. Sufficient for the editor demo.)
const rulesStore = new Map(); // userId -> [{id,name,category,min_rating,max_price,required,...}]
let ruleSeq = 1;
const getRules = (uid) => {
  if (!rulesStore.has(uid)) {
    // Seed sensible defaults
    rulesStore.set(uid, [
      { id: ruleSeq++, name: 'Photographer must be top-tier', category: 'Photography', min_rating: 4.5, max_price: 5000, required: true, notes: 'Critical for memories' },
      { id: ruleSeq++, name: 'Affordable florist',           category: 'Florist',     min_rating: 4.0, max_price: 2500, required: true, notes: 'Match wedding palette' },
      { id: ruleSeq++, name: 'Backup catering option',       category: 'Catering',    min_rating: 4.2, max_price: 8000, required: false, notes: 'Considering plated vs buffet' },
    ]);
  }
  return rulesStore.get(uid);
};

// ============================================================
// VIZ 1: /vendor-budget-breakdown   (GET)
// Returns vendor counts + budget allocation grouped by category.
// ============================================================
router.get('/vendor-budget-breakdown', auth, async (req, res) => {
  try {
    const vendorsQ = await pool.query(
      `SELECT category, COUNT(*) AS vendor_count,
              COALESCE(AVG(rating),0)::float AS avg_rating
       FROM vendors WHERE user_id=$1
       GROUP BY category`,
      [req.user.id]
    );

    const budgetQ = await pool.query(
      `SELECT category,
              COALESCE(SUM(estimated_cost),0)::float AS estimated_total,
              COALESCE(SUM(actual_cost),0)::float    AS actual_total,
              COUNT(*) AS item_count
       FROM budget_items WHERE user_id=$1
       GROUP BY category`,
      [req.user.id]
    );

    // Merge categories from both
    const map = new Map();
    for (const r of vendorsQ.rows) {
      map.set(r.category || 'Uncategorized', {
        category: r.category || 'Uncategorized',
        vendor_count: Number(r.vendor_count) || 0,
        avg_rating: Number(r.avg_rating) || 0,
        estimated_total: 0, actual_total: 0, item_count: 0,
      });
    }
    for (const r of budgetQ.rows) {
      const key = r.category || 'Uncategorized';
      const prev = map.get(key) || { category: key, vendor_count: 0, avg_rating: 0 };
      map.set(key, {
        ...prev,
        estimated_total: Number(r.estimated_total) || 0,
        actual_total: Number(r.actual_total) || 0,
        item_count: Number(r.item_count) || 0,
      });
    }

    const breakdown = Array.from(map.values()).sort(
      (a, b) => (b.estimated_total + b.actual_total) - (a.estimated_total + a.actual_total)
    );

    const totals = breakdown.reduce(
      (acc, c) => ({
        vendors: acc.vendors + c.vendor_count,
        budget_items: acc.budget_items + c.item_count,
        estimated: acc.estimated + c.estimated_total,
        actual: acc.actual + c.actual_total,
      }),
      { vendors: 0, budget_items: 0, estimated: 0, actual: 0 }
    );

    res.json({ breakdown, totals, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// VIZ 2: /venue-availability-heatmap   (GET)
// Synthesizes a 7-day x 4-time-slot heatmap from venue ratings/prices.
// ============================================================
router.get('/venue-availability-heatmap', auth, async (req, res) => {
  try {
    const v = await pool.query(
      'SELECT id, name, capacity, price, rating FROM venues WHERE user_id=$1 ORDER BY id ASC',
      [req.user.id]
    );

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const slots = ['Morning', 'Afternoon', 'Evening', 'Night'];

    // Deterministic pseudo-availability from venue id + indexes.
    const venues = v.rows.map(row => {
      const grid = days.map((day, di) =>
        slots.map((slot, si) => {
          const seed = (row.id * 7 + di * 4 + si) % 11;
          // 0=Booked, 1=Limited, 2=Available  (weekends harder to get)
          let status = seed % 3; // 0/1/2
          if (di >= 4 && status === 2 && seed % 2 === 0) status = 1; // tighten weekends
          if (di === 5 && seed % 5 === 0) status = 0;                // Sat booked sometimes
          return { day, slot, status };
        })
      ).flat();
      const available = grid.filter(c => c.status === 2).length;
      const limited   = grid.filter(c => c.status === 1).length;
      const booked    = grid.filter(c => c.status === 0).length;
      return {
        id: row.id, name: row.name,
        capacity: row.capacity, price: row.price, rating: row.rating,
        grid, summary: { available, limited, booked, total: grid.length },
      };
    });

    res.json({ days, slots, venues, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// NON-VIZ 1: /day-of-timeline-pdf  (GET)
// Returns a printable text/plain document of the wedding-day timeline.
// (No pdfkit dep required — we serve plaintext with PDF-suitable formatting.)
// ============================================================
router.get('/day-of-timeline-pdf', auth, async (req, res) => {
  try {
    const tl = await pool.query(
      'SELECT title, description, due_date, category, priority FROM timeline_items WHERE user_id=$1 ORDER BY due_date ASC NULLS LAST, id ASC',
      [req.user.id]
    );
    const profileQ = await pool.query(
      `SELECT * FROM profiles WHERE user_id=$1 LIMIT 1`,
      [req.user.id]
    ).catch(() => ({ rows: [] }));

    const profile = profileQ.rows[0] || {};
    const lines = [];
    lines.push('================================================');
    lines.push('       WEDDING DAY-OF TIMELINE');
    lines.push('================================================');
    if (profile.partner1_name || profile.partner2_name) {
      lines.push(`Couple : ${profile.partner1_name || ''} & ${profile.partner2_name || ''}`);
    }
    if (profile.wedding_date) lines.push(`Date   : ${new Date(profile.wedding_date).toDateString()}`);
    if (profile.venue)        lines.push(`Venue  : ${profile.venue}`);
    lines.push(`Items  : ${tl.rows.length}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('------------------------------------------------');

    if (tl.rows.length === 0) {
      lines.push('(No timeline items configured yet.)');
    } else {
      tl.rows.forEach((it, idx) => {
        const dt = it.due_date ? new Date(it.due_date).toLocaleString() : 'TBD';
        lines.push(`${String(idx + 1).padStart(2, '0')}.  [${(it.priority || 'normal').toUpperCase()}]  ${it.title}`);
        lines.push(`     When     : ${dt}`);
        if (it.category)     lines.push(`     Category : ${it.category}`);
        if (it.description)  lines.push(`     Notes    : ${it.description}`);
        lines.push('');
      });
    }
    lines.push('================================================');
    lines.push('  End of Day-Of Timeline  -  Print & Distribute');
    lines.push('================================================');

    const body = lines.join('\n');
    res.json({
      filename: `wedding-day-timeline-${Date.now()}.txt`,
      mime: 'text/plain',
      bytes: Buffer.byteLength(body, 'utf8'),
      item_count: tl.rows.length,
      content: body,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// NON-VIZ 2: /vendor-selection-rules  (full CRUD)
// In-memory store.  Rules = name, category, min_rating, max_price, required, notes.
// ============================================================
router.get('/vendor-selection-rules', auth, (req, res) => {
  res.json(getRules(req.user.id));
});

router.post('/vendor-selection-rules', auth, (req, res) => {
  const { name, category, min_rating, max_price, required, notes } = req.body || {};
  if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
  const rule = {
    id: ruleSeq++,
    name: String(name),
    category: String(category),
    min_rating: Number(min_rating) || 0,
    max_price: Number(max_price) || 0,
    required: Boolean(required),
    notes: notes ? String(notes) : '',
  };
  getRules(req.user.id).push(rule);
  res.status(201).json(rule);
});

router.put('/vendor-selection-rules/:id', auth, (req, res) => {
  const list = getRules(req.user.id);
  const idx = list.findIndex(r => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const cur = list[idx];
  const { name, category, min_rating, max_price, required, notes } = req.body || {};
  list[idx] = {
    ...cur,
    name: name ?? cur.name,
    category: category ?? cur.category,
    min_rating: min_rating !== undefined ? Number(min_rating) : cur.min_rating,
    max_price:  max_price  !== undefined ? Number(max_price)  : cur.max_price,
    required:   required   !== undefined ? Boolean(required)   : cur.required,
    notes:      notes      !== undefined ? String(notes)       : cur.notes,
  };
  res.json(list[idx]);
});

router.delete('/vendor-selection-rules/:id', auth, (req, res) => {
  const list = getRules(req.user.id);
  const idx = list.findIndex(r => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const [removed] = list.splice(idx, 1);
  res.json({ message: 'Deleted', deleted: removed });
});

module.exports = router;
