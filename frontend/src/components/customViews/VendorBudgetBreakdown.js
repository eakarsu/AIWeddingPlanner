import React, { useEffect, useState } from 'react';
import API from '../../services/api';

// VIZ #1 - horizontal bar chart of vendor count + budget by category.
function VendorBudgetBreakdown() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    API.get('/custom-views/vendor-budget-breakdown')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div className="login-error" data-testid="vbb-error">Error: {err}</div>;
  if (!data) return <div data-testid="vbb-loading">Loading vendor + budget breakdown...</div>;

  const max = Math.max(1, ...data.breakdown.map(r => r.estimated_total + r.actual_total));
  const fmt = n => '$' + Number(n || 0).toLocaleString();

  return (
    <div data-testid="viz-vendor-budget" style={{ padding: '12px 4px' }}>
      <h3 style={{ marginBottom: 8 }}>Vendor + Budget Breakdown by Category</h3>
      <div style={{ fontSize: '.85rem', marginBottom: 14, color: '#666' }}>
        Vendors: {data.totals.vendors} &middot; Budget items: {data.totals.budget_items} &middot;
        Estimated: {fmt(data.totals.estimated)} &middot; Actual: {fmt(data.totals.actual)}
      </div>
      {data.breakdown.length === 0 && <div>No vendor or budget data yet.</div>}
      {data.breakdown.map(row => {
        const w = ((row.estimated_total + row.actual_total) / max) * 100;
        return (
          <div key={row.category} style={{ marginBottom: 10 }} data-testid={`vbb-row-${row.category}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.9rem' }}>
              <strong>{row.category}</strong>
              <span>{row.vendor_count} vendor(s) &middot; {fmt(row.estimated_total)} est / {fmt(row.actual_total)} act</span>
            </div>
            <div style={{ height: 18, background: '#f1e6ef', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${w}%`, height: '100%',
                background: 'linear-gradient(90deg,#8b5e83,#d4a574)',
                transition: 'width .4s',
              }} />
            </div>
            <div style={{ fontSize: '.75rem', color: '#888' }}>
              Avg rating: {Number(row.avg_rating || 0).toFixed(1)} / 5
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VendorBudgetBreakdown;
