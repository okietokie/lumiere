// src/components/threeD/furniture/ModelPreview.jsx
// Uses a single persistent Canvas shared across all previews — no WebGL
// context creation on every hover. Model swaps instantly via useGLTF cache.
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { SkeletonUtils } from 'three-stdlib';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, Bounds } from '@react-three/drei';
import * as THREE from 'three';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function toDirectUrl(b2Url) {
  return b2Url || null;
}

// ── Single persistent Canvas mounted once at app level ────────────────────────
// The panel moves via CSS; the Canvas never unmounts.
let _setPreviewModel = null;

export function PreviewPortal() {
  const [model,  setModel]  = useState(null);
  const [pos,    setPos]    = useState({ left: -9999, top: -9999 });
  const panelRef = useRef(null);

  // Expose setters so ModelPreview can update from outside
  useEffect(() => {
    _setPreviewModel = ({ model, left, top }) => {
      setModel(model);
      setPos({ left, top });
    };
    return () => { _setPreviewModel = null; };
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position:  'fixed',
        zIndex:    9999,
        left:      pos.left,
        top:       pos.top,
        width:     200,
        height:    200,
        borderRadius: 14,
        overflow:  'hidden',
        border:    '1px solid rgba(196,154,108,0.35)',
        background: '#1E1917',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
        // Hide when no model selected
        opacity:   model ? 1 : 0,
        transition: 'opacity 0.1s',
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
        {model?.name || ''}
      </div>

      {/* Single persistent Canvas — never remounts */}
      <Canvas
        frameloop="always"
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

        {model && (
          <PreviewErrorBoundary key={model.url}>
            <Suspense fallback={<LoadingSpinner />}>
              <PreviewModel url={toDirectUrl(model.url)} />
            </Suspense>
          </PreviewErrorBoundary>
        )}

        <OrbitControls
          autoRotate autoRotateSpeed={2.5}
          enableZoom={false} enablePan={false} enableRotate={false}
        />
      </Canvas>
    </div>
  );
}

// ── Lightweight trigger — just moves the panel, no Canvas created ─────────────
export default function ModelPreview({ model, anchorEl }) {
  useEffect(() => {
    if (!anchorEl || !model || !_setPreviewModel) return;
    const rect       = anchorEl.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const left = spaceRight >= 210 ? rect.right + 8 : rect.left;
    const top  = spaceRight >= 210
      ? Math.min(rect.top, window.innerHeight - 230)
      : rect.top - 220;
    _setPreviewModel({ model, left, top });
    return () => { if (_setPreviewModel) _setPreviewModel({ model: null, left: -9999, top: -9999 }); };
  }, [model, anchorEl]);

  return null; // renders nothing — panel lives in PreviewPortal
}

// ── Model renderer ────────────────────────────────────────────────────────────
function PreviewModel({ url }) {
  if (!url) return <NotAvailablePlaceholder />;
  const { scene } = useGLTF(url);
  const cloned = React.useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return clone;
  }, [scene]);
  return <Bounds fit clip observe margin={1.2}><Center><primitive object={cloned} /></Center></Bounds>;
}

class PreviewErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('[ModelPreview] Load failed:', err?.message); }
  render() {
    if (this.state.failed) return <NotAvailablePlaceholder />;
    return this.props.children;
  }
}

function NotAvailablePlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshBasicMaterial color="#7A6559" wireframe />
    </mesh>
  );
}

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