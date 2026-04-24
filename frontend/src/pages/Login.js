import React, { useState } from 'react';
import API from '../services/api';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { name, email, password } : { email, password };
      const { data } = await API.post(endpoint, payload);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
    setLoading(false);
  };

  const fillDemo = () => {
    setEmail('demo@weddingplanner.com');
    setPassword('demo123456');
    setIsRegister(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <span className="login-icon">💍</span>
          <h1>AI Wedding Planner</h1>
          <p>Plan your perfect wedding with AI assistance</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" required />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>

          <div className="login-divider">or</div>

          <button type="button" className="btn btn-demo btn-full" onClick={fillDemo}>
            ✨ Quick Demo Login (Click then Sign In)
          </button>

          <div className="login-divider">
            <button type="button" className="btn btn-outline btn-full btn-sm" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
