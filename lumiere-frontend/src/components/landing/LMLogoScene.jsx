import React, { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls } from "@react-three/drei";

function LoadingFallback() {
  return (
    <Html center>
      <div className="lm-scene-loading">Loading logo</div>
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
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#4f2e12");
  gradient.addColorStop(0.14, "#b97a2d");
  gradient.addColorStop(0.32, "#fff1b9");
  gradient.addColorStop(0.52, "#d8a550");
  gradient.addColorStop(0.74, "#7a4a19");
  gradient.addColorStop(1, "#f6d78b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 18; index += 1) {
    const y = (index / 18) * canvas.height;
    context.fillStyle = `rgba(255, 245, 214, ${0.06 + (index % 3) * 0.02})`;
    context.fillRect(0, y, canvas.width, 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function ExtrudedLetter({ shape, position, texture }) {
  const geometry = useMemo(() => {
    const extrudeSettings = {
      depth: 0.52,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      curveSegments: 16,
    };

    const nextGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    nextGeometry.center();
    return nextGeometry;
  }, [shape]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#ddb25d"
        metalness={1}
        roughness={0.18}
        clearcoat={1}
        clearcoatRoughness={0.12}
        reflectivity={1}
        envMapIntensity={2.4}
        map={texture}
      />
    </mesh>
  );
}

function LMLogo({ pointer, progress }) {
  const groupRef = useRef(null);
  const texture = useMemo(() => goldTexture(), []);
  const lShape = useMemo(() => createLShape(), []);
  const mShape = useMemo(() => createMShape(), []);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const targetY = (pointer?.x || 0) * 0.35;
    const targetX = -0.08 + (pointer?.y || 0) * -0.18;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.06;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.06;
    groupRef.current.position.y =
      0.22 + Math.sin(state.clock.elapsedTime * 0.9) * 0.05 + progress * 0.1;
  });

  return (
    <group ref={groupRef} scale={0.9}>
      <ExtrudedLetter shape={lShape} position={[-3.75, 0, 0]} texture={texture} />
      <ExtrudedLetter shape={mShape} position={[2.15, 0, 0]} texture={texture} />
    </group>
  );
}

function LogoPedestal() {
  return (
    <>
      <mesh position={[0, -3.1, -0.55]} receiveShadow>
        <cylinderGeometry args={[5.3, 6, 0.52, 64]} />
        <meshStandardMaterial color="#17120f" roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh position={[0, -2.8, -1.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6.4, 64]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </>
  );
}

export function SceneFallback() {
  return (
    <div className="lm-scene-fallback">
      <div className="lm-fallback-room">
        <div className="lm-fallback-object lm-logo-fallback-l" />
        <div className="lm-fallback-object lm-logo-fallback-base" />
        <div className="lm-fallback-object lm-logo-fallback-m-left" />
        <div className="lm-fallback-object lm-logo-fallback-m-right" />
        <div className="lm-fallback-object lm-logo-fallback-m-leg" />
      </div>
      <div className="lm-fallback-card">
        <span>Logo Mode</span>
        <strong>Gold LM preview</strong>
      </div>
    </div>
  );
}

export default function LMLogoScene({ pointer, progress = 0, mobile = false }) {
  if (mobile) {
    return <SceneFallback />;
  }

  return (
    <div className="lm-scene-shell">
      <Canvas
        dpr={[1, 1.8]}
        shadows
        camera={{ position: [0, 0.9, 16], fov: 24 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#130f0d"]} />
        <fog attach="fog" args={["#130f0d", 14, 28]} />

        <ambientLight intensity={0.45} color="#ffd8a1" />
        <spotLight
          position={[2, 8, 10]}
          angle={0.42}
          penumbra={1}
          intensity={120}
          color="#fff0c5"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <spotLight
          position={[-7, 3, 8]}
          angle={0.36}
          penumbra={1}
          intensity={45}
          color="#c8863e"
        />
        <directionalLight position={[8, 4, 7]} intensity={2.4} color="#ffda98" />

        <Suspense fallback={<LoadingFallback />}>
          <Environment preset="studio" />
          <LMLogo pointer={pointer} progress={progress} />
          <LogoPedestal />
        </Suspense>

        <ContactShadows position={[0, -3.05, 0]} opacity={0.42} scale={14} blur={2.8} far={10} />
        <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={1.75} minPolarAngle={1.35} />
      </Canvas>

      <div className="lm-scene-glow lm-scene-glow-a" />
      <div className="lm-scene-glow lm-scene-glow-b" />
    </div>
  );
}
