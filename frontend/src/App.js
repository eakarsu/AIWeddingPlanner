import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIAssistant from './pages/AIAssistant';
import ProfilePage from './pages/ProfilePage';
import NotesPage from './pages/NotesPage';
import BudgetSummary from './pages/BudgetSummary';
import './App.css';

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
