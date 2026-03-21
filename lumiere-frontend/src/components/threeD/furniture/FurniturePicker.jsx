// src/components/threeD/furniture/FurniturePicker.
//UI for browsing and placing furniture models in the room scene. Fetches model list from backend, shows 3D previews, and lets user place items in the room and select them for editing.
import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Tiny inline 3D preview per card ──────────────────────────────────────────

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

function RotatingModel({ url }) {
  const { scene } = useGLTF(url);
  const cloned = React.useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
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

function CardPreview({ url }) {
  const [ready, setReady] = useState(false);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading spinner overlay — shown until canvas is ready */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${COLORS.surface}CC`,
          borderRadius: 8,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: `2px solid ${COLORS.action}40`,
            borderTopColor: COLORS.action,
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      <Canvas
        frameloop="always"
        camera={{ position: [1.5, 1.5, 1.5], fov: 45 }}
        gl={{
          antialias: false, // off for perf in small canvas
          alpha: true,
          powerPreference: 'low-power',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        dpr={[1, 1.5]} // cap pixel ratio for perf
        style={{ background: 'transparent', borderRadius: 8 }}
        onCreated={() => setReady(true)}
      >
        <ambientLight intensity={0.5} color="#FFF5E6" />
        <directionalLight position={[3, 5, 3]} intensity={0.8} color="#FFEAD2" />
        <pointLight position={[-2, 2, -2]} intensity={0.3} color="#C49A6C" />

        <CardErrorBoundary>
          <Suspense fallback={<SpinnerMesh />}>
            <RotatingModel url={url} />
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

// ─────────────────────────────────────────────────────────────────────────────

export default function FurniturePicker({
  selectedItem, placedItems, addItem, deleteItem, gizmoMode, setGizmoMode,
  furnitureRefs, tint, setTint,
}) {
  const [models,         setModels]        = useState([]);
  const [loading,        setLoading]       = useState(false);
  const [error,          setError]         = useState(null);
  const [activeCategory, setActiveCategory] = useState('');

  const fetchModels = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/models/list`);
      if (!res.ok) throw new Error();
      setModels(await res.json());
    } catch {
      setError('Could not reach backend. Is it running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const rawCats    = [...new Set(models.map((m) => m.category || 'uncategorized'))];
  const categories = [...rawCats];

  const visibleModels = activeCategory === 'all'
    ? models
    : models.filter((m) => (m.category || 'uncategorized') === activeCategory);

  const gizmoButtons = [
    { mode: 'translate', icon: <DragOutlined />,  label: 'Move'   },
    { mode: 'rotate',    icon: <SwapOutlined />,  label: 'Rotate' },
    { mode: 'scale',     icon: <ExpandOutlined />, label: 'Scale' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AppstoreOutlined style={{ color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Furniture</span>
        </div>
        <Tooltip title="Refresh model list">
          <Button type="text" size="small" icon={<ReloadOutlined />}
            onClick={fetchModels} style={{ color: COLORS.secondary }} />
        </Tooltip>
      </div>

      {/* Category tabs */}
      {!loading && models.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
              border:      `1px solid ${activeCategory === cat ? COLORS.action : COLORS.secondary + '60'}`,
              background:   activeCategory === cat ? COLORS.action + '22' : 'transparent',
              color:        activeCategory === cat ? COLORS.action : COLORS.secondary,
              fontSize: 12, textTransform: 'capitalize', transition: 'all 0.2s',
              fontWeight:   cat === 'all' ? 400 : 500,
            }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Model grid */}
      <div style={{ padding: 12, background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.secondary}60`, minHeight: 120 }}>
        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>}
        {error   && <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', padding: 12 }}>{error}</div>}
        {!loading && !error && visibleModels.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: COLORS.secondary, fontSize: 13 }}>No models found</span>} />
        )}
        {!loading && !error && (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16,
          background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.action}40` }}>
          <div style={{ color: COLORS.text, fontSize: 13 }}>
            Selected: <strong style={{ color: COLORS.action }}>{selectedItem.name || selectedItem.filename}</strong>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8 }}>
            {gizmoButtons.map(({ mode, icon, label }) => (
              <Button key={mode} type={gizmoMode === mode ? 'primary' : 'text'}
                onClick={() => setGizmoMode(mode)} block icon={icon} size="small"
                style={{ color: COLORS.text, background: gizmoMode === mode ? COLORS.action : 'transparent' }}>
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
            <Button danger icon={<DeleteOutlined />} block style={{ background: 'transparent' }}>Remove</Button>
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

// ── Model card with inline 3D preview ────────────────────────────────────────
function ModelCard({ model, onPlace }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
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
      {/* 3D preview area */}
      <div style={{
        width: '100%', height: 100, borderRadius: 8,
        overflow: 'hidden', pointerEvents: 'none',
        background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
      }}>
        {model.url ? (
          <CardPreview url={model.url} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            📦
          </div>
        )}
      </div>

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

      {/* Tap to place hint */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: COLORS.action + 'DD',
          color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.04em',
        }}>
          + PLACE
        </div>
      )}
    </button>
  );
}