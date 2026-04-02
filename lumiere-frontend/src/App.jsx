import React from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import your components
import LandingPage from './components/Landingpage.jsx';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
// 1. Import the new ResetPassword component
import ResetPassword from './components/ResetPassword.jsx';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp> 
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* 2. Add the route for Reset Password */}
            {/* This matches the link in your email: /reset-password?token=... */}
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;