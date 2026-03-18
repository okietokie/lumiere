// src/components/threeD/lighting/SceneLighting.jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function SceneLighting({ lighting, globalBrightness, placedLights, moodAmbient }) {
  const ambientRef = useRef();
  const sunRef     = useRef();

  // ── Pre-allocate THREE.Color objects ONCE — never inside useFrame ────────────
  const colors = useRef({
    ambient: new THREE.Color(lighting.ambientColor),
    sun:     new THREE.Color(lighting.sunColor),
    // Reusable target colors — set() them instead of new THREE.Color() each frame
    targetAmbient: new THREE.Color(),
    targetSun:     new THREE.Color(),
  });

  // Track smooth current intensities
  const intensities = useRef({
    ambient: lighting.ambientIntensity * globalBrightness,
    sun:     lighting.sunIntensity     * globalBrightness,
  });

  useFrame((_, delta) => {
    const speed = Math.min(delta * 2.0, 1); // cap so tab-switch doesn't jump
    const col   = colors.current;
    const ints  = intensities.current;

    // Set target colors using .set() — no allocation
    col.targetAmbient.set(moodAmbient || lighting.ambientColor);
    col.targetSun.set(lighting.sunColor);

    // Lerp current colors toward targets
    col.ambient.lerp(col.targetAmbient, speed);
    col.sun.lerp(col.targetSun, speed);

    // Lerp intensities
    const targetAmbientI = lighting.ambientIntensity * globalBrightness;
    const targetSunI     = lighting.sunIntensity     * globalBrightness;
    ints.ambient = THREE.MathUtils.lerp(ints.ambient, targetAmbientI, speed);
    ints.sun     = THREE.MathUtils.lerp(ints.sun,     targetSunI,     speed);

    // Apply — mutate existing objects, never replace
    if (ambientRef.current) {
      ambientRef.current.intensity = ints.ambient;
      ambientRef.current.color.copy(col.ambient);
    }
    if (sunRef.current) {
      sunRef.current.intensity = ints.sun;
      sunRef.current.color.copy(col.sun);
    }
  });

  return (
    <>
      <ambientLight
        ref={ambientRef}
        intensity={lighting.ambientIntensity * globalBrightness}
        color={lighting.ambientColor}
      />
      <directionalLight
        ref={sunRef}
        position={[8, 8, 5]}
        intensity={lighting.sunIntensity * globalBrightness}
        color={lighting.sunColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* Placed lights — NO castShadow on point/spot lights (too expensive) */}
      {placedLights.map((light) => (
        <PlacedLightSource key={light.id} light={light} />
      ))}
    </>
  );
}

function PlacedLightSource({ light }) {
  if (!light.enabled) return null;
  const [x, y, z] = light.position;

  if (light.type === 'spot') {
    return (
      <spotLight
        position={[x, y, z]}
        intensity={light.intensity}
        color={light.color}
        distance={light.distance}
        angle={light.angle}
        penumbra={0.4}
      />
    );
  }
  return (
    <pointLight
      position={[x, y, z]}
      intensity={light.intensity}
      color={light.color}
      distance={light.distance}
    />
  );
}
