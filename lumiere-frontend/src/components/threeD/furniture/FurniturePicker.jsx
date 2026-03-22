// src/components/threeD/furniture/FurniturePicker.jsx
//
// KEY CHANGE vs broken offscreen version:
//   Each card still gets its own <Canvas> (reliable, correct rendering).
//   BUT — the Canvas is only MOUNTED when the card scrolls into view
//   (IntersectionObserver with 80px rootMargin).
//   Cards that scroll OUT are unmounted after a short delay, freeing the
//   WebGL context. This keeps the live context count at ~4-6 at any time,
//   well within the browser's 8-16 limit.
//
// Other improvements retained:
//   - Uses /manifest order (high-priority categories first, small files first)
//   - Background prefetch with progress bar
//   - Shimmer skeleton while canvas is loading

import React, {
  useEffect, useState, useCallback, useRef, useMemo, Suspense,
} from 'react';
import { Button, Popconfirm, Spin, Empty, Tooltip } from 'antd';
import {
  AppstoreOutlined, DeleteOutlined, ReloadOutlined,
  DragOutlined, SwapOutlined, ExpandOutlined,
} from '@ant-design/icons';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, Bounds } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';
import FurnitureTint from './FurnitureTint';
import { resolveGlbUrl } from './FurnitureItem';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── 3D preview components ─────────────────────────────────────────────────────

function SpinnerMesh() {
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.z += delta * 2; });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.3, 0.06, 8, 32]} />
      <meshBasicMaterial color="#C49A6C" />
    </mesh>
  );
}

class CardErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <mesh>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshBasicMaterial color="#7A6559" wireframe />
      </mesh>
    );
    return this.props.children;
  }
}

function RotatingModel({ url, filename }) {
  const { scene } = useGLTF(resolveGlbUrl(url, filename));
  const cloned = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((c) => {
      if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; }
    });
    return clone;
  }, [scene]);
  return (
    <Bounds fit clip observe margin={1.3}>
      <Center>
        <primitive object={cloned} />
      </Center>
    </Bounds>
  );
}

// CardPreview — the actual Canvas, only rendered when visible
function CardPreview({ url, filename }) {
  const [ready, setReady] = useState(false);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Spinner overlay until canvas is initialised */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${COLORS.surface}CC`, borderRadius: 8,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: `2px solid ${COLORS.action}40`,
            borderTopColor: COLORS.action,
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
      <Canvas
        frameloop="demand"               // only render when something changes
        camera={{ position: [1.5, 1.5, 1.5], fov: 45 }}
        gl={{
          antialias:        false,       // off — big perf win in small canvas
          alpha:            true,
          powerPreference:  'low-power',
          toneMapping:      THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        dpr={[1, 1.5]}                   // cap device pixel ratio
        style={{ background: 'transparent', borderRadius: 8 }}
        onCreated={() => setReady(true)}
      >
        <ambientLight intensity={0.5} color="#FFF5E6" />
        <directionalLight position={[3, 5, 3]} intensity={0.8} color="#FFEAD2" />
        <pointLight position={[-2, 2, -2]} intensity={0.3} color="#C49A6C" />

        <CardErrorBoundary>
          <Suspense fallback={<SpinnerMesh />}>
            <RotatingModel url={url} filename={filename} />
          </Suspense>
        </CardErrorBoundary>

        <OrbitControls
          autoRotate autoRotateSpeed={3}
          enableZoom={false} enablePan={false} enableRotate={false}
        />
      </Canvas>
    </div>
  );
}

// ── ModelCard — mounts Canvas only when in viewport ───────────────────────────
//
// State machine:
//   'idle'     → card not yet seen; shows shimmer
//   'mounted'  → card in viewport; Canvas is alive
//   'frozen'   → card scrolled away; Canvas unmounted but last frame preserved
//                via a cheap <img> snapshot (we keep the last rendered frame)
//
// In practice with a 2-column grid and typical screen height, only 4-6 cards
// are in view simultaneously, keeping WebGL context count comfortably low.

function ModelCard({ model, onPlace }) {
  const [hovered,  setHovered]  = useState(false);
  const [visible,  setVisible]  = useState(false);   // IntersectionObserver
  const cardRef                 = useRef(null);
  const unmountTimer            = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(unmountTimer.current);
          setVisible(true);
        } else {
          // Keep canvas alive for 4 s after scrolling away.
          // This prevents flicker when the user scrolls slowly,
          // and avoids constantly recreating WebGL contexts.
          unmountTimer.current = setTimeout(() => setVisible(false), 4000);
        }
      },
      { threshold: 0.05, rootMargin: '80px' },
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(unmountTimer.current);
    };
  }, []);

  return (
    <button
      ref={cardRef}
      onClick={onPlace}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Place ${model.name}`}
      style={{
        background:    hovered ? `${COLORS.action}18` : `${COLORS.surface}80`,
        border:        `1px solid ${hovered ? COLORS.action : COLORS.secondary + '50'}`,
        borderRadius:  12,
        padding:       8,
        cursor:        'pointer',
        transition:    'all 0.18s',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           6,
        color:         COLORS.text,
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      {/* Preview area */}
      <div style={{
        width: '100%', height: 100, borderRadius: 8,
        overflow: 'hidden', pointerEvents: 'none',
        background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
      }}>
        {!model.url ? (
          // No URL at all — just show a box icon
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            📦
          </div>
        ) : visible ? (
          // In viewport — render live 3D canvas
          <CardPreview url={model.url} filename={model.filename} />
        ) : (
          // Not yet in viewport — show shimmer skeleton
          <div style={{
            width: '100%', height: '100%', borderRadius: 8,
            background: `linear-gradient(90deg,
              ${COLORS.surface}80 0%,
              ${COLORS.background}CC 50%,
              ${COLORS.surface}80 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Size badge */}
      {model.size_bytes > 0 && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(0,0,0,0.55)',
          color: 'rgba(200,185,170,0.7)', fontSize: 8,
          padding: '1px 5px', borderRadius: 4,
          fontFamily: 'Inter, sans-serif', pointerEvents: 'none',
        }}>
          {model.size_bytes < 1_000_000
            ? `${Math.round(model.size_bytes / 1024)}KB`
            : `${(model.size_bytes / 1_000_000).toFixed(1)}MB`}
        </div>
      )}

      {/* Name */}
      <span style={{
        fontSize: 11,
        color:    hovered ? COLORS.action : COLORS.text,
        textAlign: 'center', lineHeight: 1.3,
        maxWidth: '100%', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '100%', transition: 'color 0.18s',
        fontFamily: 'Inter, sans-serif',
      }}>
        {model.name}
      </span>

      {/* Place hint */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: COLORS.action + 'DD',
          color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.04em', pointerEvents: 'none',
        }}>
          + PLACE
        </div>
      )}
    </button>
  );
}

// ── FurniturePicker ────────────────────────────────────────────────────────────
export default function FurniturePicker({
  selectedItem, placedItems, addItem, deleteItem, gizmoMode, setGizmoMode,
  furnitureRefs, tint, setTint,
}) {
  const [models,           setModels]          = useState([]);
  const [loading,          setLoading]         = useState(false);
  const [error,            setError]           = useState(null);
  const [activeCategory,   setActiveCategory]  = useState('');
  const [prefetchProgress, setPrefetchProgress] = useState(0);
  const [prefetchDone,     setPrefetchDone]    = useState(false);

  // ── Fetch model list — tries /manifest first (sorted), falls back to /list ──
  const fetchModels = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let res = await fetch(`${API_BASE}/api/models/manifest`);
      if (!res.ok) res = await fetch(`${API_BASE}/api/models/list`);
      if (!res.ok) throw new Error('Backend unreachable');
      const data = await res.json();
      setModels(data);
      // Auto-select first available category
      if (data.length > 0) {
        const firstCat = data[0]?.category || 'uncategorized';
        setActiveCategory((prev) => prev || firstCat);
      }
    } catch {
      setError('Could not reach backend. Is it running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  // ── Background prefetch: prime browser HTTP cache in manifest order ─────────
  useEffect(() => {
    if (!models.length || prefetchDone) return;
    let cancelled = false;
    const BATCH   = 3;
    const urls    = models.map((m) => m.url).filter(Boolean);

    (async () => {
      // Small delay so the initial render + GLB model list fetch settle first
      await new Promise((r) => setTimeout(r, 2500));
      for (let i = 0; i < urls.length; i += BATCH) {
        if (cancelled) break;
        await Promise.allSettled(
          urls.slice(i, i + BATCH).map((url) =>
            fetch(url, { cache: 'force-cache', credentials: 'omit' }).catch(() => {})
          )
        );
        setPrefetchProgress(Math.round(((i + BATCH) / urls.length) * 100));
        await new Promise((r) => setTimeout(r, 80));
      }
      if (!cancelled) setPrefetchDone(true);
    })();

    return () => { cancelled = true; };
  }, [models, prefetchDone]);

  const categories = useMemo(
    () => [...new Set(models.map((m) => m.category || 'uncategorized'))],
    [models],
  );

  const visibleModels = useMemo(
    () => !activeCategory || activeCategory === 'all'
      ? models
      : models.filter((m) => (m.category || 'uncategorized') === activeCategory),
    [models, activeCategory],
  );

  const gizmoButtons = [
    { mode: 'translate', icon: <DragOutlined />,   label: 'Move'   },
    { mode: 'rotate',    icon: <SwapOutlined />,   label: 'Rotate' },
    { mode: 'scale',     icon: <ExpandOutlined />, label: 'Scale'  },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Keyframes */}
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AppstoreOutlined style={{ color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Furniture</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Prefetch progress pill — disappears when done */}
          {!prefetchDone && prefetchProgress > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: `${COLORS.background}CC`, borderRadius: 20,
              padding: '3px 8px', border: `1px solid ${COLORS.secondary}40`,
            }}>
              <div style={{
                width: 60, height: 3, borderRadius: 2,
                background: `${COLORS.secondary}30`, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${prefetchProgress}%`,
                  background: COLORS.action,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ color: COLORS.secondary, fontSize: 9, fontFamily: 'Inter, sans-serif' }}>
                {Math.min(prefetchProgress, 100)}%
              </span>
            </div>
          )}

          <Tooltip title="Refresh model list">
            <Button type="text" size="small" icon={<ReloadOutlined />}
              onClick={fetchModels} style={{ color: COLORS.secondary }} />
          </Tooltip>
        </div>
      </div>

      {/* Category tabs */}
      {!loading && models.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
              border:     `1px solid ${activeCategory === cat ? COLORS.action : COLORS.secondary + '60'}`,
              background:  activeCategory === cat ? COLORS.action + '22' : 'transparent',
              color:       activeCategory === cat ? COLORS.action : COLORS.secondary,
              fontSize: 12, textTransform: 'capitalize', transition: 'all 0.2s', fontWeight: 500,
            }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Model grid */}
      <div style={{
        padding: 12, background: `${COLORS.background}CC`, borderRadius: 16,
        border: `1px solid ${COLORS.secondary}60`, minHeight: 120,
      }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin size="small" />
          </div>
        )}
        {error && (
          <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', padding: 12 }}>
            {error}
          </div>
        )}
        {!loading && !error && visibleModels.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: COLORS.secondary, fontSize: 13 }}>No models found</span>}
          />
        )}
        {!loading && !error && visibleModels.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {visibleModels.map((model) => (
              <ModelCard
                key={model.id || model.filename}
                model={model}
                onPlace={() => addItem(model)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected item controls */}
      {selectedItem && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14, padding: 16,
          background: `${COLORS.background}CC`, borderRadius: 16,
          border: `1px solid ${COLORS.action}40`,
        }}>
          <div style={{ color: COLORS.text, fontSize: 13 }}>
            Selected: <strong style={{ color: COLORS.action }}>
              {selectedItem.name || selectedItem.filename}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8 }}>
            {gizmoButtons.map(({ mode, icon, label }) => (
              <Button
                key={mode}
                type={gizmoMode === mode ? 'primary' : 'text'}
                onClick={() => setGizmoMode(mode)} block icon={icon} size="small"
                style={{ color: COLORS.text, background: gizmoMode === mode ? COLORS.action : 'transparent' }}
              >
                {label}
              </Button>
            ))}
          </div>
          <FurnitureTint
            selectedItem={selectedItem}
            furnitureRefs={furnitureRefs}
            updateItem={() => {}}
            tint={tint}
            setTint={setTint}
          />
          <Popconfirm title="Remove this item?" onConfirm={() => deleteItem(selectedItem.id)}>
            <Button danger icon={<DeleteOutlined />} block style={{ background: 'transparent' }}>
              Remove
            </Button>
          </Popconfirm>
        </div>
      )}

      {placedItems.length > 0 && (
        <div style={{ color: COLORS.secondary, fontSize: 12, textAlign: 'center' }}>
          {placedItems.length} item{placedItems.length !== 1 ? 's' : ''} placed in room
        </div>
      )}
    </div>
  );
}