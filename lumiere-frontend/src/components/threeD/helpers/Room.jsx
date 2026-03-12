// src/components/helpers/Room.jsx
import { useMemo, useRef, useEffect } from "react";
import { gsap } from "gsap";
import * as THREE from 'three';

function Room({ width, height, depth, wallColor, floorColor, ceilingColor }) {
  const roomGroupRef = useRef(null);
  const wallsRef = useRef([]);
  const floorRef = useRef(null);
  const ceilingRef = useRef(null);

  // GSAP animation when room dimensions/colors change
  useEffect(() => {
    if (roomGroupRef.current) {
      // Subtle bounce animation
      gsap.to(roomGroupRef.current.position, {
        y: 0.05,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
      
      // Pulse effect on floor
      if (floorRef.current) {
        gsap.to(floorRef.current.material, {
          emissiveIntensity: 0.15,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut"
        });
      }
    }
  }, [width, height, depth, wallColor, floorColor, ceilingColor]);

  // Initial entrance animation
  useEffect(() => {
    if (roomGroupRef.current) {
      gsap.from(roomGroupRef.current.position, {
        y: -1,
        duration: 1.2,
        ease: "elastic.out(1, 0.3)"
      });
      
      gsap.from(roomGroupRef.current.children, {
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power2.out",
        delay: 0.2
      });
    }
  }, []);

  const thickness = 0.1;

  const walls = useMemo(() => [
    // Back wall (no rotation – thin in Z)
    { 
      position: [0, height / 2, -depth / 2 + thickness/2], 
      rotation: [0, 0, 0], 
      size: [width, height, thickness], 
      ref: el => wallsRef.current[0] = el 
    },
    // Left wall (no rotation – thin in X)
    { 
      position: [-width / 2 + thickness/2, height / 2, 0], 
      rotation: [0, 0, 0], 
      size: [thickness, height, depth], 
      ref: el => wallsRef.current[1] = el 
    },
    // Right wall (no rotation – thin in X)
    { 
      position: [width / 2 - thickness/2, height / 2, 0], 
      rotation: [0, 0, 0], 
      size: [thickness, height, depth], 
      ref: el => wallsRef.current[2] = el 
    }
  ], [width, height, depth]);

  return (
    <group ref={roomGroupRef}>
      {/* Floor */}
      <mesh 
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color={floorColor}
          roughness={0.65}
          metalness={0.15}
          emissive={floorColor}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Walls – double-sided so visible from inside */}
      {walls.map((wall, i) => (
        <mesh
          key={i}
          ref={wall.ref}
          position={wall.position}
          rotation={wall.rotation}
          receiveShadow
          castShadow
        >
          <boxGeometry args={wall.size} />
          <meshStandardMaterial 
            color={wallColor}
            roughness={0.55}
            metalness={0.1}
            emissive={wallColor}
            emissiveIntensity={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Ceiling – visible from below */}
      <mesh 
        ref={ceilingRef}
        position={[0, height, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color={ceilingColor}
          roughness={0.7}
          metalness={0.05}
          emissive={ceilingColor}
          emissiveIntensity={0.03}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Baseboard trim (optional) */}
      <mesh position={[0, 0.1, -depth / 2 + 0.08]}>
        <boxGeometry args={[width, 0.1, 0.05]} />
        <meshStandardMaterial color="#4A3F3A" roughness={0.8} />
      </mesh>
      <mesh position={[-width / 2 + 0.08, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.1, depth]} />
        <meshStandardMaterial color="#4A3F3A" roughness={0.8} />
      </mesh>
      <mesh position={[width / 2 - 0.08, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.1, depth]} />
        <meshStandardMaterial color="#4A3F3A" roughness={0.8} />
      </mesh>
    </group>
  );
}

export default Room;