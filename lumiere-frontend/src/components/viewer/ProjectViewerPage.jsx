import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { Link, useParams } from 'react-router-dom';
import * as THREE from 'three';
import { COLORS } from '../../utils/colors';
import { resolveGlbUrl } from '../threeD/furniture/FurnitureItem';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function absolutizeUrl(value) {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
}

function getDevice() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  return { isIOS, isAndroid };
}

function buildSceneViewerUrl(glbUrl, title, fallbackUrl) {
  if (!glbUrl) return null;
  const url = new URL('https://arvr.google.com/scene-viewer/1.0');
  url.searchParams.set('file', glbUrl);
  url.searchParams.set('mode', 'ar_preferred');
  url.searchParams.set('title', title || 'Lumiere design');
  url.searchParams.set('browser_fallback_url', fallbackUrl || window.location.href);
  return url.toString();
}

function wallToMeshProps(wall) {
  const start = wall?.start || [0, 0];
  const end = wall?.end || [0, 0];
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz) || 0.01;
  const angle = Math.atan2(dz, dx);
  const centerX = (start[0] + end[0]) / 2;
  const centerZ = (start[1] + end[1]) / 2;
  const height = Number.isFinite(wall?.height) ? wall.height : 3;
  const thickness = Number.isFinite(wall?.thickness) ? wall.thickness : 0.18;
  return {
    position: [centerX, height / 2, centerZ],
    rotation: [0, -angle, 0],
    size: [length, height, thickness],
    color: wall?.color || '#8A8070',
  };
}

function SceneShell({ scene }) {
  const rooms = scene?.rooms || [];
  const walls = scene?.walls || [];
  const furniture = scene?.furniture || [];
  const lights = scene?.lighting?.placedLights || [];
  const floor = scene?.materials?.floor || {};
  const ceiling = scene?.materials?.ceiling || {};

  const bounds = useMemo(() => {
    if (!rooms.length) return { width: 12, depth: 12, centerX: 0, centerZ: 0, ceilingY: 3 };
    const left = Math.min(...rooms.map((room) => room.x - room.width / 2));
    const right = Math.max(...rooms.map((room) => room.x + room.width / 2));
    const top = Math.min(...rooms.map((room) => room.z - room.depth / 2));
    const bottom = Math.max(...rooms.map((room) => room.z + room.depth / 2));
    const height = Math.max(...rooms.map((room) => room.height || 3), 3);
    return {
      width: Math.max(right - left, 4),
      depth: Math.max(bottom - top, 4),
      centerX: (left + right) / 2,
      centerZ: (top + bottom) / 2,
      ceilingY: height,
    };
  }, [rooms]);

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 10, 6]} intensity={1.2} castShadow />
      <Environment preset="apartment" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.centerX, 0, bounds.centerZ]} receiveShadow>
        <planeGeometry args={[bounds.width + 4, bounds.depth + 4]} />
        <meshStandardMaterial color={floor?.color || '#715f52'} roughness={floor?.roughness ?? 0.95} metalness={0.04} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[bounds.centerX, bounds.ceilingY, bounds.centerZ]}>
        <planeGeometry args={[bounds.width + 2, bounds.depth + 2]} />
        <meshStandardMaterial color={ceiling?.color || '#ddd1c3'} roughness={ceiling?.roughness ?? 1} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      {walls.map((wall) => {
        const mesh = wallToMeshProps(wall);
        return (
          <mesh
            key={wall.id}
            position={mesh.position}
            rotation={mesh.rotation}
            castShadow
            receiveShadow
          >
            <boxGeometry args={mesh.size} />
            <meshStandardMaterial color={mesh.color} roughness={wall?.roughness ?? 0.85} metalness={wall?.metalness ?? 0.02} />
          </mesh>
        );
      })}

      {lights.filter((item) => item?.enabled !== false).map((light) => (
        <pointLight
          key={light.id}
          position={light.position || [0, 2.4, 0]}
          intensity={light.intensity ?? 0.8}
          color={light.color || '#fff2d8'}
          distance={light.distance ?? 7}
        />
      ))}

      {furniture.filter((item) => resolveGlbUrl(item?.url, item?.filename)).map((item) => (
        <Suspense fallback={null} key={item.id}>
          <ProjectFurniture item={item} />
        </Suspense>
      ))}
    </>
  );
}

function ProjectFurniture({ item }) {
  const resolvedUrl = resolveGlbUrl(item?.url, item?.filename);
  const safeUrl = absolutizeUrl(resolvedUrl);
  const { scene } = useGLTF(safeUrl);

  const content = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.position.set(-center.x, -center.y, -center.z);
    return clone;
  }, [scene]);

  return (
    <group
      position={item.position || [0, 0, 0]}
      rotation={item.rotation || [0, 0, 0]}
      scale={item.scale || [1, 1, 1]}
    >
      <primitive object={content} />
    </group>
  );
}

export default function ProjectViewerPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Project not found');
        const data = await res.json();
        if (!active) return;
        setProject(data);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Could not load project');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [projectId]);

  const projectTitle = project?.title || project?.name || 'Room design';
  const projectScene = project?.scene_data || project?.scene;
  const device = getDevice();
  const shareUrl = project?.share_url || window.location.href;
  const glbUrl = absolutizeUrl(project?.model_assets?.glb_url);
  const usdzUrl = absolutizeUrl(project?.model_assets?.usdz_url);
  const sceneViewerUrl = buildSceneViewerUrl(glbUrl, projectTitle, shareUrl);

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(circle at top, #5b4a3d 0%, ${COLORS.background} 48%, #1d1714 100%)`,
      color: COLORS.text,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ color: COLORS.action, letterSpacing: '0.18em', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Lumiere View</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>{projectTitle}</h1>
        </div>
        <Link to="/user/room" style={{ color: COLORS.text, textDecoration: 'none', border: `1px solid ${COLORS.secondary}80`, borderRadius: 999, padding: '10px 14px' }}>
          Open editor
        </Link>
      </div>

      <div style={{ padding: '12px 18px 18px', display: 'grid', gap: 14 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}>
          <ActionButton onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy link</ActionButton>
          <ActionButton disabled={!glbUrl} onClick={() => glbUrl && window.open(glbUrl, '_blank', 'noopener,noreferrer')}>Download GLB</ActionButton>
          <ActionButton disabled={!usdzUrl} onClick={() => usdzUrl && window.open(usdzUrl, '_blank', 'noopener,noreferrer')}>Download USDZ</ActionButton>
          {device.isAndroid ? (
            <ActionButton disabled={!sceneViewerUrl} onClick={() => sceneViewerUrl && (window.location.href = sceneViewerUrl)}>View in AR</ActionButton>
          ) : device.isIOS ? (
            <ActionLink href={usdzUrl} rel="ar" disabled={!usdzUrl}>View in AR</ActionLink>
          ) : (
            <ActionButton disabled>AR on phone</ActionButton>
          )}
        </div>

        <div style={{
          minHeight: '62vh',
          borderRadius: 28,
          overflow: 'hidden',
          border: `1px solid ${COLORS.secondary}66`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.24) 100%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}>
          {loading ? (
            <CenterMessage>Loading 3D room...</CenterMessage>
          ) : error ? (
            <CenterMessage>{error}</CenterMessage>
          ) : (
            <Canvas camera={{ position: [8, 5.5, 8], fov: 42 }} shadows>
              <Suspense fallback={null}>
                <SceneShell scene={projectScene} />
              </Suspense>
              <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2.1} />
            </Canvas>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
          color: `${COLORS.text}CC`,
          fontSize: 13,
        }}>
          <InfoCard title="Browser viewer">
            Open this page on any phone to inspect the room in real time, orbit, zoom, and review the layout without installing anything.
          </InfoCard>
          <InfoCard title="Android AR">
            {glbUrl ? 'Tap View in AR on Android to launch Scene Viewer from Chrome.' : 'Upload a GLB export in the editor to enable Android AR.'}
          </InfoCard>
          <InfoCard title="iPhone/iPad AR">
            {usdzUrl ? 'Tap View in AR on iPhone or iPad to open Apple Quick Look in Safari.' : 'Upload a USDZ export in the editor to enable Quick Look on Apple devices.'}
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 46,
        padding: '0 16px',
        borderRadius: 16,
        border: `1px solid ${disabled ? `${COLORS.secondary}40` : `${COLORS.action}90`}`,
        background: disabled ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${COLORS.action} 0%, ${COLORS.accent} 100%)`,
        color: disabled ? `${COLORS.text}66` : '#1b120d',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function CenterMessage({ children }) {
  return (
    <div style={{ minHeight: '62vh', display: 'grid', placeItems: 'center', fontSize: 16, color: COLORS.text }}>
      {children}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div style={{
      borderRadius: 18,
      padding: '14px 16px',
      border: `1px solid ${COLORS.secondary}44`,
      background: 'rgba(255,255,255,0.04)',
      lineHeight: 1.6,
    }}>
      <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ActionLink({ children, href, rel, disabled }) {
  return (
    <a
      href={disabled ? undefined : href}
      rel={disabled ? undefined : rel}
      style={{
        minHeight: 46,
        padding: '0 16px',
        borderRadius: 16,
        border: `1px solid ${disabled ? `${COLORS.secondary}40` : `${COLORS.action}90`}`,
        background: disabled ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${COLORS.action} 0%, ${COLORS.accent} 100%)`,
        color: disabled ? `${COLORS.text}66` : '#1b120d',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'grid',
        placeItems: 'center',
        textDecoration: 'none',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {children}
    </a>
  );
}
