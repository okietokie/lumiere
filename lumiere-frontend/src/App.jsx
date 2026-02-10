import React from 'react';
import { ConfigProvider } from 'antd';
import LandingPage from './components/Landingpage.jsx';

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
      <LandingPage />
    </ConfigProvider>
  );
}

export default App;