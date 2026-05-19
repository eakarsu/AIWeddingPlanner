import React, { useState } from 'react';
import VendorBudgetBreakdown from '../components/customViews/VendorBudgetBreakdown';
import VenueAvailabilityHeatmap from '../components/customViews/VenueAvailabilityHeatmap';
import DayOfTimelinePDF from '../components/customViews/DayOfTimelinePDF';
import VendorSelectionRulesEditor from '../components/customViews/VendorSelectionRulesEditor';

const VIEWS = [
  { key: 'vbb',   label: 'Vendor + Budget',     icon: '💰', kind: 'VIZ',     Comp: VendorBudgetBreakdown },
  { key: 'vah',   label: 'Venue Heatmap',       icon: '🏛️', kind: 'VIZ',     Comp: VenueAvailabilityHeatmap },
  { key: 'pdf',   label: 'Day-Of Timeline PDF', icon: '📄', kind: 'NON-VIZ', Comp: DayOfTimelinePDF },
  { key: 'rules', label: 'Vendor Rules Editor', icon: '⚙️', kind: 'NON-VIZ', Comp: VendorSelectionRulesEditor },
];

function CustomViewsPage() {
  const [active, setActive] = useState('vbb');
  const Active = VIEWS.find(v => v.key === active);
  const ActiveComp = Active?.Comp;

  return (
    <div data-testid="custom-views-page">
      <div className="dashboard-header">
        <h1>💍 Wedding Views</h1>
        <p>Four additional planning views: budget visualization, venue heatmap, day-of PDF, and rules editor.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }} data-testid="custom-views-tabs">
        {VIEWS.map(v => (
          <button
            key={v.key}
            className={`btn ${active === v.key ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActive(v.key)}
            data-testid={`tab-${v.key}`}
          >
            <span style={{ marginRight: 6 }}>{v.icon}</span>{v.label}
            <span style={{
              marginLeft: 6, fontSize: '.65rem', opacity: .7,
              background: v.kind === 'VIZ' ? '#d4a574' : '#8b5e83',
              color: 'white', padding: '1px 6px', borderRadius: 8,
            }}>{v.kind}</span>
          </button>
        ))}
      </div>

      <div style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        {ActiveComp && <ActiveComp />}
      </div>
    </div>
  );
}

export default CustomViewsPage;
