import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function SceneLighting({ lighting, globalBrightness, placedLights, moodAmbient }) {
  const ambientRef = useRef();
  const sunRef     = useRef();
  const fillRef    = useRef();

  const colors = useRef({
    ambient:       new THREE.Color(lighting.ambientColor),
    sun:           new THREE.Color(lighting.sunColor),
    targetAmbient: new THREE.Color(),
    targetSun:     new THREE.Color(),
  });

  const intensities = useRef({
    ambient: lighting.ambientIntensity * globalBrightness,
    sun:     lighting.sunIntensity     * globalBrightness,
  });

  useFrame((_, delta) => {
    const speed = Math.min(delta * 2.0, 1);
    const col   = colors.current;
    const ints  = intensities.current;

    col.targetAmbient.set(moodAmbient || lighting.ambientColor);
    col.targetSun.set(lighting.sunColor);
    col.ambient.lerp(col.targetAmbient, speed);
    col.sun.lerp(col.targetSun, speed);

    const targetAmbientI = lighting.ambientIntensity * globalBrightness;
    const targetSunI     = lighting.sunIntensity     * globalBrightness;
    ints.ambient = THREE.MathUtils.lerp(ints.ambient, targetAmbientI, speed);
    ints.sun     = THREE.MathUtils.lerp(ints.sun,     targetSunI,     speed);

    if (ambientRef.current) {
      ambientRef.current.intensity = ints.ambient;
      ambientRef.current.color.copy(col.ambient);
    }
    if (sunRef.current) {
      sunRef.current.intensity = ints.sun;
      sunRef.current.color.copy(col.sun);
    }
    // Fill light tracks at half sun intensity for soft shadow fill
    if (fillRef.current) {
      fillRef.current.intensity = ints.sun * 0.35;
    }
  });

  return (
    <>
      <ambientLight
        ref={ambientRef}
        intensity={lighting.ambientIntensity * globalBrightness}
        color={lighting.ambientColor}
      />

      {/* ── Key light — repositioned above-front-centre, softened ── */}
      <directionalLight
        ref={sunRef}
        position={[2, 10, 6]}
        intensity={lighting.sunIntensity * globalBrightness * 0.75}
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

      {/* ── Fill light — left side, no shadow, half intensity ── */}
      <directionalLight
        ref={fillRef}
        position={[-6, 6, 2]}
        intensity={lighting.sunIntensity * globalBrightness * 0.35}
        color={lighting.sunColor}
        castShadow={false}
      />

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
