import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LIGHT_TYPES } from '../../../hooks/useLighting';

export default function PlacedLight({
  light, isSelected, onSelect, updateLight, setOrbitEnabled,
}) {
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const glowRef  = useRef();
  const dragging = useRef(false);
  const bobOffset = useRef(Math.random() * Math.PI * 2); // random phase per light
  useFrame((state, delta) => {
    if (!glowRef.current || !light.enabled) return;

    const targetScale = isSelected ? 1.4 : hovered ? 1.1 : 0.85;
    glowRef.current.scale.setScalar(
      THREE.MathUtils.lerp(glowRef.current.scale.x, targetScale, delta * 6)
    );
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + bobOffset.current) * 0.06;
    const targetOpacity = (isSelected ? 0.85 : 0.45) * pulse;
    glowRef.current.material.opacity = THREE.MathUtils.lerp(
      glowRef.current.material.opacity,
      targetOpacity,
      delta * 8,
    );
  });
  const getWorldPos = (clientX, clientY) => {
    const rect  = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      ((clientY - rect.top)  / rect.height) * -2 + 1,
    );
    const ray  = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -light.position[1]);
    const hit   = new THREE.Vector3();
    ray.ray.intersectPlane(plane, hit);
    return hit;
  };

  const startDrag = (e) => {
    e.stopPropagation();
    if (!isSelected) { onSelect(); return; }
    setOrbitEnabled(false);
    dragging.current = true;
    const origin  = getWorldPos(e.clientX, e.clientY);
    const initPos = [...light.position];

    const onMove = (ev) => {
      if (!dragging.current) return;
      const pos = getWorldPos(ev.clientX, ev.clientY);
      if (!pos) return;
      updateLight(light.id, {
        position: [initPos[0] + (pos.x - origin.x), light.position[1], initPos[2] + (pos.z - origin.z)],
      });
    };
    const onUp = () => {
      dragging.current = false;
      setOrbitEnabled(true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  };

  const [x, y, z] = light.position;

  const shapes = {
    ceiling: { geo: <cylinderGeometry args={[0.15, 0.2,  0.1,  16]} />, bodyColor: '#E8E8E8' },
    lamp:    { geo: <cylinderGeometry args={[0.06, 0.12, 0.3,  12]} />, bodyColor: '#C8A870' },
    spot:    { geo: <coneGeometry     args={[0.12, 0.25, 12]}       />, bodyColor: '#303030' },
  };
  const shape = shapes[light.type] || shapes.ceiling;

  return (
    <group position={[x, y, z]}>

      {/* Body */}
      <mesh
        onPointerDown={startDrag}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'grab'; }}
        onPointerOut={()   => {                      setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e)       => { e.stopPropagation(); onSelect(); }}
        castShadow
      >
        {shape.geo}
        <meshStandardMaterial
          color={shape.bodyColor}
          emissive={light.enabled ? light.color : '#000000'}
          emissiveIntensity={light.enabled ? (isSelected ? 2.5 : hovered ? 1.5 : 1.0) : 0}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Glow — only mounted when light is on */}
      {light.enabled && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshBasicMaterial
            color={light.color}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.8} depthTest={false} />
        </mesh>
      )}

      {/* Drop line to floor */}
      {isSelected && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, 0, -y, 0]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FFD700" transparent opacity={0.5} />
        </line>
      )}
    </group>
  );
}

