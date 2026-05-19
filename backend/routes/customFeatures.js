// Custom feature endpoints (batch_09 audit suggestions)
const express = require('express');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const router = express.Router();

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callLLM(system, user, { maxTokens = 2000, temperature = 0.4 } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error('OPENROUTER_API_KEY missing');
    err.statusCode = 503;
    throw err;
  }
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Wedding Planner',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens, temperature,
    }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return { content: data.choices?.[0]?.message?.content || '', model: data.model };
}

function parseJSON(t) {
  if (!t) return null;
  const c = String(t).replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const m = c.match(/\{[\s\S]*\}/) || c.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function err(res, e, label) {
  if (e.statusCode === 503) return res.status(503).json({ error: e.message });
  console.error(`${label} error:`, e.message);
  res.status(500).json({ error: e.message });
}

// 1. Real-time guest preference learning
router.post('/guest-preferences', auth, async (req, res) => {
  try {
    const { guests, event_context } = req.body || {};
    if (!Array.isArray(guests) || !guests.length) return res.status(400).json({ error: 'guests array required' });
    const ai = await callLLM(
      'You aggregate guest signals (dietary, accessibility, music taste) into actionable preferences. JSON only.',
      `GUESTS: ${JSON.stringify(guests.slice(0,80))}\nCONTEXT: ${event_context || 'wedding'}\nReturn JSON {"dietary_summary":{"vegan":0,"gluten_free":0,"halal":0,"other":[""]},"accessibility":[{"need":"","accommodation":""}],"music_profile":{"genres":[""],"avoid":[""]},"per_guest_notes":[{"guest_id":"","tip":""}]}`
    );
    res.json({ type: 'guest-preferences', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'guest-preferences'); }
});

// 2. Predictive budget overruns with smart reallocation
router.post('/budget-overrun', auth, async (req, res) => {
  try {
    const { categories, total_budget_usd, spent_to_date_usd } = req.body || {};
    if (!Array.isArray(categories)) return res.status(400).json({ error: 'categories array required' });
    const ai = await callLLM(
      'You predict budget overruns and reallocate funds across wedding categories. JSON only.',
      `CATEGORIES: ${JSON.stringify(categories)}\nBUDGET: ${total_budget_usd}\nSPENT: ${spent_to_date_usd}\nReturn JSON {"projected_overrun_usd":0,"at_risk_categories":[{"name":"","projected_overrun":0}],"reallocations":[{"from":"","to":"","amount_usd":0,"reason":""}],"confidence":0}`
    );
    res.json({ type: 'budget-overrun', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'budget-overrun'); }
});

// 3. Vendor performance prediction
router.post('/vendor-performance', auth, async (req, res) => {
  try {
    const { vendor, history } = req.body || {};
    if (!vendor) return res.status(400).json({ error: 'vendor required' });
    const ai = await callLLM(
      'You forecast wedding vendor on-time / quality risk from past performance signals. JSON only.',
      `VENDOR: ${JSON.stringify(vendor)}\nHISTORY: ${JSON.stringify(history || [])}\nReturn JSON {"on_time_score":0,"quality_score":0,"risk_factors":[""],"backup_recommendation":"","confidence":0}`
    );
    res.json({ type: 'vendor-performance', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'vendor-performance'); }
});

// 4. Seating-conflict detection with AI optimizer
router.post('/seating-optimize', auth, async (req, res) => {
  try {
    const { guests, table_capacity = 8, known_conflicts } = req.body || {};
    if (!Array.isArray(guests) || !guests.length) return res.status(400).json({ error: 'guests array required' });
    const ai = await callLLM(
      'You arrange seating to minimize conflicts and maximize affinity. JSON only.',
      `GUESTS: ${JSON.stringify(guests.slice(0,120))}\nTABLE_CAP: ${table_capacity}\nCONFLICTS: ${JSON.stringify(known_conflicts || [])}\nReturn JSON {"tables":[{"id":0,"guests":[""],"theme":""}],"unresolved_conflicts":[""],"affinity_score":0}`,
      { maxTokens: 3000 }
    );
    res.json({ type: 'seating-optimize', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'seating-optimize'); }
});

// 5. Crowd-sourced destination wedding guides with AI itineraries
router.post('/destination-itinerary', auth, async (req, res) => {
  try {
    const { destination, days, party_size, vibe } = req.body || {};
    if (!destination) return res.status(400).json({ error: 'destination required' });
    const ai = await callLLM(
      'You produce destination wedding multi-day itineraries informed by crowd reviews. JSON only.',
      `DEST: ${destination}\nDAYS: ${days || 3}\nPARTY: ${party_size || 50}\nVIBE: ${vibe || 'relaxed'}\nReturn JSON {"itinerary":[{"day":1,"morning":"","afternoon":"","evening":""}],"highlight_venues":[""],"local_tips":[""],"estimated_per_guest_usd":0}`
    );
    res.json({ type: 'destination-itinerary', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'destination-itinerary'); }
});

// 6. Live event-day coordination with IoT
// TODO: configure credentials for IOT_HUB_API_KEY (photo booth / music transitions).
router.post('/event-day-coordination', auth, async (req, res) => {
  try {
    const { schedule, current_time } = req.body || {};
    if (!Array.isArray(schedule)) return res.status(400).json({ error: 'schedule required' });
    const ai = await callLLM(
      `You orchestrate live event-day cues (music, photo booth, lighting). IoT hub configured: ${Boolean(process.env.IOT_HUB_API_KEY)}. JSON only.`,
      `NOW: ${current_time || new Date().toISOString()}\nSCHEDULE: ${JSON.stringify(schedule)}\nReturn JSON {"next_cue":{"at":"","action":"","device":""},"upcoming":[{"at":"","action":""}],"warnings":[""]}`
    );
    res.json({ type: 'event-day-coordination', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'event-day-coordination'); }
});

// 7. Post-wedding thank-you generation + mail integration
// TODO: configure credentials for MAIL_API_KEY.
router.post('/thank-you-cards', auth, async (req, res) => {
  try {
    const { couple_names, guests_with_gifts } = req.body || {};
    if (!Array.isArray(guests_with_gifts)) return res.status(400).json({ error: 'guests_with_gifts required' });
    const ai = await callLLM(
      `You draft personalized wedding thank-you notes. Mail API configured: ${Boolean(process.env.MAIL_API_KEY)}. JSON only.`,
      `COUPLE: ${couple_names || 'the couple'}\nGUESTS: ${JSON.stringify(guests_with_gifts.slice(0,40))}\nReturn JSON {"notes":[{"guest_id":"","name":"","body":"","tone":"warm|formal|playful"}]}`
    );
    res.json({ type: 'thank-you-cards', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'thank-you-cards'); }
});

// 8. Marriage-counseling referrals from pre-wedding stress indicators
router.post('/counseling-referrals', auth, async (req, res) => {
  try {
    const { stress_indicators } = req.body || {};
    const ai = await callLLM(
      'You assess pre-wedding stress and refer to counseling resources. Compassionate tone. JSON only.',
      `INDICATORS: ${JSON.stringify(stress_indicators || {})}\nReturn JSON {"stress_score":0,"flags":[""],"resources":[{"name":"","type":"online|local|group","why":""}],"escalate":false}`
    );
    res.json({ type: 'counseling-referrals', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'counseling-referrals'); }
});

module.exports = router;
