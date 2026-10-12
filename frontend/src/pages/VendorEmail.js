import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIReport from '../components/AIReport';
import FullFieldPresets from '../components/FullFieldPresets';
import API from '../services/api';
import { recordRows } from '../services/recordRows';

const EMAIL_TYPES = [
  { value: 'inquiry', label: '💬 Initial Inquiry & Availability' },
  { value: 'negotiation', label: '🤝 Price / Package Negotiation' },
  { value: 'confirmation', label: '✅ Booking Confirmation' },
  { value: 'cancellation', label: '🛑 Cancellation Request' },
  { value: 'complaint', label: '⚠️ Service Complaint' },
];

export default function VendorEmail() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [emailType, setEmailType] = useState('inquiry');
  const [customNotes, setCustomNotes] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/vendors').then(r => setVendors(recordRows(r.data, 'Vendors'))).catch(() => setVendors([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await API.post('/ai/vendor-email-draft', {
        vendorId: vendorId || undefined,
        emailType,
        customNotes,
      });
      setResult(res.data.result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to draft email');
    }
    setLoading(false);
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    alert('Email copied to clipboard!');
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="dashboard-header">
        <h1>✉️ Vendor Email Drafts</h1>
        <p>Draft professional emails to vendors. Pick a vendor and email type, AI generates two tone variants.</p>
      </div>

      <form className="ai-form" onSubmit={submit}>
        <FullFieldPresets value={{ vendorId, emailType, customNotes }} onChange={next => { setEmailType(next.emailType); setCustomNotes(next.customNotes); setResult(''); setError(''); }} disabled={loading} presets={[
          { label: 'Availability inquiry', values: { emailType: 'inquiry', customNotes: 'Ask about availability for June 12, 2027, service for 120 guests, package details, and a call next week.' } },
          { label: 'Package negotiation', values: { emailType: 'negotiation', customNotes: 'Thank them for the proposal; ask about a smaller package, delivery fees, and payment milestones.' } },
          { label: 'Booking confirmation', values: { emailType: 'confirmation', customNotes: 'Confirm the event date, arrival window, agreed services, deposit, and next planning check-in.' } }
        ]} />
        <p role="status">The selected vendor stays unchanged. Choose a vendor from your own records, or keep the generic option.</p>
        <div className="form-group">
          <label>Vendor (optional — leave blank for generic)</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)}>
            <option value="">— Generic / no specific vendor —</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Email Type</label>
          <select value={emailType} onChange={e => setEmailType(e.target.value)}>
            {EMAIL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Custom Notes (optional)</label>
          <textarea
            rows={4}
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            placeholder="Specific dates to ask about, package details to negotiate, problems to address…"
          />
        </div>
        <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
          {loading ? '✏️ Drafting…' : '✨ Draft 2 Email Versions'}
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
        <>
          <div className="ai-output">
            <div className="ai-output-header">
              <span style={{ fontSize: '1.5rem' }}>✉️</span>
              <h3>Email Drafts</h3>
            </div>
            <div className="ai-output-body"><AIReport response={result} title="AI result" /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={copyResult}>📋 Copy to Clipboard</button>
          </div>
        </>
      )}
    </div>
  );
}
