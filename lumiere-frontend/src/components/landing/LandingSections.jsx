import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRightOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import LandingScene from "./LandingScene";
import "./landing-page.css";

const reveal = {
  hidden: { opacity: 0, y: 30 },
  show: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 18,
      delay: index * 0.08,
    },
  }),
};

const featureCards = [
  {
    title: "Precision Layouts",
    body: "Build rooms with exact dimensions and expand effortlessly.",
  },
  {
    title: "Live 3D Feedback",
    body: "Every change updates instantly - no waiting, no guessing.",
  },
  {
    title: "Interactive Elements",
    body: "Doors, windows, and objects behave like they should.",
  },
];

const features = [
  {
    icon: "SB",
    title: "Smart Room Builder",
    body: "Create and expand spaces seamlessly - from single rooms to full layouts.",
  },
  {
    icon: "2D",
    title: "2D to 3D Sync",
    body: "Switch between planning and visualization instantly, without losing context.",
  },
  {
    icon: "DW",
    title: "Dynamic Openings",
    body: "Add doors and windows that do not just exist - they move, adapt, and respond.",
  },
  {
    icon: "IP",
    title: "Intelligent Placement",
    body: "Place furniture naturally with snapping and spacing that makes sense.",
  },
  {
    icon: "MF",
    title: "Materials and Finishes",
    body: "Experiment with textures, colors, and surfaces - instantly applied.",
  },
  {
    icon: "RL",
    title: "Real-Time Lighting",
    body: "Control mood, shadows, and ambience with dynamic lighting.",
  },
];

const flowSteps = [
  {
    title: "Start with a Space",
    body: "Define your layout with simple inputs or sketches.",
  },
  {
    title: "Shape the Details",
    body: "Add structure, openings, and elements with precision.",
  },
  {
    title: "Bring It to Life",
    body: "Explore your design in full 3D, in real time.",
  },
];

function usePointerParallax() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event) => {
      setPointer({
        x: event.clientX / window.innerWidth - 0.5,
        y: event.clientY / window.innerHeight - 0.5,
      });
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return pointer;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 820);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return mobile;
}

function MotionButton({ className, children, ...props }) {
  return (
    <motion.button
      className={className}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.975, y: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

function ShowcaseFrame() {
  const bars = useMemo(() => [48, 70, 84, 58, 74], []);

  return (
    <div className="lm-preview-shell">
      <div className="lm-preview-frame">
        <div className="lm-preview-badge">Guided walkthrough</div>
        <div className="lm-preview-grid" />
        <div className="lm-preview-bars">
          {bars.map((bar, index) => (
            <motion.span
              key={`${bar}-${index}`}
              initial={{ height: 16 }}
              animate={{ height: `${bar}%` }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                duration: 1.4 + index * 0.16,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SignupCard({ finalCta, onDemo, onLogin, onRegister }) {
  return (
    <motion.form
      className="lm-signup-card"
      onSubmit={(event) => event.preventDefault()}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
      variants={reveal}
    >
      <p className="lm-kicker">Your Space, Reimagined</p>
      <h3>{finalCta?.title || "Start building environments that you can actually feel."}</h3>
      <p className="lm-body-copy">
        {finalCta?.body || "Start building environments that you can actually feel - not just imagine."}
      </p>

      <div className="lm-signup-actions">
        <MotionButton type="button" className="lm-button lm-button-primary" onClick={finalCta?.primaryAction || onRegister}>
          {finalCta?.primaryLabel || "Start Now"}
        </MotionButton>
        <MotionButton type="button" className="lm-button lm-button-secondary" onClick={finalCta?.secondaryAction || onLogin}>
          {finalCta?.secondaryLabel || "Login"}
        </MotionButton>
        <MotionButton type="button" className="lm-button lm-button-secondary" onClick={finalCta?.tertiaryAction || onDemo}>
          {finalCta?.tertiaryLabel || "Try Live Demo"}
        </MotionButton>
      </div>
    </motion.form>
  );
}

export default function LandingSections({
  navActions,
  heroActions,
  finalCta,
  sceneComponent: SceneComponent = LandingScene,
}) {
  const navigate = useNavigate();
  const shellRef = useRef(null);
  const experienceRef = useRef(null);
  const pointer = usePointerParallax();
  const mobile = useIsMobile();

  const springX = useSpring(pointer.x, { stiffness: 100, damping: 18, mass: 0.5 });
  const springY = useSpring(pointer.y, { stiffness: 100, damping: 18, mass: 0.5 });

  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ["start start", "end end"],
  });
  const { scrollYProgress: experienceScroll } = useScroll({
    target: experienceRef,
    offset: ["start 75%", "end 20%"],
  });

  const backdropY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const sceneRotateX = useTransform(springY, [-0.5, 0.5], [5, -5]);
  const sceneRotateY = useTransform(springX, [-0.5, 0.5], [-7, 7]);
  const experienceY = useTransform(experienceScroll, [0, 1], [26, -18]);
  const [sceneProgress, setSceneProgress] = useState(0);

  useEffect(() => {
    const unsub = experienceScroll.on("change", (value) => setSceneProgress(value));
    return () => unsub();
  }, [experienceScroll]);

  const openDemo = () => navigate("/user/room");
  const openLogin = () => navigate("/login");
  const openRegister = () => navigate("/register");

  return (
    <div className="lm-page" ref={shellRef}>
      <motion.div className="lm-backdrop" style={{ y: backdropY }} />

      <header className="lm-nav">
        <div>
          <p className="lm-brand">Lumiere Maison</p>
          <span className="lm-nav-sub">Immersive interior design platform</span>
        </div>
        <div className="lm-nav-actions">
          {navActions || (
            <>
              <MotionButton className="lm-button lm-button-secondary" onClick={openDemo}>
                Explore Demo
              </MotionButton>
              <a className="lm-button lm-button-primary" href="#final-cta">
                Start Designing
              </a>
            </>
          )}
        </div>
      </header>

      <main className="lm-main">
        <section className="lm-hero">
          <motion.div className="lm-copy" initial="hidden" animate="show" variants={reveal}>
            <motion.p className="lm-kicker" custom={0} variants={reveal}>
              Interactive 3D interior platform
            </motion.p>
            <motion.h1 custom={1} variants={reveal}>
              Shape Your Space in Real Time
            </motion.h1>
            <motion.p className="lm-body-copy lm-hero-copy" custom={2} variants={reveal}>
              Design, refine, and experience interiors through an interactive 3D environment -
              built to feel as real as it looks.
            </motion.p>

            <motion.div className="lm-hero-actions" custom={3} variants={reveal}>
              {heroActions || (
                <>
                  <MotionButton className="lm-button lm-button-primary" onClick={openDemo}>
                    Start Designing <ArrowRightOutlined />
                  </MotionButton>
                  <MotionButton className="lm-button lm-button-secondary" onClick={openDemo}>
                    Explore Demo <PlayCircleOutlined />
                  </MotionButton>
                </>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            className="lm-hero-stage"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.15 }}
            style={{ rotateX: sceneRotateX, rotateY: sceneRotateY }}
          >
            <SceneComponent pointer={pointer} progress={sceneProgress} mobile={mobile} />
            <div className="lm-stage-panel lm-stage-panel-top">
              <span>Spatial Mode</span>
              <strong>Interactive room preview</strong>
            </div>
            <div className="lm-stage-panel lm-stage-panel-bottom">
              <span>Realtime response</span>
              <strong>Hover, scroll, click</strong>
            </div>
          </motion.div>
        </section>

        <section className="lm-floating-strip">
          {featureCards.map((card, index) => (
            <motion.article
              key={card.title}
              className="lm-floating-card"
              custom={index}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              whileHover={{ y: -8, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              style={{ rotateX: pointer.y * -4, rotateY: pointer.x * 6 }}
            >
              <span className="lm-card-number">0{index + 1}</span>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </motion.article>
          ))}
        </section>

        <section className="lm-experience" ref={experienceRef}>
          <motion.div
            className="lm-text-panel"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={reveal}
          >
            <p className="lm-kicker">Experience Section</p>
            <h2>
              Not Just Design -
              <br />
              Experience It
            </h2>
            <p className="lm-body-copy">
              Step inside your ideas. Move through your space, adjust details in real time, and
              explore every angle before anything is built.
            </p>
            <ul className="lm-note-list">
              <li>Scroll guides the camera deeper into the room.</li>
              <li>Walls soften into a subtle ghost effect as the scene opens up.</li>
              <li>Light shifts dynamically to change the emotional read of the space.</li>
            </ul>
          </motion.div>

          <motion.div className="lm-visual-panel" style={{ y: experienceY }}>
            <SceneComponent pointer={pointer} progress={sceneProgress} mobile={mobile} />
          </motion.div>
        </section>

        <section className="lm-features-grid">
          <div className="lm-section-head">
            <p className="lm-kicker">Features Grid</p>
            <h2>Interactive tools that already feel like part of the product.</h2>
          </div>
          <div className="lm-grid">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                className="lm-feature-tile"
                custom={index % 3}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.22 }}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
              >
                <span className="lm-icon-chip">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="lm-flow">
          <div className="lm-section-head">
            <p className="lm-kicker">How It Works</p>
            <h2>Designed Around How You Think</h2>
          </div>
          <div className="lm-flow-track">
            <motion.div
              className="lm-flow-line"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
            {flowSteps.map((step, index) => (
              <motion.article
                key={step.title}
                className="lm-step-card"
                custom={index}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="lm-showcase">
          <div className="lm-text-panel">
            <p className="lm-kicker">Showcase Section</p>
            <h2>See It Before It Exists</h2>
            <p className="lm-body-copy">
              Capture snapshots or record walkthroughs of your designs - whether it is an
              automated cinematic view or your own guided exploration.
            </p>
          </div>
          <motion.div
            className="lm-showcase-panel"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
          >
            <ShowcaseFrame />
          </motion.div>
        </section>

        <section className="lm-final-cta" id="final-cta">
          <div className="lm-text-panel">
            <p className="lm-kicker">Final CTA</p>
            <h2>Your Space, Reimagined</h2>
            <p className="lm-body-copy">
              Whether you are planning your home, learning design, or building something bigger -
              Lumiere adapts to you.
            </p>
          </div>
          <SignupCard
            finalCta={finalCta}
            onDemo={openDemo}
            onLogin={openLogin}
            onRegister={openRegister}
          />
        </section>
      </main>
    </div>
  );
}
