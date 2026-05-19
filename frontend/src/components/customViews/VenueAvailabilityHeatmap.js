import React, { useEffect, useState } from 'react';
import API from '../../services/api';

const COLOR = { 0: '#d97a7a', 1: '#e9c46a', 2: '#7cb87c' }; // booked/limited/available
const LABEL = { 0: 'Booked', 1: 'Limited', 2: 'Available' };

// VIZ #2 - per-venue 7 day x 4 slot availability heatmap.
function VenueAvailabilityHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    API.get('/custom-views/venue-availability-heatmap')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div className="login-error" data-testid="vah-error">Error: {err}</div>;
  if (!data) return <div data-testid="vah-loading">Loading venue availability...</div>;

  return (
    <div data-testid="viz-venue-heatmap" style={{ padding: '12px 4px' }}>
      <h3 style={{ marginBottom: 8 }}>Venue Availability Heatmap</h3>
      <div style={{ display: 'flex', gap: 12, fontSize: '.78rem', marginBottom: 12 }}>
        {[2, 1, 0].map(k => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: COLOR[k], display: 'inline-block', borderRadius: 2 }} />
            {LABEL[k]}
          </span>
        ))}
      </div>
      {data.venues.length === 0 && <div>No venues yet — add some in Venue Search.</div>}
      {data.venues.map(venue => (
        <div key={venue.id} style={{ marginBottom: 22 }} data-testid={`vah-venue-${venue.id}`}>
          <div style={{ marginBottom: 6 }}>
            <strong>{venue.name}</strong>
            <span style={{ marginLeft: 8, color: '#666', fontSize: '.85rem' }}>
              cap {venue.capacity || '?'} &middot; rating {venue.rating || '?'} &middot;
              avail {venue.summary.available} / {venue.summary.total}
            </span>
          </div>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: 4, fontSize: '.75rem' }} />
                {data.days.map(d => (
                  <th key={d} style={{ padding: 4, fontSize: '.75rem' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slots.map(slot => (
                <tr key={slot}>
                  <td style={{ padding: 4, fontSize: '.75rem', textAlign: 'right' }}>{slot}</td>
                  {data.days.map(day => {
                    const cell = venue.grid.find(c => c.day === day && c.slot === slot);
                    return (
                      <td key={day + slot} title={`${day} ${slot}: ${LABEL[cell.status]}`} style={{ padding: 2 }}>
                        <div style={{
                          width: 28, height: 22,
                          background: COLOR[cell.status],
                          borderRadius: 3,
                        }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default VenueAvailabilityHeatmap;
