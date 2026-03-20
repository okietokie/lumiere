// App.jsx
import { useEffect } from "react";
import barba from "@barba/core";
import gsap from "gsap";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./components/Landingpage";
import RoomScene from "./components/threeD/scene/RoomScene";
import { COLORS } from "./utils/colors";

function App() {
  useEffect(() => {
    // Initialize Barba
    barba.init({
      sync: true,
      transitions: [{
        name: 'opacity-transition',
        leave(data) {
          return gsap.to(data.current.container, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut"
          });
        },
        enter(data) {
          return gsap.from(data.next.container, {
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            delay: 0.2
          });
        }
      }]
    });

    gsap.from('body', { opacity: 0, duration: 0.8, ease: "power3.out" });
  }, []);

  return (
    <div data-barba="wrapper" style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <div data-barba="container" style={{ 
        margin: 0, 
        padding: 0, 
        background: COLORS.background,
        color: COLORS.text,
        height: "100%",
        width: "100%"
      }}>
        <BrowserRouter>
          <Routes>
            {/* Set RoomScene as the Home Page */}

            <Route path="/" element={<LandingPage />} />
            <Route path="/user/room" element={<RoomScene />} />
            
            {/* Set WallEditor as the secondary page */}
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
}

export default App;