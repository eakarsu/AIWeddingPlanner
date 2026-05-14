import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import API from '../services/api';

const aiFeatures = [
  { key: 'vendor-match', icon: '🤝', name: 'Vendor Matching', endpoint: '/ai/vendor-match' },
  { key: 'budget-optimize', icon: '💰', name: 'Budget Optimizer', endpoint: '/ai/budget-optimize' },
  { key: 'timeline-suggest', icon: '📅', name: 'Timeline Planner', endpoint: '/ai/timeline-suggest' },
  { key: 'seating-suggest', icon: '🪑', name: 'Seating Planner', endpoint: '/ai/seating-suggest' },
  { key: 'menu-suggest', icon: '🍽️', name: 'Menu Designer', endpoint: '/ai/menu-suggest' },
  { key: 'invitation-wording', icon: '💌', name: 'Invitation Writer', endpoint: '/ai/invitation-wording' },
  { key: 'floral-suggest', icon: '💐', name: 'Floral Designer', endpoint: '/ai/floral-suggest' },
  { key: 'music-suggest', icon: '🎵', name: 'Music Curator', endpoint: '/ai/music-suggest' },
  { key: 'general-advice', icon: '🤖', name: 'General Advice', endpoint: '/ai/general-advice' },
  { key: 'budget-risk', icon: '⚠️', name: 'Budget Risk', endpoint: '/ai/budget-risk' },
  { key: 'vendor-performance-prediction', icon: '🔍', name: 'Vendor Performance', endpoint: '/ai/vendor-performance-prediction' },
];

const formFields = {
  'vendor-match': [
    { key: 'budget', label: 'Total Budget ($)', type: 'number', placeholder: '50000' },
    { key: 'style', label: 'Wedding Style', type: 'select', options: ['Classic Elegant', 'Modern Minimal', 'Rustic Charm', 'Bohemian', 'Tropical Beach', 'Garden Romance', 'Vintage Glam', 'Industrial Chic'] },
    { key: 'location', label: 'Location', type: 'text', placeholder: 'Los Angeles, CA' },
    { key: 'guestCount', label: 'Guest Count', type: 'number', placeholder: '150' },
    { key: 'preferences', label: 'Special Preferences', type: 'textarea', placeholder: 'Outdoor ceremony, locally sourced food, live band...' },
  ],
  'budget-optimize': [
    { key: 'totalBudget', label: 'Total Budget ($)', type: 'number', placeholder: '50000' },
    { key: 'priorities', label: 'Top Priorities', type: 'textarea', placeholder: 'Photography, food quality, venue ambiance...' },
  ],
  'timeline-suggest': [
    { key: 'weddingDate', label: 'Wedding Date', type: 'date' },
    { key: 'currentTasks', label: 'What have you started?', type: 'textarea', placeholder: 'Booked venue, hired photographer...' },
    { key: 'completedTasks', label: 'What is completed?', type: 'textarea', placeholder: 'Save the dates sent, dress purchased...' },
  ],
  'seating-suggest': [
    { key: 'tables', label: 'Number of Tables', type: 'number', placeholder: '15' },
    { key: 'relationships', label: 'Key Relationships/Groups', type: 'textarea', placeholder: 'Bride family, groom family, college friends, work colleagues...' },
    { key: 'constraints', label: 'Constraints', type: 'textarea', placeholder: 'Keep Aunt Mary away from Uncle Bob, kids table needed...' },
  ],
  'menu-suggest': [
    { key: 'guestCount', label: 'Guest Count', type: 'number', placeholder: '150' },
    { key: 'dietaryNeeds', label: 'Dietary Requirements', type: 'text', placeholder: 'Vegetarian, vegan, gluten-free guests' },
    { key: 'style', label: 'Cuisine Style', type: 'select', options: ['American Fine Dining', 'Italian', 'French', 'Mediterranean', 'Asian Fusion', 'Farm-to-Table', 'BBQ', 'International Buffet'] },
    { key: 'budget', label: 'Food Budget ($)', type: 'number', placeholder: '12000' },
    { key: 'season', label: 'Season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter'] },
  ],
  'invitation-wording': [
    { key: 'names', label: 'Couple Names', type: 'text', placeholder: 'Sarah & James' },
    { key: 'date', label: 'Wedding Date', type: 'text', placeholder: 'September 1, 2026' },
    { key: 'venue', label: 'Venue Name', type: 'text', placeholder: 'Enchanted Garden Estate' },
    { key: 'style', label: 'Invitation Style', type: 'select', options: ['Formal Traditional', 'Semi-Formal', 'Casual Fun', 'Romantic', 'Modern', 'Destination', 'Religious'] },
    { key: 'tone', label: 'Tone', type: 'select', options: ['Elegant', 'Playful', 'Heartfelt', 'Classic', 'Whimsical'] },
  ],
  'floral-suggest': [
    { key: 'season', label: 'Season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter'] },
    { key: 'colors', label: 'Color Palette', type: 'text', placeholder: 'Blush pink, ivory, sage green' },
    { key: 'style', label: 'Style', type: 'select', options: ['Romantic Garden', 'Modern Minimal', 'Wildflower', 'Tropical', 'Classic Elegant', 'Bohemian', 'Rustic'] },
    { key: 'budget', label: 'Floral Budget ($)', type: 'number', placeholder: '5000' },
    { key: 'venue', label: 'Venue Type', type: 'text', placeholder: 'Outdoor garden' },
  ],
  'music-suggest': [
    { key: 'style', label: 'Music Style', type: 'select', options: ['Classic & Elegant', 'Party & Dance', 'Indie & Alternative', 'Jazz & Blues', 'Country', 'Latin', 'Multi-Cultural', 'R&B & Soul'] },
    { key: 'guestDemographics', label: 'Guest Age Range', type: 'text', placeholder: '25-65, mostly 30s-40s' },
    { key: 'vibe', label: 'Reception Vibe', type: 'select', options: ['High Energy Dance Party', 'Elegant & Refined', 'Relaxed & Casual', 'Romantic', 'Fun & Quirky'] },
    { key: 'budget', label: 'Entertainment Budget ($)', type: 'number', placeholder: '5000' },
  ],
  'general-advice': [
    { key: 'question', label: 'Ask anything about wedding planning', type: 'textarea', placeholder: 'What are the most important things to book first? How do I handle family drama with seating? What are creative ways to stay within budget?' },
  ],
  'budget-risk': [
    { key: 'notes', label: 'Optional context (the analysis pulls your real budget data)', type: 'textarea', placeholder: 'Anything we should know? e.g. expecting more guests, choosing pricier venue...' },
  ],
  'vendor-performance-prediction': [
    { key: 'vendor_id', label: 'Vendor ID (leave blank to predict for all your vendors)', type: 'number', placeholder: '12' },
  ],
};

function AIAssistant() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState('general-advice');
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentFeature = aiFeatures.find(f => f.key === activeFeature);
  const currentFields = formFields[activeFeature] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await API.post(currentFeature.endpoint, formData);
      setResult(res.data.result);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message || 'Failed to get AI response.';
      setError(status === 503 ? `AI service unavailable — set OPENROUTER_API_KEY on the backend. (${msg})` : msg);
    }
    setLoading(false);
  };

  const handleFeatureChange = (key) => {
    setActiveFeature(key);
    setFormData({});
    setResult('');
    setError('');
  };

  return (
    <div className="ai-page">
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="ai-header">
        <h1>🤖 AI Wedding Assistant</h1>
        <p>Get AI-powered recommendations and advice for every aspect of your wedding</p>
      </div>

      <div className="ai-cards">
        {aiFeatures.map(f => (
          <div
            key={f.key}
            className={`ai-feature-card ${activeFeature === f.key ? 'active' : ''}`}
            onClick={() => handleFeatureChange(f.key)}
          >
            <span className="ai-feature-icon">{f.icon}</span>
            <div className="ai-feature-name">{f.name}</div>
          </div>
        ))}
      </div>

      <form className="ai-form" onSubmit={handleSubmit}>
        <h3>{currentFeature.icon} {currentFeature.name}</h3>
        {currentFields.map(f => (
          <div key={f.key} className="form-group">
            <label>{f.label}</label>
            {f.type === 'select' ? (
              <select value={formData[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}>
                <option value="">Select...</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                value={formData[f.key] || ''}
                onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
              />
            ) : (
              <input
                type={f.type}
                value={formData[f.key] || ''}
                onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
        <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
          {loading ? '🔮 AI is thinking...' : `✨ Get ${currentFeature.name} Suggestions`}
        </button>
      </form>

      {loading && (
        <div className="ai-loading">
          <div className="spinner"></div>
          <p>Our AI wedding expert is crafting personalized recommendations...</p>
        </div>
      )}

      {error && (
        <div className="ai-output">
          <div className="ai-output-header" style={{ background: 'linear-gradient(135deg, #C75B5B, #D47070)' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <h3>Error</h3>
          </div>
          <div className="ai-output-body">
            <p>{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="ai-output">
          <div className="ai-output-header">
            <span style={{ fontSize: '1.5rem' }}>{currentFeature.icon}</span>
            <h3>AI {currentFeature.name} Results</h3>
          </div>
          <div className="ai-output-body">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
