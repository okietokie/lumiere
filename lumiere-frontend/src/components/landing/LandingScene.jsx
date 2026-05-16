import React, { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Html,
  PerspectiveCamera,
  RoundedBox,
} from "@react-three/drei";
import { PerformanceFrameMonitor, usePerformanceMode } from "../../providers/PerformanceModeProvider.jsx";

function LoadingFallback() {
  return (
    <Html center>
      <div className="lm-scene-loading">Loading scene</div>
    </Html>
  );
}

function HeroRoom({ progress, pointer, animate = true }) {
  const group = useRef(null);
  const house = useRef(null);
  const plant = useRef(null);

  useFrame((state) => {
    if (!group.current) return;

    const t = state.clock.elapsedTime;
    group.current.rotation.y = pointer.x * (animate ? 0.2 : 0.1);
    group.current.rotation.x = pointer.y * (animate ? 0.08 : 0.04);
    group.current.position.y = 0.24 + (animate ? Math.sin(t * 0.7) * 0.04 : 0) + progress * 0.08;

    if (house.current) {
      house.current.rotation.y = (animate ? Math.sin(t * 0.45) * 0.04 : 0) + pointer.x * 0.12;
      house.current.position.x = pointer.x * (animate ? 0.24 : 0.12);
    }

    if (plant.current && animate) {
      plant.current.rotation.z = Math.sin(t * 1.1) * 0.05;
    }
  });

  return (
    <Float speed={animate ? 1.1 : 0.6} rotationIntensity={animate ? 0.18 : 0.05} floatIntensity={animate ? 0.2 : 0.04}>
      <group ref={group} position={[0, 0.24, 0]} scale={1.08 - progress * 0.06}>
        <group ref={house} position={[0, 0.95, -0.1]}>
          <RoundedBox args={[3.4, 2.1, 2.7]} radius={0.18} smoothness={6} castShadow receiveShadow>
            <meshStandardMaterial color="#8d6850" roughness={0.72} metalness={0.08} />
          </RoundedBox>

          <mesh position={[0, 1.36, 0]} castShadow>
            <coneGeometry args={[1.88, 1.22, 4]} />
            <meshStandardMaterial color="#5f4133" roughness={0.88} metalness={0.04} />
          </mesh>

          <mesh position={[0, 0.28, 1.37]} castShadow>
            <boxGeometry args={[0.74, 1.22, 0.08]} />
            <meshStandardMaterial color="#4b3226" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.08, 1.42]}>
            <boxGeometry args={[0.16, 0.48, 0.04]} />
            <meshStandardMaterial color="#d5b088" roughness={0.28} metalness={0.18} />
          </mesh>

          <mesh position={[-0.98, 0.64, 1.38]}>
            <boxGeometry args={[0.72, 0.58, 0.08]} />
            <meshStandardMaterial
              color="#d8cab9"
              roughness={0.12}
              metalness={0.08}
              transparent
              opacity={0.5}
            />
          </mesh>
          <mesh position={[0.98, 0.64, 1.38]}>
            <boxGeometry args={[0.72, 0.58, 0.08]} />
            <meshStandardMaterial
              color="#d8cab9"
              roughness={0.12}
              metalness={0.08}
              transparent
              opacity={0.5}
            />
          </mesh>

          <mesh position={[-1.62, -0.1, 0]} scale={[0.12, 1.8, 2.26]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6f4d3c" roughness={0.8} />
          </mesh>
          <mesh position={[1.62, -0.1, 0]} scale={[0.12, 1.8, 2.26]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6f4d3c" roughness={0.8} />
          </mesh>
        </group>

        <group position={[0, 0.14, 0.32]}>
          <RoundedBox args={[1.32, 0.34, 0.62]} radius={0.12} smoothness={6} castShadow>
            <meshStandardMaterial color="#d1ab84" roughness={0.6} metalness={0.06} />
          </RoundedBox>
          <RoundedBox args={[0.28, 0.86, 0.58]} radius={0.12} smoothness={6} position={[-0.52, 0.22, 0]} castShadow>
            <meshStandardMaterial color="#c49369" roughness={0.56} />
          </RoundedBox>
          <RoundedBox args={[0.28, 0.86, 0.58]} radius={0.12} smoothness={6} position={[0.52, 0.22, 0]} castShadow>
            <meshStandardMaterial color="#c49369" roughness={0.56} />
          </RoundedBox>
          <RoundedBox args={[1.06, 0.32, 0.24]} radius={0.08} smoothness={6} position={[0, 0.42, -0.18]} castShadow>
            <meshStandardMaterial color="#e7cfb7" roughness={0.42} />
          </RoundedBox>
        </group>

        <group position={[-1.7, 0.24, 0.32]} castShadow>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.18, 28]} />
            <meshStandardMaterial color="#9a7358" roughness={0.72} />
          </mesh>
          <group ref={plant} position={[0, 0.16, 0]}>
            <mesh position={[0, 0.34, 0]} castShadow>
              <sphereGeometry args={[0.24, 24, 24]} />
              <meshStandardMaterial color="#647b5a" roughness={0.9} />
            </mesh>
            <mesh position={[0.18, 0.24, 0.02]} castShadow>
              <sphereGeometry args={[0.16, 18, 18]} />
              <meshStandardMaterial color="#7e936e" roughness={0.9} />
            </mesh>
            <mesh position={[-0.18, 0.22, -0.04]} castShadow>
              <sphereGeometry args={[0.14, 18, 18]} />
              <meshStandardMaterial color="#728765" roughness={0.9} />
            </mesh>
          </group>
        </group>

        <group position={[1.58, 0.18, -0.1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.96, 20]} />
            <meshStandardMaterial color="#caa278" roughness={0.34} metalness={0.22} />
          </mesh>
          <mesh position={[0, 0.58, 0]} castShadow>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial
              color="#f2dcc2"
              emissive="#d6a873"
              emissiveIntensity={0.45 + progress * 0.22}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[0.34, 0.4, 0.08, 24]} />
            <meshStandardMaterial color="#6b4939" roughness={0.7} />
          </mesh>
        </group>

        <group position={[0, -0.06, 1.52]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.5, 0.08, 32]} />
            <meshStandardMaterial color="#5d3f31" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.1, 0.36, 0.1]} />
            <meshStandardMaterial color="#8b644d" roughness={0.58} />
          </mesh>
        </group>
      </group>
    </Float>
  );
}

function RoomShell({ progress }) {
  const opacity = 0.88 - progress * 0.26;

  return (
    <group position={[0, 0.26, -0.2]}>
      <mesh position={[0, -0.14, 0]} scale={[4.5, 0.14, 4.5]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#35241d" roughness={0.88} metalness={0.08} />
      </mesh>

      <mesh position={[0, 1.32, -2.2]} scale={[5.2, 2.9, 0.1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#554136" transparent opacity={opacity} roughness={0.96} />
      </mesh>
      <mesh position={[-2.08, 1.32, -0.06]} scale={[0.1, 2.9, 4.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#473329" transparent opacity={opacity - 0.05} roughness={0.94} />
      </mesh>
      <mesh position={[2.08, 1.32, -0.06]} scale={[0.1, 2.9, 4.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#614638" transparent opacity={opacity - 0.04} roughness={0.94} />
      </mesh>

      <mesh position={[-1.2, 1.12, -2.14]} scale={[0.72, 1.62, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7d5f4b" roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh position={[1.16, 1.34, -2.12]} scale={[1.1, 0.92, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#d8c4ae"
          roughness={0.15}
          metalness={0.12}
          transparent
          opacity={0.32 + progress * 0.18}
        />
      </mesh>
      <mesh position={[0.42, 0.4, 0.28]} scale={[1.2, 0.32, 0.8]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8b684f" roughness={0.58} metalness={0.18} />
      </mesh>
      <mesh position={[-0.96, 0.62, 0.82]} castShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.82, 32]} />
        <meshStandardMaterial color="#c49a72" roughness={0.24} metalness={0.32} />
      </mesh>
    </group>
  );
}

function AccentObjects({ pointer, animate = true }) {
  const left = useRef(null);
  const right = useRef(null);

  useFrame((state) => {
    if (left.current) {
      left.current.rotation.x = (animate ? Math.sin(state.clock.elapsedTime * 0.6) * 0.06 : 0) + pointer.y * 0.12;
      left.current.position.x = -2.5 + pointer.x * (animate ? 0.14 : 0.08);
    }
    if (right.current && animate) {
      right.current.rotation.y -= 0.003;
    }
    if (right.current) right.current.position.x = 2.35 + pointer.x * (animate ? 0.12 : 0.06);
  });

  return (
    <>
      <Float speed={animate ? 1.3 : 0.7} rotationIntensity={animate ? 0.4 : 0.08} floatIntensity={animate ? 0.4 : 0.08}>
        <group ref={left} position={[-2.9, 1.04, -1.26]} scale={0.44}>
          <RoundedBox args={[1.9, 0.16, 1.9]} radius={0.18} smoothness={6}>
            <meshStandardMaterial color="#6f4d3c" roughness={0.54} metalness={0.28} />
          </RoundedBox>
          <mesh position={[0, 0.16, 0]}>
            <torusGeometry args={[0.6, 0.08, 18, 64]} />
            <meshStandardMaterial color="#eedcc5" roughness={0.16} metalness={0.58} />
          </mesh>
        </group>
      </Float>

      <Float speed={animate ? 1 : 0.55} rotationIntensity={animate ? 0.35 : 0.06} floatIntensity={animate ? 0.42 : 0.06}>
        <group ref={right} position={[2.7, 1.86, -1.74]} scale={0.34}>
          <mesh castShadow>
            <octahedronGeometry args={[0.82, 0]} />
            <meshStandardMaterial color="#b58560" roughness={0.28} metalness={0.38} />
          </mesh>
        </group>
      </Float>
    </>
  );
}

function CameraRig({ pointer, progress }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.x += ((pointer.x || 0) * 0.48 - camera.position.x) * 0.04;
    camera.position.y += (2.38 + (pointer.y || 0) * -0.2 - camera.position.y) * 0.04;
    camera.position.z += (8.4 - progress * 0.9 - camera.position.z) * 0.04;
    camera.lookAt(pointer.x * 0.35, 1.08 + progress * 0.12, 0.12);
  });

  return null;
}

export function SceneFallback() {
  return (
    <div className="lm-scene-fallback">
      <div className="lm-fallback-room">
        <div className="lm-fallback-wall lm-fallback-wall-back" />
        <div className="lm-fallback-wall lm-fallback-wall-left" />
        <div className="lm-fallback-wall lm-fallback-wall-right" />
        <div className="lm-fallback-object lm-fallback-object-main" />
        <div className="lm-fallback-object lm-fallback-object-side" />
      </div>
      <div className="lm-fallback-card">
        <span>Live preview</span>
        <strong>Responsive scene fallback</strong>
      </div>
    </div>
  );
}

export default function LandingScene({ pointer, progress = 0, mobile = false }) {
  const { quality, isLite } = usePerformanceMode();

  if (mobile && quality.reduceMotion) {
    return <SceneFallback />;
  }

  return (
    <div className="lm-scene-shell">
      <Canvas
        dpr={quality.landingDpr}
        shadows={quality.shadows}
        gl={{ antialias: quality.antialias, alpha: false, powerPreference: isLite ? "default" : "high-performance" }}
      >
        <PerformanceFrameMonitor label="landing scene" />
        <PerspectiveCamera makeDefault position={[0, 2.38, 8.4]} fov={32} />
        <CameraRig pointer={pointer} progress={progress} />

        <ambientLight intensity={0.78} color="#b28b68" />
        <spotLight
          position={[5, 8, 4]}
          intensity={65}
          angle={0.34}
          penumbra={1}
          castShadow={quality.shadows}
          color="#f0c89d"
        />
        <spotLight
          position={[-4, 6, 5]}
          intensity={quality.lightAnimation ? 30 + progress * 10 : 24}
          angle={0.38}
          penumbra={1}
          color="#8d5b3f"
        />

        <Suspense fallback={<LoadingFallback />}>
          {quality.environment ? <Environment preset="apartment" /> : null}
          <RoomShell progress={progress} />
          <AccentObjects pointer={pointer} animate={quality.floatEffects} />
          <HeroRoom progress={progress} pointer={pointer} animate={quality.floatEffects} />
        </Suspense>

        {quality.contactShadows ? (
          <ContactShadows position={[0, -0.28, 0]} opacity={0.42} scale={10} blur={2.6} far={7} />
        ) : null}
      </Canvas>

      <div className="lm-scene-glow lm-scene-glow-a" />
      <div className="lm-scene-glow lm-scene-glow-b" />
    </div>
  );
}
