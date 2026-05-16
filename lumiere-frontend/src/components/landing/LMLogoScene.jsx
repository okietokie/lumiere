import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
  useCursor,
} from "@react-three/drei";
import { PerformanceFrameMonitor, usePerformanceMode } from "../../providers/PerformanceModeProvider.jsx";

const INTRO_EASE = [0.22, 1, 0.36, 1];
const INTRO_DURATION = 4.8;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function cubicBezierAtT(t, p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  let x = t;
  for (let index = 0; index < 6; index += 1) {
    const currentX = ((ax * x + bx) * x + cx) * x - t;
    const currentSlope = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(currentSlope) < 1e-6) break;
    x -= currentX / currentSlope;
    x = clamp(x);
  }

  return ((ay * x + by) * x + cy) * x;
}

function easeHero(value) {
  return cubicBezierAtT(clamp(value), INTRO_EASE[0], INTRO_EASE[1], INTRO_EASE[2], INTRO_EASE[3]);
}

function springDrop(value) {
  const t = clamp(value);
  return 1 - Math.exp(-6 * t) * Math.cos(8 * t);
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return mobile;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="lm-loader">
        <span className="lm-loader-dot" />
        Loading immersive scene
      </div>
    </Html>
  );
}

function createLetterGeometry(letter) {
  const shape = new THREE.Shape();

  if (letter === "L") {
    shape.moveTo(0, 0);
    shape.lineTo(0, 5.8);
    shape.lineTo(1.2, 5.8);
    shape.lineTo(1.2, 1.15);
    shape.lineTo(4.4, 1.15);
    shape.lineTo(4.4, 0);
    shape.closePath();
  } else {
    shape.moveTo(0, 0);
    shape.lineTo(0, 5.8);
    shape.lineTo(1.18, 5.8);
    shape.lineTo(3.25, 1.15);
    shape.lineTo(5.26, 5.8);
    shape.lineTo(6.45, 5.8);
    shape.lineTo(6.45, 0);
    shape.lineTo(5.2, 0);
    shape.lineTo(5.2, 4.15);
    shape.lineTo(3.25, 0);
    shape.lineTo(1.25, 4.15);
    shape.lineTo(1.25, 0);
    shape.closePath();
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.13,
    bevelThickness: 0.14,
    curveSegments: 18,
  });
  geometry.center();
  return geometry;
}

function useHeroTimeline() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();

    const tick = () => {
      const next = (performance.now() - startedAt) / 1000;
      setElapsed(next);
      if (next < INTRO_DURATION + 1.6) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return elapsed;
}

function LogoMark({ elapsed }) {
  const groupRef = useRef(null);
  const blurRef = useRef(null);
  const watermarkRef = useRef(null);
  const lGeometry = useMemo(() => createLetterGeometry("L"), []);
  const mGeometry = useMemo(() => createLetterGeometry("M"), []);

  useFrame((state) => {
    if (!groupRef.current || !blurRef.current || !watermarkRef.current) return;

    const logoIn = easeHero(elapsed / 1.8);
    const roomShift = easeHero(clamp((elapsed - 2.15) / 1.4));
    const watermark = easeHero(clamp((elapsed - 2.35) / 1.45));
    const oscillation = Math.sin(state.clock.elapsedTime * 0.95) * THREE.MathUtils.degToRad(8);

    groupRef.current.position.set(THREE.MathUtils.lerp(0, 2.2, roomShift), 1.2, THREE.MathUtils.lerp(2.8, -2.6, watermark));
    groupRef.current.rotation.y = oscillation * (1 - watermark) + THREE.MathUtils.lerp(0, -0.28, roomShift);
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0.7, 1, logoIn) * THREE.MathUtils.lerp(1, 0.92, watermark));

    blurRef.current.scale.setScalar(THREE.MathUtils.lerp(1.18, 1, logoIn));
    blurRef.current.material.opacity = THREE.MathUtils.lerp(0.32, 0, logoIn);

    watermarkRef.current.position.set(3.15, 1.15, -3.2);
    watermarkRef.current.rotation.y = state.clock.elapsedTime * 0.16;
    watermarkRef.current.rotation.x = -0.08;
    watermarkRef.current.scale.setScalar(THREE.MathUtils.lerp(0.8, 1.08, watermark));

    watermarkRef.current.children.forEach((child) => {
      if (child.material) {
        child.material.opacity = 0.05 * watermark;
      }
    });
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh ref={blurRef} geometry={lGeometry} position={[-1.55, 0, 0]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
        </mesh>
        <mesh geometry={mGeometry} position={[1.55, 0, 0]}>
          <meshPhysicalMaterial
            color="#e8e8e8"
            roughness={0.18}
            metalness={0.88}
            clearcoat={1}
            clearcoatRoughness={0.16}
          />
        </mesh>
        <mesh geometry={lGeometry} position={[-1.55, 0, 0]}>
          <meshPhysicalMaterial
            color="#e8e8e8"
            roughness={0.18}
            metalness={0.88}
            clearcoat={1}
            clearcoatRoughness={0.16}
          />
        </mesh>
        <mesh geometry={mGeometry} position={[1.55, 0, 0]} scale={1.06}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
        </mesh>
      </group>

      <group ref={watermarkRef}>
        <mesh geometry={lGeometry} position={[-1.38, 0, 0]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0} />
        </mesh>
        <mesh geometry={mGeometry} position={[1.38, 0, 0]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0} />
        </mesh>
      </group>
    </>
  );
}

function RoomShell({ elapsed, hovered, setHovered }) {
  const shellRef = useRef(null);
  const floorRef = useRef(null);
  const leftWallRef = useRef(null);
  const rightWallRef = useRef(null);
  const sofaMaterial = useRef(null);
  const tableMaterial = useRef(null);
  const lampMaterial = useRef(null);

  useCursor(Boolean(hovered));

  useFrame((state) => {
    if (!shellRef.current || !floorRef.current || !leftWallRef.current || !rightWallRef.current) return;

    const roomShift = easeHero(clamp((elapsed - 2.15) / 1.4));
    const floorDrop = springDrop((elapsed - 1) / 0.75);
    const leftDrop = springDrop((elapsed - 1.15) / 0.78);
    const rightDrop = springDrop((elapsed - 1.3) / 0.78);

    shellRef.current.position.x = THREE.MathUtils.lerp(0.4, 3.1, roomShift);
    shellRef.current.position.z = THREE.MathUtils.lerp(0, -0.7, roomShift);
    shellRef.current.rotation.y = THREE.MathUtils.lerp(0, -0.24, roomShift);
    shellRef.current.scale.setScalar(3);

    floorRef.current.position.y = THREE.MathUtils.lerp(5.5, -1.32, floorDrop);
    leftWallRef.current.position.y = THREE.MathUtils.lerp(6.3, 0.9, leftDrop);
    rightWallRef.current.position.y = THREE.MathUtils.lerp(7.1, 0.9, rightDrop);

    if (sofaMaterial.current) {
      sofaMaterial.current.emissiveIntensity = THREE.MathUtils.lerp(
        sofaMaterial.current.emissiveIntensity,
        hovered === "sofa" ? 0.22 : 0,
        0.12
      );
    }
    if (tableMaterial.current) {
      tableMaterial.current.emissiveIntensity = THREE.MathUtils.lerp(
        tableMaterial.current.emissiveIntensity,
        hovered === "table" ? 0.18 : 0,
        0.12
      );
    }
    if (lampMaterial.current) {
      lampMaterial.current.emissiveIntensity = THREE.MathUtils.lerp(
        lampMaterial.current.emissiveIntensity,
        hovered === "lamp" ? 0.32 : 0.16,
        0.12
      );
    }

    shellRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.03;
  });

  return (
    <group ref={shellRef}>
      <mesh ref={floorRef} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.5, 6.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.98} metalness={0.05} />
      </mesh>

      <mesh ref={leftWallRef} position={[-3.1, 0.9, -0.05]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.8, 4.2]} />
        <meshStandardMaterial color="#111111" roughness={0.92} metalness={0.03} />
      </mesh>

      <mesh ref={rightWallRef} position={[3.1, 0.9, -0.05]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.8, 4.2]} />
        <meshStandardMaterial color="#111111" roughness={0.92} metalness={0.03} />
      </mesh>

      <mesh position={[0, 0.74, -2.78]}>
        <planeGeometry args={[5.4, 3.1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.04} />
      </mesh>

      <group
        position={[-0.5, -0.72, 0.45]}
        onPointerOver={() => setHovered("sofa")}
        onPointerOut={() => setHovered(null)}
      >
        <RoundedBox args={[2.05, 0.44, 0.88]} radius={0.12} smoothness={6} castShadow receiveShadow>
          <meshStandardMaterial
            ref={sofaMaterial}
            color="#c6a87d"
            roughness={0.72}
            metalness={0.06}
            emissive="#c6a87d"
            emissiveIntensity={0}
          />
        </RoundedBox>
        <RoundedBox args={[0.28, 0.88, 0.84]} radius={0.1} smoothness={6} position={[-0.9, 0.22, 0]} castShadow>
          <meshStandardMaterial color="#9d8261" roughness={0.78} metalness={0.04} />
        </RoundedBox>
        <RoundedBox args={[0.28, 0.88, 0.84]} radius={0.1} smoothness={6} position={[0.9, 0.22, 0]} castShadow>
          <meshStandardMaterial color="#9d8261" roughness={0.78} metalness={0.04} />
        </RoundedBox>
      </group>

      <group
        position={[0.58, -1.02, 1.1]}
        onPointerOver={() => setHovered("table")}
        onPointerOut={() => setHovered(null)}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.08, 0.72]} />
          <meshPhysicalMaterial
            ref={tableMaterial}
            color="#e8e8e8"
            roughness={0.08}
            metalness={0.16}
            transparent
            opacity={0.82}
            emissive="#ffffff"
            emissiveIntensity={0}
          />
        </mesh>
        {[
          [-0.46, -0.24, -0.28],
          [0.46, -0.24, -0.28],
          [-0.46, -0.24, 0.28],
          [0.46, -0.24, 0.28],
        ].map((position, index) => (
          <mesh key={index} position={position} castShadow>
            <boxGeometry args={[0.04, 0.48, 0.04]} />
            <meshStandardMaterial color="#c6a87d" roughness={0.34} metalness={0.42} />
          </mesh>
        ))}
      </group>

      <group
        position={[1.95, -0.84, 0.95]}
        onPointerOver={() => setHovered("plant")}
        onPointerOut={() => setHovered(null)}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.24, 24]} />
          <meshStandardMaterial color="#5b4b3d" roughness={0.88} />
        </mesh>
        {[
          [0, 0.32, 0, 0.28],
          [-0.18, 0.22, 0.02, 0.18],
          [0.18, 0.28, -0.04, 0.2],
        ].map(([x, y, z, radius]) => (
          <mesh key={`${x}-${y}-${radius}`} position={[x, y, z]} castShadow>
            <sphereGeometry args={[radius, 20, 20]} />
            <meshStandardMaterial
              color="#6d7f65"
              roughness={0.94}
              emissive="#7ea174"
              emissiveIntensity={hovered === "plant" ? 0.14 : 0}
            />
          </mesh>
        ))}
      </group>

      <group
        position={[0.3, -0.48, -1.18]}
        onPointerOver={() => setHovered("lamp")}
        onPointerOut={() => setHovered(null)}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.07, 1.2, 18]} />
          <meshStandardMaterial color="#c6a87d" roughness={0.24} metalness={0.46} />
        </mesh>
        <mesh position={[0, 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.34, 0.46, 24]} />
          <meshStandardMaterial
            ref={lampMaterial}
            color="#f5f2eb"
            roughness={0.24}
            emissive="#ffffff"
            emissiveIntensity={0.16}
          />
        </mesh>
      </group>
    </group>
  );
}

function CameraRig({ elapsed, mobile, reduceMotion = false }) {
  const controls = useRef(null);
  const zoomTarget = useRef(8.8);
  const { camera, gl } = useThree();

  useEffect(() => {
    if (mobile) return undefined;

    const handleWheel = (event) => {
      zoomTarget.current = clamp(zoomTarget.current + event.deltaY * 0.0025, 7.9, 10.5);
    };

    gl.domElement.addEventListener("wheel", handleWheel, { passive: true });
    return () => gl.domElement.removeEventListener("wheel", handleWheel);
  }, [gl, mobile]);

  useFrame((state) => {
    const roomShift = easeHero(clamp((elapsed - 2.15) / 1.4));
    const autoOrbit = reduceMotion ? 0 : state.clock.elapsedTime * 0.12;
    const targetX = THREE.MathUtils.lerp(0.6, 2.8, roomShift) + Math.sin(autoOrbit) * 0.35;
    const targetY = 1.45 + Math.sin(autoOrbit * 0.7) * 0.08;
    const baseZ = mobile ? 10.8 : zoomTarget.current + Math.cos(autoOrbit) * 0.18;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.045);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, baseZ, 0.05);

    if (controls.current) {
      controls.current.target.lerp(
        new THREE.Vector3(THREE.MathUtils.lerp(0.5, 3, roomShift), -0.18, 0),
        0.08
      );
      controls.current.enabled = elapsed > 2.8 && !mobile && !reduceMotion;
      controls.current.update();
    } else {
      camera.lookAt(THREE.MathUtils.lerp(0.5, 3, roomShift), -0.18, 0);
    }

    if (!controls.current) {
      camera.lookAt(THREE.MathUtils.lerp(0.5, 3, roomShift), -0.18, 0);
    }
    state.camera.updateProjectionMatrix();
  });

  return mobile ? null : (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={1.08}
      maxPolarAngle={1.72}
      minAzimuthAngle={-0.75}
      maxAzimuthAngle={0.48}
      rotateSpeed={0.7}
    />
  );
}

function SceneContent({ elapsed, mobile, quality }) {
  const [hovered, setHovered] = useState(null);

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 7, 16]} />
      <PerspectiveCamera makeDefault position={[0.8, 1.45, 9]} fov={30} />
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight
        position={[6, 7, 4]}
        intensity={1.1}
        color="#ffffff"
        castShadow={quality.shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        position={[4.8, 5.8, 3.4]}
        intensity={26}
        angle={0.42}
        penumbra={1}
        color="#c6a87d"
        castShadow={quality.shadows}
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.22} color="#ffffff" />
      <LogoMark elapsed={elapsed} />
      <RoomShell elapsed={elapsed} hovered={hovered} setHovered={setHovered} />
      <CameraRig elapsed={elapsed} mobile={mobile} reduceMotion={quality.reduceMotion} />
    </>
  );
}

function MobileFallback() {
  return (
    <div className="lm-hero-fallback">
      <div className="lm-hero-fallback-room">
        <span className="lm-hero-fallback-floor" />
        <span className="lm-hero-fallback-wall lm-hero-fallback-wall-left" />
        <span className="lm-hero-fallback-wall lm-hero-fallback-wall-right" />
        <span className="lm-hero-fallback-logo">LM</span>
      </div>
    </div>
  );
}

export default function LMLogoScene() {
  const elapsed = useHeroTimeline();
  const mobile = useIsMobile();
  const { quality } = usePerformanceMode();

  if (mobile || quality.reduceMotion) {
    return <MobileFallback />;
  }

  return (
    <div className="lm-scene-shell">
      <Canvas
        dpr={quality.logoDpr}
        shadows={quality.shadows}
        gl={{ antialias: quality.antialias, alpha: false, powerPreference: quality.reduceMotion ? "default" : "high-performance" }}
      >
        <PerformanceFrameMonitor label="logo scene" />
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent elapsed={elapsed} mobile={mobile} quality={quality} />
        </Suspense>
      </Canvas>
      <div className="lm-scene-vignette" />
    </div>
  );
}
