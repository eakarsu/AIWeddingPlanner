// // === Batch 09 Gaps & Frontend Mounts ===
import React, { useState } from 'react';
import FullFieldPresets from '../../components/FullFieldPresets';
import AIReport from '../../components/AIReport';

export default function PostWeddingThankYouGenerationAndMailIntegrationPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const r = await fetch('/api/custom/post-wedding-thank-you-generation-and-mail-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ prompt: input })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (e) { setError(e.message || 'Error'); }
    setLoading(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Post-wedding thank-you generation and mail integration</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>Generated gap feature for AIWeddingPlanner.</p>
      <FullFieldPresets value={{ input }} presets={[
        { label: 'Wedding scenario', values: { input: 'For a 120-guest wedding, assess post-wedding thank-you generation and mail integration. Include practical priorities, assumptions, and a review checklist.' } },
        { label: 'Planning constraints', values: { input: 'For a wedding with a $35,000 budget and a six-month timeline, explain post-wedding thank-you generation and mail integration with dependencies, risks, and next actions.' } },
        { label: 'Decision briefing', values: { input: 'Prepare a concise decision brief about post-wedding thank-you generation and mail integration for a couple and coordinator. Separate verified facts from assumptions.' } }
      ]} onChange={(next) => setInput(next.input)} disabled={loading} />
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Describe what you need..."
        rows={6}
        style={{ width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 6, marginBottom: 12 }}
      />
      <button
        onClick={run}
        disabled={loading}
        style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        {loading ? 'Running...' : 'Run AI'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      {result && <AIReport response={result} title="Post-wedding thank-you generation and mail integration" />}
    </div>
  );
}
