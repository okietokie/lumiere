// src/hooks/useProjectSave.js
// Assembles all scene state into a saveable JSON, handles backend persistence,
// canvas snapshots, autosave, and JSON export/import.
import { useState, useCallback, useEffect, useRef } from 'react';

const API_BASE     = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const AUTOSAVE_MS  = 30_000; // 30 seconds

// ── Assemble scene JSON ───────────────────────────────────────────────────────
export function buildSceneData({ walls, placedItems, floorMaterial, ceilingMaterial, lightingState }) {
  return {
    version:   '1.0',
    savedAt:   new Date().toISOString(),
    walls:     walls.map(({ id, start, end, height, thickness, color, roughness, metalness, textureId }) =>
      ({ id, start, end, height, thickness, color, roughness, metalness, textureId })),
    furniture: placedItems.map(({ id, filename, name, position, rotation, scale }) =>
      ({ id, filename, name, position, rotation, scale })),
    materials: {
      floor:   floorMaterial,
      ceiling: ceilingMaterial,
    },
    lighting: {
      timeOfDay:        lightingState.timeOfDay,
      activeMood:       lightingState.activeMood,
      globalBrightness: lightingState.globalBrightness,
      placedLights:     lightingState.placedLights.map(({ id, type, position, intensity, color, distance, angle, enabled }) =>
        ({ id, type, position, intensity, color, distance, angle, enabled })),
    },
  };
}

// ── Restore scene from JSON ───────────────────────────────────────────────────
export function applySceneData(sceneData, { setWalls, setPlacedItems, setFloor, setCeiling, lightingState }) {
  if (!sceneData) return;
  if (sceneData.walls)     setWalls(sceneData.walls);
  if (sceneData.furniture) setPlacedItems(sceneData.furniture);
  if (sceneData.materials?.floor)   setFloor(sceneData.materials.floor);
  if (sceneData.materials?.ceiling) setCeiling(sceneData.materials.ceiling);
  if (sceneData.lighting) {
    const l = sceneData.lighting;
    if (l.timeOfDay        !== undefined) lightingState.setTimeOfDay(l.timeOfDay);
    if (l.activeMood)                     lightingState.applyMood(l.activeMood);
    if (l.globalBrightness !== undefined) lightingState.setGlobalBrightness(l.globalBrightness);
    if (l.placedLights)                   lightingState.setPlacedLights(l.placedLights);
  }
}

// ── Canvas snapshot ───────────────────────────────────────────────────────────
// preserveDrawingBuffer must be true on the Canvas for this to work.
// We find the canvas, force a fresh pixel read, and return the data URL.
export function takeSnapshot(canvasWrapperEl) {
  // Accept either the wrapper div or the canvas itself
  const canvas = canvasWrapperEl?.tagName === 'CANVAS'
    ? canvasWrapperEl
    : canvasWrapperEl?.querySelector('canvas');
  if (!canvas) return null;
  try {
    // With preserveDrawingBuffer:true the last rendered frame is always available
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    // Guard against blank (all-zero) canvas
    if (dataUrl === 'data:,') return null;
    return dataUrl;
  } catch (e) {
    console.warn('Snapshot failed:', e);
    return null;
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export default function useProjectSave({
  walls, setWalls,
  placedItems, setPlacedItems,
  floorMaterial, setFloorMaterial,
  ceilingMaterial, setCeilingMaterial,
  lightingState,
  canvasRef,          // ref to the <Canvas> DOM element
  currentProjectId,
  setCurrentProjectId,
}) {
  const [saveStatus,  setSaveStatus]  = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [projectName, setProjectName] = useState('Untitled Room');
  const autosaveTimer = useRef(null);

  // ── Collect current scene ─────────────────────────────────────────────────
  const getSceneData = useCallback(() => buildSceneData({
    walls, placedItems, floorMaterial, ceilingMaterial, lightingState,
  }), [walls, placedItems, floorMaterial, ceilingMaterial, lightingState]);

  // ── Get canvas wrapper element ──────────────────────────────────────────
  const getCanvas = useCallback(() => {
    if (canvasRef?.current) return canvasRef.current;
    // fallback: find the canvas directly
    return document.querySelector('canvas')?.parentElement ?? document.querySelector('canvas');
  }, [canvasRef]);

  // ── Save to backend ───────────────────────────────────────────────────────
  const saveProject = useCallback(async (name = projectName, withThumbnail = true) => {
    setSaveStatus('saving');
    try {
      const scene     = getSceneData();
      // Capture thumbnail — double rAF ensures the last frame is flushed
      const thumbnail = await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(withThumbnail ? takeSnapshot(getCanvas()) : null);
          });
        });
      });

      let response;
      if (currentProjectId) {
        // Update existing
        response = await fetch(`${API_BASE}/api/projects/${currentProjectId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, scene, thumbnail }),
        });
      } else {
        // Create new
        response = await fetch(`${API_BASE}/api/projects/save`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, scene, thumbnail }),
        });
      }

      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      setCurrentProjectId(data.id);
      setProjectName(name);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return data;
    } catch (e) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      throw e;
    }
  }, [projectName, currentProjectId, getSceneData, getCanvas, setCurrentProjectId]);

  // ── Snapshot only (no save) ───────────────────────────────────────────────
  const downloadSnapshot = useCallback((mode = 'current') => {
    // Give the canvas one frame to settle before grabbing pixels
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = getCanvas();
        const url    = takeSnapshot(canvas);
        if (!url) { alert('Snapshot failed — make sure the 3D scene is visible.'); return; }
        const a      = document.createElement('a');
        a.href       = url;
        a.download   = `${projectName.replace(/\s+/g, '_')}_snapshot.png`;
        a.click();
      });
    });
  }, [getCanvas, projectName]);

  // ── Export JSON ───────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const scene = getSceneData();
    const blob  = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `${projectName.replace(/\s+/g, '_')}.lumiere.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getSceneData, projectName]);

  // ── Import JSON ───────────────────────────────────────────────────────────
  const importJSON = useCallback(() => {
    const input   = document.createElement('input');
    input.type    = 'file';
    input.accept  = '.json,.lumiere.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          applySceneData(data, {
            setWalls, setPlacedItems,
            setFloor:   setFloorMaterial,
            setCeiling: setCeilingMaterial,
            lightingState,
          });
          setProjectName(file.name.replace(/\.(lumiere\.json|json)$/, ''));
          setCurrentProjectId(null); // treat as new project
        } catch {
          alert('Invalid project file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setWalls, setPlacedItems, setFloorMaterial, setCeilingMaterial, lightingState, setCurrentProjectId]);

  // ── Load project from backend ─────────────────────────────────────────────
  const loadProject = useCallback(async (projectId) => {
    const res  = await fetch(`${API_BASE}/api/projects/${projectId}`);
    const data = await res.json();
    if (data.scene) {
      applySceneData(data.scene, {
        setWalls, setPlacedItems,
        setFloor:   setFloorMaterial,
        setCeiling: setCeilingMaterial,
        lightingState,
      });
      setProjectName(data.name);
      setCurrentProjectId(data.id);
    }
    return data;
  }, [setWalls, setPlacedItems, setFloorMaterial, setCeilingMaterial, lightingState, setCurrentProjectId]);

  // ── Autosave ──────────────────────────────────────────────────────────────
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
    autosaveEnabled, setAutosaveEnabled,
  };
}