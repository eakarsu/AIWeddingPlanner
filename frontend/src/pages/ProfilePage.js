import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const weddingStyles = [
  'Classic Elegant', 'Modern Minimal', 'Rustic Charm', 'Bohemian',
  'Tropical Beach', 'Garden Romance', 'Vintage Glam', 'Industrial Chic'
];

const emptyProfile = {
  partner1_name: '',
  partner2_name: '',
  wedding_date: '',
  venue_name: '',
  wedding_style: '',
  color_palette: '',
  total_budget: '',
  guest_count_target: '',
  ceremony_time: '',
  reception_time: '',
  website_url: '',
  hashtag: '',
  notes: '',
};

function ProfilePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/profile');
        if (res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
          const merged = { ...emptyProfile };
          Object.keys(merged).forEach(key => {
            if (res.data[key] !== null && res.data[key] !== undefined) {
              let val = res.data[key];
              if (key === 'wedding_date' && val) val = val.split('T')[0];
              merged[key] = val;
            }
          });
          setFormData(merged);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (successMsg) setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put('/profile', formData);
      setSuccessMsg('Profile saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving profile');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="feature-page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
          <h1>💍 Wedding Profile</h1>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: '#E8F5E9',
          color: 'var(--success)',
          padding: '14px 20px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 24,
          fontWeight: 600,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: 32,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
        }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Partner 1 Name</label>
            <input
              type="text"
              value={formData.partner1_name}
              onChange={e => handleChange('partner1_name', e.target.value)}
              placeholder="First partner's name"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Partner 2 Name</label>
            <input
              type="text"
              value={formData.partner2_name}
              onChange={e => handleChange('partner2_name', e.target.value)}
              placeholder="Second partner's name"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Wedding Date</label>
            <input
              type="date"
              value={formData.wedding_date}
              onChange={e => handleChange('wedding_date', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Venue Name</label>
            <input
              type="text"
              value={formData.venue_name}
              onChange={e => handleChange('venue_name', e.target.value)}
              placeholder="Your wedding venue"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Wedding Style</label>
            <select
              value={formData.wedding_style}
              onChange={e => handleChange('wedding_style', e.target.value)}
            >
              <option value="">Select style...</option>
              {weddingStyles.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Color Palette</label>
            <input
              type="text"
              value={formData.color_palette}
              onChange={e => handleChange('color_palette', e.target.value)}
              placeholder="e.g. Blush, Gold, Ivory"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Total Budget ($)</label>
            <input
              type="number"
              value={formData.total_budget}
              onChange={e => handleChange('total_budget', e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Guest Count Target</label>
            <input
              type="number"
              value={formData.guest_count_target}
              onChange={e => handleChange('guest_count_target', e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Ceremony Time</label>
            <input
              type="time"
              value={formData.ceremony_time}
              onChange={e => handleChange('ceremony_time', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Reception Time</label>
            <input
              type="time"
              value={formData.reception_time}
              onChange={e => handleChange('reception_time', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Wedding Website URL</label>
            <input
              type="text"
              value={formData.website_url}
              onChange={e => handleChange('website_url', e.target.value)}
              placeholder="https://yourwedding.com"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Wedding Hashtag</label>
            <input
              type="text"
              value={formData.hashtag}
              onChange={e => handleChange('hashtag', e.target.value)}
              placeholder="#YourWeddingHashtag"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 20 }}>
          <label>Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Any additional notes about your wedding..."
            style={{ minHeight: 120 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfilePage;
