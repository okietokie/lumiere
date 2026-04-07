import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Html,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
} from "@react-three/drei";

const INTRO_DURATION = 7.4;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value) {
  const next = clamp(value);
  return 1 - (1 - next) ** 3;
}

function easeInOutCubic(value) {
  const next = clamp(value);
  return next < 0.5 ? 4 * next ** 3 : 1 - ((-2 * next + 2) ** 3) / 2;
}

function mix(start, end, amount) {
  return start + (end - start) * amount;
}

function getIntroPhase(time) {
  const intro = clamp(time / INTRO_DURATION);

  return {
    intro,
    shellDrop: easeOutCubic(clamp(intro / 0.3)),
    letterDrop: easeOutCubic(clamp((intro - 0.18) / 0.26)),
    letterHide: easeInOutCubic(clamp((intro - 0.68) / 0.2)),
    roomShift: easeInOutCubic(clamp((intro - 0.54) / 0.26)),
    interactive: intro > 0.84,
  };
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="lm-scene-loading">Building intro</div>
    </Html>
  );
}

function createLShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 5.8);
  shape.lineTo(1.25, 5.8);
  shape.lineTo(1.25, 1.15);
  shape.lineTo(4.3, 1.15);
  shape.lineTo(4.3, 0);
  shape.lineTo(0, 0);
  return shape;
}

function createMShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 5.8);
  shape.lineTo(1.18, 5.8);
  shape.lineTo(3.22, 1.2);
  shape.lineTo(5.22, 5.8);
  shape.lineTo(6.4, 5.8);
  shape.lineTo(6.4, 0);
  shape.lineTo(5.16, 0);
  shape.lineTo(5.16, 4.15);
  shape.lineTo(3.22, 0);
  shape.lineTo(1.24, 4.15);
  shape.lineTo(1.24, 0);
  shape.lineTo(0, 0);
  return shape;
}

function goldTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#3c220b");
  gradient.addColorStop(0.18, "#996127");
  gradient.addColorStop(0.34, "#ffe8a2");
  gradient.addColorStop(0.56, "#d29a47");
  gradient.addColorStop(0.8, "#714114");
  gradient.addColorStop(1, "#f5d38b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 28; index += 1) {
    const alpha = 0.02 + (index % 4) * 0.02;
    context.fillStyle = `rgba(255, 246, 220, ${alpha})`;
    context.fillRect(0, (index / 28) * canvas.height, canvas.width, 10);
  }

  for (let index = 0; index < 90; index += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 2 + Math.random() * 5;
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, "rgba(255,255,240,0.18)");
    glow.addColorStop(1, "rgba(255,255,240,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function ExtrudedLetter({
  shape,
  position,
  texture,
  materialRef,
  opacity = 1,
  scale = 1,
}) {
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.58,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.13,
      bevelThickness: 0.14,
      curveSegments: 18,
    });
    nextGeometry.center();
    return nextGeometry;
  }, [shape]);

  return (
    <mesh geometry={geometry} position={position} scale={scale} castShadow receiveShadow>
      <meshPhysicalMaterial
        ref={materialRef}
        color="#ddb15b"
        metalness={1}
        roughness={0.18}
        clearcoat={1}
        clearcoatRoughness={0.1}
        reflectivity={1}
        envMapIntensity={2.5}
        map={texture}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

function IntroArcs() {
  const group = useRef(null);

  useFrame((state) => {
    if (!group.current) {
      return;
    }

    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
  });

  return (
    <group ref={group} position={[-5.4, 2.4, -8.6]}>
      {[6.5, 8, 9.5, 11].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[Math.PI / 2, 0.14, 0]}
          position={[0, 0, index * -0.02]}
        >
          <ringGeometry args={[radius - 0.02, radius, 128, 1, 0.35, 1.3]} />
          <meshBasicMaterial
            color="#b98a50"
            transparent
            opacity={0.12 - index * 0.015}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function WatermarkLogo() {
  const groupRef = useRef(null);
  const lShape = useMemo(() => createLShape(), []);
  const mShape = useMemo(() => createMShape(), []);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const phase = getIntroPhase(state.clock.elapsedTime);
    const reveal = phase.roomShift;
    groupRef.current.position.set(mix(-1.4, 2.8, reveal), 0.8, -4.2);
    groupRef.current.rotation.y = Math.PI * 0.1 + state.clock.elapsedTime * 0.12;
    groupRef.current.rotation.x = -0.16;
    groupRef.current.scale.setScalar(mix(0.78, 1.02, reveal));

    groupRef.current.children.forEach((child) => {
      if (child.material) {
        child.material.opacity = mix(0.02, 0.12, phase.letterHide);
      }
    });
  });

  return (
    <group ref={groupRef}>
      <ExtrudedLetter shape={lShape} position={[-4.2, 0, 0]} opacity={0.06} scale={1.2} />
      <ExtrudedLetter shape={mShape} position={[2.28, 0, 0]} opacity={0.06} scale={1.2} />
    </group>
  );
}

function RoomShell({ pointer, progress = 0 }) {
  const root = useRef(null);
  const floorRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const backGlow = useRef(null);
  const windowRef = useRef(null);
  const couchRef = useRef(null);
  const coffeeRef = useRef(null);
  const plantRef = useRef(null);
  const lampRef = useRef(null);

  useFrame((state) => {
    if (!root.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const phase = getIntroPhase(time);
    const floatLift = Math.sin(time * 0.8) * 0.05;
    const orbitX = phase.interactive ? (pointer?.x || 0) * 0.28 : 0;
    const orbitY = phase.interactive ? (pointer?.y || 0) * 0.12 : 0;
    const targetX = mix(-1.15, 1.95, phase.roomShift) + orbitX + progress * 0.12;
    const targetY = mix(0.2, -0.05, phase.roomShift) + floatLift;
    const targetRotY = mix(-0.18, -0.72, phase.roomShift) + orbitX * 0.15;
    const targetRotX = -0.24 + orbitY;

    root.current.position.x += (targetX - root.current.position.x) * 0.06;
    root.current.position.y += (targetY - root.current.position.y) * 0.06;
    root.current.rotation.y += (targetRotY - root.current.rotation.y) * 0.06;
    root.current.rotation.x += (targetRotX - root.current.rotation.x) * 0.06;

    if (floorRef.current) {
      floorRef.current.position.y = mix(5.8, -1.28, phase.shellDrop);
      floorRef.current.rotation.x = mix(-0.95, -Math.PI / 2, phase.shellDrop);
    }

    if (leftRef.current) {
      leftRef.current.position.y = mix(6.6, 0.9, phase.shellDrop);
      leftRef.current.position.x = mix(-0.3, -2.46, phase.shellDrop);
      leftRef.current.rotation.y = mix(0.3, Math.PI / 2, phase.shellDrop);
    }

    if (rightRef.current) {
      rightRef.current.position.y = mix(7.2, 1.06, phase.shellDrop);
      rightRef.current.position.x = mix(0.4, 2.34, phase.shellDrop);
      rightRef.current.rotation.y = mix(-0.28, -Math.PI / 2, phase.shellDrop);
    }

    if (backGlow.current) {
      backGlow.current.material.opacity = mix(0.14, 0.32, phase.shellDrop);
    }

    if (windowRef.current) {
      windowRef.current.position.x = mix(0.2, 1.08, phase.shellDrop);
      windowRef.current.material.opacity = mix(0, 0.24, phase.shellDrop);
    }

    if (couchRef.current) {
      couchRef.current.position.y = mix(3.4, -0.12, phase.shellDrop);
      couchRef.current.rotation.y = Math.sin(time * 0.45) * 0.03;
    }

    if (coffeeRef.current) {
      coffeeRef.current.position.y = mix(3.8, -0.68, phase.shellDrop);
      coffeeRef.current.rotation.y = time * 0.08;
    }

    if (plantRef.current) {
      plantRef.current.position.y = mix(4.2, -0.58, phase.shellDrop);
      plantRef.current.rotation.z = Math.sin(time * 1.1) * 0.05;
    }

    if (lampRef.current) {
      lampRef.current.position.y = mix(4.8, 0.04, phase.shellDrop);
    }
  });

  return (
    <group ref={root} position={[-1.15, 0.2, 0]}>
      <mesh ref={floorRef} receiveShadow position={[0, -1.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.3, 6.1]} />
        <meshStandardMaterial color="#efe5d6" roughness={0.94} metalness={0.02} />
      </mesh>

      <mesh
        ref={leftRef}
        position={[-2.46, 0.9, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[4.5, 4.5]} />
        <meshStandardMaterial color="#f5eee4" roughness={0.96} metalness={0.02} />
      </mesh>

      <mesh
        ref={rightRef}
        position={[2.34, 1.06, -0.18]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[4.9, 4.8]} />
        <meshStandardMaterial color="#f7f2ea" roughness={0.94} metalness={0.02} />
      </mesh>

      <mesh ref={backGlow} position={[0, 1.05, -2.5]}>
        <planeGeometry args={[4.8, 3.7]} />
        <meshBasicMaterial color="#f2d4a2" transparent opacity={0.2} />
      </mesh>

      <group position={[1.92, 0.66, -0.08]}>
        <mesh ref={windowRef}>
          <planeGeometry args={[2.1, 2.8]} />
          <meshPhysicalMaterial
            color="#fffaf2"
            roughness={0.08}
            metalness={0.12}
            transparent
            opacity={0.22}
            transmission={0.16}
          />
        </mesh>
        {[[-0.68, 0], [0, 0], [0.68, 0], [0, 0.9], [0, -0.9]].map(([x, y], index) => (
          <mesh key={`${x}-${y}-${index}`} position={[x, y, 0.02]}>
            <boxGeometry args={[index < 3 ? 0.06 : 2.08, index < 3 ? 2.8 : 0.06, 0.04]} />
            <meshStandardMaterial color="#ddd0bb" roughness={0.4} metalness={0.22} />
          </mesh>
        ))}
      </group>

      <group ref={couchRef} position={[-0.56, -0.12, 0.26]}>
        <RoundedBox args={[1.86, 0.42, 0.82]} radius={0.12} smoothness={6} castShadow receiveShadow>
          <meshStandardMaterial color="#cdb391" roughness={0.68} />
        </RoundedBox>
        <RoundedBox
          args={[0.3, 0.92, 0.78]}
          radius={0.12}
          smoothness={6}
          position={[-0.78, 0.23, 0]}
          castShadow
        >
          <meshStandardMaterial color="#87705d" roughness={0.72} />
        </RoundedBox>
        <RoundedBox
          args={[0.3, 0.92, 0.78]}
          radius={0.12}
          smoothness={6}
          position={[0.78, 0.23, 0]}
          castShadow
        >
          <meshStandardMaterial color="#87705d" roughness={0.72} />
        </RoundedBox>
        <RoundedBox
          args={[1.26, 0.34, 0.28]}
          radius={0.08}
          smoothness={6}
          position={[0, 0.46, -0.2]}
          castShadow
        >
          <meshStandardMaterial color="#efe4d3" roughness={0.4} />
        </RoundedBox>
      </group>

      <group ref={coffeeRef} position={[0.38, -0.68, 0.9]}>
        <mesh castShadow>
          <boxGeometry args={[1.18, 0.08, 0.62]} />
          <meshPhysicalMaterial
            color="#f8efe2"
            roughness={0.06}
            metalness={0.18}
            transparent
            opacity={0.82}
          />
        </mesh>
        {[
          [-0.48, -0.24, -0.22],
          [0.48, -0.24, -0.22],
          [-0.48, -0.24, 0.22],
          [0.48, -0.24, 0.22],
        ].map((position, index) => (
          <mesh key={index} position={position} castShadow>
            <boxGeometry args={[0.04, 0.48, 0.04]} />
            <meshStandardMaterial color="#c79f69" roughness={0.3} metalness={0.42} />
          </mesh>
        ))}
      </group>

      <group ref={plantRef} position={[2.02, -0.58, 1.18]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.24, 28]} />
          <meshStandardMaterial color="#7e5d44" roughness={0.78} />
        </mesh>
        {[
          [0, 0.32, 0, 0.28, "#6d8662"],
          [-0.16, 0.22, -0.04, 0.18, "#89a178"],
          [0.16, 0.26, 0.02, 0.2, "#718a63"],
        ].map(([x, y, z, radius, color]) => (
          <mesh key={`${x}-${y}-${radius}`} position={[x, y, z]} castShadow>
            <sphereGeometry args={[radius, 24, 24]} />
            <meshStandardMaterial color={color} roughness={0.92} />
          </mesh>
        ))}
      </group>

      <group ref={lampRef} position={[0.06, 0.04, -1.38]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.07, 1.2, 20]} />
          <meshStandardMaterial color="#b89263" roughness={0.38} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.32, 0.42, 24]} />
          <meshStandardMaterial color="#f0dfc4" emissive="#f0be7a" emissiveIntensity={0.54} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.63, 0]}>
          <cylinderGeometry args={[0.26, 0.34, 0.08, 24]} />
          <meshStandardMaterial color="#7d5a42" roughness={0.72} />
        </mesh>
      </group>
    </group>
  );
}

function HeroLetters({ pointer }) {
  const groupRef = useRef(null);
  const lRef = useRef(null);
  const mRef = useRef(null);
  const lMaterial = useRef(null);
  const mMaterial = useRef(null);
  const texture = useMemo(() => goldTexture(), []);
  const lShape = useMemo(() => createLShape(), []);
  const mShape = useMemo(() => createMShape(), []);

  useFrame((state) => {
    if (!groupRef.current || !lRef.current || !mRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const phase = getIntroPhase(time);
    const pointerX = phase.interactive ? (pointer?.x || 0) : 0;
    const pointerY = phase.interactive ? (pointer?.y || 0) : 0;
    const swing = Math.sin(time * 1.2) * 0.04;

    groupRef.current.position.x +=
      (mix(-1, 1.98, phase.roomShift) + pointerX * 0.3 - groupRef.current.position.x) * 0.07;
    groupRef.current.position.y +=
      (mix(1.6, 0.88, phase.roomShift) + Math.sin(time * 0.7) * 0.05 - groupRef.current.position.y) *
      0.07;
    groupRef.current.rotation.y +=
      (mix(0, -0.72, phase.roomShift) + pointerX * 0.18 - groupRef.current.rotation.y) * 0.06;
    groupRef.current.rotation.x += (-0.1 + pointerY * 0.14 - groupRef.current.rotation.x) * 0.06;

    lRef.current.position.set(
      -1.7,
      mix(5.4, 0, phase.letterDrop) + Math.sin(time * 1.4) * 0.04,
      mix(0.4, -1.18, phase.letterHide)
    );
    lRef.current.rotation.x = mix(1.4, 0.04, phase.letterDrop) + swing;
    lRef.current.rotation.y = mix(-1.5, 0.2, phase.letterDrop) + time * 0.45 * (1 - phase.letterHide);
    lRef.current.rotation.z = mix(0.8, 0, phase.letterDrop);

    mRef.current.position.set(
      1.42,
      mix(6.2, 0, phase.letterDrop),
      mix(-0.2, -1.36, phase.letterHide)
    );
    mRef.current.rotation.x = mix(-1.2, -0.08, phase.letterDrop) - swing;
    mRef.current.rotation.y = mix(1.8, -0.22, phase.letterDrop) + time * 0.5 * (1 - phase.letterHide);
    mRef.current.rotation.z = mix(-0.7, 0, phase.letterDrop);

    if (lMaterial.current) {
      lMaterial.current.opacity = mix(1, 0.14, phase.letterHide);
    }

    if (mMaterial.current) {
      mMaterial.current.opacity = mix(1, 0.1, phase.letterHide);
    }
  });

  return (
    <Float speed={0.72} rotationIntensity={0.04} floatIntensity={0.18}>
      <group ref={groupRef} position={[-1, 1.6, 0]}>
        <group ref={lRef}>
          <ExtrudedLetter shape={lShape} position={[0, 0, 0]} texture={texture} materialRef={lMaterial} />
        </group>
        <group ref={mRef}>
          <ExtrudedLetter shape={mShape} position={[0, 0, 0]} texture={texture} materialRef={mMaterial} />
        </group>
      </group>
    </Float>
  );
}

function CameraRig({ pointer, progress = 0 }) {
  useFrame((state) => {
    const phase = getIntroPhase(state.clock.elapsedTime);
    const pointerX = phase.interactive ? (pointer?.x || 0) : 0;
    const pointerY = phase.interactive ? (pointer?.y || 0) : 0;
    const targetX = mix(0, 2.1, phase.roomShift) + pointerX * 0.35 + progress * 0.1;
    const targetY = 1.24 - pointerY * 0.24;
    const targetZ = mix(15.8, 12.6, phase.roomShift);

    state.camera.position.x += (targetX - state.camera.position.x) * 0.05;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.05;
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.05;
    state.camera.lookAt(mix(-0.8, 2.2, phase.roomShift), 0.4, 0.2);
  });

  return null;
}

function SceneContent({ pointer, progress }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.24, 15.8]} fov={25} />
      <CameraRig pointer={pointer} progress={progress} />

      <ambientLight intensity={0.36} color="#f7d7ab" />
      <spotLight
        position={[-8, 8, 4]}
        angle={0.5}
        penumbra={1}
        intensity={170}
        color="#d39a56"
      />
      <spotLight
        position={[5, 8, 10]}
        angle={0.4}
        penumbra={1}
        intensity={240}
        color="#fff0c6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[1.4, 2.1, -0.2]} intensity={34} distance={12} color="#ffdbac" />
      <directionalLight position={[4, 5, 6]} intensity={1.6} color="#fff2d6" />

      <Suspense fallback={<LoadingFallback />}>
        <Environment preset="apartment" />
        <IntroArcs />
        <WatermarkLogo />
        <RoomShell pointer={pointer} progress={progress} />
        <HeroLetters pointer={pointer} />
      </Suspense>

      <ContactShadows position={[1.8, -1.26, 0.2]} opacity={0.3} scale={16} blur={2.8} far={12} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={1.18}
        maxPolarAngle={1.72}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.38}
      />
    </>
  );
}

export function SceneFallback() {
  return (
    <div className="lm-scene-fallback lm-logo-scene-fallback">
      <div className="lm-fallback-room lm-fallback-room-angled">
        <div className="lm-fallback-wall lm-fallback-wall-left" />
        <div className="lm-fallback-wall lm-fallback-wall-right" />
        <div className="lm-fallback-floor" />
        <div className="lm-logo-fallback-l" />
        <div className="lm-logo-fallback-m-left" />
        <div className="lm-logo-fallback-m-right" />
        <div className="lm-logo-fallback-m-leg" />
        <div className="lm-fallback-watermark" />
      </div>
      <div className="lm-fallback-card">
        <span>Scene mode</span>
        <strong>Touch-enabled intro</strong>
      </div>
    </div>
  );
}

export default function LMLogoScene({ pointer, progress = 0, mobile = false }) {
  const [introProgress, setIntroProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      setIntroProgress(clamp(elapsed / INTRO_DURATION));
      if (elapsed < INTRO_DURATION) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (mobile) {
    return <SceneFallback />;
  }

  return (
    <div className="lm-scene-shell lm-logo-room-shell">
      <Canvas dpr={[1, 1.8]} shadows gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#020202"]} />
        <fog attach="fog" args={["#020202", 12, 24]} />
        <SceneContent pointer={pointer} progress={progress} />
      </Canvas>

      <div className="lm-scene-glow lm-scene-glow-a" />
      <div className="lm-scene-glow lm-scene-glow-b" />
      <div className="lm-room-vignette" />
      <div
        className="lm-scene-intro-mask"
        style={{ opacity: 1 - easeOutCubic(introProgress) }}
      />
      <div className="lm-scene-caption">
        <span>{introProgress > 0.84 ? "Interactive" : "Cinematic intro"}</span>
        <strong>
          {introProgress > 0.84 ? "Drag to orbit the room" : "LM drops into the space"}
        </strong>
      </div>
    </div>
  );
}
