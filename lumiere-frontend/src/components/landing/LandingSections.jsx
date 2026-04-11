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
    title: "Cinematic Entrance",
    body: "A black-screen reveal opens into a staged LM room instead of dropping users into a flat hero.",
  },
  {
    title: "Touch and Mouse Orbit",
    body: "Once the room settles to the right, the camera becomes draggable across desktop and mobile.",
  },
  {
    title: "Living Watermark",
    body: "The LM mark keeps rotating softly in the background so the identity stays present without getting loud.",
  },
];

const features = [
  {
    icon: "IN",
    title: "Intro-Choreographed",
    body: "Planes, letters, lights, and camera shifts are sequenced so the landing page feels authored, not assembled.",
  },
  {
    icon: "RM",
    title: "Room-First Identity",
    body: "The brand mark lives inside an architectural moment, tying Lumiere directly to spatial design.",
  },
  {
    icon: "MX",
    title: "Mixed Materials",
    body: "Warm glass, soft ivory walls, metallic accents, and a dark stage keep the room premium without overdecorating it.",
  },
  {
    icon: "MV",
    title: "Moveable View",
    body: "After reveal, the scene stops being passive and invites people to explore it with drag input.",
  },
  {
    icon: "GL",
    title: "Glow Language",
    body: "Gold light and subtle ambient arcs echo the inspiration image without copying it literally.",
  },
  {
    icon: "3D",
    title: "Real 3D Foundation",
    body: "The landing hero stays in Three.js, so the experience already feels connected to the product itself.",
  },
];

const flowSteps = [
  {
    title: "Fade Up from Black",
    body: "The first beat is pure darkness so the reveal has weight.",
  },
  {
    title: "Drop the Room",
    body: "Three planes and the LM letters fall into place like a staged set.",
  },
  {
    title: "Hand Over Control",
    body: "The room shifts right and becomes draggable once the choreography completes.",
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

function SceneStoryPanel() {
  return (
    <div className="lm-vision-panel">
      <div className="lm-orbit-card">
        <span className="lm-status-pill">Sequence</span>
        <h3>Designed to feel like stepping into a branded miniature set.</h3>
        <p>
          The room does the storytelling first, then the interface takes over. That keeps the
          landing experience cinematic without losing usability.
        </p>
      </div>

      <div className="lm-vision-grid">
        <article>
          <span>01</span>
          <strong>Black intro mask</strong>
          <p>Creates a clean opening beat before any geometry is visible.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Room planes drop</strong>
          <p>Left wall, right wall, and floor descend into a warm, staged composition.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Watermark takeover</strong>
          <p>The solid letters soften while a slow rotating LM remains in the scene.</p>
        </article>
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
  const [heroIntroProgress, setHeroIntroProgress] = useState(mobile ? 1 : 0);

  useEffect(() => {
    setHeroIntroProgress(mobile ? 1 : 0);
  }, [mobile]);

  const heroIntroActive = !mobile && heroIntroProgress < 0.86;

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

      <header className={`lm-nav${heroIntroActive ? " lm-nav-hidden" : ""}`}>
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
        <section className={`lm-hero${heroIntroActive ? " lm-hero-intro-active" : ""}`}>
          <motion.div
            className={`lm-copy${heroIntroActive ? " lm-copy-hidden" : ""}`}
            initial="hidden"
            animate="show"
            variants={reveal}
          >
            <motion.p className="lm-kicker" custom={0} variants={reveal}>
              Cinematic 3D landing experience
            </motion.p>
            <motion.h1 custom={1} variants={reveal}>
              Let the Brand Enter the Room
            </motion.h1>
            <motion.p className="lm-body-copy lm-hero-copy" custom={2} variants={reveal}>
              Lumiere opens in darkness, builds a floating architectural stage, drops the LM mark
              into place, and then hands the scene over to the user.
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
            className="lm-hero-stage-wrap"
            initial={false}
            animate={
              mobile
                ? { width: "100%", height: 520, top: 0, y: 0 }
                : heroIntroActive
                  ? { width: "100%", height: "calc(100vh - 132px)", top: 0, left: 0, y: 0 }
                  : { width: "56%", height: 680, top: "50%", left: 0, y: "-50%" }
            }
            transition={{
              type: "spring",
              stiffness: heroIntroActive ? 72 : 88,
              damping: 18,
              mass: 0.95,
            }}
          >
            <motion.div
              className="lm-hero-stage"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.15 }}
              style={{ rotateX: sceneRotateX, rotateY: sceneRotateY }}
            >
              <SceneComponent
                pointer={pointer}
                progress={sceneProgress}
                mobile={mobile}
                onIntroProgress={setHeroIntroProgress}
              />
              {!heroIntroActive && (
                <>
                  <div className="lm-stage-panel lm-stage-panel-top">
                    <span>Hero scene</span>
                    <strong>Animated room reveal</strong>
                  </div>
                  <div className="lm-stage-panel lm-stage-panel-bottom">
                    <span>After intro</span>
                    <strong>Drag with mouse or touch</strong>
                  </div>
                </>
              )}
            </motion.div>
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
              Not Just a Logo -
              <br />
              A Whole Entrance
            </h2>
            <p className="lm-body-copy">
              The landing page now works like a short film beat. It starts restrained, reveals the
              room composition, shifts the staging, and then lets people physically explore it.
            </p>
            <ul className="lm-note-list">
              <li>The initial black mask gives the room reveal more impact.</li>
              <li>The room slides right to make the layout feel intentional, not centered by default.</li>
              <li>The fading LM watermark keeps motion alive even after the intro ends.</li>
            </ul>
          </motion.div>

          <motion.div className="lm-visual-panel" style={{ y: experienceY }}>
            <SceneStoryPanel />
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
            <h2>See the Motion System Before the Product Starts</h2>
            <p className="lm-body-copy">
              The visual language is already doing product work here: warmth, space, controlled
              motion, and direct manipulation all land before signup.
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
