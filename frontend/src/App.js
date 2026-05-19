import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIAssistant from './pages/AIAssistant';
import ProfilePage from './pages/ProfilePage';
import NotesPage from './pages/NotesPage';
import BudgetSummary from './pages/BudgetSummary';
import CustomViewsPage from './pages/CustomViewsPage';
import './App.css';

function WeddingViewsSidebar() {
  const loc = useLocation();
  const active = loc.pathname.startsWith('/custom-views');
  return (
    <aside
      data-testid="wedding-views-sidebar"
      style={{
        position: 'fixed', top: 80, right: 16, zIndex: 50,
        background: 'white', border: '1px solid #e5d6e3', borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,.06)', padding: '10px 14px',
        fontSize: '.9rem',
      }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#8b5e83' }}>Sidebar</div>
      <Link
        to="/custom-views"
        data-testid="sidebar-wedding-views-link"
        style={{
          display: 'block', padding: '6px 10px', borderRadius: 4,
          background: active ? '#8b5e83' : 'transparent',
          color: active ? 'white' : '#8b5e83', textDecoration: 'none',
          fontWeight: 600,
        }}>
        💍 Wedding Views
      </Link>
    </aside>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) setUser(JSON.parse(savedUser));
  }, [token]);

  const handleLogin = (userData, tokenData) => {
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand" onClick={() => window.location.href = '/'}>
            <span className="nav-icon">💍</span>
            <span className="nav-title">AI Wedding Planner</span>
          </div>
          <div className="nav-right">
            <span className="nav-user">Welcome, {user?.name}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/budget-summary" element={<BudgetSummary />} />
            <Route path="/:feature" element={<FeaturePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
