import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import gsap from "gsap";
import barba from "@barba/core";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import LandingPage from "./components/Landingpage";
import Login from "./components/login/login.jsx";
import Register from "./components/login/Register.jsx";
import ResetPassword from "./components/login/ResetPassword.jsx";
import Dashboard from "./components/userDashboard/Dashboard/Dashboard.jsx";
import RoomScene from "./components/threeD/scene/RoomScene";
import RoomCanvas from "./components/2d/RoomCanvas.jsx";
import ModelPreviewStudio from "./components/admin/ModelPreviewStudio";
import ProjectViewerPage from "./components/viewer/ProjectViewerPage";
import { COLORS } from "./utils/colors";
import { clearAuthSession, getAccessToken, getStoredUser } from "./utils/authStorage.js";
import {
  convert2DPlanTo3DScene,
  convert3DSceneTo2DPlan,
  getLatestLiveEditorSnapshot,
} from "./utils/editorSceneBridge";
import { ToastProvider } from "./ui/ToastNotification";
import useModelPrefetch from "./hooks/useModelPrefetch";
import { fetchModelManifest } from "./hooks/useModelPrefetch";

function RequireAuth({ children }) {
  return getAccessToken() ? children : <Navigate to="/login" replace />;
}

function RedirectAuthenticated({ children }) {
  return getAccessToken() ? <Navigate to="/user/dashboard" replace /> : children;
}

function EditorRoute({ children }) {
  return <>{children}</>;
}

function LiveRoomCanvasRoute() {
  const initialPlan = useMemo(() => {
    const latest = getLatestLiveEditorSnapshot();
    if (!latest) return null;
    return latest.type === "2d" ? latest.data : convert3DSceneTo2DPlan(latest.data);
  }, []);
  return <RoomCanvas initialPlan={initialPlan} />;
}

function LiveRoomSceneRoute() {
  const initialLiveScene = useMemo(() => {
    const latest = getLatestLiveEditorSnapshot();
    return latest?.type === "3d" ? latest.data : null;
  }, []);
  const [initialScene, setInitialScene] = useState(initialLiveScene);

  useEffect(() => {
    if (initialLiveScene) return undefined;
    let cancelled = false;

    const load = async () => {
      const latest = getLatestLiveEditorSnapshot();
      if (!latest) {
        if (!cancelled) setInitialScene(null);
        return;
      }

      if (latest.type === "3d") {
        if (!cancelled) setInitialScene(latest.data);
        return;
      }

      let manifest = [];
      try {
        manifest = await fetchModelManifest();
      } catch {
        manifest = [];
      }

      if (!cancelled) {
        setInitialScene(convert2DPlanTo3DScene(latest.data, { manifest }));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [initialLiveScene]);

  return <RoomScene initialScene={initialScene} />;
}

function RouteShell() {
  const location = useLocation();
  const isFullscreenRoute = ["/user/room", "/user/room-2d", "/canvas"].includes(location.pathname);
  const routeNamespace =
    location.pathname === "/"
      ? "landing"
      : location.pathname === "/login"
        ? "login"
        : location.pathname === "/register"
          ? "register"
          : location.pathname === "/user/dashboard"
            ? "dashboard"
            : location.pathname.startsWith("/user/room")
              ? "editor"
              : "app";
  const storedUser = getStoredUser();
  const shellRef = useRef(null);
  const veilRef = useRef(null);
  const previousPathRef = useRef(location.pathname);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/login";
  };

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const veil = veilRef.current;
    if (!shell || !veil) return undefined;

    const from = previousPathRef.current;
    const to = location.pathname;
    const isEditorViewSwitch =
      from.startsWith("/user/room") &&
      to.startsWith("/user/room") &&
      from !== to;

    if (isEditorViewSwitch) {
      gsap.set(shell, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
      gsap.set(veil, { autoAlpha: 0, scaleY: 0 });
      previousPathRef.current = to;
      return undefined;
    }

    const data = {
      current: { namespace: from },
      next: { namespace: to },
      trigger: "react-router",
    };

    const waitForTimeline = (timeline) =>
      new Promise((resolve) => {
        timeline.eventCallback("onComplete", resolve);
      });

    const run = async () => {
      await barba.hooks.do("before", data);
      await barba.hooks.do("beforeEnter", data);

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.set(veil, { autoAlpha: 1, scaleY: 0, transformOrigin: "top center" })
        .fromTo(
          shell,
          { autoAlpha: 0, y: 28, filter: "blur(18px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.7 },
          0.14
        )
        .to(
          veil,
          {
            scaleY: 1,
            duration: 0.22,
            ease: "power2.inOut",
          },
          0
        )
        .to(
          veil,
          {
            scaleY: 0,
            transformOrigin: "bottom center",
            duration: 0.42,
            ease: "expo.out",
          },
          0.22
        )
        .set(veil, { autoAlpha: 0 });

      await waitForTimeline(tl);
      await barba.hooks.do("enter", data);
      await barba.hooks.do("afterEnter", data);
      await barba.hooks.do("after", data);
      previousPathRef.current = to;
    };

    run();
    return () => {
      gsap.killTweensOf([shell, veil]);
    };
  }, [location.pathname]);

  return (
    <>
      <div
        ref={veilRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: "none",
          opacity: 0,
          transform: "scaleY(0)",
          background:
            "linear-gradient(180deg, rgba(196,154,108,0.14) 0%, rgba(139,107,77,0.22) 45%, rgba(44,36,32,0.02) 100%)",
          backdropFilter: "blur(12px)",
        }}
      />
      <div
        ref={shellRef}
        data-barba="container"
        data-barba-namespace={routeNamespace}
        data-route-shell
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
          <Route
            path="/login"
            element={
              <RedirectAuthenticated>
                <Login />
              </RedirectAuthenticated>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectAuthenticated>
                <Register />
              </RedirectAuthenticated>
            }
          />
          <Route
            path="/reset-password"
            element={
              <RedirectAuthenticated>
                <ResetPassword />
              </RedirectAuthenticated>
            }
          />
          <Route
            path="/user/dashboard"
            element={
              <RequireAuth>
                <Dashboard user={storedUser} onLogout={handleLogout} />
              </RequireAuth>
            }
          />
          <Route
            path="/user/room"
            element={
              <RequireAuth>
                <EditorRoute mode="3d">
                  <LiveRoomSceneRoute />
                </EditorRoute>
              </RequireAuth>
            }
          />
          <Route
            path="/user/room-2d"
            element={
              <RequireAuth>
                <EditorRoute mode="2d">
                  <LiveRoomCanvasRoute />
                </EditorRoute>
              </RequireAuth>
            }
          />
          <Route path="/canvas" element={<Navigate to="/user/room-2d" replace />} />
          <Route path="/view/:projectId" element={<ProjectViewerPage />} />
          <Route path="/admin/model-previews" element={<ModelPreviewStudio />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  useModelPrefetch({ autostart: true, delay: 1200 });

  useEffect(() => {
    gsap.fromTo("body", { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power3.out" });
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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <RouteShell />
          </BrowserRouter>
        </ToastProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
