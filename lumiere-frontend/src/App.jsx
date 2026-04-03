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

    return () => {
      if (barba?.destroy) {
        barba.destroy();
      }
    };
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: undefined,
        token: {
          colorPrimary: COLORS?.action || "#1677ff",
          colorBgBase: COLORS?.background || "#1A1614",
          colorBgContainer: COLORS?.surface || "#26211E",
          colorBorder: `${COLORS?.action || "#A67C52"}33`,
          colorText: COLORS?.text || "#D9C5B2",
          colorTextPlaceholder: "rgba(217, 197, 178, 0.55)",
          colorIcon: COLORS?.text || "#D9C5B2",
          borderRadius: 16,
          wireframe: false,
        },
        components: {
          Layout: {
            bodyBg: COLORS?.background || "#1A1614",
            headerBg: COLORS?.background || "#1A1614",
          },
          Card: {
            colorBgContainer: COLORS?.surface || "#26211E",
          },
          Input: {
            colorBgContainer: "#312A26",
            colorBorder: `${COLORS?.action || "#A67C52"}40`,
            colorText: COLORS?.text || "#D9C5B2",
            colorTextPlaceholder: "rgba(217, 197, 178, 0.55)",
            activeBorderColor: COLORS?.action || "#A67C52",
            hoverBorderColor: COLORS?.action || "#A67C52",
            activeShadow: "0 0 0 2px rgba(166, 124, 82, 0.18)",
          },
          Button: {
            primaryColor: "#F8F3ED",
            defaultColor: COLORS?.text || "#D9C5B2",
            defaultBorderColor: `${COLORS?.action || "#A67C52"}40`,
          },
          Form: {
            labelColor: COLORS?.text || "#D9C5B2",
          },
          Divider: {
            colorSplit: "rgba(217, 197, 178, 0.16)",
          },
          Modal: {
            contentBg: COLORS?.surface || "#26211E",
            headerBg: COLORS?.surface || "#26211E",
            titleColor: COLORS?.text || "#D9C5B2",
            colorText: COLORS?.text || "#D9C5B2",
          },
          Checkbox: {
            colorText: COLORS?.text || "#D9C5B2",
          },
        },
      }}
    >
      <div
        data-barba="wrapper"
        style={{
          minHeight: "100vh",
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
