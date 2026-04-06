import React, { useState, useEffect } from 'react';
import Dashboard from './components/userDashboard/Dashboard/Dashboard';
import { authAPI } from './utils/api';
import './styles/globals.css';

const App = () => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.me()
      .then(res => setUser(res.data))
      .catch(() => { /* redirect to login */ window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('lumiere_token');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1A1614',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <span style={{ color: '#A67C52', fontSize: 28 }}>✦</span>
        <p style={{ color: '#8A7568', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
          Loading Lumière Maison…
        </p>
      </div>
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;
