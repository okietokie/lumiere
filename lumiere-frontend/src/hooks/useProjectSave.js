import { useState, useCallback, useEffect, useRef } from 'react';
import { createRoomEntity } from '../utils/sceneEntities';
import { generateLayoutWalls } from '../utils/roomLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const AUTOSAVE_MS = 30_000;

function buildRoomsFromWalls(walls = []) {
  if (!walls.length) return [createRoomEntity()];

  const points = walls.flatMap(({ start = [0, 0], end = [0, 0] }) => [start, end]);
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  const heights = walls.map((wall) => wall.height).filter((value) => Number.isFinite(value));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  return [createRoomEntity({
    name: 'Room 1',
    type: 'room',
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    width: Math.max(maxX - minX, 1),
    depth: Math.max(maxZ - minZ, 1),
    height: heights.length ? Math.max(...heights) : 3,
  })];
}

export function buildSceneData({ rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState }) {
  return {
    version: '1.2',
    savedAt: new Date().toISOString(),
    rooms: rooms.map(({ id, name, type, x, z, width, depth, height }) => ({
      id, name, type, x, z, width, depth, height,
    })),
    walls: walls.map(({ id, roomId, start, end, height, thickness, color, roughness, metalness, textureId }) => ({
      id, roomId, start, end, height, thickness, color, roughness, metalness, textureId,
    })),
    furniture: placedItems.map(({ id, filename, name, url, category, position, rotation, scale }) => ({
      id,
      filename,
      name,
      url: url || null,
      category: category || null,
      position,
      rotation,
      scale,
    })),
    materials: {
      floor: floorMaterial,
      ceiling: ceilingMaterial,
    },
    lighting: {
      timeOfDay: lightingState.timeOfDay,
      activeMood: lightingState.activeMood,
      globalBrightness: lightingState.globalBrightness,
      placedLights: lightingState.placedLights.map(({ id, type, position, intensity, color, distance, angle, enabled }) => ({
        id, type, position, intensity, color, distance, angle, enabled,
      })),
    },
  };
}

export function applySceneData(sceneData, { setRooms, setWalls, setPlacedItems, setFloor, setCeiling, lightingState }) {
  if (!sceneData) return;
  const rooms = sceneData.rooms?.length ? sceneData.rooms : buildRoomsFromWalls(sceneData.walls);
  setRooms(rooms);
  if (rooms.length) {
    setWalls(generateLayoutWalls(rooms, sceneData.walls ?? []));
  } else if (sceneData.walls) {
    setWalls(sceneData.walls);
  }
  if (sceneData.furniture) setPlacedItems(sceneData.furniture);
  if (sceneData.materials?.floor) setFloor(sceneData.materials.floor);
  if (sceneData.materials?.ceiling) setCeiling(sceneData.materials.ceiling);
  if (sceneData.lighting) {
    const lighting = sceneData.lighting;
    if (lighting.timeOfDay !== undefined) lightingState.setTimeOfDay(lighting.timeOfDay);
    if (lighting.activeMood) lightingState.applyMood(lighting.activeMood);
    if (lighting.globalBrightness !== undefined) lightingState.setGlobalBrightness(lighting.globalBrightness);
    if (lighting.placedLights) lightingState.setPlacedLights(lighting.placedLights);
  }
}

export function takeSnapshot(canvasWrapperEl) {
  const canvas = canvasWrapperEl?.tagName === 'CANVAS'
    ? canvasWrapperEl
    : canvasWrapperEl?.querySelector('canvas');
  if (!canvas) return null;
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (dataUrl === 'data:,') return null;
    return dataUrl;
  } catch (e) {
    console.warn('Snapshot failed:', e);
    return null;
  }
}

export default function useProjectSave({
  rooms, setRooms,
  walls, setWalls,
  placedItems, setPlacedItems,
  floorMaterial, setFloorMaterial,
  ceilingMaterial, setCeilingMaterial,
  lightingState,
  canvasRef,
  currentProjectId,
  setCurrentProjectId,
}) {
  const [saveStatus, setSaveStatus] = useState('idle');
  const [projectName, setProjectName] = useState('Untitled Room');
  const [shareUrl, setShareUrl] = useState('');
  const [modelAssets, setModelAssets] = useState({
    glb_url: null,
    usdz_url: null,
    glb_filename: null,
    usdz_filename: null,
  });
  const [assetUploadStatus, setAssetUploadStatus] = useState({ glb: 'idle', usdz: 'idle' });
  const autosaveTimer = useRef(null);

  const getSceneData = useCallback(() => buildSceneData({
    rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState,
  }), [rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState]);

  const getCanvas = useCallback(() => {
    if (canvasRef?.current) return canvasRef.current;
    return document.querySelector('canvas')?.parentElement ?? document.querySelector('canvas');
  }, [canvasRef]);

  const saveProject = useCallback(async (name = projectName, withThumbnail = true) => {
    setSaveStatus('saving');
    try {
      const scene = getSceneData();
      const thumbnail = await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(withThumbnail ? takeSnapshot(getCanvas()) : null);
          });
        });
      });

      let response;
      if (currentProjectId) {
        response = await fetch(`${API_BASE}/api/projects/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, scene, thumbnail }),
        });
      } else {
        response = await fetch(`${API_BASE}/api/projects/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, scene, thumbnail }),
        });
      }

      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      setCurrentProjectId(data.id);
      setProjectName(name);
      setShareUrl(data.share_url || '');
      setModelAssets(data.model_assets || {
        glb_url: null,
        usdz_url: null,
        glb_filename: null,
        usdz_filename: null,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return data;
    } catch (e) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      throw e;
    }
  }, [projectName, currentProjectId, getSceneData, getCanvas, setCurrentProjectId]);

  const downloadSnapshot = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = getCanvas();
        const url = takeSnapshot(canvas);
        if (!url) {
          alert('Snapshot failed - make sure the 3D scene is visible.');
          return;
        }
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectName.replace(/\s+/g, '_')}_snapshot.png`;
        link.click();
      });
    });
  }, [getCanvas, projectName]);

  const exportJSON = useCallback(() => {
    const scene = getSceneData();
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}.lumiere.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [getSceneData, projectName]);

  const importJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.lumiere.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          applySceneData(data, {
            setRooms,
            setWalls,
            setPlacedItems,
            setFloor: setFloorMaterial,
            setCeiling: setCeilingMaterial,
            lightingState,
          });
          setProjectName(file.name.replace(/\.(lumiere\.json|json)$/, ''));
          setCurrentProjectId(null);
        } catch {
          alert('Invalid project file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setRooms, setWalls, setPlacedItems, setFloorMaterial, setCeilingMaterial, lightingState, setCurrentProjectId]);

  const loadProject = useCallback(async (projectId) => {
    const res = await fetch(`${API_BASE}/api/projects/${projectId}`);
    const data = await res.json();
    if (data.scene) {
      applySceneData(data.scene, {
        setRooms,
        setWalls,
        setPlacedItems,
        setFloor: setFloorMaterial,
        setCeiling: setCeilingMaterial,
        lightingState,
      });
      setProjectName(data.name);
      setCurrentProjectId(data.id);
      setShareUrl(data.share_url || '');
      setModelAssets(data.model_assets || {
        glb_url: null,
        usdz_url: null,
        glb_filename: null,
        usdz_filename: null,
      });
    }
    return data;
  }, [setRooms, setWalls, setPlacedItems, setFloorMaterial, setCeilingMaterial, lightingState, setCurrentProjectId]);

  const ensureProject = useCallback(async ({ persistLatest = false } = {}) => {
    if (!currentProjectId) {
      const project = await saveProject(projectName, true);
      return project.id;
    }

    if (persistLatest) {
      const project = await saveProject(projectName, true);
      return project.id;
    }

    return currentProjectId;
  }, [currentProjectId, projectName, saveProject]);

  const uploadModelAsset = useCallback(async (kind, file) => {
    if (!file) return null;
    if (!['glb', 'usdz'].includes(kind)) {
      throw new Error('Unsupported asset type.');
    }

    const projectId = await ensureProject({ persistLatest: true });
    setAssetUploadStatus((prev) => ({ ...prev, [kind]: 'uploading' }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/assets/${kind}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Failed to upload ${kind.toUpperCase()}`);
      const data = await res.json();
      setModelAssets((prev) => ({
        ...prev,
        [`${kind}_url`]: data.url,
        [`${kind}_filename`]: data.filename,
      }));
      setAssetUploadStatus((prev) => ({ ...prev, [kind]: 'done' }));
      setTimeout(() => setAssetUploadStatus((prev) => ({ ...prev, [kind]: 'idle' })), 2000);
      return data;
    } catch (error) {
      setAssetUploadStatus((prev) => ({ ...prev, [kind]: 'error' }));
      setTimeout(() => setAssetUploadStatus((prev) => ({ ...prev, [kind]: 'idle' })), 2500);
      throw error;
    }
  }, [ensureProject]);

  const copyShareLink = useCallback(async () => {
    const projectId = await ensureProject({ persistLatest: true });
    const url = shareUrl || `${window.location.origin}/view/${projectId}`;
    await navigator.clipboard.writeText(url);
    setShareUrl(url);
    return url;
  }, [ensureProject, shareUrl]);

  const openSharePage = useCallback(async () => {
    const projectId = await ensureProject({ persistLatest: true });
    const url = shareUrl || `${window.location.origin}/view/${projectId}`;
    setShareUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    return url;
  }, [ensureProject, shareUrl]);

  const [autosaveEnabled, setAutosaveEnabled] = useState(false);

  useEffect(() => {
    if (!autosaveEnabled || !currentProjectId) return;
    autosaveTimer.current = setInterval(() => {
      saveProject(projectName, true).catch(() => {});
    }, AUTOSAVE_MS);
    return () => clearInterval(autosaveTimer.current);
  }, [autosaveEnabled, currentProjectId, saveProject, projectName]);

  return {
    projectName, setProjectName,
    saveStatus,
    saveProject,
    downloadSnapshot,
    exportJSON,
    importJSON,
    loadProject,
    shareUrl,
    modelAssets,
    assetUploadStatus,
    uploadModelAsset,
    copyShareLink,
    openSharePage,
    autosaveEnabled, setAutosaveEnabled,
  };
}
