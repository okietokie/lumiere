import { useState, useCallback, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { createRoomEntity } from '../utils/sceneEntities';
import { generateLayoutWalls } from '../utils/roomLayout';
import { getAccessToken } from '../utils/authStorage';

const AUTOSAVE_MS = 30_000;
const DEFAULT_PROJECT_NAME = 'Untitled Room';
const DEFAULT_FLOOR_MATERIAL = { color: '#C8A060', roughness: 0.60, metalness: 0.0, textureId: 'wood_light' };
const DEFAULT_CEILING_MATERIAL = { color: '#FAFAFA', roughness: 0.90, metalness: 0.0, textureId: null };
const EMPTY_MODEL_ASSETS = {
  glb_url: null,
  usdz_url: null,
  glb_filename: null,
  usdz_filename: null,
};

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

function pointKey(point) {
  return Array.isArray(point)
    ? `${Number(point[0]).toFixed(5)},${Number(point[1]).toFixed(5)}`
    : '';
}

function buildFootprintFromWalls(roomWalls = []) {
  if (!Array.isArray(roomWalls) || roomWalls.length < 3) return null;

  const edges = new Map();
  const points = new Map();
  roomWalls.forEach((wall) => {
    if (!Array.isArray(wall?.start) || !Array.isArray(wall?.end)) return;
    const startKey = pointKey(wall.start);
    const endKey = pointKey(wall.end);
    if (!startKey || !endKey || startKey === endKey) return;
    points.set(startKey, wall.start);
    points.set(endKey, wall.end);
    if (!edges.has(startKey)) edges.set(startKey, []);
    if (!edges.has(endKey)) edges.set(endKey, []);
    edges.get(startKey).push(endKey);
    edges.get(endKey).push(startKey);
  });

  const firstKey = [...points.keys()][0];
  if (!firstKey) return null;

  const footprint = [firstKey];
  let previousKey = null;
  let currentKey = firstKey;
  let safety = 0;

  while (safety < points.size + roomWalls.length + 4) {
    safety += 1;
    const nextKey = (edges.get(currentKey) ?? []).find((key) => key !== previousKey);
    if (!nextKey) break;
    if (nextKey === firstKey) {
      return footprint.length >= 3 ? footprint.map((key) => points.get(key)) : null;
    }
    if (footprint.includes(nextKey)) break;
    footprint.push(nextKey);
    previousKey = currentKey;
    currentKey = nextKey;
  }

  return null;
}

function normalizeLoadedRooms(sceneData) {
  const sourceRooms = sceneData?.rooms?.length ? sceneData.rooms : buildRoomsFromWalls(sceneData?.walls);
  const walls = Array.isArray(sceneData?.walls) ? sceneData.walls : [];

  return sourceRooms.map((room) => {
    if (Array.isArray(room?.footprint) && room.footprint.length >= 3) {
      return room;
    }

    const roomWalls = walls.filter((wall) => wall?.roomId === room?.id);
    const footprint = buildFootprintFromWalls(roomWalls);
    if (!footprint?.length) return room;

    const xs = footprint.map(([x]) => x);
    const zs = footprint.map(([, z]) => z);
    return {
      ...room,
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      z: (Math.min(...zs) + Math.max(...zs)) / 2,
      width: Math.max(Math.max(...xs) - Math.min(...xs), 1),
      depth: Math.max(Math.max(...zs) - Math.min(...zs), 1),
      footprint,
      isCustomShape: true,
    };
  });
}

export function buildSceneData({ rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState }) {
  return {
    version: '1.3',
    savedAt: new Date().toISOString(),
    rooms: rooms.map(({ id, name, type, x, z, width, depth, height, footprint, isCustomShape }) => ({
      id, name, type, x, z, width, depth, height, footprint, isCustomShape,
    })),
    walls: walls.map(({ id, roomId, start, end, height, thickness, color, roughness, metalness, textureId, doors, windows }) => ({
      id, roomId, start, end, height, thickness, color, roughness, metalness, textureId, doors, windows,
    })),
    furniture: placedItems.map(({ id, filename, name, url, category, position, rotation, scale, tint }) => ({
      id,
      filename,
      name,
      url: url || null,
      category: category || null,
      position,
      rotation,
      scale,
      tint,
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
  const rooms = normalizeLoadedRooms(sceneData);
  setRooms(rooms);
  if (rooms.some((room) => room?.isCustomShape || (Array.isArray(room?.footprint) && room.footprint.length >= 3))) {
    setWalls(sceneData.walls ?? []);
  } else if (rooms.length) {
    setWalls(generateLayoutWalls(rooms, sceneData.walls ?? []));
  } else if (sceneData.walls) {
    setWalls(sceneData.walls);
  }
  const furniture = sceneData.furniture ?? sceneData.placedItems ?? [];
  setPlacedItems(Array.isArray(furniture) ? furniture : []);
  const floor = sceneData.materials?.floor ?? sceneData.floorMaterial;
  const ceiling = sceneData.materials?.ceiling ?? sceneData.ceilingMaterial;
  if (floor) setFloor(floor);
  if (ceiling) setCeiling(ceiling);
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
  snapshotApiRef,
  currentProjectId,
  setCurrentProjectId,
  skipInitialLatestLoad = false,
  localMutationVersionRef = null,
}) {
  const [saveStatus, setSaveStatus] = useState('idle');
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [shareUrl, setShareUrl] = useState('');
  const [modelAssets, setModelAssets] = useState(EMPTY_MODEL_ASSETS);
  const [assetUploadStatus, setAssetUploadStatus] = useState({ glb: 'idle', usdz: 'idle' });
  const autosaveTimer = useRef(null);
  const hasAttemptedInitialLoad = useRef(false);

  const getSceneData = useCallback(() => buildSceneData({
    rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState,
  }), [rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState]);

  const getCanvas = useCallback(() => {
    if (canvasRef?.current) return canvasRef.current;
    return document.querySelector('canvas')?.parentElement ?? document.querySelector('canvas');
  }, [canvasRef]);

  // Read the ref live inside async load guards; it must not be captured from render.
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const getLocalMutationVersion = useCallback(
    () => localMutationVersionRef?.current ?? 0,
    [localMutationVersionRef],
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const captureSnapshot = useCallback(() => {
    const snapshotApi = snapshotApiRef?.current;
    if (snapshotApi?.capture) {
      const captured = snapshotApi.capture();
      if (captured && captured !== 'data:,') return captured;
    }
    return takeSnapshot(getCanvas());
  }, [getCanvas, snapshotApiRef]);

  const saveProject = useCallback(async (name = projectName, withThumbnail = true, options = {}) => {
    setSaveStatus('saving');
    try {
      const scene = getSceneData();
      const thumbnail = await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(withThumbnail ? captureSnapshot() : null);
          });
        });
      });

      let response;
      if (currentProjectId && !options.createNew) {
        response = await axiosClient.put(`/api/projects/${currentProjectId}`, {
          title: name,
          scene_data: scene,
          thumbnail_url: thumbnail,
        });
      } else {
        response = await axiosClient.post('/api/projects/save', {
          title: name,
          scene_data: scene,
          thumbnail_url: thumbnail,
        });
      }

      const data = response.data;
      setCurrentProjectId(data.id);
      setProjectName(data.title || name);
      setShareUrl(data.share_url || '');
      setModelAssets(data.model_assets || EMPTY_MODEL_ASSETS);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return data;
    } catch (e) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      throw e;
    }
  }, [projectName, currentProjectId, getSceneData, captureSnapshot, setCurrentProjectId]);

  const downloadSnapshot = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const url = captureSnapshot();
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
  }, [captureSnapshot, projectName]);

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
          setShareUrl('');
          setModelAssets(EMPTY_MODEL_ASSETS);
        } catch {
          alert('Invalid project file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setRooms, setWalls, setPlacedItems, setFloorMaterial, setCeilingMaterial, lightingState, setCurrentProjectId]);

  const loadProject = useCallback(async (projectId, options = {}) => {
    const startMutationVersion = getLocalMutationVersion();
    const endpoint = getAccessToken()
      ? `/api/projects/me/open/${projectId}`
      : `/api/projects/${projectId}`;
    const { data } = await axiosClient.get(endpoint);
    if (options.skipIfLocalChanged && getLocalMutationVersion() !== startMutationVersion) {
      return data;
    }
    const sceneData = data.scene_data || data.scene;
    if (sceneData) {
      applySceneData(sceneData, {
        setRooms,
        setWalls,
        setPlacedItems,
        setFloor: setFloorMaterial,
        setCeiling: setCeilingMaterial,
        lightingState,
      });
      setProjectName(data.title || data.name);
      setCurrentProjectId(data.id);
      setShareUrl(data.share_url || '');
      setModelAssets(data.model_assets || EMPTY_MODEL_ASSETS);
    }
    return data;
  }, [getLocalMutationVersion, setRooms, setWalls, setPlacedItems, setFloorMaterial, setCeilingMaterial, lightingState, setCurrentProjectId]);

  const loadLatestProject = useCallback(async () => {
    if (!getAccessToken() || currentProjectId) return null;
    const startMutationVersion = getLocalMutationVersion();
    try {
      const { data } = await axiosClient.get('/api/projects/me/latest');
      if (getLocalMutationVersion() !== startMutationVersion) {
        return data;
      }
      const sceneData = data.scene_data || data.scene;
      if (!sceneData) return null;
      applySceneData(sceneData, {
        setRooms,
        setWalls,
        setPlacedItems,
        setFloor: setFloorMaterial,
        setCeiling: setCeilingMaterial,
        lightingState,
      });
      setProjectName(data.title || data.name || DEFAULT_PROJECT_NAME);
      setCurrentProjectId(data.id);
      setShareUrl(data.share_url || '');
      setModelAssets(data.model_assets || EMPTY_MODEL_ASSETS);
      return data;
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  }, [
    currentProjectId,
    getLocalMutationVersion,
    lightingState,
    setCeilingMaterial,
    setCurrentProjectId,
    setFloorMaterial,
    setPlacedItems,
    setProjectName,
    setRooms,
    setWalls,
  ]);

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
      const { data } = await axiosClient.post(`/api/projects/${projectId}/assets/${kind}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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

  const createNewProject = useCallback(() => {
    const nextRooms = [
      createRoomEntity({
        name: 'Room 1',
        type: 'room',
        x: 0,
        z: 0,
        width: 6,
        depth: 6,
        height: 3,
      }),
    ];

    setRooms(nextRooms);
    setWalls(generateLayoutWalls(nextRooms), true);
    setPlacedItems([]);
    setFloorMaterial(DEFAULT_FLOOR_MATERIAL);
    setCeilingMaterial(DEFAULT_CEILING_MATERIAL);
    lightingState.setTimeOfDay(50);
    lightingState.applyMood('none');
    lightingState.setPlacedLights([]);
    lightingState.setSelectedLightId(null);
    lightingState.setGlobalBrightness(1);
    lightingState.setPreviewMode(false);
    setCurrentProjectId(null);
    setProjectName(DEFAULT_PROJECT_NAME);
    setShareUrl('');
    setModelAssets(EMPTY_MODEL_ASSETS);
    setAssetUploadStatus({ glb: 'idle', usdz: 'idle' });
    setSaveStatus('idle');
  }, [
    lightingState,
    setCeilingMaterial,
    setCurrentProjectId,
    setFloorMaterial,
    setPlacedItems,
    setRooms,
    setWalls,
  ]);

  const listProjects = useCallback(async () => {
    const { data } = await axiosClient.get('/api/projects/list');
    return data;
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    await axiosClient.delete(`/api/projects/${projectId}`);
    if (projectId === currentProjectId) {
      setCurrentProjectId(null);
      setShareUrl('');
    }
  }, [currentProjectId, setCurrentProjectId]);

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

  useEffect(() => {
    if (skipInitialLatestLoad) return;
    if (hasAttemptedInitialLoad.current) return;
    hasAttemptedInitialLoad.current = true;
    const timeoutId = window.setTimeout(() => {
      loadLatestProject().catch(() => {});
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadLatestProject, skipInitialLatestLoad]);

  return {
    projectName, setProjectName,
    saveStatus,
    saveProject,
    downloadSnapshot,
    exportJSON,
    importJSON,
    loadProject,
    createNewProject,
    shareUrl,
    modelAssets,
    assetUploadStatus,
    listProjects,
    deleteProject,
    uploadModelAsset,
    copyShareLink,
    openSharePage,
    autosaveEnabled, setAutosaveEnabled,
    loadLatestProject,
  };
}
