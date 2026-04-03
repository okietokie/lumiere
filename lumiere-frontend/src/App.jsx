import { useEffect } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import gsap from "gsap";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import LandingPage from "./components/Landingpage";
import Login from "./components/login/login.jsx";
import Register from "./components/login/Register.jsx";
import ResetPassword from "./components/login/ResetPassword.jsx";
import RoomScene from "./components/threeD/scene/RoomScene";
import ModelPreviewStudio from "./components/admin/ModelPreviewStudio";
import ProjectViewerPage from "./components/viewer/ProjectViewerPage";
import { COLORS } from "./utils/colors";
import { ToastProvider } from "./ui/ToastNotification";
import useModelPrefetch from "./hooks/useModelPrefetch";

function RouteShell() {
  const location = useLocation();
  const isFullscreenRoute = location.pathname === "/user/room";

  return (
    <div
      style={{
        minHeight: "100vh",
        height: isFullscreenRoute ? "100vh" : "auto",
        width: "100vw",
        overflowX: "hidden",
        overflowY: isFullscreenRoute ? "hidden" : "auto",
        background: COLORS.background,
        color: COLORS.text,
      }}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/user/room" element={<RoomScene />} />
        <Route path="/view/:projectId" element={<ProjectViewerPage />} />
        <Route path="/admin/model-previews" element={<ModelPreviewStudio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  useModelPrefetch({ autostart: true, delay: 1200 });

  useEffect(() => {
    gsap.fromTo(
      "body",
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: "power3.out" }
    );
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: COLORS.action,
          colorBgBase: COLORS.background,
          colorBgContainer: COLORS.surface,
          colorBorder: `${COLORS.action}33`,
          colorText: COLORS.text,
          colorTextPlaceholder: "rgba(242, 229, 213, 0.55)",
          colorIcon: COLORS.text,
          borderRadius: 16,
          wireframe: false,
        },
        components: {
          Layout: {
            bodyBg: COLORS.background,
            headerBg: COLORS.background,
          },
          Card: {
            colorBgContainer: COLORS.surface,
          },
          Input: {
            colorBgContainer: "#312A26",
            colorBorder: `${COLORS.action}40`,
            colorText: COLORS.text,
            colorTextPlaceholder: "rgba(242, 229, 213, 0.55)",
            activeBorderColor: COLORS.action,
            hoverBorderColor: COLORS.action,
            activeShadow: "0 0 0 2px rgba(196, 154, 108, 0.18)",
          },
          Button: {
            primaryColor: "#F8F3ED",
            defaultColor: COLORS.text,
            defaultBorderColor: `${COLORS.action}40`,
          },
          Form: {
            labelColor: COLORS.text,
          },
          Divider: {
            colorSplit: "rgba(242, 229, 213, 0.16)",
          },
          Modal: {
            contentBg: COLORS.surface,
            headerBg: COLORS.surface,
            titleColor: COLORS.text,
            colorText: COLORS.text,
          },
          Checkbox: {
            colorText: COLORS.text,
          },
        },
      }}
    >
      <AntApp>
        <ToastProvider>
          <BrowserRouter>
            <RouteShell />
          </BrowserRouter>
        </ToastProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
