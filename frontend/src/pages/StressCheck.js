import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import API from '../services/api';

export default function StressCheck() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');

  const runCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/ai/wedding-stress-check', {});
      setResult(res.data.result);
      setMetrics(res.data.metrics);
    } catch (err) {
      setError(err.response?.data?.error || 'Stress check failed');
    }
    setLoading(false);
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="dashboard-header">
        <h1>🩺 Wedding Planning Stress Check</h1>
        <p>Holistic assessment of your wedding planning health — what's on track, what's overdue, what to fix this week.</p>
      </div>

      {!result && (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="empty-state-icon">🩺</span>
          <h3>Get Your Wedding Health Score</h3>
          <p>Pulls your real budget, timeline, vendors, and RSVP data to identify stress points.</p>
          <button className="btn btn-primary btn-lg" onClick={runCheck} disabled={loading} style={{ marginTop: 24 }}>
            {loading ? '🔮 Analyzing Wedding…' : '✨ Run Stress Check Now'}
          </button>
        </div>
      )}

      {error && (
        <div className="ai-output">
          <div className="ai-output-header" style={{ background: 'linear-gradient(135deg, #C75B5B, #D47070)' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <h3>Error</h3>
          </div>
          <div className="ai-output-body"><p>{error}</p></div>
        </div>
      )}

      {metrics && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div className="stat-value">{metrics.daysUntilWedding ?? '—'}</div>
            <div className="stat-label">Days Until Wedding</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📋</span>
            <div className="stat-value">{metrics.completedPct}%</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚠️</span>
            <div className="stat-value">{metrics.overdueCount}</div>
            <div className="stat-label">Overdue Tasks</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>{metrics.budgetStatus}</div>
            <div className="stat-label">Budget Status</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-value">{metrics.rsvpSummary?.confirmed || 0}</div>
            <div className="stat-label">Confirmed RSVPs</div>
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="ai-output">
            <div className="ai-output-header">
              <span style={{ fontSize: '1.5rem' }}>🩺</span>
              <h3>Stress Check Report</h3>
            </div>
            <div className="ai-output-body">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-outline" onClick={runCheck} disabled={loading}>
              {loading ? 'Refreshing…' : '🔄 Run Again'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/timeline')}>📅 Open Timeline</button>
            <button className="btn btn-secondary" onClick={() => navigate('/budget')}>💰 Open Budget</button>
          </div>
        </>
      )}
    </div>
  );
}
