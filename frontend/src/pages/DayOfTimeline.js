import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import API from '../services/api';

export default function DayOfTimeline() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/ai/day-of-timeline', {});
      setResult(res.data.result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate timeline');
    }
    setLoading(false);
  };

  const downloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-day-timeline-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="dashboard-header">
        <h1>⏰ Wedding Day Timeline</h1>
        <p>Generate a minute-by-minute schedule from getting-ready through send-off, using your real wedding details and vendor list.</p>
      </div>

      {!result && (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="empty-state-icon">⏰</span>
          <h3>Build Your Day-Of Timeline</h3>
          <p>Pulls ceremony time, venue, guest count, and booked vendors from your profile.</p>
          <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading} style={{ marginTop: 24 }}>
            {loading ? '🔮 Building Timeline…' : '✨ Generate Timeline'}
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

      {result && (
        <>
          <div className="ai-output">
            <div className="ai-output-header">
              <span style={{ fontSize: '1.5rem' }}>⏰</span>
              <h3>Minute-by-Minute Schedule</h3>
            </div>
            <div className="ai-output-body">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={downloadTxt}>📥 Download .txt</button>
            <button className="btn btn-outline" onClick={generate} disabled={loading}>
              {loading ? 'Regenerating…' : '🔄 Regenerate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
