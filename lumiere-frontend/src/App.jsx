import React from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/Landingpage.jsx';
import RoomCanvas from './components/2d/RoomCanvas.jsx';

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/canvas" element={<RoomCanvas />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;