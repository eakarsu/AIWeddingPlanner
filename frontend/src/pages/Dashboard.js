import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const features = [
  { key: 'vendors', icon: '🤝', title: 'Vendor Matching', desc: 'Find and manage perfect vendors for your wedding', badge: 'AI Powered' },
  { key: 'budget', icon: '💰', title: 'Budget Manager', desc: 'Track expenses, payments, and budget allocation', badge: 'Smart Tracking' },
  { key: 'budget-summary', icon: '📊', title: 'Budget Overview', desc: 'Visual breakdown of your wedding budget', badge: 'Summary' },
  { key: 'timeline', icon: '📅', title: 'Timeline & Checklist', desc: 'Stay on track with tasks and deadlines', badge: 'Auto Schedule' },
  { key: 'seating', icon: '🪑', title: 'Seating Arrangement', desc: 'Plan table layouts and seating charts', badge: 'AI Powered' },
  { key: 'guests', icon: '👥', title: 'Guest Management', desc: 'Manage RSVPs, meals, and guest details', badge: 'RSVP Tracker' },
  { key: 'venues', icon: '🏛️', title: 'Venue Search', desc: 'Browse and compare wedding venues', badge: 'Top Picks' },
  { key: 'menu', icon: '🍽️', title: 'Menu Planning', desc: 'Design your reception menu and courses', badge: 'AI Powered' },
  { key: 'invitations', icon: '💌', title: 'Invitations', desc: 'Track invitation sends and responses', badge: 'AI Wording' },
  { key: 'registry', icon: '🎁', title: 'Wedding Registry', desc: 'Manage your gift registry items', badge: 'Wishlist' },
  { key: 'photography', icon: '📸', title: 'Photography', desc: 'Compare photographers and packages', badge: 'Portfolio' },
  { key: 'music', icon: '🎵', title: 'Music & Entertainment', desc: 'Book DJs, bands, and entertainment', badge: 'AI Powered' },
  { key: 'florals', icon: '💐', title: 'Floral Arrangements', desc: 'Design bouquets, centerpieces, and decor', badge: 'AI Powered' },
  { key: 'transportation', icon: '🚗', title: 'Transportation', desc: 'Coordinate wedding day transport', badge: 'Logistics' },
  { key: 'accommodation', icon: '🏨', title: 'Accommodation', desc: 'Manage hotel blocks and guest stays', badge: 'Room Blocks' },
  { key: 'notes', icon: '📝', title: 'Planning Notes', desc: 'Keep a journal of ideas, decisions, and reminders', badge: 'Journal' },
  { key: 'profile', icon: '💍', title: 'Wedding Profile', desc: 'Set your wedding date, names, style, and details', badge: 'Settings' },
  { key: 'ai-assistant', icon: '🤖', title: 'AI Wedding Assistant', desc: 'Get AI-powered advice for any wedding question', badge: 'Ask AI' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/dashboard/stats').then(res => setStats(res.data)).catch(() => {});
  }, []);

  const getDaysUntilWedding = () => {
    if (!stats?.wedding_date) return null;
    const wedding = new Date(stats.wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    wedding.setHours(0, 0, 0, 0);
    const diff = Math.ceil((wedding - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysLeft = getDaysUntilWedding();

  return (
    <div>
      <div className="dashboard-header">
        <h1>Your Wedding Dashboard</h1>
        <p>Everything you need to plan your perfect day</p>
      </div>

      {stats && (
        <div className="stats-section">
          {daysLeft !== null && (
            <div className="countdown-card" onClick={() => navigate('/profile')}>
              <div className="countdown-number">{daysLeft > 0 ? daysLeft : 0}</div>
              <div className="countdown-label">{daysLeft > 0 ? 'Days Until Your Wedding' : daysLeft === 0 ? 'Today is the Day!' : 'Wedding Day Has Passed'}</div>
              {stats.wedding_date && (
                <div className="countdown-date">{new Date(stats.wedding_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              )}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card" onClick={() => navigate('/budget-summary')}>
              <span className="stat-icon">💰</span>
              <div className="stat-value">${Number(stats.budget?.total_actual || 0).toLocaleString()}</div>
              <div className="stat-label">Spent of ${Number(stats.budget?.total_estimated || 0).toLocaleString()}</div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{
                  width: `${Math.min(100, stats.budget?.total_estimated > 0 ? (stats.budget.total_actual / stats.budget.total_estimated * 100) : 0)}%`,
                  background: stats.budget?.total_actual > stats.budget?.total_estimated ? 'var(--danger)' : 'var(--success)'
                }}></div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/guests')}>
              <span className="stat-icon">👥</span>
              <div className="stat-value">{stats.guests?.confirmed || 0} <span className="stat-unit">confirmed</span></div>
              <div className="stat-label">{stats.guests?.pending || 0} pending, {stats.guests?.declined || 0} declined</div>
              <div className="stat-bar">
                <div className="stat-bar-fill stat-bar-success" style={{
                  width: `${stats.guests?.total > 0 ? (stats.guests.confirmed / stats.guests.total * 100) : 0}%`
                }}></div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/timeline')}>
              <span className="stat-icon">📋</span>
              <div className="stat-value">{stats.tasks?.completed || 0}/{stats.tasks?.total || 0} <span className="stat-unit">tasks</span></div>
              <div className="stat-label">{stats.tasks?.overdue > 0 ? `${stats.tasks.overdue} overdue!` : 'All on track'}</div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{
                  width: `${stats.tasks?.total > 0 ? (stats.tasks.completed / stats.tasks.total * 100) : 0}%`,
                  background: stats.tasks?.overdue > 0 ? 'var(--warning)' : 'var(--success)'
                }}></div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/vendors')}>
              <span className="stat-icon">🤝</span>
              <div className="stat-value">{stats.vendors?.total || 0} <span className="stat-unit">vendors</span></div>
              <div className="stat-label">Booked & managed</div>
            </div>

            <div className="stat-card" onClick={() => navigate('/seating')}>
              <span className="stat-icon">🪑</span>
              <div className="stat-value">{stats.tables?.total || 0} <span className="stat-unit">tables</span></div>
              <div className="stat-label">{stats.tables?.total_capacity || 0} total seats</div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {features.map(f => (
          <div key={f.key} className="feature-card" onClick={() => navigate(`/${f.key}`)}>
            <span className="card-icon">{f.icon}</span>
            <div className="card-title">{f.title}</div>
            <div className="card-description">{f.desc}</div>
            <span className="card-badge">{f.badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
