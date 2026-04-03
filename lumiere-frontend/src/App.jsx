import React, { useEffect } from "react";
import { ConfigProvider, App as AntApp } from "antd";
import barba from "@barba/core";
import gsap from "gsap";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./components/Landingpage.jsx";
import Login from "./components/login/login.jsx";
import Register from "./components/login/Register.jsx";
import ResetPassword from "./components/login/ResetPassword.jsx";
import { COLORS } from "./utils/colors";

function App() {
  useEffect(() => {
    barba.init({
      sync: true,
      transitions: [
        {
          name: "opacity-transition",
          leave(data) {
            return gsap.to(data.current.container, {
              opacity: 0,
              duration: 0.5,
              ease: "power2.inOut",
            });
          },
          enter(data) {
            return gsap.from(data.next.container, {
              opacity: 0,
              duration: 0.8,
              ease: "power3.out",
              delay: 0.2,
            });
          },
        },
      ],
    });

    gsap.from("body", {
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
    });

    return () => {
      if (barba?.destroy) {
        barba.destroy();
      }
    };
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: COLORS?.action || "#1677ff",
        },
      }}
    >
      <div
        data-barba="wrapper"
        style={{
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          background: COLORS?.background || "#ffffff",
          color: COLORS?.text || "#000000",
        }}
      >
        <div
          data-barba="container"
          style={{
            margin: 0,
            padding: 0,
            height: "100%",
            width: "100%",
          }}
        >
          <AntApp>
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </AntApp>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;