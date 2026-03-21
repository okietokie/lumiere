// src/components/threeD/furniture/ModelPreview.jsx
// Preview panel — uses a Canvas that only mounts when actively hovering.
// Destroyed after a short delay when hover ends to free WebGL context.
import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { SkeletonUtils } from 'three-stdlib';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, Bounds } from '@react-three/drei';
import * as THREE from 'three';

function toDirectUrl(b2Url) { return b2Url || null; }

// ── Module-level state shared between ModelPreview triggers and PreviewPortal ─
let _setPreviewState = null;

export function PreviewPortal() {
  const [state, setState] = useState({ model: null, left: -9999, top: -9999, mounted: false });
  const hideTimer = useRef(null);

  useEffect(() => {
    _setPreviewState = ({ model, left, top }) => {
      clearTimeout(hideTimer.current);
      if (model) {
        // Show immediately
        setState({ model, left, top, mounted: true });
      } else {
        // Hide visually right away, but keep Canvas mounted briefly to avoid flicker
        setState((prev) => ({ ...prev, left: -9999, top: -9999 }));
        // Fully unmount Canvas after 2s of inactivity — frees WebGL context
        hideTimer.current = setTimeout(() => {
          setState({ model: null, left: -9999, top: -9999, mounted: false });
        }, 2000);
      }
    };
    return () => {
      _setPreviewState = null;
      clearTimeout(hideTimer.current);
    };
  }, []);

  const visible = state.left > 0 && state.model;

  return (
    <div style={{
      position:      'fixed',
      zIndex:        9999,
      left:          state.left,
      top:           state.top,
      width:         200,
      height:        200,
      borderRadius:  14,
      overflow:      'hidden',
      border:        '1px solid rgba(196,154,108,0.35)',
      background:    '#1E1917',
      boxShadow:     '0 16px 40px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
      opacity:       visible ? 1 : 0,
      transition:    'opacity 0.15s',
    }}>
      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1,
        padding: '6px 10px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
        color: '#C49A6C', fontSize: 11,
        fontFamily: 'Inter, sans-serif', fontWeight: 500,
        textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {state.model?.name || ''}
      </div>

      {/* Canvas — only mounted when needed */}
      {state.mounted && state.model && (
        <Canvas
          frameloop="always"
          camera={{ position: [2, 2, 2], fov: 45 }}
          gl={{
            antialias:             true,
            alpha:                 false,
            powerPreference:       'low-power',   // ← use low-power to save contexts
            toneMapping:           THREE.ACESFilmicToneMapping,
            toneMappingExposure:   0.9,
          }}
          style={{ background: 'linear-gradient(135deg, #2C2420 0%, #1A1410 100%)' }}
        >
          <ambientLight intensity={0.4} color="#FFF5E6" />
          <directionalLight position={[3, 5, 3]} intensity={0.8} color="#FFEAD2" />

          <PreviewErrorBoundary key={state.model.url}>
            <Suspense fallback={<LoadingSpinner />}>
              <PreviewModel url={toDirectUrl(state.model.url)} />
            </Suspense>
          </PreviewErrorBoundary>

          <OrbitControls
            autoRotate autoRotateSpeed={2.5}
            enableZoom={false} enablePan={false} enableRotate={false}
          />
        </Canvas>
      )}
    </div>
  );
}

// ── Lightweight trigger ───────────────────────────────────────────────────────
export default function ModelPreview({ model, anchorEl }) {
  useEffect(() => {
    if (!anchorEl || !model || !_setPreviewState) return;
    const rect       = anchorEl.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const left = spaceRight >= 210 ? rect.right + 8 : rect.left - 210;
    const top  = spaceRight >= 210
      ? Math.min(rect.top, window.innerHeight - 230)
      : rect.top;
    _setPreviewState({ model, left: Math.max(8, left), top: Math.max(8, top) });
    return () => { _setPreviewState?.({ model: null, left: -9999, top: -9999 }); };
  }, [model, anchorEl]);

  return null;
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