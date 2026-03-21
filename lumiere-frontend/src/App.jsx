import { useEffect } from "react";
import gsap from "gsap";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import LandingPage from "./components/Landingpage";
import RoomScene from "./components/threeD/scene/RoomScene";
import { COLORS } from "./utils/colors";
import { ToastProvider } from "./ui/ToastNotification";

// Wrapper so each route can control its own scroll/overflow
function RouteWrapper() {
  const location = useLocation();
  const isRoom   = location.pathname === '/user/room';

  return (
    <div style={{
      height:   isRoom ? '100vh' : 'auto',
      width:    '100vw',
      overflow: isRoom ? 'hidden' : 'auto',
      background: COLORS.background,
      color:    COLORS.text,
    }}>
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/user/room" element={<RoomScene />}   />
      </Routes>
    </div>
  );
}

function App() {
  useEffect(() => {
    gsap.from('body', { opacity: 0, duration: 0.8, ease: "power3.out" });
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <RouteWrapper />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;