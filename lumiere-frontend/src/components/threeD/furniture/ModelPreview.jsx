// src/components/threeD/furniture/ModelPreview.jsx
import React, { Suspense, useEffect, useRef } from 'react';
import { SkeletonUtils } from 'three-stdlib';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, Bounds } from '@react-three/drei';
import * as THREE from 'three';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function ModelPreview({ model, anchorEl, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!anchorEl || !panelRef.current) return;
    const rect  = anchorEl.getBoundingClientRect();
    const panel = panelRef.current;
    const spaceRight = window.innerWidth - rect.right;
    if (spaceRight >= 200) {
      panel.style.left = `${rect.right + 8}px`;
      panel.style.top  = `${Math.min(rect.top, window.innerHeight - 230)}px`;
    } else {
      panel.style.left = `${rect.left}px`;
      panel.style.top  = `${rect.top - 220}px`;
    }
  }, [anchorEl]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed', zIndex: 9999,
        width: 200, height: 200,
        borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(196,154,108,0.35)',
        background: '#1E1917',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
      }}
    >
      {/* Name badge */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '6px 10px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
        color: '#C49A6C', fontSize: 11,
        fontFamily: 'Inter, sans-serif', fontWeight: 500,
        textAlign: 'center', zIndex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {model.name}
      </div>

      <Canvas
        frameloop="demand"
        camera={{ position: [2, 2, 2], fov: 45 }}
        gl={{
          antialias: true, alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        style={{ background: 'linear-gradient(135deg, #2C2420 0%, #1A1410 100%)' }}
      >
        <ambientLight intensity={0.4} color="#FFF5E6" />
        <directionalLight position={[3, 5, 3]} intensity={0.8} color="#FFEAD2" />
        <pointLight position={[-2, 3, -2]} intensity={0.3} color="#C49A6C" />

        {/* Suspense handles the GLTF load — spinner while loading, model when ready */}
        <Suspense fallback={<LoadingSpinner />}>
          <PreviewModel filename={model.filename} />
        </Suspense>

        <OrbitControls
          autoRotate autoRotateSpeed={2.5}
          enableZoom={false} enablePan={false} enableRotate={false}
        />
      </Canvas>
    </div>
  );
}

// ── Loads and displays the model — only mounts inside Suspense ────────────────
function PreviewModel({ filename }) {
  const url         = `${API_BASE}/api/models/download/${filename}`;
  const { scene }   = useGLTF(url);

  const cloned = React.useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    return clone;
  }, [scene]);

  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <primitive object={cloned} />
      </Center>
    </Bounds>
  );
}

// ── Spinning ring shown while the GLB is loading ──────────────────────────────
function LoadingSpinner() {
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.z += delta * 2; });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.3, 0.05, 8, 32]} />
      <meshBasicMaterial color="#C49A6C" />
    </mesh>
  );
}