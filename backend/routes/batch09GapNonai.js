// // === Batch 09 Gaps & Frontend Mounts ===
// Auto-generated gap-nonai endpoints for AIWeddingPlanner.
// Calls OpenRouter via native fetch (no SDK); lazily creates gap_features table.
const express = require('express');
const router = express.Router();

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function runAI(system, user) {
  if (!process.env.OPENROUTER_API_KEY) {
    const e = new Error('OPENROUTER_API_KEY missing'); e.statusCode = 503; throw e;
  }
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [
      { role: 'system', content: system }, { role: 'user', content: user }
    ], max_tokens: 1500, temperature: 0.4 })
  });
  if (!r.ok) { const e = new Error(`AI ${r.status}`); e.statusCode = 502; throw e; }
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content || '';
  let parsed = null;
  try { const m = content.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}
  return { raw: content, parsed, model: data?.model };
}

let _persistInit = false;
async function persist(feature, input, output) {
  // Lazy gap_features table — best-effort, swallow errors so AI still works.
  try {
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    if (!_persistInit) {
      await p.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS gap_features (id SERIAL PRIMARY KEY, feature TEXT, input JSONB, output JSONB, created_at TIMESTAMPTZ DEFAULT NOW())');
      _persistInit = true;
    }
    await p.$executeRawUnsafe('INSERT INTO gap_features(feature, input, output) VALUES ($1, $2::jsonb, $3::jsonb)', feature, JSON.stringify(input || {}), JSON.stringify(output || {}));
  } catch { /* swallow */ }
}

// POST /api/gap-nonai-aiweddingplanner/payment-processing-and-deposits
// Payment processing and deposits
router.post('/payment-processing-and-deposits', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Payment processing and deposits\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('payment-processing-and-deposits', req.body, ai);
    res.json({ feature: 'payment-processing-and-deposits', title: 'Payment processing and deposits', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-aiweddingplanner/venue-contract-template-library
// Venue contract template library
router.post('/venue-contract-template-library', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Venue contract template library\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('venue-contract-template-library', req.body, ai);
    res.json({ feature: 'venue-contract-template-library', title: 'Venue contract template library', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-aiweddingplanner/supplier-inventory-tracking-rentals-dishware
// Supplier inventory tracking (rentals, dishware)
router.post('/supplier-inventory-tracking-rentals-dishware', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Supplier inventory tracking (rentals, dishware)\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('supplier-inventory-tracking-rentals-dishware', req.body, ai);
    res.json({ feature: 'supplier-inventory-tracking-rentals-dishware', title: 'Supplier inventory tracking (rentals, dishware)', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-aiweddingplanner/day-of-staffcoordinator-management
// Day-of staff/coordinator management
router.post('/day-of-staffcoordinator-management', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Day-of staff/coordinator management\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('day-of-staffcoordinator-management', req.body, ai);
    res.json({ feature: 'day-of-staffcoordinator-management', title: 'Day-of staff/coordinator management', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-aiweddingplanner/vendor-reviewrating-system
// Vendor review/rating system
router.post('/vendor-reviewrating-system', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Vendor review/rating system\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('vendor-reviewrating-system', req.body, ai);
    res.json({ feature: 'vendor-reviewrating-system', title: 'Vendor review/rating system', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-aiweddingplanner/multi-event-sharing-rehearsal-dinner-brunch
// Multi-event sharing (rehearsal dinner, brunch)
router.post('/multi-event-sharing-rehearsal-dinner-brunch', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Multi-event sharing (rehearsal dinner, brunch)\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('multi-event-sharing-rehearsal-dinner-brunch', req.body, ai);
    res.json({ feature: 'multi-event-sharing-rehearsal-dinner-brunch', title: 'Multi-event sharing (rehearsal dinner, brunch)', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

module.exports = router;
