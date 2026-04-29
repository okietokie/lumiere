import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid as DreiGrid, useGLTF } from '@react-three/drei';
import { useNavigate, useParams } from 'react-router-dom';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { COLORS } from '../../utils/colors';
import { getAccessToken } from '../../utils/authStorage';
import { apiAssetUrl, apiUrl } from '../../utils/apiBase';
import { applyTint, captureOriginals, normalizeTint, resetTint } from '../../utils/tintStore';
import { resolveGlbUrl } from '../threeD/furniture/FurnitureItem';
import SurfaceMaterial from '../threeD/materials/SurfaceMaterial';
import SceneLighting from '../threeD/lighting/SceneLighting';
import { getTimeOfDayLighting, MOOD_PRESETS } from '../../hooks/useLighting';
import { fetchModelManifest } from '../../hooks/useModelPrefetch';
import useThemedDialogs from '../../hooks/useThemedDialogs.jsx';

const VIEWER_BACKDROP = '#050505';
const VIEWER_FOG = '#050505';

function absolutizeUrl(value) {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return apiAssetUrl(value);
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

function getSceneBounds(scene) {
  const rooms = scene?.rooms || [];
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
}

const CATEGORY_TARGETS = {
  sofa: { axis: 'x', size: 2.0 },
  sofas: { axis: 'x', size: 2.0 },
  bed: { axis: 'x', size: 2.0 },
  beds: { axis: 'x', size: 2.0 },
  table: { axis: 'y', size: 0.8 },
  tables: { axis: 'y', size: 0.8 },
  chair: { axis: 'y', size: 1.0 },
  chairs: { axis: 'y', size: 1.0 },
  cupboard: { axis: 'y', size: 1.8 },
  cupboards: { axis: 'y', size: 1.8 },
  lamp: { axis: 'y', size: 1.6 },
  lamps: { axis: 'y', size: 1.6 },
  chandelier: { axis: 'y', size: 0.6 },
  curtain: { axis: 'y', size: 2.4 },
  stair: { axis: 'y', size: 2.4 },
  window: { axis: 'y', size: 1.2 },
  others: { axis: 'y', size: 1.2 },
};
const DEFAULT_TARGET = { axis: 'y', size: 1.2 };

function computeNormAndCentroid(modelScene, category) {
  try {
    const box = new THREE.Box3().setFromObject(modelScene);
    if (box.isEmpty()) return { normScale: 1, centroid: [0, 0, 0] };
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const target = CATEGORY_TARGETS[category?.toLowerCase()] || DEFAULT_TARGET;
    const current = size[target.axis];
    const normScale = (!current || !Number.isFinite(current) || current < 0.0001)
      ? 1
      : Math.max(0.01, Math.min(100, target.size / current));
    return { normScale, centroid: [centre.x, centre.y, centre.z] };
  } catch {
    return { normScale: 1, centroid: [0, 0, 0] };
  }
}

function getMoodAmbient(activeMood) {
  return MOOD_PRESETS.find((mood) => mood.key === activeMood)?.ambientColor || null;
}

function ViewerCamera({ scene, is2D }) {
  const { camera } = useThree();
  const bounds = useMemo(() => getSceneBounds(scene), [scene]);

  useEffect(() => {
    if (!is2D) return;

    if (is2D) {
      camera.position.set(bounds.centerX, Math.max(bounds.width, bounds.depth, 8) * 1.8, bounds.centerZ);
      camera.up.set(0, 0, -1);
      camera.lookAt(bounds.centerX, 0, bounds.centerZ);
      camera.updateProjectionMatrix();
      return;
    }
  }, [bounds, camera, is2D]);

  return null;
}

function SceneShell({ scene, hideWalls, hideCeiling, is2D, manifestReady }) {
  const walls = scene?.walls || [];
  const furniture = scene?.furniture || [];
  const lightingState = scene?.lighting || {};
  const floor = scene?.materials?.floor || scene?.floorMaterial || {};
  const ceiling = scene?.materials?.ceiling || scene?.ceilingMaterial || {};
  const wallMaterial = scene?.materials?.wall || scene?.wallMaterial || {};
  const bounds = useMemo(() => getSceneBounds(scene), [scene]);
  const lighting = useMemo(
    () => getTimeOfDayLighting(Number.isFinite(lightingState.timeOfDay) ? lightingState.timeOfDay : 50),
    [lightingState.timeOfDay],
  );
  const placedLights = Array.isArray(lightingState.placedLights)
    ? lightingState.placedLights
        .filter((light) => Array.isArray(light?.position))
        .map((light) => ({
          ...light,
          enabled: light.enabled !== false,
          intensity: light.intensity ?? 0.8,
          color: light.color || '#fff2d8',
          distance: light.distance ?? 7,
          angle: light.angle ?? Math.PI / 3,
        }))
    : [];
  const globalBrightness = Number.isFinite(lightingState.globalBrightness) ? lightingState.globalBrightness : 1;
  const moodAmbient = getMoodAmbient(lightingState.activeMood);
  const floorMaterial = { color: '#715f52', roughness: 0.95, metalness: 0.04, ...floor };
  const ceilingMaterial = { color: '#ddd1c3', roughness: 1, metalness: 0, ...ceiling };

  return (
    <>
      <color attach="background" args={[VIEWER_BACKDROP]} />
      <fog attach="fog" args={[VIEWER_FOG, 15, 30]} />
      <SceneLighting
        lighting={lighting}
        globalBrightness={globalBrightness}
        placedLights={placedLights}
        moodAmbient={moodAmbient}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.centerX, 0, bounds.centerZ]} receiveShadow>
        <planeGeometry args={[bounds.width + 4, bounds.depth + 4]} />
        <SurfaceMaterial mat={floorMaterial} repeat={[Math.max(bounds.width / 2, 2), Math.max(bounds.depth / 2, 2)]} />
      </mesh>

      {!hideCeiling && !is2D && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[bounds.centerX, bounds.ceilingY, bounds.centerZ]}>
          <planeGeometry args={[bounds.width + 2, bounds.depth + 2]} />
          <SurfaceMaterial mat={ceilingMaterial} repeat={[Math.max(bounds.width / 3, 2), Math.max(bounds.depth / 3, 2)]} side={THREE.DoubleSide} />
        </mesh>
      )}

      {!hideWalls && walls.map((wall) => {
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
            <SurfaceMaterial
              mat={{
                color: wall?.color ?? wallMaterial?.color ?? mesh.color,
                roughness: wall?.roughness ?? wallMaterial?.roughness ?? 0.85,
                metalness: wall?.metalness ?? wallMaterial?.metalness ?? 0.02,
                textureId: wall?.textureId ?? wallMaterial?.textureId ?? null,
              }}
              repeat={[Math.max(mesh.size[0] / 2, 1), Math.max(mesh.size[1] / 1.5, 1)]}
            />
          </mesh>
        );
      })}

      {manifestReady && furniture.filter((item) => resolveGlbUrl(item?.url, item?.filename)).map((item) => (
        <Suspense fallback={null} key={item.id}>
          <ProjectFurniture item={item} />
        </Suspense>
      ))}

      <DreiGrid
        args={[bounds.width, bounds.depth]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={COLORS.accent}
        sectionSize={2}
        sectionThickness={1}
        sectionColor={COLORS.action}
        fadeDistance={30}
        position={[bounds.centerX, 0.001, bounds.centerZ]}
      />
    </>
  );
}

function ProjectFurniture({ item }) {
  const resolvedUrl = resolveGlbUrl(item?.url, item?.filename);
  const safeUrl = absolutizeUrl(resolvedUrl);
  const { scene } = useGLTF(safeUrl);
  const groupRef = useRef(null);

  const { content, normScale, centroid } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = Array.isArray(child.material)
          ? child.material.map((material) => material?.clone?.() ?? material)
          : child.material?.clone?.() ?? child.material;
      }
    });
    const normalized = computeNormAndCentroid(scene, item?.category || item?.type);
    return { content: clone, ...normalized };
  }, [scene, item?.category, item?.type]);

  useEffect(() => {
    if (!groupRef.current || !item?.id) return;
    captureOriginals(item.id, groupRef.current);
  }, [item?.id, content]);

  useEffect(() => {
    if (!groupRef.current || !item?.id) return;
    const tint = normalizeTint(item.tint);
    const hasTint = item.tint && (
      tint.hue !== 0 ||
      tint.saturation !== 1 ||
      tint.brightness !== 1
    );

    if (hasTint) {
      applyTint(item.id, groupRef.current, tint.hue, tint.saturation, tint.brightness);
    } else {
      resetTint(item.id, groupRef.current);
    }
  }, [item?.id, item?.tint, content]);

  return (
    <group
      ref={groupRef}
      position={item.position || [0, 0, 0]}
      rotation={item.rotation || [0, 0, 0]}
      scale={item.scale || [1, 1, 1]}
    >
      <group scale={[normScale, normScale, normScale]}>
        <group position={[-centroid[0], -centroid[1], -centroid[2]]}>
          <primitive object={content} />
        </group>
      </group>
    </group>
  );
}

export default function ProjectViewerPage() {
  const dialogs = useThemedDialogs();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hideWalls, setHideWalls] = useState(false);
  const [hideCeiling, setHideCeiling] = useState(false);
  const [is2D, setIs2D] = useState(false);
  const [manifestReady, setManifestReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetchModelManifest()
      .catch(() => [])
      .finally(() => {
        if (active) setManifestReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(apiUrl(`/projects/${projectId}`));
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
  const sceneBounds = useMemo(() => getSceneBounds(projectScene), [projectScene]);

  const handleEdit = async () => {
    const editPath = `/user/room?projectId=${projectId}`;
    if (!getAccessToken()) {
      await dialogs.alert({
        title: 'Login Required',
        content: 'Please log in to edit this Lumiere Maison model.',
        tone: 'warning',
      });
      navigate(`/login?redirect=${encodeURIComponent(editPath)}`);
      return;
    }
    navigate(editPath);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.background,
      color: COLORS.text,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: COLORS.action, letterSpacing: '0.18em', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Lumiere View</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>{projectTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ActionButton onClick={() => setHideWalls((value) => !value)}>{hideWalls ? 'Show Walls' : 'Hide Walls'}</ActionButton>
          <ActionButton onClick={() => setHideCeiling((value) => !value)}>{hideCeiling ? 'Show Ceiling' : 'Hide Ceiling'}</ActionButton>
          <ActionButton onClick={() => setIs2D((value) => !value)}>{is2D ? 'Switch to 3D' : 'Switch to 2D'}</ActionButton>
          <ActionButton onClick={handleEdit}>Edit</ActionButton>
        </div>
      </div>

      <div style={{ padding: '12px 18px 18px', display: 'grid', gap: 14, flex: 1 }}>
        <div style={{
          minHeight: 'calc(100vh - 150px)',
          borderRadius: 8,
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
            <Canvas
              key={is2D ? 'public-2d-view' : 'public-3d-view'}
              orthographic={is2D}
              camera={is2D
                ? { position: [sceneBounds.centerX, Math.max(sceneBounds.width, sceneBounds.depth, 8) * 1.8, sceneBounds.centerZ], zoom: 42 }
                : { position: [8, 5.5, 8], fov: 42 }}
              shadows={{ type: THREE.PCFShadowMap }}
              gl={{
                antialias: true,
                alpha: false,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 0.85,
                powerPreference: 'high-performance',
              }}
            >
              <ViewerCamera scene={projectScene} is2D={is2D} />
              <Suspense fallback={null}>
                <SceneShell scene={projectScene} hideWalls={hideWalls} hideCeiling={hideCeiling} is2D={is2D} manifestReady={manifestReady} />
              </Suspense>
              <OrbitControls
                enablePan
                enableZoom
                enableRotate={!is2D}
                target={is2D ? [sceneBounds.centerX, 0, sceneBounds.centerZ] : [0, 0, 0]}
                maxPolarAngle={Math.PI / 2.1}
              />
            </Canvas>
          )}
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
        minHeight: 44,
        padding: '0 16px',
        borderRadius: 8,
        border: `1px solid ${disabled ? `${COLORS.secondary}40` : `${COLORS.secondary}80`}`,
        background: disabled ? 'rgba(255,255,255,0.03)' : COLORS.surface,
        color: disabled ? `${COLORS.text}66` : COLORS.text,
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
    <div style={{ minHeight: 'calc(100vh - 150px)', display: 'grid', placeItems: 'center', fontSize: 16, color: COLORS.text }}>
      {children}
    </div>
  );
}
