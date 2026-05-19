import React, { useEffect, useState } from 'react';
import API from '../../services/api';

const BLANK = { name: '', category: 'Photography', min_rating: 4, max_price: 1000, required: false, notes: '' };
const CATEGORIES = ['Photography', 'Florist', 'Catering', 'Music', 'Bakery', 'Videography', 'Transportation', 'Venue', 'Beauty', 'Officiant', 'Other'];

// NON-VIZ #2 - CRUD editor for vendor selection rules / requirements.
function VendorSelectionRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const { data } = await API.get('/custom-views/vendor-selection-rules');
      setRules(data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (editingId) {
        await API.put(`/custom-views/vendor-selection-rules/${editingId}`, form);
      } else {
        await API.post('/custom-views/vendor-selection-rules', form);
      }
      setForm(BLANK);
      setEditingId(null);
      load();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  const edit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name, category: rule.category,
      min_rating: rule.min_rating, max_price: rule.max_price,
      required: rule.required, notes: rule.notes || '',
    });
  };

  const del = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await API.delete(`/custom-views/vendor-selection-rules/${id}`);
      load();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  const totalBudget = rules.reduce((s, r) => s + Number(r.max_price || 0), 0);

  return (
    <div data-testid="nonviz-rules-editor" style={{ padding: '12px 4px' }}>
      <h3 style={{ marginBottom: 8 }}>Vendor Selection Rules</h3>
      <p style={{ fontSize: '.9rem', color: '#666', marginBottom: 12 }}>
        Define requirements (category, min rating, max price) used to shortlist vendors.
        Total max-price ceiling: <strong>${totalBudget.toLocaleString()}</strong>
      </p>

      {err && <div className="login-error" style={{ marginBottom: 10 }}>{err}</div>}

      <form onSubmit={submit} data-testid="rules-form" style={{
        background: '#faf6fa', padding: 14, borderRadius: 6,
        marginBottom: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Rule name</label>
          <input data-testid="rule-name" required value={form.name}
                 onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Category</label>
          <select data-testid="rule-category" value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Min rating (0-5)</label>
          <input data-testid="rule-min-rating" type="number" step="0.1" min="0" max="5"
                 value={form.min_rating}
                 onChange={e => setForm({ ...form, min_rating: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Max price ($)</label>
          <input data-testid="rule-max-price" type="number" min="0"
                 value={form.max_price}
                 onChange={e => setForm({ ...form, max_price: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
          <label>Notes</label>
          <textarea data-testid="rule-notes" value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input data-testid="rule-required" type="checkbox" checked={form.required}
                 onChange={e => setForm({ ...form, required: e.target.checked })} />
          Required
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {editingId && (
            <button type="button" className="btn btn-outline btn-sm"
                    onClick={() => { setForm(BLANK); setEditingId(null); }}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-sm" data-testid="rule-submit">
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
        <thead>
          <tr style={{ background: '#efe6ef' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>Rule</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Category</th>
            <th style={{ padding: 8 }}>Min ★</th>
            <th style={{ padding: 8 }}>Max $</th>
            <th style={{ padding: 8 }}>Req</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 && (
            <tr><td colSpan="6" style={{ padding: 12, textAlign: 'center', color: '#888' }}>No rules yet.</td></tr>
          )}
          {rules.map(r => (
            <tr key={r.id} data-testid={`rule-row-${r.id}`} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{r.name}<div style={{ fontSize: '.75rem', color: '#888' }}>{r.notes}</div></td>
              <td style={{ padding: 8 }}>{r.category}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{Number(r.min_rating).toFixed(1)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>${Number(r.max_price).toLocaleString()}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.required ? '✓' : ''}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>
                <button className="btn btn-outline btn-sm" onClick={() => edit(r)} style={{ marginRight: 6 }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default VendorSelectionRulesEditor;
