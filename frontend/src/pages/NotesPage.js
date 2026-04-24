import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const categories = [
  'Venue', 'Design', 'Catering', 'Photography', 'Music',
  'Travel', 'Logistics', 'Planning', 'Budget', 'Personal', 'Other'
];

const categoryColors = {
  Venue: '#8B5E83',
  Design: '#C9849B',
  Catering: '#D4A574',
  Photography: '#5B9A6F',
  Music: '#6B3FA0',
  Travel: '#D4A04A',
  Logistics: '#C75B5B',
  Planning: '#B48EAD',
  Budget: '#5B9A6F',
  Personal: '#9B9B9B',
  Other: '#6B6B6B',
};

const emptyNote = {
  title: '',
  content: '',
  category: '',
  pinned: false,
};

function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [formData, setFormData] = useState(emptyNote);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/notes');
      setNotes(res.data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const filteredNotes = notes.filter(note => {
    if (filterCategory && note.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (note.title && note.title.toLowerCase().includes(q)) ||
        (note.content && note.content.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort: pinned first, then by created date descending
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const truncate = (text, len = 120) => {
    if (!text) return '';
    return text.length > len ? text.substring(0, len) + '...' : text;
  };

  const openAddForm = () => {
    setEditNote(null);
    setFormData({ ...emptyNote });
    setShowForm(true);
  };

  const openEditForm = (note) => {
    setEditNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      category: note.category || '',
      pinned: !!note.pinned,
    });
    setSelectedNote(null);
    setShowForm(true);
  };

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    try {
      if (editNote) {
        await API.put(`/notes/${editNote.id}`, formData);
      } else {
        await API.post('/notes', formData);
      }
      setShowForm(false);
      fetchNotes();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving note');
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Delete "${note.title}"?`)) return;
    try {
      await API.delete(`/notes/${note.id}`);
      setSelectedNote(null);
      fetchNotes();
    } catch (err) {
      alert('Error deleting note');
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await API.put(`/notes/${note.id}`, { ...note, pinned: !note.pinned });
      if (selectedNote && selectedNote.id === note.id) {
        setSelectedNote({ ...note, pinned: !note.pinned });
      }
      fetchNotes();
    } catch (err) {
      alert('Error updating note');
    }
  };

  return (
    <div>
      <div className="feature-page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
          <h1>📝 Notes & Journal</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddForm}>+ Add New</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '10px 14px' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ padding: '10px 14px' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading notes...</p></div>
      ) : sortedNotes.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📝</span>
          <h3>{searchQuery || filterCategory ? 'No matching notes' : 'No notes yet'}</h3>
          <p>{searchQuery || filterCategory ? 'Try adjusting your filters' : 'Click "Add New" to start journaling'}</p>
        </div>
      ) : (
        <div style={{
          columns: '3 280px',
          columnGap: 20,
        }}>
          {sortedNotes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              style={{
                background: 'white',
                borderRadius: 'var(--radius)',
                padding: 20,
                marginBottom: 20,
                breakInside: 'avoid',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: 'var(--shadow)',
                border: note.pinned ? '2px solid var(--primary-light)' : '1px solid var(--border)',
                position: 'relative',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }}
            >
              {note.pinned && (
                <span style={{
                  position: 'absolute',
                  top: 10,
                  right: 12,
                  fontSize: '0.9rem',
                }}>📌</span>
              )}
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.05rem',
                fontWeight: 600,
                marginBottom: 8,
                color: 'var(--text)',
                paddingRight: note.pinned ? 24 : 0,
              }}>
                {note.title}
              </div>
              {note.category && (
                <span style={{
                  display: 'inline-block',
                  background: categoryColors[note.category] || 'var(--text-muted)',
                  color: 'white',
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  marginBottom: 10,
                }}>
                  {note.category}
                </span>
              )}
              <div style={{
                color: 'var(--text-light)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                marginBottom: 10,
                whiteSpace: 'pre-wrap',
              }}>
                {truncate(note.content)}
              </div>
              <div style={{
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
              }}>
                {note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedNote.pinned ? '📌 ' : ''}{selectedNote.title}</h2>
              <button className="modal-close" onClick={() => setSelectedNote(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedNote.category && (
                  <span style={{
                    display: 'inline-block',
                    background: categoryColors[selectedNote.category] || 'var(--text-muted)',
                    color: 'white',
                    padding: '3px 12px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}>
                    {selectedNote.category}
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {selectedNote.created_at ? new Date(selectedNote.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              <div style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}>
                {selectedNote.content}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleTogglePin(selectedNote)}
              >
                {selectedNote.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => openEditForm(selectedNote)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedNote)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay form-modal" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editNote ? 'Edit Note' : 'New Note'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleFormChange('title', e.target.value)}
                  placeholder="Note title"
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={formData.content}
                  onChange={e => handleFormChange('content', e.target.value)}
                  placeholder="Write your note..."
                  style={{ minHeight: 180 }}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={e => handleFormChange('category', e.target.value)}
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={!!formData.pinned}
                    onChange={e => handleFormChange('pinned', e.target.checked)}
                  />
                  <label>Pin this note</label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editNote ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotesPage;
