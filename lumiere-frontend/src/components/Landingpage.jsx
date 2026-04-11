import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRightOutlined, PlayCircleOutlined, SettingOutlined } from "@ant-design/icons";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import landingBg from "../assets/landing-page-bg.jpg";
import landingBg2 from "../assets/landin-page-bg-2.jpg";
import ScrollExpandMedia from "./blocks/scroll-expansion-hero";
import { GooeyText } from "./ui/gooey-text-morphing";
import { Waves } from "./ui/wave-background";
import { COLORS } from "../utils/colors";
import "./landing/landing-page.css";

gsap.registerPlugin(ScrollTrigger);

const hexToRgbChannels = (hex) => {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((char) => char + char).join("")
    : value;

  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ].join(", ");
};

const landingThemeStyle = {
  "--lm-bg": COLORS.background,
  "--lm-surface": COLORS.surface,
  "--lm-surface-low": COLORS.background,
  "--lm-surface-mid": COLORS.surface,
  "--lm-surface-high": COLORS.secondary,
  "--lm-surface-highest": COLORS.secondary,
  "--lm-surface-lowest": COLORS.background,
  "--lm-on-surface": COLORS.text,
  "--lm-on-surface-var": COLORS.grid,
  "--lm-primary": COLORS.action,
  "--lm-primary-dim": COLORS.action,
  "--lm-secondary": COLORS.accent,
  "--lm-secondary-container": COLORS.surface,
  "--lm-on-secondary-container": COLORS.text,
  "--lm-outline-var": COLORS.secondary,
  "--lm-action-contrast": COLORS.background,
  "--lm-grid": COLORS.grid,
  "--lm-bg-rgb": hexToRgbChannels(COLORS.background),
  "--lm-surface-rgb": hexToRgbChannels(COLORS.surface),
  "--lm-text-rgb": hexToRgbChannels(COLORS.text),
  "--lm-action-rgb": hexToRgbChannels(COLORS.action),
  "--lm-accent-rgb": hexToRgbChannels(COLORS.accent),
  "--lm-grid-rgb": hexToRgbChannels(COLORS.grid),
};

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Gallery", href: "#gallery" },
  { label: "Workflow", href: "#workflow" },
];

const FEATURES = [
  {
    icon: "drag_pan",
    title: "Real-time Furniture Placement",
    body: "Compose rooms with drag, drop, and rotation controls that feel editorial instead of technical.",
    accent: "primary",
    cta: "Explore Library",
  },
  {
    icon: "light_mode",
    title: "Smart Spatial Visualization",
    body: "Preview natural light, material response, and atmosphere with cleaner cinematic feedback.",
    accent: "secondary",
    cta: "View Tech Specs",
  },
  {
    icon: "group_work",
    title: "Collaborative Planning",
    body: "Share scenes, align decisions, and move from concept to presentation with less friction.",
    accent: "primary",
    cta: "Launch Studio",
  },
];

const WORKFLOW = [
  {
    num: "01",
    title: "Layout",
    accent: "primary",
    body: "Upload a floor plan or sketch your room dimensions from scratch in the editor.",
  },
  {
    num: "02",
    title: "Customize",
    accent: "secondary",
    body: "Style the scene with materials, furniture, and lighting presets tuned for quick iteration.",
  },
  {
    num: "03",
    title: "Visualize",
    accent: "primary",
    body: "Generate polished perspectives that feel presentation-ready instead of prototype-only.",
  },
];

const FOOTER_GROUPS = {
  Product: ["Features", "Pricing", "3D Library"],
  Legal: ["Privacy Policy", "Terms of Service", "Contact"],
  Connect: ["Instagram", "Pinterest", "Dribbble"],
};

const HERO_METRICS = [
  { value: 120, suffix: "+", label: "Material combinations" },
  { value: 24, suffix: "/7", label: "Cloud design access" },
  { value: 3, suffix: "D", label: "Presentation-ready staging" },
];

const MARQUEE_ITEMS = [
  "Interactive previews",
  "Editorial staging",
  "Precision lighting",
  "Fast concept reviews",
  "Cinematic materials",
  "Collaborative iteration",
];

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

import lmIcon from '../assets/lm no-bg.png';

function TopNav({ navigate }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`lm-nav-shell${scrolled ? " is-scrolled" : ""}`}>
      <nav className="lm-nav">
        <button className="lm-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img src={lmIcon} alt="LM Logo" className="lm-wordmark-icon" style={{ height: '1.2em', marginRight: '0.5em', verticalAlign: 'middle', display: 'inline-block' }} />
          Lumiere Maison
        </button>
        <div className="lm-nav-links">
          {NAV_LINKS.map((link) => (
            <a key={link.label} className="lm-nav-link" href={link.href}>
              {link.label}
            </a>
          ))}
          <button className="lm-nav-link" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
        <button className="lm-nav-cta" onClick={() => navigate("/register")}>
          Get Started
        </button>
      </nav>
    </header>
  );
}

function HeroMetric({ metric, reducedMotion }) {
  const valueRef = useRef(null);

  useEffect(() => {
    if (!valueRef.current) return undefined;

    if (reducedMotion) {
      valueRef.current.textContent = metric.value;
      return undefined;
    }

    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value: metric.value,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: valueRef.current,
        start: "top 92%",
        once: true,
      },
      onUpdate: () => {
        if (valueRef.current) {
          valueRef.current.textContent = Math.round(counter.value);
        }
      },
    });

    return () => tween.kill();
  }, [metric.value, reducedMotion]);

  return (
    <article className="lm-metric-card">
      <strong>
        <span ref={valueRef}>0</span>
        {metric.suffix}
      </strong>
      <p>{metric.label}</p>
    </article>
  );
}

import LandingScene from "./landing/LandingScene";

function Hero({ navigate, reducedMotion }) {
  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const auraRef = useRef(null);
  const pillRef = useRef(null);
  const titleRef = useRef(null);
  const copyRef = useRef(null);
  const actionsRef = useRef(null);
  const statsRef = useRef(null);
  const sceneRef = useRef(null);
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return undefined;

    const ctx = gsap.context(() => {
      const titleWords = titleRef.current?.querySelectorAll(".lm-title-word");
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(bgRef.current, { scale: 1.08, opacity: 0, duration: 1.6 }, 0)
        .from(auraRef.current, { opacity: 0, scale: 0.82, duration: 1.2 }, 0.15)
        .from(pillRef.current, { opacity: 0, y: 20, duration: 0.6 }, 0.65)
        .from(titleWords, { opacity: 0, yPercent: 120, stagger: 0.12, duration: 0.8 }, 0.72)
        .from(copyRef.current, { opacity: 0, y: 20, duration: 0.7 }, 0.95)
        .from(actionsRef.current, { opacity: 0, y: 24, duration: 0.7 }, 1.08)
        .from(statsRef.current, { opacity: 0, y: 24, duration: 0.7 }, 1.2)
        .from(sceneRef.current, { opacity: 0, x: 52, duration: 1.4, ease: "power4.out" }, 1.15);

      gsap.to(auraRef.current, {
        backgroundPosition: "100% 50%",
        duration: 14,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const xBg = gsap.quickTo(bgRef.current, "x", { duration: 1.2, ease: "power3" });
    const yBg = gsap.quickTo(bgRef.current, "y", { duration: 1.2, ease: "power3" });

    const onMove = (event) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2;
      const ny = (event.clientY / window.innerHeight - 0.5) * 2;
      
      pointerRef.current.x = nx;
      pointerRef.current.y = ny;

      xBg(nx * 12);
      yBg(ny * 8);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reducedMotion]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current, {
        yPercent: 18,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => setScrollProgress(self.progress)
        },
      });

      gsap.to(".lm-hero-metrics", {
        yPercent: -18,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="lm-hero" id="top">
      <div ref={bgRef} className="lm-hero-bg" style={{ backgroundImage: `url(${landingBg})` }} />
      <div ref={auraRef} className="lm-hero-aura" aria-hidden="true" />
      <div className="lm-hero-scrim" />

      <div className="lm-shell lm-hero-content">
        <div className="lm-hero-inner">
          <div ref={pillRef} className="lm-pill">
            <span className="lm-pill-dot" />
            <span>Now in Early Access</span>
          </div>

          <h1 ref={titleRef} className="lm-hero-title">
            <span className="lm-title-line">
              <span className="lm-title-word">Visualize</span>
              <span className="lm-title-word">Your</span>
              <span className="lm-title-word">Space,</span>
            </span>
            <span className="lm-title-line lm-title-line-accent">
              <span className="lm-title-word">Redefine</span>
              <span className="lm-title-word">Your</span>
              <span className="lm-title-word">World.</span>
            </span>
          </h1>

          <p ref={copyRef} className="lm-hero-copy">
            The smartest web-based 3D interior design platform for modern creators. Build your
            sanctuary with presentation-ready clarity and enough motion to feel alive from the
            first scroll.
          </p>

          <div ref={actionsRef} className="lm-hero-actions">
            <button className="lm-button lm-button-primary" onClick={() => navigate("/register")}>
              Start Designing
            </button>
            <button className="lm-button lm-button-secondary" onClick={() => navigate("/user/room")}>
              <PlayCircleOutlined />
              Watch Demo
            </button>
          </div>

          <div ref={statsRef} className="lm-hero-metrics">
            {HERO_METRICS.map((metric) => (
              <HeroMetric key={metric.label} metric={metric} reducedMotion={reducedMotion} />
            ))}
          </div>
        </div>

        <div ref={sceneRef} className="lm-hero-3d-container">
          <LandingScene pointer={pointerRef.current} progress={scrollProgress} />
        </div>
      </div>
    </section>
  );
}

function MotionStrip({ reducedMotion }) {
  const stripRef = useRef(null);

  useEffect(() => {
    if (reducedMotion || !stripRef.current) return undefined;

    const track = stripRef.current.querySelector(".lm-marquee-track");
    if (!track) return undefined;

    const tween = gsap.to(track, {
      xPercent: -50,
      duration: 22,
      ease: "none",
      repeat: -1,
    });

    return () => tween.kill();
  }, [reducedMotion]);

  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <section ref={stripRef} className="lm-motion-strip" aria-label="Lumiere motion highlights">
      <div className="lm-marquee-track">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="lm-marquee-chip">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function Live2DDrawingPreview() {
  const [tool, setTool] = useState("draw");
  const [points, setPoints] = useState([
    { x: 86, y: 76 },
    { x: 246, y: 76 },
    { x: 246, y: 188 },
    { x: 118, y: 220 },
  ]);
  const [isClosed, setIsClosed] = useState(true);

  const handleCanvasClick = (event) => {
    if (tool !== "draw") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 360;
    const y = ((event.clientY - rect.top) / rect.height) * 260;

    setIsClosed(false);
    setPoints((current) => [...current, { x: Math.round(x), y: Math.round(y) }]);
  };

  const undoPoint = () => {
    setPoints((current) => current.slice(0, -1));
    setIsClosed(false);
  };

  const resetPlan = () => {
    setPoints([
      { x: 86, y: 76 },
      { x: 246, y: 76 },
      { x: 246, y: 188 },
      { x: 118, y: 220 },
    ]);
    setIsClosed(true);
  };

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="lm-live-preview lm-live-2d">
      <div className="lm-live-sidebar">
        <span>Tools</span>
        {[
          ["draw", "Draw"],
          ["select", "Select"],
          ["measure", "Measure"],
        ].map(([key, label]) => (
          <button key={key} className={tool === key ? "is-active" : ""} onClick={() => setTool(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="lm-live-main">
        <div className="lm-live-topbar">
          <span>Room drawing canvas</span>
          <div>
            <button onClick={undoPoint} disabled={points.length <= 1}>Undo</button>
            <button onClick={() => setIsClosed(true)} disabled={points.length < 3}>Close</button>
            <button onClick={resetPlan}>Reset</button>
          </div>
        </div>
        <svg
          className={`lm-drawing-canvas is-${tool}`}
          viewBox="0 0 360 260"
          role="img"
          aria-label="Interactive 2D drawing preview"
          onClick={handleCanvasClick}
        >
          <defs>
            <pattern id="lm-preview-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" />
            </pattern>
          </defs>
          <rect width="360" height="260" fill="url(#lm-preview-grid)" />
          {points.length > 1 && (
            <>
              {isClosed ? (
                <polygon className="lm-drawn-room-fill" points={linePoints} />
              ) : null}
              <polyline className="lm-drawn-room-line" points={linePoints} />
              {isClosed ? <line className="lm-drawn-room-line" x1={points.at(-1).x} y1={points.at(-1).y} x2={points[0].x} y2={points[0].y} /> : null}
            </>
          )}
          {points.map((point, index) => (
            <g key={`${point.x}-${point.y}-${index}`}>
              <circle className="lm-draw-point" cx={point.x} cy={point.y} r="5" />
              {tool === "select" && <text className="lm-point-label" x={point.x + 8} y={point.y - 8}>P{index + 1}</text>}
            </g>
          ))}
          {tool === "measure" && points.length > 1 ? (
            <g className="lm-svg-measure">
              <line x1={points[0].x} y1={points[0].y - 18} x2={points[1].x} y2={points[1].y - 18} />
              <text x={(points[0].x + points[1].x) / 2 - 20} y={points[0].y - 26}>4.2 m</text>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

function ThreePlaneRoom({ wallTone }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 2]} intensity={1.35} color="#EAD8C3" />
      <group rotation={[0, -0.35, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[4.8, 4.8]} />
          <meshStandardMaterial color="#2D241F" roughness={0.82} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.2, -2.4]} receiveShadow>
          <planeGeometry args={[4.8, 2.4]} />
          <meshStandardMaterial color={wallTone} roughness={0.9} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} position={[-2.4, 0.2, 0]} receiveShadow>
          <planeGeometry args={[4.8, 2.4]} />
          <meshStandardMaterial color="#211A17" roughness={0.92} />
        </mesh>
        <mesh position={[-0.45, -0.68, -0.55]} castShadow>
          <boxGeometry args={[1.4, 0.38, 0.68]} />
          <meshStandardMaterial color="#A9784E" roughness={0.55} />
        </mesh>
        <mesh position={[0.7, -0.78, 0.35]} castShadow>
          <cylinderGeometry args={[0.34, 0.42, 0.18, 32]} />
          <meshStandardMaterial color="#6E5038" roughness={0.62} />
        </mesh>
      </group>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={7} target={[0, 0, -0.6]} />
    </>
  );
}

function Live3DRoomPreview() {
  const [wallTone, setWallTone] = useState("#3B2E28");

  return (
    <div className="lm-live-preview lm-live-3d">
      <div className="lm-live-sidebar">
        <span>Scene</span>
        {[
          ["#3B2E28", "Walnut"],
          ["#4A392F", "Coffee"],
          ["#625044", "Clay"],
        ].map(([value, label]) => (
          <button key={value} className={wallTone === value ? "is-active" : ""} onClick={() => setWallTone(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="lm-live-main">
        <div className="lm-live-topbar">
          <span>Three mesh room scene</span>
          <strong>Drag to rotate</strong>
        </div>
        <div className="lm-three-canvas-wrap">
          <Canvas shadows camera={{ position: [3.6, 2.5, 4.6], fov: 42 }}>
            <ThreePlaneRoom wallTone={wallTone} />
          </Canvas>
        </div>
      </div>
    </div>
  );
}

function Showcase() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lm-section-head h2", {
        opacity: 0,
        y: 40,
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });

      gsap.from(".lm-section-head p, .lm-showcase-tags span", {
        opacity: 0,
        y: 24,
        stagger: 0.08,
        scrollTrigger: { trigger: ref.current, start: "top 76%", once: true },
      });

      gsap.from(".lm-showcase-card", {
        opacity: 0,
        y: 60,
        stagger: 0.14,
        scrollTrigger: { trigger: ref.current, start: "top 72%", once: true },
      });

      gsap.to(".lm-showcase-card-plan .lm-grid-overlay", {
        backgroundPosition: "64px 32px",
        duration: 10,
        ease: "none",
        repeat: -1,
      });

      gsap.to(".lm-render-sofa", {
        y: -8,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".lm-render-table", {
        rotate: 6,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="lm-showcase relative" id="gallery">
      <Waves strokeColor={`rgba(${landingThemeStyle["--lm-action-rgb"]}, 0.15)`} pointerSize={0} />
      <div className="lm-shell relative z-10">
        <div className="lm-section-head">
          <div className="flex-1">
            <h2 className="flex flex-wrap items-center gap-x-4 mb-2">
              <span>Blueprint to</span>
              <GooeyText
                texts={["Plan.", "Place.", "Live."]}
                className="w-[160px] md:w-[220px]"
                textClassName="text-[var(--lm-primary)]"
              />
            </h2>
            <p>Watch technical plans transform into immersive scenes with cleaner light and material response.</p>
          </div>
          <div className="lm-showcase-tags">
            <span>Architectural Accuracy</span>
            <span>Ray-Traced Shadows</span>
          </div>
        </div>
        <div className="lm-showcase-grid">
          <div className="lm-showcase-card lm-product-screen lm-product-screen-2d">
            <div className="lm-app-chrome">
              <div className="lm-window-dots"><span /><span /><span /></div>
              <strong>Downtown Loft.plan</strong>
              <span>Drawing mode</span>
            </div>
            <Live2DDrawingPreview />
            <div className="lm-showcase-label">2D Project Workspace</div>
          </div>
          <div className="lm-showcase-card lm-product-screen lm-product-screen-3d">
            <div className="lm-app-chrome">
              <div className="lm-window-dots"><span /><span /><span /></div>
              <strong>Downtown Loft.3d</strong>
              <span>Orbit enabled</span>
            </div>
            <Live3DRoomPreview />
            <div className="lm-showcase-label lm-showcase-label-accent">3D Project Workspace</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lm-feature-card", {
        opacity: 0,
        y: 60,
        rotateX: 6,
        stagger: 0.12,
        transformOrigin: "center bottom",
        scrollTrigger: { trigger: ref.current, start: "top 72%", once: true },
      });

      gsap.to(".lm-feature-card", {
        yPercent: -8,
        stagger: 0.04,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="lm-features" id="features">
      <div className="lm-shell lm-feature-grid">
        {FEATURES.map((feature) => (
          <div key={feature.title} className={`lm-feature-card ${feature.accent}`}>
            <div className="lm-feature-card-glow" />
            <div className="lm-feature-icon">
              <span className="material-symbols-outlined">{feature.icon}</span>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
            <div className="lm-feature-link">
              <span>{feature.cta}</span>
              <ArrowRightOutlined />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Workflow() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lm-workflow-head", {
        opacity: 0,
        y: 32,
        scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
      });

      gsap.from(".lm-workflow-step", {
        opacity: 0,
        y: 50,
        stagger: 0.14,
        scrollTrigger: { trigger: ref.current, start: "top 72%", once: true },
      });

      gsap.to(".lm-workflow-progress span", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 70%",
          end: "bottom 40%",
          scrub: true,
        },
      });

      gsap.to(".lm-workflow-grid", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="lm-workflow" id="workflow">
      <div className="lm-workflow-glow" />
      <div className="lm-shell">
        <div className="lm-workflow-head">
          <h2>Master Your Vision.</h2>
          <p>The three-step workflow</p>
        </div>
        <div className="lm-workflow-progress">
          <span />
        </div>
        <div className="lm-workflow-grid">
          {WORKFLOW.map((step) => (
            <div key={step.num} className="lm-workflow-step">
              <div className="lm-workflow-number">{step.num}</div>
              <h4 className={step.accent}>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ navigate }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lm-cta-inner", {
        opacity: 0,
        y: 48,
        scale: 0.97,
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });

      gsap.to(".lm-cta-orb", {
        y: -14,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="lm-cta">
      <div className="lm-cta-glow" />
      <div className="lm-cta-orb lm-cta-orb-left" />
      <div className="lm-cta-orb lm-cta-orb-right" />
      <div className="lm-shell">
        <div className="lm-cta-inner">
          <h2>Ready to bring your vision to life?</h2>
          <p>Join Lumiere Maison and transform the way you present interior design.</p>
          <div className="lm-hero-actions" style={{ justifyContent: "center" }}>
            <button className="lm-button lm-button-primary" onClick={() => navigate("/register")}>
              Get Started
            </button>
            <button className="lm-button lm-button-link" onClick={() => navigate("/login")}>
              Request Enterprise Access
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lm-footer-brand", {
        opacity: 0,
        y: 30,
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      });

      gsap.from(".lm-footer-column", {
        opacity: 0,
        y: 24,
        stagger: 0.1,
        scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={ref} className="lm-footer">
      <div className="lm-shell lm-footer-grid">
        <div className="lm-footer-brand">
          <span>Lumiere Maison</span>
          <p>Crafted for digital ateliers. Pioneering the future of architectural interaction.</p>
        </div>
        {Object.entries(FOOTER_GROUPS).map(([title, items]) => (
          <div key={title} className="lm-footer-column">
            <h5>{title}</h5>
            <ul>
              {items.map((item) => (
                <li key={item}>
                  <a href="#top">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="lm-shell lm-footer-bottom">
        <p>© 2026 Lumiere Maison. Crafted for digital ateliers.</p>
        <div className="lm-footer-status">
          <span />
          <strong>System Status: Optimal</strong>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div
      className="lm-page"
      data-page="landing"
      data-barba-namespace="landing"
      style={landingThemeStyle}
    >
      <TopNav navigate={navigate} />
      <main>
        <ScrollExpandMedia
          mediaType="image"
          mediaSrc={landingBg}
          bgImageSrc={landingBg2}
          textBlend={true}
        >
          <MotionStrip reducedMotion={reducedMotion} />
          <Showcase />
          <Features />
          <Workflow />
          <CTA navigate={navigate} />
        </ScrollExpandMedia>
      </main>
      <Footer />
    </div>
  );
}
