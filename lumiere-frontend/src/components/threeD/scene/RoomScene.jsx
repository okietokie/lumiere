import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid as DreiGrid, GizmoHelper, GizmoViewport, Html, Text } from "@react-three/drei";
import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { Splitter, Button, Tooltip, Space, Grid, Tabs, InputNumber, Slider } from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
  ApartmentOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  AppstoreOutlined,
  ColumnWidthOutlined,
  BulbOutlined,
  FormatPainterOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  UpOutlined,
  DownOutlined,
  LoginOutlined,
  LogoutOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { gsap } from "gsap";
import { v4 as uuidv4 } from "uuid";
import { COLORS } from "../../../utils/colors";
import {
  generateLayoutWalls,
  getLayoutBounds,
  ROOM_DIRECTION_ORDER,
  addRoomAdjacent,
  hasRoomOverlap,
} from "../../../utils/roomLayout";
import {
  createRoomEntity,
  createWallEntity,
  createDoorEntity,
  createWindowEntity,
  getWallMetrics,
  projectPointOntoWall,
  validateDoorPlacement,
  validateWindowPlacement,
} from "../../../utils/sceneEntities";
import * as THREE from "three";
import useHistory   from "../../../hooks/useHistory";
import useMaterials from "../../../hooks/useMaterials";
import useLighting  from "../../../hooks/useLighting";
import FirstPersonControls from "../camera/FirstPersonControls";
import WalkHUD             from "../camera/WalkHUD";
import InteractiveWall from "../walls/InteractiveWall";
import WallGizmo       from "../walls/WallGizmo";
import WallEditorPanel from "../walls/WallEditor";
import FurnitureItem   from "../furniture/FurnitureItem";
import FurnitureGizmo  from "../furniture/FurnitureGizmo";
import FurniturePicker from "../furniture/FurniturePicker";
import { PreviewPortal } from "../furniture/ModelPreview";
import SceneLighting from "../lighting/SceneLighting";
import LightingPanel from "../lighting/LightingPanel";
import PlacedLight   from "../lighting/PlacedLight";
import MaterialPanel from "../materials/MaterialPanel";
import ContextToolbar, { WorldProjector } from "../ui/ContextToolbar";
import useContextNav       from "../../../hooks/useContextNav";
import SurfaceMaterial     from "../materials/SurfaceMaterial";
import ScorePanel          from "../ui/ScorePanel";
import CollisionHighlight  from "../furniture/CollisionHighlight";
import useSpatialAnalysis  from "../../../hooks/useSpatialAnalysis";
import SaveModal           from "../ui/SaveModal";
import SavedProjectsPanel  from "../ui/SavedProjectsPanel";
import { useToast }        from "../../../ui/ToastNotification";
import { SlidePanel, BottomNav, MobileTopBar } from "./MobileLayout";
import RevealActionButton from "./RevealActionButton";
import useProjectSave      from "../../../hooks/useProjectSave";
import RoomCreationPanel from "../rooms/RoomCreationPanel";
import PendingRoomNameInput from "../rooms/PendingRoomNameInput";
import useRoomCreation from "../rooms/useRoomCreation";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import KeyboardDoubleArrowLeftRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import KeyboardDoubleArrowUpRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowUpRounded";
import KeyboardDoubleArrowDownRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowDownRounded";
import ArchitectureRoundedIcon from "@mui/icons-material/ArchitectureRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import TextureRoundedIcon from "@mui/icons-material/TextureRounded";
import ChairRoundedIcon from "@mui/icons-material/ChairRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import FolderCopyRoundedIcon from "@mui/icons-material/FolderCopyRounded";

import useRecorder          from '../../../hooks/useRecorder';
import RecordingIndicator   from '../ui/RecordingIndicator';
import { clearAuthSession } from "../../../utils/authStorage";
import { useNavigate, useSearchParams } from "react-router-dom";


const CAMERA_PRESETS = {
  perspective: { position: [7, 4, 9],    target: [0, 1.5, 0] },
  top:         { position: [0, 10, 0.1], target: [0, 1.5, 0] },
  front:       { position: [0, 1.5, 10], target: [0, 1.5, 0] },
  side:        { position: [10, 1.5, 0], target: [0, 1.5, 0] },
};

const OPENING_STEP = 0.05;
const DOOR_STYLE_OPTIONS = [
  { key: 'hinged', label: 'Single Hinged Door' },
  { key: 'sliding', label: 'Single Sliding Door' },
  { key: 'double', label: 'Double Hinged Door' },
];

const ROOM_ACTION_BUTTONS = [
  { key: 'wall', icon: SpaceDashboardRoundedIcon, label: 'Add Wall' },
  { key: 'room', icon: HomeWorkRoundedIcon, label: 'Add Room' },
  { key: 'direction', icon: KeyboardDoubleArrowRightRoundedIcon, label: 'Change Side' },
];
const ROOM_CREATION_ROOT_SELECTOR = '[data-room-creation-root="true"]';

function formatMoney(value, currency = 'AED') {
  return new Intl.NumberFormat(currency === 'EUR' ? 'en-IE' : 'en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function RoomScene() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId");
  const [rooms, setRooms] = useState(() => [
    createRoomEntity({
      name: 'Room 1',
      type: 'room',
      x: 0,
      z: 0,
      width: 6,
      depth: 6,
      height: 3,
    }),
  ]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const initialWalls = useMemo(() => generateLayoutWalls(rooms), [rooms]);
  const handleLogout = useCallback(() => {
    clearAuthSession();
    navigate("/login", { replace: true });
  }, [navigate]);
  const handleDashboard = useCallback(() => {
    navigate("/user/dashboard");
  }, [navigate]);
  const {
    state: walls, set: setWalls,
    undo, redo, canUndo, canRedo,
  } = useHistory(initialWalls);
  const {
    floorMaterial, ceilingMaterial,
    setFloorMaterial, setCeilingMaterial,
    applyTexture, updateSurface, applyTheme, activeTheme,
  } = useMaterials(walls, setWalls);

  // Lighting 
  const lightingState = useLighting();
  const {
    lighting, placedLights,
    selectedLightId, setSelectedLightId,
    previewMode,
  } = lightingState;

  // Furniture 
  const [placedItems,         setPlacedItems]         = useState([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);
  const furnitureRefs = useRef({});

  // UI state 
  const [selectedWallId,      setSelectedWallId]      = useState(null);
  const [selectedOpening,     setSelectedOpening]     = useState(null);
  const [roomWallPlacementSide, setRoomWallPlacementSide] = useState('right');
  const [sceneRoomActionsVisible, setSceneRoomActionsVisible] = useState(false);
  const [cameraMode,          setCameraMode]          = useState('orbit');
  const [gizmoMode,           setGizmoMode]           = useState('translate');
  const [activeTool,          setActiveTool]          = useState('select');
  const [openingPreview,      setOpeningPreview]      = useState(null);
  const [isPointerLocked,     setIsPointerLocked]     = useState(false);
  const [orbitEnabled,        setOrbitEnabled]        = useState(true);
  const [teleportTarget,      setTeleportTarget]      = useState(null);
  const [activeTab,           setActiveTab]           = useState('walls');
  const [desktopPanelOpen,    setDesktopPanelOpen]    = useState(false);
  const [currentViewPreset,   setCurrentViewPreset]   = useState('perspective');
  const [saveModalOpen,       setSaveModalOpen]       = useState(false);
  const [currentProjectId,    setCurrentProjectId]    = useState(null);
  const [wallsHidden,         setWallsHidden]         = useState(false);
  const [wallToolbarPinned,   setWallToolbarPinned]   = useState(false);
  const [furnitureToolbarPinned, setFurnitureToolbarPinned] = useState(false);
  const [wallToolbarPos,      setWallToolbarPos]      = useState(null);
  const [furnitureToolbarPos, setFurnitureToolbarPos] = useState(null);
  const [lightToolbarPos,     setLightToolbarPos]     = useState(null);

  const orbitControlsRef = useRef(null);
  const sceneRef         = useRef(null);
  const canvasWrapperRef = useRef(null);
  const wallRefs         = useRef({});
  const desktopFloatingRef = useRef(null);

  const screens = Grid.useBreakpoint();
  const { navigateTo } = useContextNav(setActiveTab);
  const toast = useToast();

  // Whether anything is selected (drives GizmoHelper visibility)
  const anythingSelected = !!(selectedWallId || selectedFurnitureId || selectedLightId || selectedOpening);

  // Mobile detection 
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobileDoorEditorSection, setMobileDoorEditorSection] = useState(null);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const openMobilePanel = useCallback((tab) => {
    const hasSelectedRoom = Boolean(selectedRoomId || rooms[0]?.id);
    const nextTab = tab === 'room' && !hasSelectedRoom ? 'walls' : tab;
    setActiveTab(nextTab);
    setMobilePanelOpen(true);
  }, [rooms, selectedRoomId]);
  const sidebarRef = useRef(null);
  const desktopPanelInitRef = useRef(false);

  const spatial = useSpatialAnalysis(placedItems, walls, furnitureRefs);

  const projectSave = useProjectSave({
    rooms, setRooms,
    walls, setWalls,
    placedItems, setPlacedItems,
    floorMaterial, setFloorMaterial,
    ceilingMaterial, setCeilingMaterial,
    lightingState,
    canvasRef: canvasWrapperRef,
    currentProjectId, setCurrentProjectId,
    skipInitialLatestLoad: Boolean(selectedProjectId),
  });
  const { loadProject } = projectSave;
  useEffect(() => {
    if (!selectedProjectId) return;
    loadProject(selectedProjectId).catch((error) => {
      console.error("Failed to load selected project", error);
    });
  }, [loadProject, selectedProjectId]);
  const handleCreateNewProject = useCallback(() => {
    projectSave.createNewProject();
    setSelectedRoomId(null);
    setSelectedWallId(null);
    setSelectedOpening(null);
    setSelectedFurnitureId(null);
    setSelectedLightId(null);
    setActiveTool('select');
    setActiveTab('walls');
    setMobilePanelOpen(false);
    setSaveModalOpen(true);
  }, [projectSave, setSelectedLightId]);
  const toggleWallsHidden = useCallback(() => {
    setWallsHidden((prev) => !prev);
    setSelectedWallId(null);
    setSelectedOpening(null);
    setWallToolbarPinned(false);
    setWallToolbarPos(null);
    if (activeTab === 'walls') setActiveTab('furniture');
    if (activeTool === 'door' || activeTool === 'window' || activeTool === 'build') {
      setActiveTool('select');
    }
  }, [activeTab, activeTool]);
  const recorder = useRecorder({
    canvasWrapperRef,         
    orbitControlsRef,         
    projectId: currentProjectId,
  });
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null,
    [rooms, selectedRoomId]
  );
  const roomCreation = useRoomCreation({
    rooms,
    setRooms,
    walls,
    setWalls,
    selectedRoom,
    setSelectedRoomId,
    setSelectedWallId,
    setSelectedOpening,
    setSelectedFurnitureId,
    setSelectedLightId,
    setActiveTab,
    rebuildResolvedWalls: (nextRooms, wallSource = walls) => {
      const manualWalls = wallSource.filter((wall) => wall?.source === 'manual');
      const layoutWalls = generateLayoutWalls(nextRooms, wallSource.filter((wall) => wall?.source !== 'manual'));
      return [...layoutWalls, ...manualWalls];
    },
    toast,
  });
  const pendingScenePreviewRoom = useMemo(() => {
    const pending = roomCreation.pendingRoomCreation;
    if (!pending || pending.sceneStep !== 'details') return null;

    const sourceRoom = rooms.find((room) => room.id === pending.sourceRoomId);
    if (!sourceRoom) return null;

    const width = Number(pending.width);
    const depth = Number(pending.depth);
    const height = Number(pending.height);

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(depth) || depth <= 0 || !Number.isFinite(height) || height <= 0) {
      return null;
    }

    const previewRoom = addRoomAdjacent(sourceRoom, pending.direction, {
      id: 'pending-room-preview',
      name: pending.name?.trim() || 'New room',
      type: pending.type ?? 'room',
      width,
      depth,
      height,
    });

    return {
      ...previewRoom,
      overlapsExisting: hasRoomOverlap(previewRoom, rooms),
    };
  }, [roomCreation.pendingRoomCreation, rooms]);

  const boardFootprint = useMemo(() => {
    const layoutBounds = getLayoutBounds(rooms);
    const wallPoints = walls.flatMap((wall) => wall ? [wall.start, wall.end] : []).filter(Boolean);
    const wallBounds = wallPoints.length ? {
      left: Math.min(...wallPoints.map(([x]) => x)),
      right: Math.max(...wallPoints.map(([x]) => x)),
      top: Math.min(...wallPoints.map(([, z]) => z)),
      bottom: Math.max(...wallPoints.map(([, z]) => z)),
    } : null;
    const left = wallBounds ? Math.min(layoutBounds.left, wallBounds.left) : layoutBounds.left;
    const right = wallBounds ? Math.max(layoutBounds.right, wallBounds.right) : layoutBounds.right;
    const top = wallBounds ? Math.min(layoutBounds.top, wallBounds.top) : layoutBounds.top;
    const bottom = wallBounds ? Math.max(layoutBounds.bottom, wallBounds.bottom) : layoutBounds.bottom;
    return {
      centerX: (left + right) / 2,
      centerZ: (top + bottom) / 2,
      width: Math.max((right - left) + 14, 20),
      depth: Math.max((bottom - top) + 14, 20),
    };
  }, [rooms, walls]);
  const roomWalls = useMemo(() => {
    const firstRoomId = rooms[0]?.id ?? null;
    return rooms.map((room, index) => {
      const scopedWalls = walls.filter((wall) => {
        const hasValidPoints = Array.isArray(wall?.start)
          && Array.isArray(wall?.end)
          && Number.isFinite(wall.start[0])
          && Number.isFinite(wall.start[1])
          && Number.isFinite(wall.end[0])
          && Number.isFinite(wall.end[1]);
        if (!hasValidPoints) return false;
        if (wall.roomId) return wall.roomId === room.id;
        return index === 0 && room.id === firstRoomId;
      });
      return { room, walls: scopedWalls };
    });
  }, [rooms, walls]);
  const roomSurfaceBounds = useMemo(() => {
    return roomWalls.map(({ room, walls: scopedWalls }) => {
      const roomLeft = room.x - room.width / 2;
      const roomRight = room.x + room.width / 2;
      const roomTop = room.z - room.depth / 2;
      const roomBottom = room.z + room.depth / 2;
      const points = scopedWalls.flatMap((wall) => [wall.start, wall.end]).filter(Boolean);

      if (!points.length) {
        return {
          roomId: room.id,
          centerX: room.x,
          centerZ: room.z,
          width: room.width,
          depth: room.depth,
        };
      }

      const left = Math.min(roomLeft, ...points.map(([x]) => x));
      const right = Math.max(roomRight, ...points.map(([x]) => x));
      const top = Math.min(roomTop, ...points.map(([, z]) => z));
      const bottom = Math.max(roomBottom, ...points.map(([, z]) => z));

      return {
        roomId: room.id,
        centerX: (left + right) / 2,
        centerZ: (top + bottom) / 2,
        width: Math.max(right - left, room.width),
        depth: Math.max(bottom - top, room.depth),
      };
    });
  }, [roomWalls]);
  const selectedRoomSurfaceBounds = useMemo(
    () => roomSurfaceBounds.find((entry) => entry.roomId === selectedRoom?.id) ?? null,
    [roomSurfaceBounds, selectedRoom]
  );
  const selectedWall      = walls.find((w) => w.id === selectedWallId);
  const selectedFurniture = placedItems.find((i) => i.id === selectedFurnitureId);
  const selectedWallDoorCount = selectedWall?.doors?.length ?? 0;
  const selectedWallWindowCount = selectedWall?.windows?.length ?? 0;
  const selectedOpeningEntity = useMemo(() => {
    if (!selectedOpening || !selectedWall) return null;
    const openings = selectedOpening.type === 'door'
      ? (selectedWall.doors ?? [])
      : (selectedWall.windows ?? []);
    return openings.find((opening) => opening.id === selectedOpening.id) ?? null;
  }, [selectedOpening, selectedWall]);
  const mobileOpeningPlacementLocked = isMobile
    && cameraMode === 'orbit'
    && (activeTool === 'door' || activeTool === 'window');

  const softBorder = `1px solid ${COLORS.secondary}55`;
  const softShadow = '0 24px 60px rgba(0, 0, 0, 0.28)';
  const glassShadow = '0 16px 34px rgba(0, 0, 0, 0.24)';
  const panelGradient = `linear-gradient(180deg, ${COLORS.surface}F2 0%, ${COLORS.background}F8 100%)`;
  const pageGradient = `radial-gradient(circle at top left, ${COLORS.surface} 0%, ${COLORS.background} 58%, #211a17 100%)`;
  const copperGlow = 'radial-gradient(circle at top left, rgba(196, 154, 108, 0.16), transparent 42%)';
  const accentGlow = 'radial-gradient(circle at bottom right, rgba(139, 107, 77, 0.18), transparent 38%)';
  const cameraCardBg = `linear-gradient(180deg, ${COLORS.background}E8 0%, ${COLORS.surface}F2 100%)`;
  const desktopCanvasShell = `linear-gradient(180deg, ${COLORS.surface}D8 0%, ${COLORS.background}F4 100%)`;
  const openingChipStyle = {
    minHeight: 30,
    padding: '0 10px',
    fontSize: 10,
    letterSpacing: '0.04em',
  };
  const openingDangerChipStyle = {
    ...openingChipStyle,
    minWidth: 72,
  };
  const openingPanelTone = {
    background: 'linear-gradient(180deg, rgba(68, 54, 47, 0.92) 0%, rgba(33, 25, 22, 0.96) 100%)',
    border: `1px solid ${COLORS.action}33`,
    boxShadow: '0 18px 42px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.05)',
  };
  const openingFieldCardStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 12px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.secondary}33`,
  };
  const openingIconButtonStyle = {
    minWidth: 36,
    width: 36,
    height: 36,
    padding: 0,
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const mobileDoorEditButtonStyle = {
    minWidth: 0,
    height: 48,
    borderRadius: 16,
    border: `1px solid ${COLORS.secondary}40`,
    background: 'rgba(255,255,255,0.05)',
    color: COLORS.text,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    font: 'inherit',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, width 0.28s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease, border-color 0.2s ease',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  };

  const getOpeningBounds = useCallback((openingType) => ({
    width: { min: 0.45, max: 2.4 },
    height: openingType === 'door'
      ? { min: 1.8, max: 2.6 }
      : { min: 0.6, max: 1.8 },
  }), []);

  useEffect(() => {
    if (!selectedRoomId && rooms[0]?.id) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoom && activeTab === 'room') {
      setActiveTab('walls');
    }
  }, [activeTab, selectedRoom]);

  useEffect(() => {
    setSceneRoomActionsVisible(false);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!roomCreation.pendingRoomCreation?.sourceRoomId) return;
    if (roomCreation.pendingRoomCreation.sourceRoomId === selectedRoomId) {
      setSceneRoomActionsVisible(true);
    }
  }, [roomCreation.pendingRoomCreation, selectedRoomId]);

  useEffect(() => {
    if (isMobile) return;
    if (!desktopPanelInitRef.current) {
      desktopPanelInitRef.current = true;
      return;
    }
    setDesktopPanelOpen(true);
  }, [activeTab, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setMobileDoorEditorSection(null);
      return;
    }
    if (!selectedOpeningEntity || selectedOpening?.type !== 'door') {
      setMobileDoorEditorSection(null);
    }
  }, [isMobile, selectedOpening?.id, selectedOpening?.type, selectedOpeningEntity]);

  useEffect(() => {
    if (isMobile || !desktopPanelOpen) return undefined;

    const onPointerDown = (event) => {
      if (desktopFloatingRef.current?.contains(event.target)) return;
      setDesktopPanelOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [desktopPanelOpen, isMobile]);

  useEffect(() => {
    if (!roomCreation.pendingRoomCreation) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(ROOM_CREATION_ROOT_SELECTOR)) return;
      roomCreation.cancelPendingRoomCreation();
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [roomCreation.cancelPendingRoomCreation, roomCreation.pendingRoomCreation]);


  // Apply ghost opacity to wall meshes
  useEffect(() => {
    walls.forEach((wall) => {
      const mesh = wallRefs.current[wall.id];
      if (!mesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (!m) return;
        if (wall.ghost) { m.transparent = true;  m.opacity = 0.15; m.depthWrite = false; }
        else            { m.transparent = false; m.opacity = 1;    m.depthWrite = true;  }
        m.needsUpdate = true;
      });
    });
  }, [walls]);

  // Keyboard shortcuts 
  // Mobile touch safety
  useEffect(() => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const safeTouchMove = (e) => {
      if (e.touches.length === 1 && e.targetTouches.length === 1) return;
      if (e.touches.length < 2) e.stopImmediatePropagation();
    };
    canvas.addEventListener('touchmove', safeTouchMove, { capture: true, passive: true });
    return () => canvas.removeEventListener('touchmove', safeTouchMove, { capture: true });
  }, []);

  useEffect(() => {
    if (sceneRef.current)
      gsap.from(sceneRef.current, { opacity: 0, scale: 0.98, duration: 1, delay: 0.3, ease: "expo.out" });
  }, []);

  // Wall helpers
  const updateWall = (id, updates) =>
    setWalls((p) => p.map((w) => w.id === id ? { ...w, ...updates } : w));

  const updateWallOpening = useCallback((wallId, openingType, openingId, updates) => {
    setWalls((prev) => prev.map((wall) => {
      if (wall.id !== wallId) return wall;
      const key = openingType === 'door' ? 'doors' : 'windows';
      const nextItems = (wall[key] ?? []).map((opening) => {
        if (opening.id !== openingId) return opening;
        const nextOpening = { ...opening, ...updates, updatedAt: Date.now() };
        const validation = openingType === 'door'
          ? validateDoorPlacement(wall, nextOpening)
          : validateWindowPlacement(wall, nextOpening);
        return validation.valid ? nextOpening : opening;
      });
      return { ...wall, [key]: nextItems, updatedAt: Date.now() };
    }));
  }, [setWalls]);

  const removeWallOpening = useCallback((wallId, openingType, openingId) => {
    setWalls((prev) => prev.map((wall) => {
      if (wall.id !== wallId) return wall;
      const key = openingType === 'door' ? 'doors' : 'windows';
      return {
        ...wall,
        [key]: (wall[key] ?? []).filter((opening) => opening.id !== openingId),
        updatedAt: Date.now(),
      };
    }));
    setSelectedOpening((prev) => (prev?.id === openingId ? null : prev));
  }, [setWalls]);

  const updateOpeningNumericField = useCallback((field, rawValue) => {
    if (!selectedOpening || !selectedOpeningEntity) return;

    const bounds = getOpeningBounds(selectedOpening.type)[field];
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      toast.info(`Enter a valid ${field} value.`);
      return;
    }

    const nextValue = Number(THREE.MathUtils.clamp(numericValue, bounds.min, bounds.max).toFixed(2));

    if (numericValue !== nextValue) {
      toast.info(`${field[0].toUpperCase() + field.slice(1)} must stay between ${bounds.min.toFixed(2)} m and ${bounds.max.toFixed(2)} m.`);
    }

    updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { [field]: nextValue });
  }, [getOpeningBounds, selectedOpening, selectedOpeningEntity, toast, updateWallOpening]);

  const renderOpeningModeButton = useCallback((tooltip, icon, active, onClick, danger = false) => (
    <Tooltip title={tooltip}>
      <button
        type="button"
        className={active ? 'room-secondary-chip is-active' : danger ? 'room-secondary-chip is-danger' : 'room-secondary-chip'}
        style={{
          ...openingIconButtonStyle,
          borderColor: active ? `${COLORS.action}AA` : undefined,
        }}
        onClick={onClick}
      >
        {icon}
      </button>
    </Tooltip>
  ), [openingIconButtonStyle]);

  const renderOpeningDimensionInputs = useCallback(() => {
    if (!selectedOpening || !selectedOpeningEntity) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <div style={openingFieldCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: COLORS.text, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ColumnWidthOutlined />
              Width
            </span>
            <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 700 }}>{Number(selectedOpeningEntity.width).toFixed(2)} m</span>
          </div>
          <InputNumber
            min={getOpeningBounds(selectedOpening.type).width.min}
            max={getOpeningBounds(selectedOpening.type).width.max}
            step={OPENING_STEP}
            precision={2}
            controls
            value={selectedOpeningEntity.width}
            onChange={(value) => updateOpeningNumericField('width', value)}
            style={{ width: '100%' }}
            addonAfter="m"
          />
        </div>
        <div style={openingFieldCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: COLORS.text, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <SpaceDashboardRoundedIcon style={{ fontSize: 16 }} />
              Height
            </span>
            <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 700 }}>{Number(selectedOpeningEntity.height).toFixed(2)} m</span>
          </div>
          <InputNumber
            min={getOpeningBounds(selectedOpening.type).height.min}
            max={getOpeningBounds(selectedOpening.type).height.max}
            step={OPENING_STEP}
            precision={2}
            controls
            value={selectedOpeningEntity.height}
            onChange={(value) => updateOpeningNumericField('height', value)}
            style={{ width: '100%' }}
            addonAfter="m"
          />
        </div>
      </div>
    );
  }, [getOpeningBounds, openingFieldCardStyle, selectedOpening, selectedOpeningEntity, updateOpeningNumericField]);

  const renderDoorBehaviorControls = useCallback(() => {
    if (!selectedOpening || !selectedOpeningEntity || selectedOpening.type !== 'door') return null;

    const selectedDoorStyle = selectedOpeningEntity.doorStyle ?? 'hinged';

    if (selectedDoorStyle === 'sliding') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Sliding Direction
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {renderOpeningModeButton(
              'Slide panel to the left',
              <LeftOutlined />,
              (selectedOpeningEntity.slideDirection ?? 'right') === 'left',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { slideDirection: 'left' })
            )}
            {renderOpeningModeButton(
              'Slide panel to the right',
              <RightOutlined />,
              (selectedOpeningEntity.slideDirection ?? 'right') === 'right',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { slideDirection: 'right' })
            )}
          </div>
        </div>
      );
    }

    if (selectedDoorStyle === 'double') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Swing Mode
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {renderOpeningModeButton(
              'Open inward',
              <LoginOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === true,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: true })
            )}
            {renderOpeningModeButton(
              'Open outward',
              <LogoutOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === false,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: false })
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {renderOpeningModeButton(
            'Hinge on the left side',
            <LeftOutlined />,
            selectedOpeningEntity.hingeSide === 'left',
            () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { hingeSide: 'left' })
          )}
          {renderOpeningModeButton(
            'Hinge on the right side',
            <RightOutlined />,
            selectedOpeningEntity.hingeSide === 'right',
            () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { hingeSide: 'right' })
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {renderOpeningModeButton(
            'Open inward',
            <LoginOutlined />,
            (selectedOpeningEntity.opensInward ?? true) === true,
            () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: true })
          )}
          {renderOpeningModeButton(
            'Open outward',
            <LogoutOutlined />,
            (selectedOpeningEntity.opensInward ?? true) === false,
            () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: false })
          )}
        </div>
      </div>
    );
  }, [renderOpeningModeButton, selectedOpening, selectedOpeningEntity, updateWallOpening]);

  const renderDoorOpenControls = useCallback(() => {
    if (!selectedOpening || !selectedOpeningEntity || selectedOpening.type !== 'door') return null;
    if ((selectedOpeningEntity.doorStyle ?? 'hinged') === 'hinged') return null;

    const openAmount = Number.isFinite(selectedOpeningEntity.openAmount) ? selectedOpeningEntity.openAmount : 0;
    const doorStyleLabel = DOOR_STYLE_OPTIONS.find((option) => option.key === (selectedOpeningEntity.doorStyle ?? 'hinged'))?.label ?? 'Door';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Open Amount
          </div>
          <div style={{ color: `${COLORS.text}9A`, fontSize: 11 }}>
            {doorStyleLabel}
          </div>
        </div>
        <div style={{ ...openingFieldCardStyle, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: COLORS.text, fontSize: 11 }}>Panel Motion</span>
            <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 700 }}>{Math.round(openAmount * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={openAmount}
            onChange={(value) => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { openAmount: value })}
            tooltip={{ formatter: (value) => `${Math.round((value ?? 0) * 100)}%` }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <button
              type="button"
              className={openAmount <= 0.01 ? 'room-secondary-chip is-active' : 'room-secondary-chip'}
              style={{ minHeight: 40, borderRadius: 14 }}
              onClick={() => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { openAmount: 0 })}
            >
              Closed
            </button>
            <button
              type="button"
              className={openAmount >= 0.99 ? 'room-secondary-chip is-active' : 'room-secondary-chip'}
              style={{ minHeight: 40, borderRadius: 14 }}
              onClick={() => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { openAmount: 1 })}
            >
              Open
            </button>
          </div>
        </div>
      </div>
    );
  }, [openingFieldCardStyle, selectedOpening, selectedOpeningEntity, updateWallOpening]);

  const renderDoorTypeControls = useCallback((compact = false) => {
    if (!selectedOpening || !selectedOpeningEntity || selectedOpening.type !== 'door') return null;

    const selectedDoorStyle = selectedOpeningEntity.doorStyle ?? 'hinged';
    const getDoorStyleUpdates = (nextStyle) => {
      if (nextStyle === 'sliding') {
        return { doorStyle: nextStyle, panelCount: 1, slideDirection: selectedOpeningEntity.slideDirection ?? 'right' };
      }
      if (nextStyle === 'double') {
        return { doorStyle: nextStyle, panelCount: 2 };
      }
      return { doorStyle: nextStyle, panelCount: 1, hingeSide: selectedOpeningEntity.hingeSide ?? 'left' };
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Door Style
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(132px, 1fr))',
            gap: 8,
            width: '100%',
          }}
        >
          {DOOR_STYLE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={selectedDoorStyle === option.key ? 'room-secondary-chip is-active' : 'room-secondary-chip'}
              style={{
                minHeight: compact ? 54 : 48,
                padding: compact ? '10px 12px' : '9px 14px',
                borderRadius: 16,
                textAlign: 'center',
                lineHeight: 1.2,
                whiteSpace: 'normal',
              }}
              onClick={() => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, getDoorStyleUpdates(option.key))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }, [selectedOpening, selectedOpeningEntity, updateWallOpening]);

  const renderWindowTypeControls = useCallback(() => {
    if (!selectedOpening || !selectedOpeningEntity || selectedOpening.type !== 'window') return null;

    const options = [
      { key: 'sliding', label: 'Sliding' },
      { key: 'triple-sliding', label: '3-Panel Sliding' },
      { key: 'casement', label: 'Casement' },
      { key: 'fixed', label: 'Fixed' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Window Type
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={(selectedOpeningEntity.windowStyle ?? 'sliding') === option.key ? 'room-secondary-chip is-active' : 'room-secondary-chip'}
              onClick={() => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { windowStyle: option.key })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }, [selectedOpening, selectedOpeningEntity, updateWallOpening]);

  const selectRoom = useCallback((roomId, nextTab = null) => {
    setSelectedRoomId(roomId);
    setSelectedWallId(null);
    setSelectedOpening(null);
    setSelectedFurnitureId(null);
    setSelectedLightId(null);
    roomCreation.cancelPendingRoomCreation();
    if (nextTab) setActiveTab(nextTab);
    if (activeTool === 'build') setActiveTool('select');
  }, [activeTool, roomCreation]);

  const rebuildResolvedWalls = useCallback((nextRooms, wallSource = walls) => {
    const manualWalls = wallSource.filter((wall) => wall?.source === 'manual');
    const layoutWalls = generateLayoutWalls(nextRooms, wallSource.filter((wall) => wall?.source !== 'manual'));
    return [...layoutWalls, ...manualWalls];
  }, [walls]);

  const addWallOnRoomEdge = useCallback((roomId, side) => {
    const room = rooms.find((entry) => entry.id === roomId);
    if (!room) {
      toast.info('Select a room first.');
      return;
    }

    const bounds = roomSurfaceBounds.find((entry) => entry.roomId === room.id) ?? {
      centerX: room.x,
      centerZ: room.z,
      width: room.width,
      depth: room.depth,
    };
    const left = bounds.centerX - bounds.width / 2;
    const right = bounds.centerX + bounds.width / 2;
    const top = bounds.centerZ - bounds.depth / 2;
    const bottom = bounds.centerZ + bounds.depth / 2;

    let start;
    let end;

    if (side === 'left') {
      start = [left, top];
      end = [left, bottom];
    } else if (side === 'right') {
      start = [right, top];
      end = [right, bottom];
    } else if (side === 'top') {
      start = [left, top];
      end = [right, top];
    } else {
      start = [left, bottom];
      end = [right, bottom];
    }

    const existingWall = walls.find((wall) =>
      wall?.roomId === room.id
      && Array.isArray(wall?.start)
      && Array.isArray(wall?.end)
      && wall?.start?.[0] === start[0]
      && wall?.start?.[1] === start[1]
      && wall?.end?.[0] === end[0]
      && wall?.end?.[1] === end[1]
    );

    if (existingWall) {
      setSelectedRoomId(room.id);
      setSelectedWallId(existingWall.id);
      setActiveTab('walls');
      toast.info(`A wall already exists on the ${side} edge.`);
      return;
    }

    if (![start[0], start[1], end[0], end[1]].every(Number.isFinite)) {
      toast.error('Wall creation failed because the edge coordinates were invalid.');
      return;
    }

    const newWall = createWallEntity({
      roomId: room.id,
      start,
      end,
      height: room.height ?? 3,
      source: 'manual',
      boundarySide: side,
    });

    setWalls((prev) => [...prev, newWall]);
    setSelectedRoomId(room.id);
    setSelectedWallId(newWall.id);
    setSelectedOpening(null);
    setSelectedFurnitureId(null);
    setSelectedLightId(null);
    setActiveTab('walls');
    toast.success(`Wall added on the ${side} edge.`);
  }, [roomSurfaceBounds, rooms, setWalls, toast, walls]);

  const cycleRoomWallPlacementSide = useCallback(() => {
    setRoomWallPlacementSide((prev) => {
      const index = ROOM_DIRECTION_ORDER.indexOf(prev);
      return ROOM_DIRECTION_ORDER[(index + 1) % ROOM_DIRECTION_ORDER.length];
    });
  }, []);

  const renderRoomQuickActions = useCallback((room, variant = 'panel') => {
    const compact = variant !== 'scene';
    const isPendingRoomForDirection = (direction) => (
      roomCreation.pendingRoomCreation?.sourceRoomId === room.id
      && roomCreation.pendingRoomCreation.direction === direction
    );
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: compact ? 'wrap' : 'nowrap',
        gap: compact ? 8 : 10,
        overflowX: compact ? 'visible' : 'auto',
        padding: compact ? 0 : '4px 8px',
      }}>
        {ROOM_ACTION_BUTTONS.filter(({ key }) => !(compact && key === 'room')).map(({ key, icon, label }) => {
          if (!compact && key === 'room' && isPendingRoomForDirection(roomWallPlacementSide)) {
            return (
              <div
                key={`${room.id}-${key}-input`}
                data-room-creation-root="true"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMobile ? 'flex-end' : 'stretch',
                  gap: 8,
                  overflow: 'visible',
                }}
              >
                {isMobile && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginRight: 6,
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Cancel room creation"
                      onClick={roomCreation.cancelPendingRoomCreation}
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        position: 'relative',
                        border: 'none',
                        padding: 0,
                        width: 38,
                        height: 38,
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: 14,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          inset: '4px 0 0',
                          borderRadius: 14,
                          background: 'rgba(36, 28, 24, 0.95)',
                          boxShadow: '0 1px 1px rgba(255,255,255,0.18), inset 0 2px 2px rgba(0,0,0,0.3)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: 3,
                          right: 3,
                          bottom: 3,
                          top: 6,
                          borderRadius: 14,
                          background: 'linear-gradient(145deg, #6d5649, #3d2f28)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.38)',
                        }}
                      />
                      <span
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          borderRadius: 14,
                          transform: 'translateY(-1px)',
                          color: '#f6ede3',
                          background: 'linear-gradient(145deg, #5c473d, #7a6559)',
                          textShadow: '0 -1px rgba(0,0,0,0.25)',
                        }}
                      >
                        <CloseOutlined style={{ fontSize: 14 }} />
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={roomCreation.pendingRoomCreation?.sceneStep === 'details' ? 'Create room' : 'Continue room creation'}
                      onClick={() => {
                        if (roomCreation.pendingRoomCreation?.sceneStep === 'details') {
                          roomCreation.submitPendingRoomCreation();
                          return;
                        }
                        roomCreation.advancePendingRoomCreationToDetails();
                      }}
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        position: 'relative',
                        border: 'none',
                        padding: 0,
                        width: 38,
                        height: 38,
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: 14,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          inset: '4px 0 0',
                          borderRadius: 14,
                          background: 'rgba(51, 39, 30, 0.96)',
                          boxShadow: '0 1px 1px rgba(255,255,255,0.18), inset 0 2px 2px rgba(0,0,0,0.3)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: 3,
                          right: 3,
                          bottom: 3,
                          top: 6,
                          borderRadius: 14,
                          background: 'linear-gradient(145deg, #b48a60, #6b5138)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.38)',
                        }}
                      />
                      <span
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          borderRadius: 14,
                          transform: 'translateY(-1px)',
                          color: '#fffaf4',
                          background: 'linear-gradient(145deg, #c49a6c, #8b6b4d)',
                          textShadow: '0 -1px rgba(0,0,0,0.25)',
                        }}
                      >
                        <CheckOutlined style={{ fontSize: 14 }} />
                      </span>
                    </button>
                  </div>
                )}
                <PendingRoomNameInput
                  value={roomCreation.pendingRoomCreation?.name ?? ''}
                  onChange={(value) => roomCreation.updatePendingRoomCreation('name', value)}
                  accent={COLORS.accent}
                  showDimensions={roomCreation.pendingRoomCreation?.sceneStep === 'details'}
                  dimensions={{
                    width: roomCreation.pendingRoomCreation?.width ?? 3,
                    height: roomCreation.pendingRoomCreation?.height ?? 3,
                    depth: roomCreation.pendingRoomCreation?.depth ?? 4,
                  }}
                  onDimensionChange={(field, value) => roomCreation.updatePendingRoomCreation(field, value)}
                  onNameEnter={roomCreation.advancePendingRoomCreationToDetails}
                  onSubmit={roomCreation.submitPendingRoomCreation}
                  isMobileView={isMobile}
                />
              </div>
            );
          }

          return (
            <RevealActionButton
              key={`${room.id}-${key}`}
              label={key === 'direction' ? roomWallPlacementSide[0].toUpperCase() + roomWallPlacementSide.slice(1) : label}
              icon={key === 'direction'
                ? (roomWallPlacementSide === 'left'
                  ? KeyboardDoubleArrowLeftRoundedIcon
                  : roomWallPlacementSide === 'right'
                    ? KeyboardDoubleArrowRightRoundedIcon
                    : roomWallPlacementSide === 'top'
                      ? KeyboardDoubleArrowUpRoundedIcon
                      : KeyboardDoubleArrowDownRoundedIcon)
                : icon}
              active={key === 'wall'
                ? activeTab === 'walls' && selectedRoom?.id === room.id
                : key === 'room'
                  ? isPendingRoomForDirection(roomWallPlacementSide)
                  : selectedRoom?.id === room.id}
              onClick={() => {
                if (key === 'wall') {
                  addWallOnRoomEdge(room.id, roomWallPlacementSide);
                  return;
                }
                if (key === 'room') {
                  roomCreation.queueRoomAdd(roomWallPlacementSide, room);
                  return;
                }
                cycleRoomWallPlacementSide();
              }}
              variant={compact ? 'pill' : 'reveal'}
            />
          );
        })}
      </div>
    );
  }, [activeTab, addWallOnRoomEdge, cycleRoomWallPlacementSide, roomCreation, roomWallPlacementSide, selectedRoom]);

  const renderRoomSidebarCards = useCallback(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rooms.map((room) => {
        const isActive = selectedRoom?.id === room.id;
        return (
          <div
            key={room.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 22,
              background: isActive ? 'rgba(55, 45, 40, 0.88)' : 'rgba(33, 27, 24, 0.78)',
              border: `1px solid ${isActive ? COLORS.action : `${COLORS.secondary}44`}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoomId(room.id);
                  setActiveTab('room');
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  color: COLORS.text,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{room.name}</div>
                <div style={{ color: `${COLORS.text}92`, fontSize: 11 }}>
                  {Number(room.width).toFixed(1)}m × {Number(room.depth).toFixed(1)}m
                </div>
              </button>
              {isActive && (
                <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Selected
                </div>
              )}
            </div>
            {renderRoomQuickActions(room, 'panel')}
          </div>
        );
      })}
    </div>
  ), [renderRoomQuickActions, rooms, selectedRoom]);

  const renderRoomActionPanel = (variant = 'panel') => {
    if (!selectedRoom) return null;

    const isSidebarVariant = variant === 'sidebar';
    const isMobileVariant = variant === 'mobile';
    const containerStyle = isSidebarVariant
      ? {
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 0,
        }
      : isMobileVariant
        ? {
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }
        : undefined;

    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: isMobileVariant ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>Selected Room</div>
            <div style={{ color: `${COLORS.text}92`, fontSize: 11 }}>
              {selectedRoom.name} • {Number(selectedRoom.width).toFixed(1)}m × {Number(selectedRoom.depth).toFixed(1)}m
            </div>
          </div>
          <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
            Room Actions
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: 10,
          overflowX: 'auto',
          paddingLeft: 6,
          paddingTop: 10,
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          {renderRoomQuickActions(selectedRoom, 'panel')}
        </div>
        <div data-room-creation-root="true">
          <RoomCreationPanel
            pendingRoomCreation={roomCreation.pendingRoomCreation?.sourceRoomId === selectedRoom.id ? roomCreation.pendingRoomCreation : null}
            selectedRoom={selectedRoom}
            isMobileVariant={isMobileVariant}
            openingFieldCardStyle={openingFieldCardStyle}
            cancelPendingRoomCreation={roomCreation.cancelPendingRoomCreation}
            updatePendingRoomCreation={roomCreation.updatePendingRoomCreation}
            submitPendingRoomCreation={roomCreation.submitPendingRoomCreation}
          />
        </div>
      </div>
    );
  };

  const renderWindowBehaviorControls = useCallback(() => {
    if (!selectedOpening || !selectedOpeningEntity || selectedOpening.type !== 'window') return null;
    if ((selectedOpeningEntity.windowStyle ?? 'sliding') !== 'casement') return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Casement Controls
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {renderOpeningModeButton(
              'Hinge on the left side',
              <LeftOutlined />,
              (selectedOpeningEntity.hingeSide ?? 'left') === 'left',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { hingeSide: 'left' })
            )}
            {renderOpeningModeButton(
              'Hinge on the right side',
              <RightOutlined />,
              (selectedOpeningEntity.hingeSide ?? 'left') === 'right',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { hingeSide: 'right' })
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {renderOpeningModeButton(
              'Open inward',
              <LoginOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === true,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: true })
            )}
            {renderOpeningModeButton(
              'Open outward',
              <LogoutOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === false,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: false })
            )}
          </div>
        </div>
      </div>
    );
  }, [renderOpeningModeButton, selectedOpening, selectedOpeningEntity, updateWallOpening]);

  const renderMobileDoorEditor = useCallback(() => {
    if (!selectedOpening || !selectedOpeningEntity || selectedOpening.type !== 'door') return null;

    const selectedDoorStyle = selectedOpeningEntity.doorStyle ?? 'hinged';

    const sections = [
      {
        key: 'style',
        label: 'Style',
        icon: <AppstoreOutlined />,
        content: renderDoorTypeControls(true),
      },
      {
        key: 'width',
        label: 'Width',
        icon: <ColumnWidthOutlined />,
        content: (
          <div style={{ ...openingFieldCardStyle, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: COLORS.text, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ColumnWidthOutlined />
                Width
              </span>
              <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 700 }}>{Number(selectedOpeningEntity.width).toFixed(2)} m</span>
            </div>
            <InputNumber
              min={getOpeningBounds('door').width.min}
              max={getOpeningBounds('door').width.max}
              step={OPENING_STEP}
              precision={2}
              controls
              value={selectedOpeningEntity.width}
              onChange={(value) => updateOpeningNumericField('width', value)}
              style={{ width: '100%' }}
              addonAfter="m"
            />
          </div>
        ),
      },
      {
        key: 'height',
        label: 'Height',
        icon: <SpaceDashboardRoundedIcon style={{ fontSize: 16 }} />,
        content: (
          <div style={{ ...openingFieldCardStyle, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: COLORS.text, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <SpaceDashboardRoundedIcon style={{ fontSize: 16 }} />
                Height
              </span>
              <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 700 }}>{Number(selectedOpeningEntity.height).toFixed(2)} m</span>
            </div>
            <InputNumber
              min={getOpeningBounds('door').height.min}
              max={getOpeningBounds('door').height.max}
              step={OPENING_STEP}
              precision={2}
              controls
              value={selectedOpeningEntity.height}
              onChange={(value) => updateOpeningNumericField('height', value)}
              style={{ width: '100%' }}
              addonAfter="m"
            />
          </div>
        ),
      },
      {
        key: 'open',
        label: 'Open',
        icon: <SwapOutlined />,
        content: renderDoorOpenControls(),
      },
      {
        key: selectedDoorStyle === 'sliding' ? 'direction' : selectedDoorStyle === 'double' ? 'swing' : 'hinge',
        label: selectedDoorStyle === 'sliding' ? 'Direction' : selectedDoorStyle === 'double' ? 'Swing' : 'Hinge',
        icon: selectedDoorStyle === 'sliding'
          ? ((selectedOpeningEntity.slideDirection ?? 'right') === 'left' ? <LeftOutlined /> : <RightOutlined />)
          : selectedDoorStyle === 'double'
            ? ((selectedOpeningEntity.opensInward ?? true) ? <LoginOutlined /> : <LogoutOutlined />)
            : (selectedOpeningEntity.hingeSide === 'left' ? <LeftOutlined /> : <RightOutlined />),
        content: selectedDoorStyle === 'sliding' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' }}>
            {renderOpeningModeButton(
              'Slide panel to the left',
              <LeftOutlined />,
              (selectedOpeningEntity.slideDirection ?? 'right') === 'left',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { slideDirection: 'left' })
            )}
            {renderOpeningModeButton(
              'Slide panel to the right',
              <RightOutlined />,
              (selectedOpeningEntity.slideDirection ?? 'right') === 'right',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { slideDirection: 'right' })
            )}
          </div>
        ) : selectedDoorStyle === 'double' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' }}>
            {renderOpeningModeButton(
              'Open inward',
              <LoginOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === true,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: true })
            )}
            {renderOpeningModeButton(
              'Open outward',
              <LogoutOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === false,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: false })
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' }}>
            {renderOpeningModeButton(
              'Hinge on the left side',
              <LeftOutlined />,
              selectedOpeningEntity.hingeSide === 'left',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { hingeSide: 'left' })
            )}
            {renderOpeningModeButton(
              'Hinge on the right side',
              <RightOutlined />,
              selectedOpeningEntity.hingeSide === 'right',
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { hingeSide: 'right' })
            )}
          </div>
        ),
      },
      ...(selectedDoorStyle === 'hinged' ? [{
        key: 'swing',
        label: 'Swing',
        icon: (selectedOpeningEntity.opensInward ?? true) ? <LoginOutlined /> : <LogoutOutlined />,
        content: (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, width: '100%' }}>
            {renderOpeningModeButton(
              'Open inward',
              <LoginOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === true,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: true })
            )}
            {renderOpeningModeButton(
              'Open outward',
              <LogoutOutlined />,
              (selectedOpeningEntity.opensInward ?? true) === false,
              () => updateWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id, { opensInward: false })
            )}
          </div>
        ),
      }] : []),
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ position: 'relative', minHeight: 56, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, width: '100%', transform: mobileDoorEditorSection ? 'translateX(-20%)' : 'translateX(0)', opacity: mobileDoorEditorSection ? 0 : 1, transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease', pointerEvents: mobileDoorEditorSection ? 'none' : 'auto' }}>
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setMobileDoorEditorSection(section.key)}
                style={{ ...mobileDoorEditButtonStyle, flex: '1 1 0' }}
              >
                {section.icon}
              </button>
            ))}
          </div>
          {sections.map((section) => {
            const isOpen = mobileDoorEditorSection === section.key;
            return (
              <div
                key={section.key}
                style={{
                  position: isOpen ? 'relative' : 'absolute',
                  inset: isOpen ? 'auto' : 0,
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 10,
                  width: '100%',
                  transform: isOpen ? 'translateX(0)' : 'translateX(24px)',
                  opacity: isOpen ? 1 : 0,
                  pointerEvents: isOpen ? 'auto' : 'none',
                  transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMobileDoorEditorSection((prev) => prev === section.key ? null : section.key)}
                  style={{
                    ...mobileDoorEditButtonStyle,
                    width: 58,
                    minWidth: 58,
                    background: 'linear-gradient(135deg, rgba(196,154,108,0.24) 0%, rgba(139,107,77,0.26) 100%)',
                    borderColor: `${COLORS.action}66`,
                    color: COLORS.action,
                    transform: isOpen ? 'translateX(0)' : 'translateX(8px)',
                  }}
                >
                  {section.icon}
                </button>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', animation: isOpen ? 'roomDoorPanelFade 0.28s ease' : 'none' }}>
                  {section.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [COLORS.action, COLORS.text, getOpeningBounds, mobileDoorEditButtonStyle, mobileDoorEditorSection, openingFieldCardStyle, renderDoorOpenControls, renderDoorTypeControls, renderOpeningModeButton, selectedOpening, selectedOpeningEntity, updateOpeningNumericField, updateWallOpening]);

  const buildOpeningPreview = useCallback((wall, openingType, point = null) => {
    if (!wall) return null;
    const base = openingType === 'door'
      ? createDoorEntity({ wallId: wall.id })
      : createWindowEntity({ wallId: wall.id });
    const metrics = getWallMetrics(wall);
    const projection = projectPointOntoWall(wall, point ?? metrics.center, 0.2);
    const nextPreview = {
      ...base,
      id: 'preview',
      wallId: wall.id,
      offsetAlongWall: projection.offsetAlongWall,
    };
    const validation = openingType === 'door'
      ? validateDoorPlacement(wall, nextPreview)
      : validateWindowPlacement(wall, nextPreview);
    return { ...nextPreview, valid: validation.valid, reason: validation.reason };
  }, []);

  const deleteWall = (id) => {
    setWalls((p) => p.filter((w) => w.id !== id));
    if (selectedWallId === id) setSelectedWallId(null);
    if (selectedOpening?.wallId === id) setSelectedOpening(null);
    if (openingPreview?.wallId === id) setOpeningPreview(null);
  };

  const addWall = () => {
    const room = selectedRoom ?? rooms[0] ?? null;
    const w = createWallEntity({
      roomId: room?.id ?? null,
      start: [-1, 0],
      end: [1, 0],
    });
    setWalls((p) => [...p, w]);
    setSelectedWallId(w.id);
    setActiveTool('build');
  };

  const splitWall = () => {
    if (!selectedWall) return;
    const { id, roomId, start, end, height, thickness, color, roughness, metalness, textureUrl } = selectedWall;
    const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    setWalls((p) => [
      ...p.filter((w) => w.id !== id),
      createWallEntity({ roomId, start, end: mid, height, thickness, color, roughness, metalness, textureUrl }),
      createWallEntity({ roomId, start: mid, end, height, thickness, color, roughness, metalness, textureUrl }),
    ]);
    setSelectedWallId(null);
  };

  const startOpeningPlacement = useCallback((openingType) => {
    if (!selectedWall) {
      toast.info(`Select a wall first to place a ${openingType}.`);
      return;
    }
    setActiveTool(openingType);
    setSelectedOpening(null);
    setOpeningPreview(buildOpeningPreview(selectedWall, openingType));
    setActiveTab('walls');
  }, [buildOpeningPreview, selectedWall, toast]);

  const updateOpeningPreview = useCallback((wall, openingType, point) => {
    if (!wall || activeTool !== openingType) return;
    setOpeningPreview(buildOpeningPreview(wall, openingType, point));
  }, [activeTool, buildOpeningPreview]);

  const commitOpeningPreview = useCallback((wall) => {
    if (!wall || !openingPreview || openingPreview.wallId !== wall.id || !openingPreview.valid) return false;
    const openingType = openingPreview.type === 'window' ? 'window' : 'door';
    const key = openingType === 'door' ? 'doors' : 'windows';
    const openingToStore = { ...openingPreview, id: uuidv4() };
    delete openingToStore.valid;
    delete openingToStore.reason;

    setWalls((prev) => prev.map((item) => (
      item.id === wall.id
        ? { ...item, [key]: [...(item[key] ?? []), openingToStore], updatedAt: Date.now() }
        : item
    )));
    setSelectedOpening({ id: openingToStore.id, type: openingType, wallId: wall.id });
    setOpeningPreview(null);
    setActiveTool('select');
    toast.success(`${openingType === 'door' ? 'Door' : 'Window'} added to wall.`);
    return true;
  }, [openingPreview, setWalls, toast]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') {
        setSelectedWallId(null);
        setSelectedFurnitureId(null);
        setSelectedOpening(null);
        setOpeningPreview(null);
        setActiveTool('select');
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFurnitureId) {
        deleteItem(selectedFurnitureId);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOpening) {
        removeWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedFurnitureId, selectedOpening, removeWallOpening]);

  // Furniture helpers
  const addItem = (modelMeta) => {
    const item = {
      id:       uuidv4(),
      filename: modelMeta.filename,
      name:     modelMeta.name,
      url:      modelMeta.url,
      category: modelMeta.category || null,   
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale:    [1, 1, 1],
      tint:     null,
    };
    setPlacedItems((p) => [...p, item]);
    setSelectedFurnitureId(item.id);
    setActiveTab('furniture');
  };

  const updateItem = (id, updates) =>
    setPlacedItems((p) => p.map((i) => i.id === id ? { ...i, ...updates } : i));

  const setSelectedFurnitureTint = useCallback((nextTint) => {
    if (!selectedFurnitureId) return;
    setPlacedItems((prev) => {
      let changed = false;
      const nextItems = prev.map((item) => {
        if (item.id !== selectedFurnitureId) return item;
        const tint = typeof nextTint === 'function' ? nextTint(item.tint ?? null) : nextTint;
        const sameTint =
          item.tint?.hue === tint?.hue &&
          item.tint?.saturation === tint?.saturation &&
          item.tint?.brightness === tint?.brightness;
        if (sameTint) return item;
        changed = true;
        return { ...item, tint };
      });
      return changed ? nextItems : prev;
    });
  }, [selectedFurnitureId]);

  const deleteItem = (id) => {
    setPlacedItems((p) => p.filter((i) => i.id !== id));
    if (selectedFurnitureId === id) setSelectedFurnitureId(null);
  };

  const replaceItem = (newMeta) => {
    if (!selectedFurniture) return;
    const newItem = {
      id: uuidv4(), filename: newMeta.filename, name: newMeta.name, url: newMeta.url,
      category: newMeta.category || null,
      position: [...selectedFurniture.position],
      rotation: [...selectedFurniture.rotation],
      scale:    [...selectedFurniture.scale],
      tint:     selectedFurniture.tint ?? null,
    };
    setPlacedItems((p) => [...p.filter((i) => i.id !== selectedFurnitureId), newItem]);
    setSelectedFurnitureId(newItem.id);
  };

  // Camera helpers 
  const applyCameraPreset = (preset) => {
    setCurrentViewPreset(preset);
    if (cameraMode === 'orbit' && orbitControlsRef.current) {
      const { position, target } = CAMERA_PRESETS[preset];
      gsap.to(orbitControlsRef.current.target, { x: target[0], y: target[1], z: target[2], duration: 1, ease: "power2.inOut" });
      gsap.to(orbitControlsRef.current.object.position, { x: position[0], y: position[1], z: position[2], duration: 1, ease: "power2.inOut", onUpdate: () => orbitControlsRef.current.update() });
    } else if (cameraMode === 'firstPerson') {
      setTeleportTarget([CAMERA_PRESETS[preset].position[0], 1.6, CAMERA_PRESETS[preset].position[2]]);
    }
  };

  const handlePointerMissed = () => {
    setSelectedWallId(null);
    setWallToolbarPos(null);
    setSelectedFurnitureId(null);
    setSelectedLightId(null);
    setSelectedOpening(null);
    setOpeningPreview(null);
    setActiveTool('select');
    setFurnitureToolbarPos(null);
    setLightToolbarPos(null);
  };

  // Tab definitions 
  const toggleDesktopPanel = useCallback((tabKey) => {
    if (activeTab === tabKey) {
      setDesktopPanelOpen((open) => !open);
      return;
    }
    setActiveTab(tabKey);
    setDesktopPanelOpen(true);
  }, [activeTab]);

  const desktopNavItems = useMemo(() => {
    const items = [
      { key: 'walls', label: 'Build', icon: ArchitectureRoundedIcon },
      { key: 'materials', label: 'Style', icon: TextureRoundedIcon },
      { key: 'lighting', label: 'Light', icon: LightbulbRoundedIcon },
      { key: 'furniture', label: 'Furnish', icon: ChairRoundedIcon },
      { key: 'projects', label: 'Projects', icon: FolderCopyRoundedIcon },
      { key: 'view', label: 'View', icon: VisibilityRoundedIcon },
    ];

    if (selectedRoom) {
      items.splice(1, 0, { key: 'room', label: 'Room', icon: HomeWorkRoundedIcon });
    }

    return items;
  }, [selectedRoom]);

  const desktopPanelTitle =
    activeTab === 'room' ? 'Room' :
    activeTab === 'walls' ? 'Build' :
    activeTab === 'materials' ? 'Style' :
    activeTab === 'lighting' ? 'Light' :
    activeTab === 'furniture' ? 'Furnish' :
    activeTab === 'projects' ? 'Projects' :
    'View';

  const desktopPanelContent = activeTab === 'room' ? (
    renderRoomActionPanel('panel')
  ) : activeTab === 'walls' ? (
    <>
      {selectedWall && (
        <div className="room-floating-context-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>Selected Wall</div>
              <div style={{ color: `${COLORS.text}92`, fontSize: 11 }}>
                {selectedWallDoorCount} door{selectedWallDoorCount === 1 ? '' : 's'} • {selectedWallWindowCount} window{selectedWallWindowCount === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
              Live Context
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <button type="button" className={activeTool === 'door' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => startOpeningPlacement('door')}>Add Door</button>
            <button type="button" className={activeTool === 'window' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => startOpeningPlacement('window')}>Add Window</button>
            <button type="button" className="room-secondary-chip" onClick={splitWall}>Split</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <button type="button" className={activeTool === 'build' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => setActiveTool('build')}>Build</button>
            <button type="button" className={activeTool === 'select' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => setActiveTool('select')}>Select</button>
            <button type="button" className="room-secondary-chip is-danger" onClick={() => deleteWall(selectedWall.id)}>Delete</button>
          </div>
          {selectedOpeningEntity && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px', borderRadius: 18, ...openingPanelTone }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Precision Edit
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                    {selectedOpening?.type} selected
                  </div>
                  <div style={{ color: `${COLORS.text}8C`, fontSize: 11 }}>
                    Drag on the wall, then fine-tune exact dimensions here.
                  </div>
                </div>
                {renderOpeningModeButton(
                  'Remove this opening',
                  <DeleteOutlined />,
                  false,
                  () => removeWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id),
                  true
                )}
              </div>
              {renderOpeningDimensionInputs()}
              {renderDoorTypeControls()}
              {renderDoorOpenControls()}
              {renderDoorBehaviorControls()}
              {renderWindowTypeControls()}
              {renderWindowBehaviorControls()}
            </div>
          )}
        </div>
      )}
      <WallEditorPanel
        selectedWall={selectedWall}
        addWall={addWall}
        splitWall={splitWall}
        deleteWall={deleteWall}
        updateWall={updateWall}
        gizmoMode={gizmoMode}
        setGizmoMode={setGizmoMode}
        envColors={{ floor: floorMaterial.color, ceiling: ceilingMaterial.color }}
        setEnvColors={(updater) => {
          const next = typeof updater === 'function'
            ? updater({ floor: floorMaterial.color, ceiling: ceilingMaterial.color })
            : updater;
          if (next.floor !== floorMaterial.color) updateSurface('floor', { color: next.floor });
          if (next.ceiling !== ceilingMaterial.color) updateSurface('ceiling', { color: next.ceiling });
        }}
      />
    </>
  ) : activeTab === 'materials' ? (
    <MaterialPanel
      selectedWall={selectedWall}
      walls={walls}
      floorMaterial={floorMaterial}
      ceilingMaterial={ceilingMaterial}
      applyTexture={applyTexture}
      updateSurface={updateSurface}
      applyTheme={applyTheme}
      activeTheme={activeTheme}
    />
  ) : activeTab === 'lighting' ? (
    <LightingPanel {...lightingState} />
  ) : activeTab === 'furniture' ? (
    <FurniturePicker
      selectedItem={selectedFurniture}
      placedItems={placedItems}
      addItem={addItem}
      deleteItem={deleteItem}
      gizmoMode={gizmoMode}
      setGizmoMode={setGizmoMode}
      furnitureRefs={furnitureRefs}
      tint={selectedFurniture?.tint ?? null}
      setTint={setSelectedFurnitureTint}
    />
  ) : activeTab === 'projects' ? (
    <SavedProjectsPanel
      currentProjectId={currentProjectId}
      currentProjectName={projectSave.projectName}
      listProjects={projectSave.listProjects}
      loadProject={projectSave.loadProject}
      deleteProject={projectSave.deleteProject}
      createNewProject={handleCreateNewProject}
    />
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', background: cameraCardBg, borderRadius: 22, border: `1px solid ${COLORS.secondary}50`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 24px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div className="room-view-title">View</div>
          <div className="room-segmented room-segmented-compact">
            <button type="button" className={cameraMode === 'orbit' ? 'room-segment is-active' : 'room-segment'} onClick={() => { setCameraMode('orbit'); if (document.pointerLockElement) document.exitPointerLock(); }}>
              Orbit
            </button>
            <button type="button" className={cameraMode === 'firstPerson' ? 'room-segment is-active' : 'room-segment'} onClick={() => { setCameraMode('firstPerson'); setTeleportTarget([0, 1.6, 0]); }}>
              Walk
            </button>
          </div>
        </div>
        <div className="room-view-strip">
          {Object.keys(CAMERA_PRESETS).map((k) => (
            <Tooltip key={k} title={k[0].toUpperCase() + k.slice(1)}>
              <button
                type="button"
                className={currentViewPreset === k ? 'room-view-option is-active' : 'room-view-option'}
                onClick={() => applyCameraPreset(k)}
              >
                {k === 'top' ? <VerticalLeftOutlined style={{ transform: 'rotate(-90deg)' }} /> : k === 'front' ? <SpaceDashboardRoundedIcon style={{ fontSize: 16 }} /> : k === 'side' ? <VerticalRightOutlined /> : <EyeOutlined />}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="room-stat-chip">
          <span className="room-stat-dot" />
          {walls.length} walls
        </div>
        <div className="room-stat-chip">
          <span className="room-stat-dot room-stat-dot-blue" />
          {placedItems.length} objects
        </div>
        <div className="room-stat-chip">
          <span className="room-stat-dot" />
          {placedLights.length} lights
        </div>
      </div>
    </div>
  );

  const tabItems = [
    ...(selectedRoom ? [{
      key: 'room',
      label: <span className="room-tab-label"><ApartmentOutlined /> Room</span>,
      children: renderRoomActionPanel('sidebar'),
    }] : []),
    {
      key: 'walls',
      label: <span className="room-tab-label"><ColumnWidthOutlined /> Build</span>,
      children: desktopPanelContent,
    },
    {
      key: 'materials',
      label: <span className="room-tab-label"><FormatPainterOutlined /> Style</span>,
      children: (
        <MaterialPanel
          selectedWall={selectedWall}
          walls={walls}
          floorMaterial={floorMaterial}
          ceilingMaterial={ceilingMaterial}
          applyTexture={applyTexture}
          updateSurface={updateSurface}
          applyTheme={applyTheme}
          activeTheme={activeTheme}
        />
      ),
    },
    {
      key: 'lighting',
      label: <span className="room-tab-label"><BulbOutlined /> Light</span>,
      children: <LightingPanel {...lightingState} />,
    },
    {
      key: 'furniture',
      label: <span className="room-tab-label"><AppstoreOutlined /> Furnish</span>,
      children: (
        <FurniturePicker
          selectedItem={selectedFurniture}
          placedItems={placedItems}
          addItem={addItem}
          deleteItem={deleteItem}
          gizmoMode={gizmoMode}
          setGizmoMode={setGizmoMode}
          furnitureRefs={furnitureRefs}
          tint={selectedFurniture?.tint ?? null}
          setTint={setSelectedFurnitureTint}
        />
      ),
    },
    {
      key: 'projects',
      label: <span className="room-tab-label"><FolderOpenOutlined /> Projects</span>,
      children: (
        <SavedProjectsPanel
          currentProjectId={currentProjectId}
          currentProjectName={projectSave.projectName}
          listProjects={projectSave.listProjects}
          loadProject={projectSave.loadProject}
          deleteProject={projectSave.deleteProject}
          createNewProject={handleCreateNewProject}
        />
      ),
    },
  ];

  // 3D canvas block 
  const canvasBlock = (
    <div ref={sceneRef} style={{ height: '100%', width: '100%', position: 'relative' }}>

      {cameraMode === 'firstPerson' && (
        <WalkHUD
          isLocked={isPointerLocked}
          onLock={() => { const c = canvasWrapperRef.current?.querySelector('canvas'); if (c) c.requestPointerLock(); }}
        />
      )}

      {/* Recording indicator — floats over canvas while recording */}
      <RecordingIndicator
        recState={recorder.recState}
        onStop={recorder.stopManualRecording}
      />

      {(activeTool !== 'select' || openingPreview) && (
        <div
          style={{
            position: 'absolute',
            left: 18,
            top: 18,
            zIndex: 30,
            padding: '10px 14px',
            borderRadius: 16,
            background: `${COLORS.background}E6`,
            border: `1px solid ${COLORS.secondary}55`,
            color: COLORS.text,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.22)',
            maxWidth: 280,
          }}
        >
          <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {activeTool === 'build' ? 'Build Mode' : activeTool === 'door' ? 'Add Door' : activeTool === 'window' ? 'Add Window' : 'Edit Mode'}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: `${COLORS.text}CC` }}>
            {activeTool === 'build' && 'Tap Add Wall, then drag endpoints directly on the selected wall to refine it.'}
            {activeTool === 'door' && 'Move across the wall to preview placement, then tap the wall to place a door.'}
            {activeTool === 'window' && 'Move across the wall to preview placement, then tap the wall to place a window.'}
          </div>
          {openingPreview && !openingPreview.valid && (
            <div style={{ marginTop: 6, color: '#ff9d8c', fontSize: 11 }}>
              {openingPreview.reason}
            </div>
          )}
        </div>
      )}

      <div
        ref={canvasWrapperRef}
        style={{ height: '100%', width: '100%' }}
        onClick={() => {
          if (cameraMode === 'firstPerson' && !isPointerLocked) {
            const c = canvasWrapperRef.current?.querySelector('canvas');
            if (c) c.requestPointerLock();
          }
        }}
      >
        <Canvas
          camera={cameraMode === 'firstPerson'
            ? { position: [0, 1.6, 0], fov: 70, near: 0.1, far: 1000 }
            : { position: [7, 4, 9],   fov: 50, near: 0.1, far: 1000 }
          }
          style={{ background: lighting.skyColor }}
          shadows
          frameloop={cameraMode === 'firstPerson' ? 'always' : 'demand'}
          performance={{ min: 0.5 }}
          gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          onPointerMissed={handlePointerMissed}
        >
          {/* Lighting */}
          <SceneLighting
            lighting={lighting}
            globalBrightness={lightingState.globalBrightness}
            placedLights={placedLights}
            moodAmbient={lightingState.moodAmbientOverride}
          />

          {/* Camera controls*/}
          {cameraMode === 'orbit' ? (
            <OrbitControls
              ref={orbitControlsRef}
              enableDamping dampingFactor={0.06}
              maxPolarAngle={Math.PI / 2.4}
              enabled={orbitEnabled && !mobileOpeningPlacementLocked}
              touches={mobileOpeningPlacementLocked
                ? { ONE: THREE.TOUCH.NONE, TWO: THREE.TOUCH.NONE }
                : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
              onTouchStart={(e) => { if (e?.touches?.length < 2) return; }}
            />
          ) : (
            <FirstPersonControls
              walls={walls}
              isLocked={isPointerLocked}
              setIsLocked={setIsPointerLocked}
              onTeleport={teleportTarget}
            />
          )}

          {/* GizmoHelper — visible whenever something is selected 
               Placed at top-left so it doesn't conflict with the
               context toolbar (which floats near the selected object).
               On mobile the top-left is always clear of the bottom nav. */}
          {anythingSelected && cameraMode === 'orbit' && (
            <GizmoHelper alignment="top-right" margin={[60, 120]}>
              <GizmoViewport
                axisColors={['#E05252', '#52C052', '#5252E0']}
                labelColor="#E8E0D8"
                hideNegativeAxes
              />
            </GizmoHelper>
          )}

          {/* Rooms */}
          {roomWalls.map(({ room, walls: roomScopedWalls }) => {
            const surfaceBounds = roomSurfaceBounds.find((entry) => entry.roomId === room.id) ?? {
              centerX: room.x,
              centerZ: room.z,
              width: room.width,
              depth: room.depth,
            };

            return (
            (() => {
              return (
            <group key={room.id}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[surfaceBounds.centerX, 0, surfaceBounds.centerZ]}
                receiveShadow
                onClick={(event) => {
                  event.stopPropagation();
                  selectRoom(room.id, 'walls');
                }}
              >
                <planeGeometry args={[surfaceBounds.width, surfaceBounds.depth]} />
                <Suspense fallback={<meshStandardMaterial color={floorMaterial.color} roughness={floorMaterial.roughness} metalness={floorMaterial.metalness} />}>
                  <SurfaceMaterial mat={floorMaterial} repeat={[Math.max(surfaceBounds.width / 2, 1), Math.max(surfaceBounds.depth / 2, 1)]} />
                </Suspense>
              </mesh>
              <mesh
                rotation={[Math.PI / 2, 0, 0]}
                position={[surfaceBounds.centerX, room.height, surfaceBounds.centerZ]}
                receiveShadow
                onClick={(event) => {
                  event.stopPropagation();
                  selectRoom(room.id, 'walls');
                }}
              >
                <planeGeometry args={[surfaceBounds.width, surfaceBounds.depth]} />
                <Suspense fallback={<meshStandardMaterial color={ceilingMaterial.color} roughness={ceilingMaterial.roughness} metalness={ceilingMaterial.metalness} />}>
                  <SurfaceMaterial mat={ceilingMaterial} repeat={[Math.max(surfaceBounds.width / 2, 1), Math.max(surfaceBounds.depth / 2, 1)]} />
                </Suspense>
              </mesh>
              {room.id === selectedRoom?.id && (
                <>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[room.x, 0.02, room.z]}>
                    <planeGeometry args={[room.width + 0.2, room.depth + 0.2]} />
                    <meshBasicMaterial color={COLORS.action} transparent opacity={0.12} />
                  </mesh>
                  <mesh position={[room.x, 0.04, room.z - (room.depth / 2) - 0.04]}>
                    <boxGeometry args={[room.width + 0.14, 0.05, 0.06]} />
                    <meshBasicMaterial color={COLORS.action} />
                  </mesh>
                  <mesh position={[room.x, 0.04, room.z + (room.depth / 2) + 0.04]}>
                    <boxGeometry args={[room.width + 0.14, 0.05, 0.06]} />
                    <meshBasicMaterial color={COLORS.action} />
                  </mesh>
                  <mesh position={[room.x - (room.width / 2) - 0.04, 0.04, room.z]}>
                    <boxGeometry args={[0.06, 0.05, room.depth + 0.14]} />
                    <meshBasicMaterial color={COLORS.action} />
                  </mesh>
                  <mesh position={[room.x + (room.width / 2) + 0.04, 0.04, room.z]}>
                    <boxGeometry args={[0.06, 0.05, room.depth + 0.14]} />
                    <meshBasicMaterial color={COLORS.action} />
                  </mesh>
                </>
              )}

              {(roomWalls.length > 1 || room.id === selectedRoom?.id) && (
                room.id === selectedRoom?.id ? (
                  <Html position={[room.x, room.height + 0.62, room.z]} center distanceFactor={10}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        pointerEvents: 'auto',
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          minHeight: 44,
                          padding: '0 14px',
                          borderRadius: 999,
                          background: 'rgba(24, 18, 15, 0.92)',
                          border: `1px solid ${COLORS.action}44`,
                          boxShadow: '0 14px 28px rgba(0, 0, 0, 0.28)',
                          color: COLORS.action,
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: '0.01em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{room.name}</span>
                        <button
                          type="button"
                          aria-label={sceneRoomActionsVisible ? 'Hide room actions' : 'Show room actions'}
                          onClick={() => setSceneRoomActionsVisible((visible) => !visible)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            border: `1px solid ${sceneRoomActionsVisible ? COLORS.action : `${COLORS.secondary}AA`}`,
                            background: sceneRoomActionsVisible ? COLORS.action : 'rgba(53, 41, 35, 0.92)',
                            color: sceneRoomActionsVisible ? COLORS.background : COLORS.text,
                            cursor: 'pointer',
                            boxShadow: sceneRoomActionsVisible ? '0 8px 18px rgba(196, 154, 108, 0.28)' : 'none',
                            transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                          }}
                        >
                          <AppstoreOutlined style={{ fontSize: 14 }} />
                        </button>
                      </div>
                      {sceneRoomActionsVisible && renderRoomQuickActions(room, 'scene')}
                    </div>
                  </Html>
                ) : (
                  <Text
                    position={[room.x, room.height + 0.28, room.z]}
                    fontSize={0.24}
                    color={COLORS.text}
                    anchorX="center"
                    anchorY="middle"
                  >
                    {room.name}
                  </Text>
                )
              )}

              {!wallsHidden && roomScopedWalls.map((wall) => (
                <InteractiveWall
                  key={wall.id}
                  ref={(r) => { if (r) wallRefs.current[wall.id] = r; }}
                  wall={wall}
                  isSelected={wall.id === selectedWallId}
                  selectedOpening={selectedOpening?.wallId === wall.id ? selectedOpening : null}
                  openingPreview={openingPreview?.wallId === wall.id ? openingPreview : null}
                  activeOpeningTool={activeTool === 'door' || activeTool === 'window' ? activeTool : null}
                  onSelect={() => {
                    setSelectedRoomId(room.id);
                    setSelectedWallId(wall.id);
                    setSelectedFurnitureId(null);
                    setSelectedLightId(null);
                    setActiveTab('walls');
                    if (activeTool === 'build') setActiveTool('select');
                  }}
                  onOpeningPreviewMove={(type, point) => updateOpeningPreview(wall, type, point)}
                  onOpeningCommit={() => commitOpeningPreview(wall)}
                  onOpeningSelect={(opening) => {
                    setSelectedRoomId(room.id);
                    setSelectedWallId(wall.id);
                    setSelectedOpening({ ...opening, wallId: wall.id });
                    setSelectedFurnitureId(null);
                    setSelectedLightId(null);
                    setActiveTab('walls');
                  }}
                  updateOpening={(type, openingId, updates) => updateWallOpening(wall.id, type, openingId, updates)}
                  updateWall={updateWall}
                  setOrbitEnabled={setOrbitEnabled}
                  cameraMode={cameraMode}
                />
              ))}
            </group>
              );
            })()
          )})}

          {pendingScenePreviewRoom && (
            <group>
              <mesh
                position={[pendingScenePreviewRoom.x, pendingScenePreviewRoom.height / 2, pendingScenePreviewRoom.z]}
                renderOrder={2}
              >
                <boxGeometry args={[pendingScenePreviewRoom.width, pendingScenePreviewRoom.height, pendingScenePreviewRoom.depth]} />
                <meshStandardMaterial
                  color={pendingScenePreviewRoom.overlapsExisting ? '#e58d73' : COLORS.action}
                  transparent
                  opacity={pendingScenePreviewRoom.overlapsExisting ? 0.18 : 0.12}
                  depthWrite={false}
                />
              </mesh>
              <lineSegments
                position={[pendingScenePreviewRoom.x, pendingScenePreviewRoom.height / 2, pendingScenePreviewRoom.z]}
                renderOrder={3}
              >
                <edgesGeometry args={[new THREE.BoxGeometry(pendingScenePreviewRoom.width, pendingScenePreviewRoom.height, pendingScenePreviewRoom.depth)]} />
                <lineBasicMaterial
                  color={pendingScenePreviewRoom.overlapsExisting ? '#f2b29d' : '#f3d0a9'}
                  transparent
                  opacity={0.9}
                />
              </lineSegments>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[pendingScenePreviewRoom.x, 0.03, pendingScenePreviewRoom.z]}
                renderOrder={1}
              >
                <planeGeometry args={[pendingScenePreviewRoom.width, pendingScenePreviewRoom.depth]} />
                <meshBasicMaterial
                  color={pendingScenePreviewRoom.overlapsExisting ? '#e58d73' : COLORS.action}
                  transparent
                  opacity={pendingScenePreviewRoom.overlapsExisting ? 0.16 : 0.22}
                />
              </mesh>
              <Text
                position={[pendingScenePreviewRoom.x, pendingScenePreviewRoom.height + 0.36, pendingScenePreviewRoom.z]}
                fontSize={0.24}
                color={pendingScenePreviewRoom.overlapsExisting ? '#f2b29d' : COLORS.action}
                anchorX="center"
                anchorY="middle"
              >
                {`${pendingScenePreviewRoom.name} Preview`}
              </Text>
            </group>
          )}

          {!wallsHidden && (
            <WallGizmo
              selectedWall={selectedWall}
              wallRef={{ current: wallRefs.current[selectedWallId] }}
              gizmoMode={gizmoMode}
              updateWall={updateWall}
              setOrbitEnabled={setOrbitEnabled}
            />
          )}

          {/* World projectors*/}
          {!wallsHidden && selectedWall && (
            <WorldProjector
              type="wall"
              worldPosition={[
                (selectedWall.start[0] + selectedWall.end[0]) / 2,
                selectedWall.height + 0.6,
                (selectedWall.start[1] + selectedWall.end[1]) / 2,
              ]}
              onScreenPos={setWallToolbarPos}
            />
          )}
          {selectedFurniture && (
            <WorldProjector
              type="furniture"
              worldPosition={[
                selectedFurniture.position[0],
                selectedFurniture.position[1] + 1.8,
                selectedFurniture.position[2],
              ]}
              onScreenPos={setFurnitureToolbarPos}
            />
          )}
          {placedLights.find((l) => l.id === selectedLightId) && (() => {
            const sl = placedLights.find((l) => l.id === selectedLightId);
            return (
              <WorldProjector
                type="light"
                worldPosition={[sl.position[0], sl.position[1] + 0.5, sl.position[2]]}
                onScreenPos={setLightToolbarPos}
              />
            );
          })()}

          {/* Furniture */}
          <Suspense fallback={null}>
            {placedItems.map((item) => (
              <FurnitureItem
                key={item.id}
                ref={(r) => { if (r) furnitureRefs.current[item.id] = r; }}
                item={item}
                isSelected={item.id === selectedFurnitureId}
                onSelect={() => { setSelectedFurnitureId(item.id); setSelectedWallId(null); setSelectedLightId(null); }}
                setOrbitEnabled={setOrbitEnabled}
                updateItem={updateItem}
              />
            ))}
          </Suspense>

          <FurnitureGizmo
            selectedItem={selectedFurniture}
            itemRef={{ current: furnitureRefs.current[selectedFurnitureId] }}
            gizmoMode={gizmoMode}
            updateItem={updateItem}
            setOrbitEnabled={setOrbitEnabled}
          />

          {/* Collision highlights */}
          <CollisionHighlight
            placedItems={placedItems}
            itemStates={spatial.itemStates}
            furnitureRefs={furnitureRefs}
          />

          {/* Placed lights */}
          {placedLights.map((light) => (
            <PlacedLight
              key={light.id}
              light={light}
              isSelected={light.id === selectedLightId}
              onSelect={() => { setSelectedLightId(light.id); setSelectedWallId(null); setSelectedFurnitureId(null); setActiveTab('lighting'); }}
              updateLight={lightingState.updateLight}
              setOrbitEnabled={setOrbitEnabled}
            />
          ))}

          {/* Grid + Fog */}
          <DreiGrid
            args={[boardFootprint.width, boardFootprint.depth]} cellSize={0.5} cellThickness={0.5}
            cellColor={COLORS.accent} sectionSize={2} sectionThickness={1}
            sectionColor={COLORS.action} fadeDistance={30}
            position={[boardFootprint.centerX, 0.001, boardFootprint.centerZ]}
          />
          <fog attach="fog" args={[lighting.fogColor, 15, 30]} />
        </Canvas>
      </div>
    </div>
  );

  // Render 
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: pageGradient,
        overflow: 'hidden',
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >

      {!isMobile && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: copperGlow, pointerEvents: 'none', opacity: 1 }} />
          <div style={{ position: 'absolute', inset: 0, background: accentGlow, pointerEvents: 'none', opacity: 1 }} />
        </>
      )}

      {isMobile ? (
        <>
          <MobileTopBar
            projectName={projectSave.projectName}
            cameraMode={cameraMode}
            onCameraToggle={() => {
              if (cameraMode === 'orbit') { setCameraMode('firstPerson'); setTeleportTarget([0, 1.6, 0]); }
              else { setCameraMode('orbit'); if (document.pointerLockElement) document.exitPointerLock(); }
            }}
          />
          <div style={{ position: 'fixed', inset: 0, paddingTop: 64, paddingBottom: 72 }}>
            {canvasBlock}
          </div>
          <BottomNav
            activeTab={activeTab}
            onTabChange={openMobilePanel}
            onSave={() => setSaveModalOpen(true)}
            onDashboard={handleDashboard}
            onLogout={handleLogout}
            canUndo={canUndo} canRedo={canRedo}
            onUndo={undo} onRedo={redo}
            showRoomTab={Boolean(selectedRoom)}
          />
          {selectedOpeningEntity && (
            <div
              style={{
                position: 'fixed',
                left: 16,
                right: 16,
                bottom: 92,
                zIndex: 1000,
                padding: '12px',
                borderRadius: 20,
                maxWidth: 420,
                maxHeight: selectedOpening?.type === 'door' ? 'auto' : '22vh',
                margin: '0 auto',
                ...openingPanelTone,
                backdropFilter: 'blur(14px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Door Studio</div>
                  <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{selectedOpening?.type} edit</div>
                  <div style={{ color: `${COLORS.text}92`, fontSize: 11 }}>Drag in scene to move. Fine-tune here with exact values.</div>
                </div>
                {renderOpeningModeButton(
                  'Remove this opening',
                  <DeleteOutlined />,
                  false,
                  () => removeWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id),
                  true
                )}
              </div>
              {selectedOpening?.type === 'door' ? (
                renderMobileDoorEditor()
              ) : (
                <div style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {renderOpeningDimensionInputs()}
                  {renderWindowTypeControls()}
                  {renderWindowBehaviorControls()}
                </div>
              )}
            </div>
          )}
          <SlidePanel
            open={mobilePanelOpen}
            onClose={() => setMobilePanelOpen(false)}
            title={
              activeTab === 'room'      ? 'Room' :
              activeTab === 'walls'     ? 'Walls' :
              activeTab === 'materials' ? 'Materials & Style' :
              activeTab === 'lighting'  ? 'Lighting' :
              activeTab === 'projects'  ? 'Projects' : 'Furniture'
            }
            height={activeTab === 'furniture' || activeTab === 'projects' ? '82vh' : activeTab === 'room' ? '76vh' : '72vh'}
          >
            {activeTab === 'room' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {renderRoomActionPanel('mobile')}
              </div>
            )}
            {activeTab === 'walls' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {renderRoomActionPanel('mobile')}
                <WallEditorPanel
                  selectedWall={selectedWall} addWall={addWall} splitWall={splitWall}
                  deleteWall={deleteWall} updateWall={updateWall}
                  gizmoMode={gizmoMode} setGizmoMode={setGizmoMode}
                  envColors={{ floor: floorMaterial.color, ceiling: ceilingMaterial.color }}
                  setEnvColors={(updater) => {
                    const next = typeof updater === 'function'
                      ? updater({ floor: floorMaterial.color, ceiling: ceilingMaterial.color })
                      : updater;
                    if (next.floor   !== floorMaterial.color)   updateSurface('floor',   { color: next.floor });
                    if (next.ceiling !== ceilingMaterial.color) updateSurface('ceiling', { color: next.ceiling });
                  }}
                />
              </div>
            )}
            {activeTab === 'materials' && (
              <MaterialPanel
                selectedWall={selectedWall} walls={walls}
                floorMaterial={floorMaterial} ceilingMaterial={ceilingMaterial}
                applyTexture={applyTexture} updateSurface={updateSurface}
                applyTheme={applyTheme} activeTheme={activeTheme}
              />
            )}
            {activeTab === 'lighting' && <LightingPanel {...lightingState} />}
            {activeTab === 'furniture' && (
              <FurniturePicker
                selectedItem={selectedFurniture} placedItems={placedItems}
                addItem={(model) => { addItem(model); setMobilePanelOpen(false); }}
                deleteItem={deleteItem} gizmoMode={gizmoMode} setGizmoMode={setGizmoMode}
                furnitureRefs={furnitureRefs} tint={selectedFurniture?.tint ?? null} setTint={setSelectedFurnitureTint}
              />
            )}
            {activeTab === 'projects' && (
              <SavedProjectsPanel
                currentProjectId={currentProjectId}
                currentProjectName={projectSave.projectName}
                listProjects={projectSave.listProjects}
                loadProject={async (projectId) => {
                  await projectSave.loadProject(projectId);
                  setMobilePanelOpen(false);
                }}
                deleteProject={projectSave.deleteProject}
                createNewProject={handleCreateNewProject}
              />
            )}
          </SlidePanel>
        </>
      ) : (
        <>
          {/* Desktop undo / save bar */}
          <div style={{ position: 'absolute', top: 28, right: 28, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ background: `${COLORS.background}D9`, padding: '10px 12px', borderRadius: '20px', border: softBorder, backdropFilter: 'blur(20px)', boxShadow: glassShadow }}>
              <Space>
                <Tooltip title="Undo (Ctrl+Z)">
                  <Button type="text" disabled={!canUndo} icon={<UndoOutlined />} onClick={undo} className="room-action-button" />
                </Tooltip>
                <Tooltip title="Redo (Ctrl+Y)">
                  <Button type="text" disabled={!canRedo} icon={<RedoOutlined />} onClick={redo} className="room-action-button" />
                </Tooltip>
                <div style={{ width: 1, height: 24, background: 'rgba(201, 171, 146, 0.45)', margin: '0 6px' }} />
                <Tooltip title="Save / Snapshot">
                  <Button type="text" icon={<SaveOutlined />} onClick={() => setSaveModalOpen(true)} className="room-action-button room-action-button-accent" />
                </Tooltip>
                <Tooltip title="Back to Dashboard">
                  <Button type="text" icon={<AppstoreOutlined />} onClick={handleDashboard} className="room-action-button" />
                </Tooltip>
                <Tooltip title="Logout">
                  <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} className="room-action-button" />
                </Tooltip>
                {projectSave.saveStatus === 'saved' && (
                  <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 600, marginLeft: 2, letterSpacing: '0.04em' }}>Saved</span>
                )}
              </Space>
            </div>
            <Button
              type="default"
              icon={wallsHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={toggleWallsHidden}
              className="room-standalone-action-button"
            >
              {wallsHidden ? 'Show Walls' : 'Hide Walls'}
            </Button>
          </div>

          <div style={{ position: 'relative', height: '100%', padding: 20 }}>
            <div className="room-canvas-shell" style={{ height: '100%', width: '100%', background: desktopCanvasShell, border: softBorder, borderRadius: 34, boxShadow: softShadow, padding: 14, backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', borderRadius: 24, overflow: 'hidden', background: `linear-gradient(180deg, ${COLORS.surface}80 0%, ${COLORS.background}20 100%)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                {canvasBlock}
              </div>
              <div ref={desktopFloatingRef} style={{ position: 'absolute', top: 24, left: 24, zIndex: 950, display: 'flex', alignItems: 'flex-start', gap: 14, pointerEvents: 'none' }}>
                <div className="room-floating-rail">
                  <div className="room-floating-brand">
                    <span className="room-floating-brand-dot" />
                  </div>
                  <div className="room-floating-rail-items">
                    {desktopNavItems.map(({ key, label, icon: Icon }) => {
                      const isActive = desktopPanelOpen && activeTab === key;
                      return (
                        <RevealActionButton
                          key={key}
                          label={label}
                          icon={Icon}
                          active={isActive}
                          onClick={() => toggleDesktopPanel(key)}
                          variant="sidebar"
                        />
                      );
                    })}
                  </div>
                </div>

                <div className={desktopPanelOpen ? 'room-floating-panel is-open' : 'room-floating-panel'}>
                  <div className={desktopPanelOpen ? 'room-floating-panel-inner is-open' : 'room-floating-panel-inner'}>
                    <div className="room-floating-panel-header">
                      <div>
                        <div className="room-floating-kicker">Context</div>
                        <div className="room-floating-title">{desktopPanelTitle}</div>
                      </div>
                      <button type="button" className="room-floating-close" onClick={() => setDesktopPanelOpen(false)}>
                        Collapse
                      </button>
                    </div>
                    <div className="room-floating-panel-scroll">
                      {desktopPanelContent}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Splitter className="room-splitter" style={{ height: '100%', width: '100%', background: 'transparent', display: 'none' }}>
              <Splitter.Panel defaultSize="38%" min="24%" max="68%" style={{ background: 'transparent' }}>
                <div ref={sidebarRef} className="room-sidebar-shell" style={{ height: '100%', width: '100%', padding: '26px 22px 22px', background: panelGradient, border: softBorder, borderRadius: 34, boxShadow: softShadow, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 auto auto 0', width: '100%', height: 160, background: 'linear-gradient(135deg, rgba(196,154,108,0.16) 0%, rgba(196,154,108,0) 72%)', pointerEvents: 'none' }} />
                  <div style={{ marginBottom: 18, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <div style={{ color: COLORS.action, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Workspace</div>
                        <div style={{ color: COLORS.text, fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Room Composer</div>
                      </div>
                      <div style={{ color: `${COLORS.text}8C`, fontSize: 12, textAlign: 'right', lineHeight: 1.45 }}>
                        Direct editing for
                        <br />
                        walls, light, and decor
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <div className="room-stat-chip">
                        <span className="room-stat-dot" />
                        {walls.length} walls
                      </div>
                      <div className="room-stat-chip">
                        <span className="room-stat-dot room-stat-dot-blue" />
                        {placedItems.length} objects
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', background: cameraCardBg, borderRadius: 22, border: `1px solid ${COLORS.secondary}50`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 24px rgba(0,0,0,0.18)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div className="room-view-title">
                          View
                        </div>
                        <div className="room-segmented room-segmented-compact">
                          <button type="button" className={cameraMode === 'orbit' ? 'room-segment is-active' : 'room-segment'} onClick={() => { setCameraMode('orbit'); if (document.pointerLockElement) document.exitPointerLock(); }}>
                            Orbit
                          </button>
                          <button type="button" className={cameraMode === 'firstPerson' ? 'room-segment is-active' : 'room-segment'} onClick={() => { setCameraMode('firstPerson'); setTeleportTarget([0, 1.6, 0]); }}>
                            Walk
                          </button>
                        </div>
                      </div>
                      <div className="room-view-strip">
                        {Object.keys(CAMERA_PRESETS).map((k) => (
                          <Tooltip key={k} title={k[0].toUpperCase() + k.slice(1)}>
                            <button
                              type="button"
                              className={currentViewPreset === k ? 'room-view-option is-active' : 'room-view-option'}
                              onClick={() => applyCameraPreset(k)}
                            >
                              {k === 'top' ? <VerticalLeftOutlined style={{ transform: 'rotate(-90deg)' }} /> : k === 'front' ? <SpaceDashboardRoundedIcon style={{ fontSize: 16 }} /> : k === 'side' ? <VerticalRightOutlined /> : <EyeOutlined />}
                            </button>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  </div>
                  {selectedWall && (
                    <div style={{ marginBottom: 16, position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', background: `${COLORS.background}D9`, borderRadius: 22, border: `1px solid ${COLORS.secondary}50` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>Selected Wall</div>
                            <div style={{ color: `${COLORS.text}92`, fontSize: 11 }}>
                              {selectedWallDoorCount} door{selectedWallDoorCount === 1 ? '' : 's'} • {selectedWallWindowCount} window{selectedWallWindowCount === 1 ? '' : 's'}
                            </div>
                          </div>
                          <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                            Live Context
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          <button type="button" className={activeTool === 'door' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => startOpeningPlacement('door')}>Add Door</button>
                          <button type="button" className={activeTool === 'window' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => startOpeningPlacement('window')}>Add Window</button>
                          <button type="button" className="room-secondary-chip" onClick={splitWall}>Split</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          <button type="button" className={activeTool === 'build' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => setActiveTool('build')}>Build</button>
                          <button type="button" className={activeTool === 'select' ? 'room-secondary-chip is-active' : 'room-secondary-chip'} onClick={() => setActiveTool('select')}>Select</button>
                          <button type="button" className="room-secondary-chip is-danger" onClick={() => deleteWall(selectedWall.id)}>Delete</button>
                        </div>
          {selectedOpeningEntity && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px', borderRadius: 18, ...openingPanelTone }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Precision Edit
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                    {selectedOpening?.type} selected
                  </div>
                  <div style={{ color: `${COLORS.text}8C`, fontSize: 11 }}>
                    Drag on the wall, then fine-tune exact dimensions here.
                  </div>
                </div>
                {renderOpeningModeButton(
                  'Remove this opening',
                  <DeleteOutlined />,
                  false,
                  () => removeWallOpening(selectedOpening.wallId, selectedOpening.type, selectedOpening.id),
                  true
                )}
              </div>
              {renderOpeningDimensionInputs()}
              {renderDoorTypeControls()}
              {renderDoorOpenControls()}
              {renderDoorBehaviorControls()}
              {renderWindowTypeControls()}
              {renderWindowBehaviorControls()}
            </div>
          )}
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1, minHeight: 0, borderRadius: 28, background: `linear-gradient(180deg, ${COLORS.surface}E8 0%, ${COLORS.background}EE 100%)`, border: `1px solid ${COLORS.secondary}50`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                    <Tabs className="room-tabs" activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ height: '100%', padding: '10px 14px 16px' }} />
                  </div>
                </div>
              </Splitter.Panel>
              <Splitter.Panel style={{ background: 'transparent' }}>
                <div className="room-canvas-shell" style={{ height: '100%', width: '100%', background: desktopCanvasShell, border: softBorder, borderRadius: 34, boxShadow: softShadow, padding: 14, backdropFilter: 'blur(10px)' }}>
                  <div style={{ height: '100%', width: '100%', borderRadius: 24, overflow: 'hidden', background: `linear-gradient(180deg, ${COLORS.surface}80 0%, ${COLORS.background}20 100%)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                    {canvasBlock}
                  </div>
                </div>
              </Splitter.Panel>
            </Splitter>
          </div>
        </>
      )}

      {/* Context toolbars */}
      <ContextToolbar
        type="wall"
        screenPos={selectedWall ? wallToolbarPos : null}
        gizmoMode={gizmoMode}
        onGizmoChange={setGizmoMode}
        onDelete={() => selectedWall && deleteWall(selectedWall.id)}
        onSplit={splitWall}
        onGhost={() => selectedWall && updateWall(selectedWall.id, { ghost: !selectedWall.ghost })}
        onAddDoor={() => startOpeningPlacement('door')}
        onAddWindow={() => startOpeningPlacement('window')}
        wallGhost={selectedWall?.ghost || false}
        activeOpeningTool={activeTool === 'door' || activeTool === 'window' ? activeTool : null}
        navigateTo={navigateTo}
        selectedItem={selectedWall}
        onPrecisionUpdate={(updates) => selectedWall && updateWall(selectedWall.id, updates)}
        isPinned={wallToolbarPinned}
        onPinnedChange={setWallToolbarPinned}
      />
      <ContextToolbar
        type="furniture"
        screenPos={selectedFurniture ? furnitureToolbarPos : null}
        gizmoMode={gizmoMode}
        onGizmoChange={setGizmoMode}
        onDelete={() => selectedFurniture && deleteItem(selectedFurniture.id)}
        navigateTo={navigateTo}
        selectedFurnitureMesh={furnitureRefs.current[selectedFurnitureId]}
        onTintChange={setSelectedFurnitureTint}
        selectedItem={selectedFurniture}
        onPrecisionUpdate={(updates) => selectedFurniture && updateItem(selectedFurniture.id, updates)}
        isPinned={furnitureToolbarPinned}
        onPinnedChange={setFurnitureToolbarPinned}
      />
      <ContextToolbar
        type="light"
        screenPos={placedLights.find((l) => l.id === selectedLightId) ? lightToolbarPos : null}
        gizmoMode={gizmoMode}
        onGizmoChange={setGizmoMode}
        onDelete={() => lightingState.deleteLight(selectedLightId)}
        navigateTo={navigateTo}
      />

        {/*  Model preview portal  */}
        <PreviewPortal />
  
      {/*  Spatial score panel  */}
      <ScorePanel
        score={spatial.score}
        suggestions={spatial.suggestions}
        visible={placedItems.length > 0}
      />

      {/*  Save modal  */}
      <SaveModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        projectName={projectSave.projectName}
        setProjectName={projectSave.setProjectName}
        saveStatus={projectSave.saveStatus}
        saveProject={projectSave.saveProject}
        downloadSnapshot={projectSave.downloadSnapshot}
        exportJSON={projectSave.exportJSON}
        importJSON={projectSave.importJSON}
        shareUrl={projectSave.shareUrl}
        modelAssets={projectSave.modelAssets}
        assetUploadStatus={projectSave.assetUploadStatus}
        uploadModelAsset={projectSave.uploadModelAsset}
        copyShareLink={projectSave.copyShareLink}
        openSharePage={projectSave.openSharePage}
        autosaveEnabled={projectSave.autosaveEnabled}
        setAutosaveEnabled={projectSave.setAutosaveEnabled}
        recorderProps={recorder}
      />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { overflow: hidden; height: 100vh; width: 100vw; touch-action: none; }
        canvas { outline: none !important; border: none !important; display: block !important; }
        .ant-splitter { border: none !important; outline: none !important; }
        .ant-splitter-panel { border: none !important; outline: none !important; }
        .room-splitter > .ant-splitter-bar {
          margin: 22px 8px !important;
          width: 22px !important;
          background: transparent !important;
        }
        .room-splitter > .ant-splitter-bar .ant-splitter-handle {
          width: 12px !important;
          border-radius: 999px !important;
          background: linear-gradient(180deg, ${COLORS.action}CC 0%, ${COLORS.accent}CC 100%) !important;
          border: 1px solid ${COLORS.secondary}99 !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22) !important;
        }
        .room-splitter > .ant-splitter-bar:hover .ant-splitter-handle {
          background: linear-gradient(180deg, ${COLORS.action} 0%, ${COLORS.accent} 100%) !important;
        }
        .room-tab-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: ${COLORS.text};
        }
        .room-tabs .ant-tabs-nav {
          margin: 0 0 14px !important;
        }
        .room-tabs .ant-tabs-nav::before {
          display: none !important;
        }
        .room-tabs .ant-tabs-nav-list {
          gap: 6px;
          padding: 6px;
          background: ${COLORS.background}B8;
          border: 1px solid ${COLORS.secondary}40;
          border-radius: 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 18px rgba(0,0,0,0.14);
          flex-wrap: nowrap !important;
          min-width: max-content;
        }
        .room-tabs .ant-tabs-nav-wrap {
          overflow-x: auto !important;
          scrollbar-width: none;
        }
        .room-tabs .ant-tabs-nav-wrap::-webkit-scrollbar {
          display: none;
        }
        .room-tabs .ant-tabs-tab {
          margin: 0 !important;
          padding: 9px 14px !important;
          border-radius: 14px !important;
          transition: all 0.2s ease !important;
        }
        .room-tabs .ant-tabs-tab:hover {
          background: ${COLORS.surface}D9;
        }
        .room-tabs .ant-tabs-tab-active {
          background: linear-gradient(180deg, ${COLORS.action} 0%, ${COLORS.accent} 100%);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.24);
          transform: translateY(-1px);
        }
        .room-tabs .ant-tabs-tab-active .room-tab-label {
          color: ${COLORS.background} !important;
        }
        .room-tabs .ant-tabs-ink-bar {
          display: none !important;
        }
        .room-tabs .ant-tabs-content-holder {
          height: calc(100% - 58px);
          overflow: auto;
          padding: 6px 2px 2px;
        }
        .room-action-button.ant-btn {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          color: ${COLORS.text};
          background: ${COLORS.surface}D9;
          border: 1px solid ${COLORS.secondary}55;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .room-action-button.ant-btn:hover {
          color: ${COLORS.action} !important;
          background: ${COLORS.surface} !important;
          border-color: ${COLORS.action}99 !important;
        }
        .room-action-button.ant-btn[disabled] {
          color: ${COLORS.secondary}66 !important;
          background: ${COLORS.surface}88 !important;
        }
        .room-action-button-accent.ant-btn {
          color: ${COLORS.background} !important;
          background: linear-gradient(135deg, ${COLORS.action} 0%, ${COLORS.accent} 100%) !important;
          border-color: ${COLORS.action} !important;
        }
        .room-standalone-action-button.ant-btn {
          height: 40px;
          border-radius: 999px;
          padding: 0 16px;
          color: ${COLORS.text};
          background: ${COLORS.surface}E8;
          border: 1px solid ${COLORS.secondary}55;
          box-shadow: ${glassShadow};
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .room-standalone-action-button.ant-btn:hover {
          color: ${COLORS.action} !important;
          border-color: ${COLORS.action}AA !important;
          background: ${COLORS.surface} !important;
        }
        .room-floating-rail {
          pointer-events: auto;
          width: 74px;
          padding: 14px 10px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(58, 48, 43, 0.94) 0%, rgba(31, 24, 21, 0.98) 100%);
          border: 1px solid rgba(196, 154, 108, 0.18);
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .room-floating-brand {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 30% 30%, rgba(242,229,213,0.9), rgba(196,154,108,0.34) 42%, rgba(58,48,43,0.96) 100%);
          box-shadow: 0 0 24px rgba(196, 154, 108, 0.24), inset 0 1px 0 rgba(255,255,255,0.45);
        }
        .room-floating-brand-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${COLORS.text} 0%, ${COLORS.action} 100%);
          box-shadow: 0 0 18px rgba(196, 154, 108, 0.52);
        }
        .room-floating-rail-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          width: 100%;
        }
        .room-floating-rail-button {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 1px solid rgba(225, 255, 247, 0.08);
          background: rgba(255,255,255,0.06);
          color: rgba(235, 255, 250, 0.78);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.24s ease, background 0.24s ease, box-shadow 0.24s ease, color 0.24s ease, border-color 0.24s ease;
          backdrop-filter: blur(14px);
        }
        .room-floating-rail-button:hover {
          transform: translateY(-2px) scale(1.02);
          color: #ffffff;
          background: rgba(255,255,255,0.12);
          border-color: rgba(225, 255, 247, 0.16);
        }
        .room-floating-rail-button.is-active {
          color: ${COLORS.background};
          background: linear-gradient(135deg, ${COLORS.text} 0%, #dbc0a2 100%);
          border-color: rgba(255,255,255,0.55);
          box-shadow: 0 0 0 6px rgba(196, 154, 108, 0.12), 0 0 24px rgba(196, 154, 108, 0.26), 0 12px 26px rgba(0,0,0,0.28);
        }
        .room-floating-panel {
          pointer-events: none;
          width: 0;
          opacity: 0;
          transform: translateX(-16px);
          transition: width 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
          overflow: hidden;
        }
        .room-floating-panel.is-open {
          pointer-events: auto;
          width: min(430px, calc(100vw - 180px));
          opacity: 1;
          transform: translateX(0);
        }
        .room-floating-panel-inner {
          height: auto;
          max-height: min(78vh, calc(100vh - 120px));
          border-radius: 34px;
          background: linear-gradient(180deg, rgba(58, 48, 43, 0.88) 0%, rgba(34, 27, 24, 0.96) 100%);
          border: 1px solid rgba(196, 154, 108, 0.14);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.09);
          backdrop-filter: blur(28px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateX(-22px);
          transition: opacity 0.22s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .room-floating-panel-inner.is-open {
          opacity: 1;
          transform: translateX(0);
        }
        .room-floating-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid rgba(196, 154, 108, 0.1);
        }
        .room-floating-kicker {
          color: rgba(196, 154, 108, 0.8);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .room-floating-title {
          color: ${COLORS.text};
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .room-floating-close {
          border: 1px solid rgba(196,154,108,0.16);
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: ${COLORS.text};
          min-height: 36px;
          padding: 0 14px;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .room-floating-close:hover {
          background: rgba(196,154,108,0.14);
          transform: translateY(-1px);
        }
        .room-floating-panel-scroll {
          flex: 1;
          max-height: calc(78vh - 84px);
          overflow-y: auto;
          padding: 16px 18px 20px;
        }
        .room-floating-panel-scroll > * {
          animation: roomFloatingContentIn 0.28s ease;
        }
        .room-floating-context-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 22px;
          background: rgba(44, 36, 32, 0.68);
          border: 1px solid rgba(196, 154, 108, 0.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        @keyframes roomFloatingContentIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes roomDoorPanelFade {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .room-icon-orb {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, ${COLORS.surface} 0%, ${COLORS.background} 100%);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
        }
        .room-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          background: ${COLORS.background}CC;
          border: 1px solid ${COLORS.secondary}50;
          color: ${COLORS.text};
          font-size: 11px;
          font-weight: 600;
        }
        .room-stat-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${COLORS.action};
          box-shadow: 0 0 0 4px rgba(196, 154, 108, 0.18);
        }
        .room-stat-dot-blue {
          background: ${COLORS.accent};
          box-shadow: 0 0 0 4px rgba(139, 107, 77, 0.24);
        }
        .room-segmented {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          background: ${COLORS.background}A6;
          border: 1px solid ${COLORS.secondary}55;
          border-radius: 999px;
        }
        .room-segmented-compact {
          gap: 4px;
          padding: 3px;
        }
        .room-segment {
          border: none;
          background: transparent;
          color: ${COLORS.secondary};
          padding: 8px 12px;
          border-radius: 999px;
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .room-segment.is-active {
          background: linear-gradient(135deg, ${COLORS.action} 0%, ${COLORS.accent} 100%);
          color: ${COLORS.background};
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.24);
        }
        .room-view-title {
          color: ${COLORS.action};
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .room-view-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          padding: 8px;
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid ${COLORS.secondary}55;
          border-radius: 999px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 24px rgba(0,0,0,0.16);
          overflow: hidden;
        }
        .room-view-option {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          width: 100%;
          min-width: 0;
          height: 44px;
          min-height: 44px;
          border: 1px solid transparent;
          background: rgba(255,255,255,0.02);
          color: ${COLORS.text};
          font: inherit;
          cursor: pointer;
          border-radius: 999px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
        }
        .room-view-option:hover {
          background: rgba(255,255,255,0.1);
          border-color: ${COLORS.secondary}66;
          color: ${COLORS.action};
          transform: translateY(-1px);
        }
        .room-view-option.is-active {
          background: linear-gradient(135deg, rgba(196,154,108,0.34) 0%, rgba(139,107,77,0.3) 100%);
          border-color: ${COLORS.action}88;
          color: ${COLORS.action};
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .room-secondary-chip {
          min-height: 38px;
          border: 1px solid ${COLORS.secondary}55;
          border-radius: 999px;
          background: ${COLORS.surface};
          color: ${COLORS.text};
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .room-secondary-chip:hover {
          border-color: ${COLORS.action}88;
          color: ${COLORS.action};
        }
        .room-secondary-chip.is-active {
          background: ${COLORS.accent};
          border-color: ${COLORS.action};
          color: ${COLORS.text};
        }
        .room-secondary-chip.is-danger:hover {
          border-color: rgba(255, 107, 107, 0.8);
          color: #ff8d8d;
        }
        .room-creation-panel {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(196, 154, 108, 0.16) 0%, rgba(196, 154, 108, 0) 34%),
            linear-gradient(180deg, #2d211d 0%, #1a1310 100%);
          border: 1px solid rgba(201, 171, 146, 0.14);
          box-shadow:
            0 24px 48px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .room-creation-panel::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 120px;
          background: linear-gradient(135deg, rgba(210, 164, 114, 0.18) 0%, rgba(210, 164, 114, 0) 72%);
          pointer-events: none;
        }
        .room-creation-field {
          min-height: 106px;
          justify-content: space-between;
          padding: 16px 16px 14px !important;
          border-radius: 18px !important;
          background: rgba(255,255,255,0.035) !important;
          border: 1px solid rgba(201, 171, 146, 0.08) !important;
          backdrop-filter: blur(14px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .room-creation-source-chip,
        .room-creation-status-pill,
        .room-creation-top-action,
        .room-creation-secondary,
        .room-creation-primary {
          font: inherit;
          border: 0;
        }
        .room-creation-source-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          color: rgba(240, 227, 216, 0.88);
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(201, 171, 146, 0.12);
        }
        .room-creation-source-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #c69a6c;
          box-shadow: 0 0 0 4px rgba(198, 154, 108, 0.18);
        }
        .room-creation-status-pill {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(198, 154, 108, 0.14);
          color: #e0b789;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(198, 154, 108, 0.16);
        }
        .room-creation-top-action,
        .room-creation-secondary {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          color: rgba(244, 234, 226, 0.94);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(201, 171, 146, 0.14);
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .room-creation-top-action:hover,
        .room-creation-secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(210, 164, 114, 0.32);
          transform: translateY(-1px);
        }
        .room-creation-primary {
          min-height: 46px;
          padding: 0 22px;
          border-radius: 14px;
          background: linear-gradient(135deg, #bb8d5e 0%, #d3a26e 100%);
          color: #fff8f1;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(126, 83, 43, 0.34);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .room-creation-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(126, 83, 43, 0.42);
          filter: brightness(1.04);
        }
        .room-creation-panel .ant-input,
        .room-creation-panel .ant-input-number,
        .room-creation-panel .ant-input-number-group-addon,
        .room-creation-panel .ant-select-selector {
          border-radius: 14px !important;
          min-height: 46px !important;
          border-color: rgba(201, 171, 146, 0.1) !important;
          box-shadow: none !important;
        }
        .room-creation-panel .ant-input,
        .room-creation-panel .ant-input-number-input,
        .room-creation-panel .ant-select-selection-item,
        .room-creation-panel .ant-select-selection-placeholder {
          font-size: 15px !important;
        }
        .room-creation-panel .ant-input,
        .room-creation-panel .ant-input-number,
        .room-creation-panel .ant-select-selector {
          background: rgba(58, 42, 35, 0.92) !important;
          color: #f6ede6 !important;
        }
        .room-creation-panel .ant-input {
          padding-inline: 14px !important;
        }
        .room-creation-panel .ant-input::placeholder,
        .room-creation-panel .ant-select-selection-placeholder {
          color: rgba(228, 211, 198, 0.5) !important;
        }
        .room-creation-panel .ant-input-number {
          display: flex !important;
          align-items: center;
        }
        .room-creation-panel .ant-input-number-input-wrap {
          display: flex;
          align-items: center;
        }
        .room-creation-panel .ant-input-number-input {
          height: 44px !important;
          padding-inline: 14px !important;
          color: #f6ede6 !important;
        }
        .room-creation-panel .ant-input-number-handler-wrap {
          display: none !important;
        }
        .room-creation-panel .ant-select-selector {
          padding-inline: 14px !important;
        }
        .room-creation-panel .ant-select-arrow {
          color: #d2a472 !important;
        }
        .room-creation-panel .ant-input:focus,
        .room-creation-panel .ant-input:hover,
        .room-creation-panel .ant-input-number:hover,
        .room-creation-panel .ant-input-number-focused,
        .room-creation-panel .ant-select:hover .ant-select-selector,
        .room-creation-panel .ant-select-focused .ant-select-selector {
          border-color: rgba(210, 164, 114, 0.48) !important;
        }
        .room-creation-unit.ant-input[readonly] {
          background: rgba(255,255,255,0.06) !important;
          color: rgba(241, 229, 218, 0.88) !important;
          font-weight: 700;
          padding-inline: 0 !important;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.secondary}; border-radius: 999px; }
        @media (max-width: 767px) {
          button { min-height: 44px; }
          .ant-btn { min-height: 44px !important; font-size: 15px !important; }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}
