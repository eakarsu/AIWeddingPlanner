import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import API from '../services/api';

const ENDPOINTS = [
  { value: '', label: 'All AI Endpoints' },
  { value: 'vendor-match', label: '🤝 Vendor Matching' },
  { value: 'budget-optimize', label: '💰 Budget Optimizer' },
  { value: 'timeline-suggest', label: '📅 Timeline Planner' },
  { value: 'seating-suggest', label: '🪑 Seating Planner' },
  { value: 'menu-suggest', label: '🍽️ Menu Designer' },
  { value: 'invitation-wording', label: '💌 Invitation Writer' },
  { value: 'floral-suggest', label: '💐 Floral Designer' },
  { value: 'music-suggest', label: '🎵 Music Curator' },
  { value: 'general-advice', label: '🤖 General Advice' },
  { value: 'day-of-timeline', label: '⏰ Day-of Timeline' },
  { value: 'vow-writer', label: '💖 Vow Writer' },
  { value: 'vendor-email-draft', label: '✉️ Vendor Email' },
  { value: 'wedding-stress-check', label: '🩺 Stress Check' },
];

export default function AIHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [endpoint, setEndpoint] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (endpoint) params.append('endpoint', endpoint);
      const res = await API.get(`/ai/history?${params.toString()}`);
      setItems(res.data.results || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="dashboard-header">
        <h1>🗂️ AI History</h1>
        <p>Browse, re-read, and reference every AI suggestion you've generated.</p>
      </div>

      <div className="search-filter-bar">
        <select className="filter-select" value={endpoint} onChange={e => setEndpoint(e.target.value)}>
          {ENDPOINTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <span className="result-count">{items.length} result{items.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading history…</p></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🗂️</span>
          <h3>No AI Results Yet</h3>
          <p>Generated AI advice will be saved here automatically.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Endpoint</th>
                <th>Model</th>
                <th>Tokens</th>
                <th>Preview</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} onClick={() => setSelected(it)}>
                  <td>{new Date(it.created_at).toLocaleString()}</td>
                  <td><span className="status-badge status-confirmed">{it.endpoint}</span></td>
                  <td>{it.model_used || '-'}</td>
                  <td>{it.tokens_used || '-'}</td>
                  <td style={{ maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(it.result_text || '').slice(0, 100)}…
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelected(it)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤖 {selected.endpoint}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-light)', marginBottom: 12 }}>
                Generated {new Date(selected.created_at).toLocaleString()} via {selected.model_used} ({selected.tokens_used || '—'} tokens)
              </p>
              {selected.request_params && Object.keys(selected.request_params).length > 0 && (
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Request Inputs</summary>
                  <pre style={{ background: 'var(--bg-light, #f5f5f5)', padding: 12, borderRadius: 6, fontSize: 12, marginTop: 8 }}>
                    {JSON.stringify(selected.request_params, null, 2)}
                  </pre>
                </details>
              )}
              <div className="ai-output-body">
                <ReactMarkdown>{selected.result_text}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
