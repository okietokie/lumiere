import { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap"; // Added GSAP for smooth teleporting

export default function FirstPersonControls({ position, setPosition, dimensions, isLocked, setIsLocked }) {
  const { camera, gl } = useThree();
  const [moveState, setMoveState] = useState({ 
    forward: false, 
    backward: false, 
    left: false, 
    right: false,
    sprint: false,
    jump: false 
  });
  
  const controlsRef = useRef();
  const velocity = useRef(new THREE.Vector3(0, 0, 0)); 

  // 1. Listen for position changes (like clicking a Preset View)
  useEffect(() => {
    // Instead of snapping, we smoothly glide the player to the preset location
    gsap.to(camera.position, {
      x: position[0],
      y: position[1], 
      z: position[2],
      duration: 1.2,
      ease: "power3.inOut"
    });
    
    // Optionally make the camera look at the center of the room when teleporting
    // Only do this if the player isn't actively walking around
    if (!isLocked) {
        gsap.to(camera.rotation, {
            x: 0,
            y: 0, // Faces forward roughly
            z: 0,
            duration: 1.2,
            ease: "power3.inOut"
        });
    }
  }, [position, camera, isLocked]); // Now it listens to the position prop!

  // 2. Handle Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.code) {
        case 'KeyW': setMoveState(prev => ({ ...prev, forward: true })); break;
        case 'KeyS': setMoveState(prev => ({ ...prev, backward: true })); break;
        case 'KeyA': setMoveState(prev => ({ ...prev, left: true })); break;
        case 'KeyD': setMoveState(prev => ({ ...prev, right: true })); break;
        case 'ShiftLeft': 
        case 'ShiftRight': setMoveState(prev => ({ ...prev, sprint: true })); break;
        case 'Space': setMoveState(prev => ({ ...prev, jump: true })); break;
        default: break;
      }
    };
    const handleKeyUp = (e) => {
      switch(e.code) {
        case 'KeyW': setMoveState(prev => ({ ...prev, forward: false })); break;
        case 'KeyS': setMoveState(prev => ({ ...prev, backward: false })); break;
        case 'KeyA': setMoveState(prev => ({ ...prev, left: false })); break;
        case 'KeyD': setMoveState(prev => ({ ...prev, right: false })); break;
        case 'ShiftLeft': 
        case 'ShiftRight': setMoveState(prev => ({ ...prev, sprint: false })); break;
        case 'Space': setMoveState(prev => ({ ...prev, jump: false })); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 3. Handle Pointer Lock Status & Sync State
  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setIsLocked(locked);
      
      if (!locked) {
        setPosition([camera.position.x, camera.position.y, camera.position.z]);
      }
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, [gl.domElement, setIsLocked, setPosition, camera]);

  // 4. Native Engine Loop
  useFrame((state, delta) => {
    if (!isLocked) return;

    const dt = Math.min(delta, 0.1); 
    
    const baseSpeed = 3.0;
    const currentSpeed = moveState.sprint ? baseSpeed * 1.8 : baseSpeed;

    const forwardVector = new THREE.Vector3();
    camera.getWorldDirection(forwardVector);
    forwardVector.y = 0; 
    forwardVector.normalize();

    const rightVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardVector).normalize();
    const movement = new THREE.Vector3();

    if (moveState.forward) movement.add(forwardVector);
    if (moveState.backward) movement.sub(forwardVector);
    if (moveState.left) movement.sub(rightVector);
    if (moveState.right) movement.add(rightVector);

    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(currentSpeed * dt);
    }

    const eyeLevel = 1.6;
    if (moveState.jump && camera.position.y <= eyeLevel) {
      velocity.current.y = 4.0; 
    }
    velocity.current.y -= 9.8 * dt; 

    let newX = camera.position.x + movement.x;
    let newY = camera.position.y + velocity.current.y * dt;
    let newZ = camera.position.z + movement.z;

    if (newY < eyeLevel) {
      newY = eyeLevel;
      velocity.current.y = 0;
    }

    if (dimensions) {
      const roomWidth = dimensions.width;
      const roomDepth = dimensions.depth;
      newX = Math.max(-roomWidth/2 + 0.5, Math.min(roomWidth/2 - 0.5, newX));
      newZ = Math.max(-roomDepth/2 + 0.5, Math.min(roomDepth/2 - 0.5, newZ));
    }

    camera.position.set(newX, newY, newZ);
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      camera={camera}
      domElement={gl.domElement}
      selector="#__next" 
      pointerSpeed={0.5}
    />
  );
}