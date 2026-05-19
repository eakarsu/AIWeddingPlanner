const express = require('express');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// ---------------------------------------------------------------------------
// OpenRouter helper – persists every result to ai_results table
// ---------------------------------------------------------------------------
async function callOpenRouter(prompt, systemPrompt, model) {
  const chosenModel = model || process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Wedding Planner',
    },
    body: JSON.stringify({
      model: chosenModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3000,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
  return {
    content: data.choices[0].message.content,
    model: chosenModel,
    tokens: data.usage?.total_tokens || null,
  };
}

async function persistResult(userId, endpoint, params, result) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, endpoint, request_params, result_text, model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, endpoint, JSON.stringify(params), result.content, result.model, result.tokens]
    );
  } catch (err) {
    // Do not crash the request if persist fails
    console.error('Failed to persist AI result:', err.message);
  }
}

// Ensure tables exist (idempotent)
async function ensureAiTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint VARCHAR(100) NOT NULL,
      request_params JSONB,
      result_text TEXT NOT NULL,
      model_used VARCHAR(100),
      tokens_used INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      session_id VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rsvp_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
      token VARCHAR(100) UNIQUE NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// Run once at startup
ensureAiTables().catch(console.error);

// ---------------------------------------------------------------------------
// GET /api/ai/history – retrieve past AI results for the logged-in user
// ---------------------------------------------------------------------------
router.get('/history', auth, async (req, res) => {
  try {
    const { endpoint, limit = 20, offset = 0 } = req.query;
    let query = `SELECT id, endpoint, request_params, result_text, model_used, tokens_used, created_at
                 FROM ai_results WHERE user_id = $1`;
    const params = [req.user.id];
    if (endpoint) {
      params.push(endpoint);
      query += ` AND endpoint = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json({ results: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/vendor-match  (upgraded: pulls real vendor + budget data)
// ---------------------------------------------------------------------------
router.post('/vendor-match', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { style, preferences } = req.body;

    // Pull real data from the user's database
    const [budgetRows, vendorRows, profileRows] = await Promise.all([
      pool.query('SELECT category, item_name, estimated_cost FROM budget_items WHERE user_id=$1', [userId]),
      pool.query('SELECT name, category, price_range, rating, description FROM vendors WHERE user_id=$1', [userId]),
      pool.query('SELECT total_budget, guest_count_target, wedding_style, wedding_date FROM wedding_profile WHERE user_id=$1', [userId]),
    ]);

    const profile = profileRows.rows[0] || {};
    const remainingBudget = budgetRows.rows.reduce(
      (sum, r) => sum - (r.estimated_cost || 0), profile.total_budget || 50000
    );

    const prompt = `
You are helping plan a real wedding. Here is the user's actual wedding data:

WEDDING PROFILE:
- Style: ${profile.wedding_style || style || 'Romantic'}
- Total Budget: $${profile.total_budget || 'Unknown'}
- Remaining Unallocated: ~$${Math.max(0, remainingBudget)}
- Guest Count: ${profile.guest_count_target || 'Unknown'}
- Wedding Date: ${profile.wedding_date || 'Unknown'}

VENDORS ALREADY BOOKED/TRACKED (${vendorRows.rows.length} total):
${vendorRows.rows.map(v => `- ${v.category}: ${v.name} (${v.price_range}, rated ${v.rating})`).join('\n') || 'None yet'}

BUDGET CATEGORIES ALREADY ALLOCATED:
${budgetRows.rows.map(b => `- ${b.category} – ${b.item_name}: $${b.estimated_cost}`).join('\n') || 'None yet'}

ADDITIONAL PREFERENCES: ${preferences || 'None specified'}

Task: Identify any MISSING critical vendor categories, recommend specific actions for each gap, and flag any budget allocation concerns. Be specific and actionable.`;

    const systemPrompt = `You are a senior wedding planner with 20+ years of experience.
You have access to this couple's real planning data. Give gap-analysis style advice — what's missing,
what should be booked next, and what the budget risks are. Be direct, numbered, and specific.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'vendor-match', { style, preferences }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/budget-optimize  (upgraded: uses real budget_items from DB)
// ---------------------------------------------------------------------------
router.post('/budget-optimize', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { priorities } = req.body;

    const [budgetRows, profileRows] = await Promise.all([
      pool.query(
        'SELECT category, item_name, estimated_cost, actual_cost, paid FROM budget_items WHERE user_id=$1 ORDER BY estimated_cost DESC',
        [userId]
      ),
      pool.query('SELECT total_budget FROM wedding_profile WHERE user_id=$1', [userId]),
    ]);

    const totalBudget = profileRows.rows[0]?.total_budget || 0;
    const totalEstimated = budgetRows.rows.reduce((s, r) => s + parseFloat(r.estimated_cost || 0), 0);
    const totalActual = budgetRows.rows.reduce((s, r) => s + parseFloat(r.actual_cost || 0), 0);

    const prompt = `
Analyze this wedding budget and provide specific optimization advice:

BUDGET OVERVIEW:
- Total Budget: $${totalBudget}
- Total Estimated: $${totalEstimated} (${totalEstimated > totalBudget ? 'OVER by $' + (totalEstimated - totalBudget) : 'Under by $' + (totalBudget - totalEstimated)})
- Total Actual Spent: $${totalActual}

LINE ITEMS (sorted by cost):
${budgetRows.rows.map(b =>
  `- ${b.category} / ${b.item_name}: estimated $${b.estimated_cost}, actual $${b.actual_cost || 0} ${b.paid ? '(PAID)' : '(UNPAID)'}`
).join('\n')}

PRIORITIES: ${priorities || 'Not specified'}

Provide:
1. Items where actual cost exceeded estimate (overage analysis)
2. 3 specific line items to negotiate or reduce
3. Hidden costs they may have missed
4. Recommended emergency buffer amount
5. A revised total budget breakdown as a percentage table`;

    const systemPrompt = `You are a certified wedding financial planner. Be precise with numbers.
Flag overages in bold. Provide a clear percentage allocation table. Give negotiation scripts for the top 2 vendors.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'budget-optimize', { priorities }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/timeline-suggest  (upgraded: reads real timeline_items from DB)
// ---------------------------------------------------------------------------
router.post('/timeline-suggest', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [timelineRows, profileRows] = await Promise.all([
      pool.query(
        'SELECT title, due_date, completed, category, priority FROM timeline_items WHERE user_id=$1 ORDER BY due_date ASC',
        [userId]
      ),
      pool.query('SELECT wedding_date FROM wedding_profile WHERE user_id=$1', [userId]),
    ]);

    const weddingDate = profileRows.rows[0]?.wedding_date;
    const completed = timelineRows.rows.filter(t => t.completed);
    const pending = timelineRows.rows.filter(t => !t.completed);
    const overdue = pending.filter(t => t.due_date && new Date(t.due_date) < new Date());

    const prompt = `
Analyze this wedding planning timeline and give actionable next steps:

WEDDING DATE: ${weddingDate ? new Date(weddingDate).toDateString() : 'Not set'}
TODAY: ${new Date().toDateString()}
DAYS UNTIL WEDDING: ${weddingDate ? Math.round((new Date(weddingDate) - new Date()) / 86400000) : 'Unknown'}

COMPLETED TASKS (${completed.length}):
${completed.map(t => `- [DONE] ${t.title} (${t.category})`).join('\n') || 'None'}

OVERDUE TASKS (${overdue.length}) – URGENT:
${overdue.map(t => `- [OVERDUE] ${t.title} – was due ${t.due_date} (${t.priority} priority)`).join('\n') || 'None'}

UPCOMING PENDING TASKS (${pending.length - overdue.length}):
${pending.filter(t => !overdue.includes(t)).map(t => `- ${t.title} – due ${t.due_date || 'No date'} (${t.priority})`).join('\n') || 'None'}

Provide:
1. Immediate action items (next 7 days) with specific vendor booking recommendations
2. Assessment of planning health (are they on track?)
3. 3 tasks that are commonly forgotten at this stage
4. A realistic week-by-week schedule for the next 4 weeks`;

    const systemPrompt = `You are a wedding timeline specialist. Be extremely specific about what needs to happen THIS WEEK.
Flag overdue items as critical. Give day-by-day recommendations if the wedding is within 30 days.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'timeline-suggest', {}, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/seating-suggest  (upgraded: fetches real guest list from DB)
// ---------------------------------------------------------------------------
router.post('/seating-suggest', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { constraints } = req.body;

    const [guestRows, seatingRows, profileRows] = await Promise.all([
      pool.query(
        `SELECT name, rsvp_status, meal_preference, plus_one, group_name, notes
         FROM guests WHERE user_id=$1 ORDER BY group_name, name`,
        [userId]
      ),
      pool.query(
        'SELECT table_name, table_number, capacity, guest_names FROM seating WHERE user_id=$1 ORDER BY table_number',
        [userId]
      ),
      pool.query('SELECT guest_count_target FROM wedding_profile WHERE user_id=$1', [userId]),
    ]);

    const confirmed = guestRows.rows.filter(g => g.rsvp_status === 'confirmed');
    const groupMap = {};
    confirmed.forEach(g => {
      const grp = g.group_name || 'Ungrouped';
      if (!groupMap[grp]) groupMap[grp] = [];
      groupMap[grp].push(g.name + (g.meal_preference ? ` (${g.meal_preference})` : ''));
    });

    const prompt = `
Create a seating chart for this real wedding using actual guest data:

CONFIRMED GUESTS (${confirmed.length}):
${Object.entries(groupMap).map(([grp, members]) =>
  `GROUP "${grp}": ${members.join(', ')}`
).join('\n') || 'No confirmed guests yet'}

GUESTS WITH DIETARY RESTRICTIONS:
${confirmed.filter(g => g.meal_preference && g.meal_preference !== 'Standard').map(g =>
  `- ${g.name}: ${g.meal_preference}`
).join('\n') || 'None'}

EXISTING TABLE SETUP (${seatingRows.rows.length} tables):
${seatingRows.rows.map(t => `- ${t.table_name} (Table ${t.table_number}): capacity ${t.capacity}, currently: ${t.guest_names || 'empty'}`).join('\n') || 'No tables set up yet'}

SPECIAL CONSTRAINTS: ${constraints || 'None specified'}

Provide:
1. Complete table-by-table seating assignments (place each group at a table)
2. Flag any potential conflicts between groups
3. Recommended table sizes and count if current setup needs adjustment
4. Special consideration for guests with dietary needs (proximity to service stations)`;

    const systemPrompt = `You are an expert wedding seating coordinator. Use the actual guest groups to create logical,
harmonious seating. Keep family groups together, separate any noted conflicts. Output in a clear TABLE: GUESTS format.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'seating-suggest', { constraints }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/menu-suggest
// ---------------------------------------------------------------------------
router.post('/menu-suggest', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { style, season } = req.body;

    const [guestRows, menuRows, budgetRows, profileRows] = await Promise.all([
      pool.query('SELECT meal_preference FROM guests WHERE user_id=$1 AND rsvp_status=$2', [userId, 'confirmed']),
      pool.query('SELECT course, item_name, dietary_info, price FROM menu_items WHERE user_id=$1 AND selected=true', [userId]),
      pool.query("SELECT estimated_cost FROM budget_items WHERE user_id=$1 AND category='Catering'", [userId]),
      pool.query('SELECT guest_count_target, wedding_style FROM wedding_profile WHERE user_id=$1', [userId]),
    ]);

    const dietaryCounts = {};
    guestRows.rows.forEach(g => {
      const pref = g.meal_preference || 'Standard';
      dietaryCounts[pref] = (dietaryCounts[pref] || 0) + 1;
    });

    const cateringBudget = budgetRows.rows.reduce((s, r) => s + parseFloat(r.estimated_cost || 0), 0);
    const guestCount = profileRows.rows[0]?.guest_count_target || guestRows.rows.length || 100;

    const prompt = `
Design a wedding menu for this real wedding:

GUEST DETAILS:
- Total Confirmed: ${guestRows.rows.length}
- Target Guest Count: ${guestCount}
- Meal Preferences: ${JSON.stringify(dietaryCounts)}

CATERING BUDGET: $${cateringBudget} (~$${cateringBudget ? Math.round(cateringBudget / guestCount) : 'Unknown'}/person)

ALREADY SELECTED MENU ITEMS:
${menuRows.rows.length > 0 ? menuRows.rows.map(m => `- [${m.course}] ${m.item_name} (${m.dietary_info || 'standard'}) - $${m.price}`).join('\n') : 'Nothing selected yet'}

WEDDING STYLE: ${profileRows.rows[0]?.wedding_style || style || 'Elegant'}
SEASON: ${season || 'Unknown'}

Provide:
1. Complete 3-course menu with vegetarian, vegan, and gluten-free alternatives for each course
2. Cocktail hour appetizers (5 options)
3. Late-night snack recommendation
4. Cost breakdown per person and total
5. Service style recommendation (plated vs buffet vs family style) given the guest count and budget`;

    const systemPrompt = `You are a catering director at a luxury wedding venue. Design menus that balance dietary needs,
budget, and elegance. Always provide per-person cost and total. Flag if the budget seems too low per person.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'menu-suggest', { style, season }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/invitation-wording
// ---------------------------------------------------------------------------
router.post('/invitation-wording', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { style, tone } = req.body;

    const profileRows = await pool.query(
      'SELECT partner1_name, partner2_name, wedding_date, venue_name, ceremony_time, hashtag FROM wedding_profile WHERE user_id=$1',
      [userId]
    );
    const profile = profileRows.rows[0] || {};

    const prompt = `
Write wedding invitation wording for this real couple using their actual details:

COUPLE: ${profile.partner1_name || 'Partner 1'} & ${profile.partner2_name || 'Partner 2'}
DATE: ${profile.wedding_date ? new Date(profile.wedding_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To Be Confirmed'}
TIME: ${profile.ceremony_time || 'To Be Confirmed'}
VENUE: ${profile.venue_name || 'To Be Confirmed'}
HASHTAG: ${profile.hashtag || 'None'}
STYLE: ${style || 'Classic'}
TONE: ${tone || 'Warm and formal'}

Provide 4 complete invitation versions:
1. Traditional/formal (with parent hosting line)
2. Modern/couple-hosted
3. Whimsical/creative
4. Minimalist

For each version include: outer envelope wording, main card text, and RSVP card text.`;

    const systemPrompt = `You are a wedding stationer with a background in calligraphy and editorial writing.
Use the couple's real names, date, and venue in every version. Each version should feel complete and print-ready.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'invitation-wording', { style, tone }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/floral-suggest
// ---------------------------------------------------------------------------
router.post('/floral-suggest', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { season, colors, style } = req.body;

    const [floralRows, budgetRows, profileRows] = await Promise.all([
      pool.query('SELECT item_name, flower_type, color, quantity, price FROM florals WHERE user_id=$1', [userId]),
      pool.query("SELECT estimated_cost FROM budget_items WHERE user_id=$1 AND category='Florals'", [userId]),
      pool.query('SELECT wedding_style, color_palette, venue_name FROM wedding_profile WHERE user_id=$1', [userId]),
    ]);

    const floralBudget = budgetRows.rows.reduce((s, r) => s + parseFloat(r.estimated_cost || 0), 0);
    const profile = profileRows.rows[0] || {};

    const prompt = `
Design floral arrangements for this wedding using the couple's real data:

WEDDING DETAILS:
- Style: ${profile.wedding_style || style || 'Romantic'}
- Color Palette: ${profile.color_palette || colors || 'Not specified'}
- Venue: ${profile.venue_name || 'Unknown'}
- Season: ${season || 'Unknown'}
- Floral Budget: $${floralBudget || 'Unknown'}

ALREADY TRACKED FLORALS (${floralRows.rows.length} items):
${floralRows.rows.map(f => `- ${f.item_name}: ${f.flower_type}, ${f.color}, qty ${f.quantity}, $${f.price}`).join('\n') || 'None tracked yet'}

Provide:
1. Bridal bouquet design (flowers, colors, style, estimated cost)
2. Bridesmaid bouquets (3 options at different price points)
3. Ceremony arch/altar arrangement
4. Centerpiece options (low, medium, high budget per table)
5. Boutonniere designs
6. Additional accent pieces (flower girl, cake florals, etc.)
7. Total estimated cost breakdown vs the stated budget
8. In-season flowers to use for cost savings`;

    const systemPrompt = `You are a master florist specializing in weddings. Give specific flower names (botanical and common).
Always provide cost estimates. Flag if the budget is too low for the scope requested.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'floral-suggest', { season, colors, style }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/music-suggest
// ---------------------------------------------------------------------------
router.post('/music-suggest', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { style, vibe } = req.body;

    const [musicRows, guestRows, profileRows] = await Promise.all([
      pool.query('SELECT type, name, genre, hours FROM music WHERE user_id=$1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM guests WHERE user_id=$1 AND rsvp_status=$2', [userId, 'confirmed']),
      pool.query('SELECT wedding_style, ceremony_time, guest_count_target FROM wedding_profile WHERE user_id=$1', [userId]),
    ]);

    const guestCount = parseInt(guestRows.rows[0]?.count || 0) || profileRows.rows[0]?.guest_count_target || 100;

    const prompt = `
Plan music and entertainment for this wedding:

WEDDING DETAILS:
- Style: ${profileRows.rows[0]?.wedding_style || style || 'Classic'}
- Ceremony Time: ${profileRows.rows[0]?.ceremony_time || 'Unknown'}
- Confirmed Guests: ${guestCount}
- Requested Vibe: ${vibe || 'Celebratory and fun'}

ENTERTAINMENT ALREADY BOOKED:
${musicRows.rows.map(m => `- ${m.type}: ${m.name} (${m.genre}), ${m.hours} hours`).join('\n') || 'Nothing booked yet'}

Provide:
1. Ceremony music timeline:
   - Prelude (30 min before)
   - Processional (bride's entrance)
   - Ceremony music
   - Recessional
2. Cocktail hour playlist (25 songs)
3. Reception timeline:
   - Grand entrance song
   - First dance options (5 suggestions)
   - Parent dances
   - Dinner music (background playlist)
   - Dancing set – must-plays and do-not-plays
   - Last dance
4. If DJ not booked: specific recommended DJs and what to look for
5. A complete Spotify-style playlist with 40 song suggestions`;

    const systemPrompt = `You are a wedding entertainment director who has planned 500+ weddings.
Give specific song titles and artists. Create a minute-by-minute music timeline for the ceremony.
Include both classic choices and modern alternatives.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'music-suggest', { style, vibe }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/general-advice  (upgraded: multi-turn conversation with history)
// ---------------------------------------------------------------------------
router.post('/general-advice', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { question, sessionId } = req.body;

    // Load conversation history for this session
    let history = [];
    if (sessionId) {
      const historyRows = await pool.query(
        `SELECT role, content FROM ai_conversations
         WHERE user_id=$1 AND session_id=$2
         ORDER BY created_at ASC LIMIT 20`,
        [userId, sessionId]
      );
      history = historyRows.rows;
    }

    // Fetch profile context
    const profileRows = await pool.query(
      `SELECT partner1_name, partner2_name, wedding_date, total_budget, guest_count_target, wedding_style
       FROM wedding_profile WHERE user_id=$1`,
      [userId]
    );
    const profile = profileRows.rows[0] || {};

    const systemPrompt = `You are an expert wedding planner with 20+ years of experience, warm, supportive, and deeply knowledgeable.
You are personally advising ${profile.partner1_name || 'the couple'} & ${profile.partner2_name || ''}
who are planning a ${profile.wedding_style || ''} wedding on ${profile.wedding_date ? new Date(profile.wedding_date).toDateString() : 'an upcoming date'}
with a budget of $${profile.total_budget || 'unknown'} for ${profile.guest_count_target || 'unknown'} guests.
You know their specific situation — reference it when relevant. Be practical, specific, and reassuring.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Wedding Planner',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages,
        max_tokens: 2000,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const assistantReply = data.choices[0].message.content;

    // Persist conversation turns
    if (sessionId) {
      await pool.query(
        `INSERT INTO ai_conversations (user_id, session_id, role, content) VALUES ($1,$2,$3,$4),($1,$2,$5,$6)`,
        [userId, sessionId, 'user', question, 'assistant', assistantReply]
      );
    }

    await persistResult(userId, 'general-advice', { question: question.substring(0, 200), sessionId }, {
      content: assistantReply,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      tokens: data.usage?.total_tokens || null,
    });

    res.json({ result: assistantReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NEW ENDPOINT 1: POST /api/ai/day-of-timeline
// Generates a minute-by-minute wedding day schedule
// ---------------------------------------------------------------------------
router.post('/day-of-timeline', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [profileRows, vendorRows, timelineRows] = await Promise.all([
      pool.query(
        `SELECT partner1_name, partner2_name, wedding_date, ceremony_time, reception_time,
                venue_name, guest_count_target, wedding_style
         FROM wedding_profile WHERE user_id=$1`,
        [userId]
      ),
      pool.query('SELECT name, category, contact_email, phone FROM vendors WHERE user_id=$1', [userId]),
      pool.query(
        "SELECT title, category FROM timeline_items WHERE user_id=$1 AND completed=true ORDER BY category",
        [userId]
      ),
    ]);

    const profile = profileRows.rows[0] || {};
    const ceremonyTime = profile.ceremony_time || '15:00';

    const prompt = `
Create a detailed minute-by-minute wedding day timeline for this real couple:

COUPLE: ${profile.partner1_name || 'Partner 1'} & ${profile.partner2_name || 'Partner 2'}
DATE: ${profile.wedding_date ? new Date(profile.wedding_date).toDateString() : 'TBD'}
CEREMONY TIME: ${ceremonyTime}
RECEPTION TIME: ${profile.reception_time || 'To follow ceremony'}
VENUE: ${profile.venue_name || 'TBD'}
GUEST COUNT: ${profile.guest_count_target || 'Unknown'}
STYLE: ${profile.wedding_style || 'Classic'}

VENDORS BOOKED:
${vendorRows.rows.map(v => `- ${v.category}: ${v.name} (${v.phone || v.contact_email})`).join('\n') || 'None tracked'}

Create a complete day-of timeline from getting-ready to end-of-night including:
- Getting ready schedule (hair/makeup with buffer times)
- First look timing (if applicable)
- Vendor arrival times (photographer, caterer, florist, DJ)
- Guest arrival window
- Ceremony (processional, readings, vows, recessional with minute estimates)
- Cocktail hour
- Reception (dinner, speeches, first dance, cake cutting, send-off)
- Buffer/contingency notes

Format as: [TIME] – EVENT – RESPONSIBLE PARTY`;

    const systemPrompt = `You are a wedding day-of coordinator. Create a realistic, buffer-aware timeline.
Add 10-15 minute buffers between major transitions. Flag potential timing conflicts.
Output in strict [HH:MM] – Event – Person format, one line per event.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'day-of-timeline', {}, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NEW ENDPOINT 2: POST /api/ai/vow-writer
// AI-powered personalized vow writing assistant
// ---------------------------------------------------------------------------
router.post('/vow-writer', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { partner, memories, tone, length, promises } = req.body;

    const profileRows = await pool.query(
      'SELECT partner1_name, partner2_name, wedding_date FROM wedding_profile WHERE user_id=$1',
      [userId]
    );
    const profile = profileRows.rows[0] || {};

    const partnerName = partner === 'partner2' ? profile.partner2_name : profile.partner1_name;
    const toName = partner === 'partner2' ? profile.partner1_name : profile.partner2_name;

    const prompt = `
Write personalized wedding vows for ${partnerName || 'the partner'} to say to ${toName || 'their partner'}.

DETAILS:
- Wedding Date: ${profile.wedding_date ? new Date(profile.wedding_date).toDateString() : 'TBD'}
- Tone: ${tone || 'Heartfelt and sincere, with one touch of humor'}
- Desired Length: ${length || '90-120 seconds when spoken'}
- Shared Memories to Reference: ${memories || 'Not specified'}
- Specific Promises to Include: ${promises || 'Not specified'}

Write 3 versions of the vows:
1. Emotional/heartfelt (no humor)
2. Balanced (warm with one light moment)
3. Poetic/literary style

Each version should include:
- Opening line
- How they met or when they knew
- 3 specific promises
- Closing statement
- Approximate word count and speaking time`;

    const systemPrompt = `You are a vow-writing specialist and poet. Create deeply personal,
specific vows that feel authentic. Never use clichés like "complete me" or "best friend."
Each vow should feel unique to this couple. Include notes on delivery pacing.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'vow-writer', { partner, tone, length }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NEW ENDPOINT 3: POST /api/ai/vendor-email-draft
// Drafts professional vendor inquiry / negotiation emails
// ---------------------------------------------------------------------------
router.post('/vendor-email-draft', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vendorId, emailType, customNotes } = req.body;
    // emailType: 'inquiry' | 'negotiation' | 'cancellation' | 'confirmation' | 'complaint'

    const [profileRows] = await Promise.all([
      pool.query(
        'SELECT partner1_name, partner2_name, wedding_date, guest_count_target, venue_name FROM wedding_profile WHERE user_id=$1',
        [userId]
      ),
    ]);

    let vendorContext = '';
    if (vendorId) {
      const vendorRow = await pool.query(
        'SELECT name, category, price_range, contact_email, notes FROM vendors WHERE id=$1 AND user_id=$2',
        [vendorId, userId]
      );
      if (vendorRow.rows.length > 0) {
        const v = vendorRow.rows[0];
        vendorContext = `VENDOR: ${v.name} (${v.category}), Price Range: ${v.price_range}, Email: ${v.contact_email}\nVendor Notes: ${v.notes || 'None'}`;
      }
    }

    const profile = profileRows.rows[0] || {};
    const emailTypeDescriptions = {
      inquiry: 'initial availability inquiry and package request',
      negotiation: 'price negotiation and package customization request',
      cancellation: 'polite cancellation with request for deposit return',
      confirmation: 'formal booking confirmation with next steps',
      complaint: 'professional complaint about service issue with resolution request',
    };

    const prompt = `
Draft a professional wedding vendor email for this couple:

COUPLE: ${profile.partner1_name || 'Partner 1'} & ${profile.partner2_name || 'Partner 2'}
WEDDING DATE: ${profile.wedding_date ? new Date(profile.wedding_date).toDateString() : 'TBD'}
GUEST COUNT: ${profile.guest_count_target || 'Unknown'}
VENUE: ${profile.venue_name || 'TBD'}

${vendorContext}

EMAIL TYPE: ${emailTypeDescriptions[emailType] || emailType || 'professional inquiry'}
CUSTOM NOTES: ${customNotes || 'None'}

Write 2 versions of the email:
1. Formal/professional tone
2. Warm/friendly tone

Each email should have:
- Subject line
- Opening
- Key questions or requests (numbered list)
- Clear call to action
- Professional closing

Include specific talking points for ${emailType === 'negotiation' ? 'negotiating price or package inclusions' : 'this type of email'}.`;

    const systemPrompt = `You are a professional wedding planner who writes emails for couples daily.
Your emails are concise, professional, and effective. They get responses.
Include specific questions that vendors need to answer. Never be rude or entitled.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'vendor-email-draft', { vendorId, emailType }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NEW ENDPOINT 4: POST /api/ai/wedding-stress-check
// Holistic planning health assessment + stress triage
// ---------------------------------------------------------------------------
router.post('/wedding-stress-check', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [profileRows, budgetRows, timelineRows, vendorRows, guestRows] = await Promise.all([
      pool.query('SELECT * FROM wedding_profile WHERE user_id=$1', [userId]),
      pool.query('SELECT category, estimated_cost, actual_cost, paid FROM budget_items WHERE user_id=$1', [userId]),
      pool.query('SELECT completed, priority, due_date FROM timeline_items WHERE user_id=$1', [userId]),
      pool.query('SELECT category FROM vendors WHERE user_id=$1', [userId]),
      pool.query(
        "SELECT rsvp_status, COUNT(*) FROM guests WHERE user_id=$1 GROUP BY rsvp_status",
        [userId]
      ),
    ]);

    const profile = profileRows.rows[0] || {};
    const daysUntilWedding = profile.wedding_date
      ? Math.round((new Date(profile.wedding_date) - new Date()) / 86400000)
      : null;

    const totalBudget = parseFloat(profile.total_budget || 0);
    const totalEstimated = budgetRows.rows.reduce((s, r) => s + parseFloat(r.estimated_cost || 0), 0);
    const totalPaid = budgetRows.rows.filter(b => b.paid).reduce((s, r) => s + parseFloat(r.actual_cost || 0), 0);
    const overdueCount = timelineRows.rows.filter(
      t => !t.completed && t.due_date && new Date(t.due_date) < new Date()
    ).length;
    const completedPct = timelineRows.rows.length > 0
      ? Math.round(100 * timelineRows.rows.filter(t => t.completed).length / timelineRows.rows.length)
      : 0;

    const rsvpSummary = {};
    guestRows.rows.forEach(r => { rsvpSummary[r.rsvp_status] = parseInt(r.count); });

    const prompt = `
Perform a wedding planning health check for this couple and identify their top stress points:

WEDDING: ${profile.partner1_name || '?'} & ${profile.partner2_name || '?'}
DAYS UNTIL WEDDING: ${daysUntilWedding !== null ? daysUntilWedding : 'Date not set'}
WEDDING DATE: ${profile.wedding_date ? new Date(profile.wedding_date).toDateString() : 'Not set'}

BUDGET HEALTH:
- Total Budget: $${totalBudget}
- Total Estimated Costs: $${totalEstimated} (${totalEstimated > totalBudget ? 'OVER BUDGET by $' + (totalEstimated - totalBudget) : 'Under budget by $' + (totalBudget - totalEstimated)})
- Amount Paid: $${totalPaid}

TIMELINE HEALTH:
- Tasks Completed: ${completedPct}%
- Overdue Tasks: ${overdueCount}

VENDORS BOOKED CATEGORIES: ${vendorRows.rows.map(v => v.category).join(', ') || 'None'}
CRITICAL MISSING: ${['Venue', 'Catering', 'Photography', 'Music'].filter(
  cat => !vendorRows.rows.some(v => v.category === cat)
).join(', ') || 'None critical missing'}

RSVP STATUS: ${JSON.stringify(rsvpSummary)}

Provide:
1. Overall planning health score (0-100) with explanation
2. Top 3 URGENT action items (must do this week)
3. Top 3 risks that could derail the wedding
4. Budget risk assessment
5. Vendor gap assessment
6. RSVP concern assessment
7. One calming piece of advice
8. Specific checklist for the next 30 days`;

    const systemPrompt = `You are a wedding planning coach and crisis manager. Be honest but encouraging.
Give a numerical health score. Be specific about what could go wrong and exactly how to fix it.
Always end with something positive.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'wedding-stress-check', { daysUntilWedding, completedPct, overdueCount }, result);
    res.json({
      result: result.content,
      metrics: { daysUntilWedding, completedPct, overdueCount, budgetStatus: totalEstimated > totalBudget ? 'over' : 'under', rsvpSummary },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/budget-risk – Predictive budget overrun analysis
// ---------------------------------------------------------------------------
router.post('/budget-risk', auth, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }

    const userId = req.user.id;

    const [profileRows, budgetRows] = await Promise.all([
      pool.query('SELECT * FROM wedding_profile WHERE user_id=$1', [userId]),
      pool.query(
        `SELECT category, item_name, estimated_cost, actual_cost, paid
         FROM budget_items WHERE user_id=$1 ORDER BY category, item_name`,
        [userId]
      ),
    ]);

    const profile = profileRows.rows[0] || {};
    const items = budgetRows.rows;
    const totalBudget = parseFloat(profile.total_budget || 0);
    const totalEstimated = items.reduce((s, r) => s + parseFloat(r.estimated_cost || 0), 0);
    const totalActual = items.reduce((s, r) => s + parseFloat(r.actual_cost || 0), 0);
    const totalPaid = items.filter(b => b.paid).reduce((s, r) => s + parseFloat(r.actual_cost || 0), 0);
    const overruns = items
      .filter(r => r.actual_cost && parseFloat(r.actual_cost) > parseFloat(r.estimated_cost || 0))
      .map(r => ({
        category: r.category,
        item: r.item_name,
        estimated: parseFloat(r.estimated_cost || 0),
        actual: parseFloat(r.actual_cost),
        delta: parseFloat(r.actual_cost) - parseFloat(r.estimated_cost || 0),
      }));

    const daysUntilWedding = profile.wedding_date
      ? Math.round((new Date(profile.wedding_date) - new Date()) / 86400000)
      : null;

    const prompt = `
You are doing a forward-looking budget risk analysis for a wedding.

Total budget: $${totalBudget}
Estimated total of line items: $${totalEstimated}
Actuals booked so far: $${totalActual}
Paid so far: $${totalPaid}
Days until wedding: ${daysUntilWedding != null ? daysUntilWedding : 'Unknown'}
Existing overruns (line items already over their estimate):
${overruns.length ? overruns.map(o => `- ${o.category}: ${o.item} +$${o.delta.toFixed(2)} (est ${o.estimated}, actual ${o.actual})`).join('\n') : 'None yet.'}

Line items (first 60):
${items.slice(0, 60).map(r => `- ${r.category} | ${r.item_name} | est $${r.estimated_cost || 0} | actual $${r.actual_cost || 0} | paid=${r.paid}`).join('\n') || 'No line items.'}

Provide:
1. Overall budget risk level (low / medium / high / critical) with a numeric score 0-100.
2. Predicted final total spend with low / mid / high scenarios in dollars.
3. Top 5 categories most likely to overrun and why.
4. Hidden / commonly forgotten cost categories to watch.
5. Specific dollar-amount adjustments to prevent overrun.
6. Trigger points (e.g., "if photography exceeds X, then Y").
7. A short summary the couple can act on this week.`;

    const systemPrompt = `You are a forensic wedding-budget analyst. Use the real data provided.
Be specific with dollar amounts and category names. Avoid generic advice.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'budget-risk', { totalBudget, totalEstimated, totalActual }, result);
    res.json({
      result: result.content,
      metrics: {
        totalBudget,
        totalEstimated,
        totalActual,
        totalPaid,
        overrunCount: overruns.length,
        overrunDelta: overruns.reduce((s, o) => s + o.delta, 0),
        daysUntilWedding,
      },
    });
  } catch (err) {
    console.error(err);
    const msg = String(err.message || '');
    if (/OPENROUTER_API_KEY|api.?key/i.test(msg)) {
      return res.status(503).json({ error: 'AI service unavailable: ' + msg });
    }
    res.status(500).json({ error: msg || 'Budget risk analysis failed.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/vendor-performance-prediction – predict vendor reliability/quality
// ---------------------------------------------------------------------------
router.post('/vendor-performance-prediction', auth, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }

    const userId = req.user.id;
    const { vendor_id } = req.body || {};

    let vendors = [];
    if (vendor_id) {
      const r = await pool.query(
        'SELECT * FROM vendors WHERE user_id=$1 AND id=$2',
        [userId, vendor_id]
      );
      vendors = r.rows;
      if (!vendors.length) {
        return res.status(404).json({ error: 'Vendor not found for this user.' });
      }
    } else {
      const r = await pool.query(
        'SELECT * FROM vendors WHERE user_id=$1 ORDER BY category, name LIMIT 50',
        [userId]
      );
      vendors = r.rows;
    }

    const vendorSummary = vendors.length
      ? vendors.map(v => `- [${v.category}] ${v.name} | price=${v.price_range || 'unknown'} | rating=${v.rating || 'n/a'} | desc=${(v.description || '').slice(0, 200)}`).join('\n')
      : 'No vendors on file.';

    const prompt = `
Predict vendor performance and reliability risk for the following wedding vendors.

Vendors (${vendors.length}):
${vendorSummary}

For each vendor return:
- predicted reliability score (0-100)
- predicted quality score (0-100)
- top 3 risk signals
- top 3 mitigations or contract clauses to insist on
- likelihood of last-minute issues (low / medium / high)

Then summarize:
- highest-risk vendor and why
- vendors where a backup should be lined up
- general due-diligence checklist before final payment.

Be concrete; reference each vendor by name. If a category is missing entirely, call it out.`;

    const systemPrompt = `You are a wedding-industry vendor-vetting expert. Predict performance using
the limited information provided plus reasonable industry priors. Be honest about uncertainty.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'vendor-performance-prediction', { vendor_id, vendor_count: vendors.length }, result);
    res.json({
      result: result.content,
      vendor_count: vendors.length,
      vendor_id: vendor_id || null,
    });
  } catch (err) {
    console.error(err);
    const msg = String(err.message || '');
    if (/OPENROUTER_API_KEY|api.?key/i.test(msg)) {
      return res.status(503).json({ error: 'AI service unavailable: ' + msg });
    }
    res.status(500).json({ error: msg || 'Vendor performance prediction failed.' });
  }
});

module.exports = router;
