import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import API from '../services/api';

export default function VowWriter() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    partner: 'partner1',
    memories: '',
    tone: 'Heartfelt and sincere, with one touch of humor',
    length: '90-120 seconds when spoken',
    promises: '',
  });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await API.post('/ai/vow-writer', form);
      setResult(res.data.result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to write vows');
    }
    setLoading(false);
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="dashboard-header">
        <h1>💖 Vow Writer</h1>
        <p>Write personalized wedding vows with AI assistance — three styles, all using your wedding details.</p>
      </div>

      <form className="ai-form" onSubmit={submit}>
        <div className="form-group">
          <label>Whose Vows?</label>
          <select value={form.partner} onChange={e => setForm({ ...form, partner: e.target.value })}>
            <option value="partner1">Partner 1's Vows (to Partner 2)</option>
            <option value="partner2">Partner 2's Vows (to Partner 1)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Tone</label>
          <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}>
            <option>Heartfelt and sincere, with one touch of humor</option>
            <option>Deeply emotional, no humor</option>
            <option>Playful and witty</option>
            <option>Poetic and literary</option>
            <option>Casual and conversational</option>
            <option>Spiritual / religious</option>
          </select>
        </div>
        <div className="form-group">
          <label>Desired Length</label>
          <select value={form.length} onChange={e => setForm({ ...form, length: e.target.value })}>
            <option>60-90 seconds when spoken</option>
            <option>90-120 seconds when spoken</option>
            <option>2-3 minutes when spoken</option>
          </select>
        </div>
        <div className="form-group">
          <label>Shared Memories to Reference</label>
          <textarea
            rows={3}
            value={form.memories}
            placeholder="The hike where we got lost, our first apartment, the night you cooked me pasta…"
            onChange={e => setForm({ ...form, memories: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Specific Promises to Include</label>
          <textarea
            rows={3}
            value={form.promises}
            placeholder="To always make you laugh in the morning, to support your dreams, to be your partner in every adventure…"
            onChange={e => setForm({ ...form, promises: e.target.value })}
          />
        </div>
        <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
          {loading ? '💖 Writing your vows…' : '✨ Generate 3 Vow Versions'}
        </button>
      </form>

      {error && (
        <div className="ai-output">
          <div className="ai-output-header" style={{ background: 'linear-gradient(135deg, #C75B5B, #D47070)' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <h3>Error</h3>
          </div>
          <div className="ai-output-body"><p>{error}</p></div>
        </div>
      )}

      {result && (
        <div className="ai-output">
          <div className="ai-output-header">
            <span style={{ fontSize: '1.5rem' }}>💖</span>
            <h3>Your Vows (3 Versions)</h3>
          </div>
          <div className="ai-output-body"><ReactMarkdown>{result}</ReactMarkdown></div>
        </div>
      )}
    </div>
  );
}
