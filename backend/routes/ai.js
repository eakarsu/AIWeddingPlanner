const express = require('express');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const router = express.Router();

async function callOpenRouter(prompt, systemPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Wedding Planner',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'OpenRouter API error');
  }
  return data.choices[0].message.content;
}

// Vendor matching AI
router.post('/vendor-match', auth, async (req, res) => {
  try {
    const { budget, style, location, guestCount, preferences } = req.body;
    const prompt = `Find the best wedding vendors for: Budget: $${budget}, Style: ${style}, Location: ${location}, Guest Count: ${guestCount}, Preferences: ${preferences}. Provide detailed vendor recommendations with categories, estimated costs, and why they're a good match.`;
    const systemPrompt = 'You are an expert wedding planner AI. Provide detailed, actionable vendor recommendations formatted in clear sections with headers. Include vendor categories, price ranges, and specific tips.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Budget optimization AI
router.post('/budget-optimize', auth, async (req, res) => {
  try {
    const { totalBudget, items, priorities } = req.body;
    const prompt = `Optimize this wedding budget: Total Budget: $${totalBudget}. Current items: ${JSON.stringify(items)}. Priorities: ${priorities}. Suggest optimal allocation, cost-saving tips, and areas where we can splurge or save.`;
    const systemPrompt = 'You are an expert wedding budget advisor. Provide specific budget optimization advice with exact dollar amounts and percentages. Be practical and creative with cost-saving suggestions.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Timeline AI
router.post('/timeline-suggest', auth, async (req, res) => {
  try {
    const { weddingDate, currentTasks, completedTasks } = req.body;
    const prompt = `Create a wedding planning timeline. Wedding date: ${weddingDate}. Current tasks: ${JSON.stringify(currentTasks)}. Completed: ${JSON.stringify(completedTasks)}. Suggest what to do next with specific deadlines and priorities.`;
    const systemPrompt = 'You are an expert wedding timeline planner. Create detailed, chronological task lists with specific deadlines. Include tips for staying on track and common pitfalls to avoid.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Seating arrangement AI
router.post('/seating-suggest', auth, async (req, res) => {
  try {
    const { guests, tables, relationships, constraints } = req.body;
    const prompt = `Suggest optimal seating arrangement. Guests: ${JSON.stringify(guests)}. Tables available: ${tables}. Relationships/groups: ${relationships}. Constraints: ${constraints}. Create a harmonious seating plan.`;
    const systemPrompt = 'You are an expert wedding seating planner. Create thoughtful seating arrangements that consider relationships, group dynamics, and special needs. Explain your reasoning for each table.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Menu planning AI
router.post('/menu-suggest', auth, async (req, res) => {
  try {
    const { guestCount, dietaryNeeds, style, budget, season } = req.body;
    const prompt = `Suggest a wedding menu. Guest count: ${guestCount}, Dietary needs: ${dietaryNeeds}, Style: ${style}, Budget: $${budget}, Season: ${season}. Include appetizers, main courses, desserts, and drinks.`;
    const systemPrompt = 'You are an expert wedding caterer and menu planner. Suggest creative, delicious menu options with detailed descriptions, estimated costs per person, and presentation tips.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Invitation wording AI
router.post('/invitation-wording', auth, async (req, res) => {
  try {
    const { style, names, date, venue, tone } = req.body;
    const prompt = `Write wedding invitation wording. Couple: ${names}, Date: ${date}, Venue: ${venue}, Style: ${style}, Tone: ${tone}. Provide multiple options.`;
    const systemPrompt = 'You are an expert wedding invitation designer. Craft elegant, personalized invitation wording options. Include formal, semi-formal, and creative versions.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Floral arrangement AI
router.post('/floral-suggest', auth, async (req, res) => {
  try {
    const { season, colors, style, budget, venue } = req.body;
    const prompt = `Suggest wedding floral arrangements. Season: ${season}, Color palette: ${colors}, Style: ${style}, Budget: $${budget}, Venue: ${venue}. Include bouquets, centerpieces, and decorations.`;
    const systemPrompt = 'You are an expert wedding florist. Suggest beautiful floral arrangements with specific flower types, color combinations, and styling tips. Include cost estimates.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Music/entertainment AI
router.post('/music-suggest', auth, async (req, res) => {
  try {
    const { style, guestDemographics, vibe, budget } = req.body;
    const prompt = `Suggest wedding music and entertainment. Style: ${style}, Guest demographics: ${guestDemographics}, Vibe: ${vibe}, Budget: $${budget}. Include ceremony music, reception playlist, and entertainment ideas.`;
    const systemPrompt = 'You are an expert wedding music director and entertainment planner. Suggest specific songs, playlist themes, and entertainment options with timing suggestions.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// General wedding advice AI
router.post('/general-advice', auth, async (req, res) => {
  try {
    const { question } = req.body;
    const prompt = question;
    const systemPrompt = 'You are an expert wedding planner with 20+ years of experience. Provide detailed, practical, and personalized wedding planning advice. Be warm, supportive, and specific.';
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
