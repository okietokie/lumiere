
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import axiosClient from "./lumiere-frontend/src/api/axiosClient";

const TOKEN_KEY = "token";
const USER_KEY = "lumiereUser";
export const LIVE_3D_SCENE_STORAGE_KEY = "lumiere:live-3d-scene";
export const LIVE_2D_PLAN_STORAGE_KEY = "lumiere:live-2d-plan";

export const authStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getStoredUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  storeAuthSession: (payload) => {
    if (payload?.access_token) localStorage.setItem(TOKEN_KEY, payload.access_token);
    if (payload?.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  },
  clearAuthSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const saveSnapshot = (key, snapshot) => {
  if (!snapshot) return;
  window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), ...snapshot }));
};

const loadSnapshot = (key) => {
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export function getLatestLiveEditorSnapshot() {
  const latest3D = loadSnapshot(LIVE_3D_SCENE_STORAGE_KEY);
  const latest2D = loadSnapshot(LIVE_2D_PLAN_STORAGE_KEY);
  if (!latest3D && !latest2D) return null;
  if (!latest3D) return { type: "2d", data: latest2D };
  if (!latest2D) return { type: "3d", data: latest3D };
  return latest2D.savedAt > latest3D.savedAt ? { type: "2d", data: latest2D } : { type: "3d", data: latest3D };
}

export const persistLiveEditorState = (scene3D, plan2D) => {
  if (scene3D) saveSnapshot(LIVE_3D_SCENE_STORAGE_KEY, scene3D);
  if (plan2D) saveSnapshot(LIVE_2D_PLAN_STORAGE_KEY, plan2D);
};
const RequireAuth = ({ children }) => authStorage.getAccessToken() ? children : <Navigate to="/login" replace />;
const RedirectAuthenticated = ({ children }) => authStorage.getAccessToken() ? <Navigate to="/user/dashboard" replace /> : children;

function RequireAuthOrDemo({ children }) {
  const location = useLocation();
  const demo = new URLSearchParams(location.search).get("demo") === "true";
  if (authStorage.getAccessToken() || demo) return children;
  const redirect = `${location.pathname}${location.search}`;
  return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
}

export function FrontendRouteShell({ LandingPage, Login, Register, Dashboard, RoomScene, RoomCanvas }) {
  const storedUser = authStorage.getStoredUser();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<RedirectAuthenticated><Login /></RedirectAuthenticated>} />
      <Route path="/register" element={<RedirectAuthenticated><Register /></RedirectAuthenticated>} />
      <Route path="/user/dashboard" element={<RequireAuth><Dashboard user={storedUser} /></RequireAuth>} />
      <Route path="/user/room" element={<RequireAuthOrDemo><RoomScene /></RequireAuthOrDemo>} />
      <Route path="/user/room-2d" element={<RequireAuthOrDemo><RoomCanvas /></RequireAuthOrDemo>} />
    </Routes>
  );
}
export function buildSceneData({ rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState, budget }) {
  return {
    version: "1.3",
    savedAt: new Date().toISOString(),
    rooms,
    walls,
    furniture: placedItems,
    materials: { floor: floorMaterial, ceiling: ceilingMaterial },
    lighting: {
      timeOfDay: lightingState.timeOfDay,
      activeMood: lightingState.activeMood,
      globalBrightness: lightingState.globalBrightness,
      placedLights: lightingState.placedLights,
    },
    budget,
  };
}

export function takeSnapshot(canvasWrapperEl) {
  const canvas = canvasWrapperEl?.tagName === "CANVAS" ? canvasWrapperEl : canvasWrapperEl?.querySelector("canvas");
  if (!canvas) return null;
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    return dataUrl === "data:," ? null : dataUrl;
  } catch {
    return null;
  }
}
export function useProjectSaveReference({
  rooms,
  walls,
  placedItems,
  floorMaterial,
  ceilingMaterial,
  lightingState,
  canvasRef,
  currentProjectId,
  setCurrentProjectId,
  hydrateBudgetFromScene,
  applySceneData,
}) {
  const [projectName, setProjectName] = useState("Untitled Room");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [shareUrl, setShareUrl] = useState("");
  const saveInFlightRef = useRef(false);
  const getSceneData = useCallback(() => buildSceneData({
    rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState, budget: {},
  }), [rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState]);
  const captureSnapshot = useCallback(() => {
    if (canvasRef?.current) return takeSnapshot(canvasRef.current);
    return takeSnapshot(document.querySelector("canvas")?.parentElement ?? document.querySelector("canvas"));
  }, [canvasRef]);
  const saveProject = useCallback(async () => {
    if (saveInFlightRef.current) return null;
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    try {
      const scene = getSceneData();
      const thumbnail = captureSnapshot();
      const response = currentProjectId
        ? await axiosClient.put(`/api/projects/${currentProjectId}`, { title: projectName, scene_data: scene, thumbnail_url: thumbnail })
        : await axiosClient.post("/api/projects/save", { title: projectName, scene_data: scene, thumbnail_url: thumbnail });
      const data = response.data;
      hydrateBudgetFromScene?.(data.scene_data?.budget ?? data.scene?.budget ?? {});
      setCurrentProjectId(data.id);
      setProjectName(data.title || projectName);
      setShareUrl(data.share_url || "");
      setSaveStatus("saved");
      return data;
    } catch (error) {
      setSaveStatus("error");
      throw error;
    } finally {
      saveInFlightRef.current = false;
    }
  }, [captureSnapshot, currentProjectId, getSceneData, hydrateBudgetFromScene, projectName, setCurrentProjectId]);

  const loadProject = useCallback(async (projectId) => {
    const endpoint = authStorage.getAccessToken() ? `/api/projects/me/open/${projectId}` : `/api/projects/${projectId}`;
    const { data } = await axiosClient.get(endpoint);
    const sceneData = data.scene_data || data.scene;
    if (sceneData) {
      hydrateBudgetFromScene?.(sceneData.budget ?? {});
      applySceneData?.(sceneData);
      setProjectName(data.title || data.name || "Untitled Room");
      setCurrentProjectId(data.id);
      setShareUrl(data.share_url || "");
    }
    return data;
  }, [applySceneData, hydrateBudgetFromScene, setCurrentProjectId]);
  return { projectName, saveStatus, shareUrl, saveProject, loadProject };
}
export function RoomSceneSystemReference({ rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState, applySceneData }) {
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [sceneMutationVersion, setSceneMutationVersion] = useState(0);
  const sceneSnapshot = useMemo(() => buildSceneData({
    rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState, budget: {},
  }), [rooms, walls, placedItems, floorMaterial, ceilingMaterial, lightingState]);
  const projectSave = useProjectSaveReference({
    rooms,
    walls,
    placedItems,
    floorMaterial,
    ceilingMaterial,
    lightingState,
    canvasRef: { current: null },
    currentProjectId,
    setCurrentProjectId,
    applySceneData,
  });
  useEffect(() => {
    persistLiveEditorState(sceneSnapshot, null);
  }, [sceneSnapshot, sceneMutationVersion]);
  return (
    <section>
      <h2>RoomScene Core System</h2>
      <p>Project: {projectSave.projectName}</p>
      <p>Save state: {projectSave.saveStatus}</p>
      <button type="button" onClick={() => setSceneMutationVersion((value) => value + 1)}>Mark Scene Dirty</button>
    </section>
  );
}
