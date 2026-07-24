'use strict';

const express = require('express');
const fetch = require('node-fetch');
const pool = require('../db');
const router = express.Router();

async function complete(prompt) {
  const baseUrl = (process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
  if (baseUrl !== 'https://openrouter.ai/api/v1') throw new Error('OPENROUTER_BASE_URL must be https://openrouter.ai/api/v1');
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is required');
  if (!process.env.OPENROUTER_MODEL) throw new Error('OPENROUTER_MODEL is required');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'You are an experienced wedding planner. Return strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
    timeout: 60000,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || `OpenRouter request failed (${response.status})`);
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('OpenRouter returned an empty response');
  return { content, model: body.model || process.env.OPENROUTER_MODEL, tokens: body.usage?.total_tokens || null };
}

router.post('/planning-advice', async (req, res) => {
  try {
    const input = req.body || {};
    const result = await complete(`Give actionable wedding planning advice for this situation: ${JSON.stringify(input).slice(0, 5000)}. Return {summary,priorities,timeline,budgetRisks,recommendations}.`);
    const saved = await pool.query(
      `INSERT INTO ai_results(user_id,endpoint,request_params,result_text,model_used,tokens_used)
       VALUES($1,'planning-advice',$2,$3,$4,$5) RETURNING id,created_at`,
      [req.user.id, input, result.content, result.model, result.tokens],
    );
    let parsed;
    try { parsed = JSON.parse(result.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
    catch (_) { parsed = { advice: result.content }; }
    res.json({ success: true, result: parsed, persistence: saved.rows[0] });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,endpoint,request_params,result_text,model_used,tokens_used,created_at
       FROM ai_results WHERE user_id=$1 AND endpoint='planning-advice' ORDER BY created_at DESC LIMIT 50`,
      [req.user.id],
    );
    res.json({ history: result.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
