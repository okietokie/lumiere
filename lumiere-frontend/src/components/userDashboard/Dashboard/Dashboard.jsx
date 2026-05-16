import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Boxes,
  Camera,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FolderOpen,
  Grid2X2,
  Home,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  UserCircle,
  Wand2,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Flex,
  Grid as AntGrid,
  Input,
  Layout,
  Progress,
  Row,
  Space,
  Typography,
} from "antd";
import useDashboard from "../../../hooks/useDashboard";
import { COLORS } from "../../../utils/colors";
import lmIcon from "../../../assets/lm no-bg.png";
import CreateProjectModal from "../modals/CreateProjectModal";
import ConfirmDeleteModal from "../modals/ConfirmDeleteModal";
import RenameProjectModal from "../modals/RenameProjectModal";
import OnboardingJoyride from "../../onboarding/OnboardingJoyride.jsx";
import { useOnboardingTour } from "../../onboarding/OnboardingTourProvider.jsx";
import WorkspaceSettingsShell from "../../settings/WorkspaceSettingsShell.jsx";

const { Header, Sider, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

const navItems = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "renders", label: "Renders", icon: ImageIcon },
  { id: "tutorials", label: "Tutorials", icon: Wand2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const dashboardStyle = {
  "--dash-bg": "#090807",
  "--dash-bg-soft": "#0f0d0c",
  "--dash-shell": "rgba(18, 14, 12, 0.78)",
  "--dash-shell-2": "rgba(255,255,255,0.025)",
  "--dash-border": "rgba(236, 220, 200, 0.06)",
  "--dash-border-strong": "rgba(236, 220, 200, 0.1)",
  "--dash-text": COLORS.text || "#f4ede4",
  "--dash-muted": COLORS.secondary || "#b7ab9d",
  "--dash-action": COLORS.action || "#c99a62",
  "--dash-accent": COLORS.accent || "#d8b07a",
  backgroundColor: "#090807",
  backgroundImage:
    "radial-gradient(circle at 18% 0%, rgba(142,96,58,0.22), transparent 28%), radial-gradient(circle at 88% 10%, rgba(110,78,52,0.12), transparent 26%), linear-gradient(180deg, #120f0d 0%, #0b0908 38%, #090807 100%)",
};

const shellClass =
  "rounded-3xl bg-[var(--dash-shell)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl";
const cardClass = `${shellClass} p-6`;
const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-all duration-200";

const NOTIFICATION_STORAGE_KEY = "lumiere_dashboard_notifications_read";

const palette = {
  background: "#090807",
  warmBlack: "#0f0d0c",
  surface: "rgba(18, 14, 12, 0.82)",
  elevated: "rgba(34, 26, 22, 0.76)",
  softSurface: "rgba(255, 255, 255, 0.035)",
  text: COLORS.text || "#ead8c3",
  muted: COLORS.secondary || "#9f9285",
  accent: COLORS.action || "#a9784e",
  accentSoft: "rgba(169, 120, 78, 0.12)",
  line: "rgba(234, 216, 195, 0.055)",
};

const antdStyles = {
  root: {
    height: "100dvh",
    minHeight: 0,
    overflow: "hidden",
    color: palette.text,
    backgroundColor: palette.background,
    backgroundImage:
      "radial-gradient(circle at 18% 0%, rgba(142,96,58,0.22), transparent 28%), radial-gradient(circle at 88% 10%, rgba(110,78,52,0.12), transparent 26%), linear-gradient(180deg, #120f0d 0%, #0b0908 38%, #090807 100%)",
  },
  sider: {
    position: "sticky",
    top: 0,
    height: "100vh",
    padding: 16,
    background: "rgba(0,0,0,0.14)",
    borderRight: `1px solid ${palette.line}`,
    backdropFilter: "blur(24px)",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    height: 76,
    padding: "0 32px",
    background: "rgba(9, 8, 7, 0.72)",
    borderBottom: `1px solid ${palette.line}`,
    backdropFilter: "blur(24px)",
  },
  content: {
    height: "calc(100dvh - 76px)",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    paddingTop: 32,
    paddingRight: 32,
    paddingBottom: 128,
    paddingLeft: 32,
  },
  shell: {
    maxWidth: 1380,
    margin: "0 auto",
  },
  panel: {
    border: 0,
    borderRadius: 24,
    background: palette.surface,
    boxShadow:
      "inset 0 1px 0 rgba(234,216,195,0.035), 0 24px 70px rgba(0,0,0,0.24)",
    backdropFilter: "blur(24px)",
  },
  panelBody: {
    padding: 24,
  },
  hero: {
    border: 0,
    borderRadius: 24,
    overflow: "hidden",
    background:
      "linear-gradient(135deg, rgba(32,24,20,0.94), rgba(12,10,9,0.86))",
    boxShadow:
      "inset 0 1px 0 rgba(234,216,195,0.04), 0 34px 90px rgba(0,0,0,0.36)",
    backdropFilter: "blur(24px)",
  },
  heroBody: {
    minHeight: 368,
    padding: 32,
    background:
      "radial-gradient(circle at 14% 8%, rgba(169,120,78,0.24), transparent 28%), radial-gradient(circle at 78% 16%, rgba(255,255,255,0.035), transparent 22%)",
  },
  projectCard: {
    border: 0,
    borderRadius: 24,
    overflow: "hidden",
    background: palette.surface,
    boxShadow:
      "inset 0 1px 0 rgba(234,216,195,0.035), 0 24px 70px rgba(0,0,0,0.2)",
  },
  metaText: {
    color: "rgba(234,216,195,0.48)",
    fontSize: 13,
  },
};

const primaryButtonStyle = {
  height: 44,
  paddingInline: 20,
  borderRadius: 999,
  border: 0,
  background: palette.accent,
  color: "#120f0d",
  fontWeight: 650,
  boxShadow: "0 12px 28px rgba(169,120,78,0.2)",
};

const quietButtonStyle = {
  height: 44,
  paddingInline: 20,
  borderRadius: 999,
  border: 0,
  background: "rgba(255,255,255,0.045)",
  color: palette.text,
  boxShadow: "inset 0 1px 0 rgba(234,216,195,0.035)",
};

const animatedButtonCss = `
  .lm-animated-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    gap: 4px;
    min-width: 140px;
    max-width: 100%;
    height: 48px;
    padding: 0 36px;
    border: 4px solid transparent;
    border-radius: 100px;
    background: transparent;
    color: ${palette.accent};
    box-shadow: 0 0 0 1.5px ${palette.accent};
    cursor: pointer;
    overflow: hidden;
    font-size: 14px;
    font-weight: 650;
    line-height: 1;
    font-family: inherit;
    appearance: none;
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .lm-animated-button svg {
    position: absolute;
    width: 22px;
    height: 22px;
    max-width: 22px;
    max-height: 22px;
    fill: ${palette.accent};
    z-index: 2;
    pointer-events: none;
    transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .lm-animated-button .arr-1 {
    right: 16px;
  }

  .lm-animated-button .arr-2 {
    left: -25%;
  }

  .lm-animated-button .circle {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${palette.accent};
    opacity: 0;
    transform: translate(-50%, -50%);
    transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .lm-animated-button .text {
    position: relative;
    z-index: 3;
    transform: translateX(-12px);
    transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
    white-space: nowrap;
  }

  .lm-animated-button:hover {
    border-radius: 14px;
    color: #120f0d;
    box-shadow: 0 0 0 12px transparent;
  }

  .lm-animated-button:hover .arr-1 {
    right: -25%;
  }

  .lm-animated-button:hover .arr-2 {
    left: 16px;
  }

  .lm-animated-button:hover .text {
    transform: translateX(12px);
  }

  .lm-animated-button:hover svg {
    fill: #120f0d;
  }

  .lm-animated-button:hover .circle {
    width: 230px;
    height: 230px;
    opacity: 1;
  }

  .lm-animated-button:active {
    transform: scale(0.96);
    box-shadow: 0 0 0 4px ${palette.accent};
  }

  .lm-animated-button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
    color: rgba(234,216,195,0.42);
    box-shadow: 0 0 0 1.5px rgba(234,216,195,0.18);
  }

  .lm-animated-button:disabled svg {
    fill: rgba(234,216,195,0.42);
  }

  .lm-animated-button:disabled:hover {
    border-radius: 100px;
    color: rgba(234,216,195,0.42);
    box-shadow: 0 0 0 1.5px rgba(234,216,195,0.18);
  }

  .lm-animated-button:disabled:hover .arr-1 {
    right: 16px;
  }

  .lm-animated-button:disabled:hover .arr-2 {
    left: -25%;
  }

  .lm-animated-button:disabled:hover .text {
    transform: translateX(-12px);
  }

  .lm-animated-button:disabled:hover .circle {
    width: 20px;
    height: 20px;
    opacity: 0;
  }

  .lm-hover-card {
    transform-origin: center;
    transition:
      transform 0.4s ease,
      box-shadow 0.4s ease,
      background 0.4s ease;
  }

  .lm-hover-card .lm-hover-card-content,
  .lm-hover-card .ant-card-body {
    transform-origin: center;
    transition: transform 0.4s ease;
  }

  .lm-hover-card .lm-card-visual,
  .lm-hover-card .lm-card-accent-icon,
  .lm-hover-card .lm-project-preview {
    transform-origin: center;
    transition: transform 0.4s ease;
  }

  .lm-hover-card:hover {
    cursor: pointer;
    transform: scale(0.985);
  }

  .lm-hover-card:hover .lm-hover-card-content,
  .lm-hover-card:hover > .ant-card-body {
    transform: scale(0.985);
  }

  .lm-hover-card:hover .lm-card-visual,
  .lm-hover-card:hover .lm-card-accent-icon,
  .lm-hover-card:hover .lm-project-preview {
    transform: scale(1.035);
  }

  .lm-hover-card:active {
    transform: scale(0.965);
  }
`;

const formatDate = (value) => {
  if (!value) return "Not edited yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not edited yet";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRelative = (value) => {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
};

const getNotificationDateValue = (value) => {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatStorage = (mb) => {
  const value = Number(mb);
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
  if (value >= 100) return `${Math.round(value)} MB`;
  return `${value.toFixed(1)} MB`;
};

const getProjectId = (project) => project?.id ?? project?._id;
const getScene = (project) => project?.scene_data ?? project?.scene ?? {};

const readStoredNotificationMap = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const buildDashboardNotifications = ({ projects, activities, storage, lastProject }) => {
  const items = [];
  const storageLimit = Number(
    storage?.total_mb ?? storage?.totalMb ?? storage?.limit_mb ?? storage?.limitMb ?? 0
  );
  const storageUsed = Number(storage?.used_mb ?? storage?.usedMb ?? 0);
  const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

  if (lastProject) {
    items.push({
      id: `resume-${getProjectId(lastProject)}-${lastProject?.last_modified ?? "latest"}`,
      title: `Continue ${lastProject?.name ?? "your latest project"}`,
      body: "Jump back into the last workspace you edited.",
      timestamp: lastProject?.last_modified,
      ctaLabel: "Open project",
      action: { type: "open-project", project: lastProject },
    });
  }

  if (storagePercent >= 80) {
    items.push({
      id: `storage-${storagePercent}`,
      title: `Storage is ${storagePercent}% used`,
      body: `${formatStorage(storageUsed)} of ${formatStorage(storageLimit)} is currently in use.`,
      timestamp: null,
      ctaLabel: "View projects",
      action: { type: "tab", tab: "projects" },
    });
  }

  if (!projects.length) {
    items.push({
      id: "empty-dashboard",
      title: "Create your first project",
      body: "Start a new concept and your dashboard activity will begin appearing here.",
      timestamp: null,
      ctaLabel: "New project",
      action: { type: "create-project" },
    });
  }

  activities.slice(0, 4).forEach((activity) => {
    const project = projects.find((item) => getProjectId(item) === activity.id);
    items.push({
      id: `activity-${activity.id}-${activity.timestamp ?? "unknown"}`,
      title: activity.action ?? "Project updated",
      body: activity.target ?? activity.project_name ?? "A recent project changed.",
      timestamp: activity.timestamp,
      ctaLabel: project ? "Open project" : "View projects",
      action: project
        ? { type: "open-project", project }
        : { type: "tab", tab: "projects" },
    });
  });

  return items
    .sort((a, b) => getNotificationDateValue(b.timestamp) - getNotificationDateValue(a.timestamp))
    .slice(0, 6);
};

const getRoomCount = (project) => {
  const scene = getScene(project);
  const directCount = project?.rooms_count ?? project?.room_count ?? project?.roomCount;
  if (Number.isFinite(Number(directCount))) return Number(directCount);
  if (Array.isArray(project?.rooms)) return project.rooms.length;
  if (Array.isArray(scene?.rooms)) return scene.rooms.length;
  if (Array.isArray(scene?.walls) && scene.walls.length) return 1;
  return 0;
};

const getProjectCost = (project) =>
  project?.estimated_cost ??
  project?.estimatedCost ??
  project?.budget_estimate ??
  project?.budgetEstimate ??
  project?.cost ??
  project?.scene_data?.estimated_cost ??
  project?.scene?.estimated_cost ??
  null;

const getProjectAssets = (project) => {
  const scene = getScene(project);
  const modelAssets = project?.model_assets ?? {};
  const sceneAssets = [
    ...(Array.isArray(scene.assets) ? scene.assets : []),
    ...(Array.isArray(scene.furniture) ? scene.furniture : []),
    ...(Array.isArray(scene.materials) ? scene.materials : []),
  ];

  const uploadedAssets = Object.entries(modelAssets)
    .filter(([key, value]) => key.endsWith("_url") && value)
    .map(([key, value]) => ({
      id: `${getProjectId(project)}-${key}`,
      name:
        modelAssets[key.replace("_url", "_filename")] ??
        key.replace("_url", "").toUpperCase(),
      kind: key.replace("_url", "").toUpperCase(),
      url: value,
      projectName: project?.name,
    }));

  return [
    ...uploadedAssets,
    ...sceneAssets.map((asset, index) => ({
      id: asset.id ?? `${getProjectId(project)}-scene-asset-${index}`,
      name: asset.name ?? asset.label ?? asset.type ?? "Scene asset",
      kind: asset.kind ?? asset.category ?? asset.type ?? "Asset",
      url: asset.url ?? asset.preview_url ?? asset.thumbnail_url ?? null,
      projectName: project?.name,
    })),
  ];
};

const getProjectRenders = (project) => {
  const scene = getScene(project);
  const renders = [
    ...(Array.isArray(project?.renders) ? project.renders : []),
    ...(Array.isArray(project?.exports) ? project.exports : []),
    ...(Array.isArray(scene.renders) ? scene.renders : []),
    ...(Array.isArray(scene.screenshots) ? scene.screenshots : []),
  ];

  if (project?.thumbnail) {
    renders.unshift({
      id: `${getProjectId(project)}-thumbnail`,
      name: `${project.name ?? "Project"} preview`,
      url: project.thumbnail,
      created_at: project.last_modified,
    });
  }

  return renders.map((render, index) => ({
    id: render.id ?? `${getProjectId(project)}-render-${index}`,
    name: render.name ?? render.title ?? "Project render",
    url: render.url ?? render.image_url ?? render.thumbnail_url ?? render,
    created_at: render.created_at ?? render.timestamp ?? project?.last_modified,
    projectName: project?.name,
  }));
};

const PrimaryButton = ({ children, className = "", ...props }) => (
  <button
    type="button"
    className={`${buttonClass} bg-[var(--dash-action)] text-[#120f0d] shadow-[0_12px_28px_rgba(169,120,78,0.2)] hover:brightness-110 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, className = "", ...props }) => (
  <button
    type="button"
    className={`${buttonClass} bg-white/[0.04] text-[var(--dash-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.06] ${className}`}
    {...props}
  >
    {children}
  </button>
);

const SectionHeading = ({ eyebrow, title, copy, action }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <p className="mb-2 text-[11px] font-light uppercase tracking-[0.24em] text-[var(--dash-action)]">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[34px] font-semibold leading-tight text-[var(--dash-text)] md:text-[40px]">
        {title}
      </h1>
      {copy && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text)]/58">
          {copy}
        </p>
      )}
    </div>
    {action}
  </div>
);

const SectionHeader = ({ eyebrow, title, action }) => (
  <div className="flex items-end justify-between gap-4">
    <div>
      {eyebrow && (
        <p className="text-[11px] font-light uppercase tracking-[0.22em] text-[var(--dash-text)]/38">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-[24px] font-medium leading-tight text-[var(--dash-text)]">
        {title}
      </h2>
    </div>
    {action}
  </div>
);

const Sidebar = ({ activeTab, setActiveTab, onCreateNew }) => (
  <aside className="hidden h-screen w-[78px] shrink-0 flex-col border-r border-white/[0.03] bg-black/10 px-3 py-4 backdrop-blur-xl lg:flex">
    <div className="flex h-11 items-center justify-center">
      <img
        src={lmIcon}
        alt="Lumiere"
        className="h-8 w-8 object-contain drop-shadow-[0_0_14px_rgba(169,120,78,0.26)]"
      />
    </div>

    <nav className="mt-8 flex flex-1 flex-col gap-2">
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            title={label}
            className={`flex h-11 items-center justify-center rounded-2xl transition-all duration-200 ${
              active
                ? "bg-[var(--dash-action)]/12 text-[var(--dash-action)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "text-[var(--dash-text)]/34 hover:bg-white/[0.035] hover:text-[var(--dash-text)]/78"
            }`}
          >
            <Icon size={18} strokeWidth={1.75} />
          </button>
        );
      })}
    </nav>

    <button
      type="button"
      onClick={onCreateNew}
      data-tour="dashboard-new-project"
      className="mt-3 flex h-14 items-center justify-center rounded-3xl bg-[var(--dash-action)] text-[#120f0d] shadow-[0_12px_28px_rgba(169,120,78,0.24)] transition hover:brightness-110"
      title="New Project"
    >
      <Plus size={20} strokeWidth={2.2} />
    </button>
  </aside>
);

const Topbar = ({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  onCreateNew,
  onSearch,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.03] bg-[var(--dash-bg)]/72 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 xl:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <img src={lmIcon} alt="Lumiere" className="h-8 w-8 object-contain" />
        </div>

        <form
          className="hidden h-12 w-full max-w-[560px] items-center rounded-full bg-white/[0.04] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:bg-white/[0.05] sm:flex"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch?.(query);
          }}
        >
          <Search size={16} className="shrink-0 text-[var(--dash-text)]/28" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="ml-2 w-full bg-transparent text-sm text-[var(--dash-text)] outline-none placeholder:text-[var(--dash-text)]/28"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <PrimaryButton
            onClick={onCreateNew}
            data-tour="dashboard-new-project"
            className="hidden sm:inline-flex"
          >
            <Plus size={16} strokeWidth={2.4} />
            New Project
          </PrimaryButton>

          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-[var(--dash-text)]/46 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:bg-white/[0.06] hover:text-[var(--dash-text)]/76">
            <Bell size={17} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex h-11 items-center gap-2 rounded-full bg-white/[0.04] pl-2 pr-4 text-sm text-[var(--dash-text)]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:bg-white/[0.06] hover:text-[var(--dash-text)]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dash-action)]/10 text-[var(--dash-action)]">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user?.name ?? "User"}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <UserCircle size={18} />
                )}
              </div>
              <span className="hidden max-w-[120px] truncate md:block">
                {user?.name ?? "Designer"}
              </span>
              <ChevronDown size={14} className="text-[var(--dash-text)]/34" />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-44 rounded-3xl bg-[var(--dash-shell)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.44)]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("settings");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm text-[var(--dash-text)]/62 hover:bg-white/[0.05] hover:text-[var(--dash-text)]"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm text-red-300/75 hover:bg-red-400/[0.08] hover:text-red-300"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 pb-4 sm:hidden">
        <form
          className="flex h-11 items-center rounded-full bg-white/[0.04] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch?.(query);
          }}
        >
          <Search size={16} className="shrink-0 text-[var(--dash-text)]/28" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-[var(--dash-text)] outline-none placeholder:text-[var(--dash-text)]/28"
          />
        </form>
      </div>

      <div className="hidden gap-2 overflow-x-auto px-4 pb-4 sm:flex lg:hidden">
        {navItems.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs ${
              activeTab === id
                ? "bg-[var(--dash-action)]/10 text-[var(--dash-action)]"
                : "text-[var(--dash-text)]/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
};

const OverviewHero = ({
  user,
  lastProject,
  stats,
  storage,
  projects,
  onCreateNew,
  onOpenLastProject,
}) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = user?.name?.split(" ")[0] ?? "Designer";
  const used = storage?.used_mb ?? 0;
  const total = storage?.total_mb ?? 0;
  const storagePct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const activeProjects = projects.filter((project) => (project?.rooms_count ?? 0) > 0).length;
  const draftProjects = Math.max(0, projects.length - activeProjects);

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,rgba(28,21,17,0.92),rgba(11,10,9,0.82))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_34px_90px_rgba(0,0,0,0.34)] sm:p-8 xl:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(169,120,78,0.24),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.035),transparent_22%)]" />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col justify-between gap-8 xl:pr-4">
          <div>
            <p className="text-[11px] font-light uppercase tracking-[0.26em] text-[var(--dash-action)]">
              Lumiere workspace
            </p>
            <h1 className="mt-4 max-w-3xl text-[42px] font-semibold leading-[0.96] text-[var(--dash-text)] md:text-[52px]">
              Good {greeting}, {firstName}.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--dash-text)]/58">
              {lastProject
                ? `Last active project: ${lastProject.name}. Continue where you left off or start a fresh design workspace.`
                : "Your latest project activity, rooms, and assets will appear here as soon as the backend returns data."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton onClick={onCreateNew}>
              <Plus size={16} />
              New Project
            </PrimaryButton>

            {lastProject && (
              <SecondaryButton onClick={onOpenLastProject}>
                Continue Work
                <ExternalLink size={15} />
              </SecondaryButton>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="h-full rounded-[28px] bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_48px_rgba(0,0,0,0.2)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--dash-action)]/10 text-[var(--dash-action)]">
                <UserCircle size={24} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-medium text-[var(--dash-text)]">
                  {user?.name ?? "Designer"}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--dash-text)]/34">
                  Workspace profile
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--dash-text)]/34">
                Storage
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-[30px] font-semibold leading-none text-[var(--dash-text)]">
                  {formatStorage(used)}
                </p>
                <p className="text-xs text-[var(--dash-text)]/38">
                  {formatStorage(total)}
                </p>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/28">
                <div
                  className="h-full rounded-full bg-[var(--dash-action)]"
                  style={{ width: `${storagePct}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-black/16 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--dash-text)]/34">
                  Projects
                </p>
                <p className="mt-2 text-[24px] font-semibold text-[var(--dash-text)]">
                  {stats?.projects ?? projects.length}
                </p>
              </div>
              <div className="rounded-2xl bg-black/16 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--dash-text)]/34">
                  Active
                </p>
                <p className="mt-2 text-[24px] font-semibold text-[var(--dash-text)]">
                  {activeProjects}
                </p>
              </div>
              <div className="rounded-2xl bg-black/16 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--dash-text)]/34">
                  Drafts
                </p>
                <p className="mt-2 text-[24px] font-semibold text-[var(--dash-text)]">
                  {draftProjects}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-black/18 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--dash-text)]/34">
                Studio state
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[var(--dash-text)]/58">
                {activeProjects > 0
                  ? "Active studio with live project work."
                  : "Quiet studio. Start a project to bring it to life."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatsStrip = ({ stats, projectAssets, projectRenders }) => {
  const items = [
    {
      label: "Projects",
      value: stats?.projects ?? 0,
      detail: `${stats?.rooms ?? 0} rooms`,
    },
    {
      label: "Assets",
      value: stats?.assets ?? projectAssets.length,
      detail: "synced library",
    },
    {
      label: "Renders",
      value: projectRenders.length,
      detail: "exports",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 rounded-[28px] bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`rounded-2xl px-5 py-4 ${index !== 2 ? "sm:border-r sm:border-white/[0.04]" : ""}`}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--dash-text)]/34">
            {item.label}
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="text-[28px] font-semibold leading-none text-[var(--dash-text)]">
              {item.value}
            </p>
            <p className="text-[13px] text-[var(--dash-text)]/40">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const QuickActions = ({ onAction }) => {
  const actions = [
    { id: "new-project", label: "New Project", copy: "Start fresh", icon: Plus, accent: true },
    { id: "import-design", label: "Import Plan", copy: "Open planner", icon: Upload },
    { id: "create-room", label: "Empty Room", copy: "Jump into 3D", icon: Grid2X2 },
    { id: "ai-generate", label: "AI Assist", copy: "Draft ideas", icon: Wand2 },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map(({ id, label, copy, icon: Icon, accent }) => (
        <button
          key={id}
          type="button"
          onClick={() => onAction(id)}
          className={`group flex min-h-[96px] items-center gap-4 rounded-[26px] p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 ${
            accent
              ? "bg-[rgba(169,120,78,0.12)] hover:bg-[rgba(169,120,78,0.15)]"
              : "bg-[var(--dash-shell)] hover:bg-white/[0.05]"
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              accent
                ? "bg-[var(--dash-action)]/10 text-[var(--dash-action)]"
                : "bg-white/[0.04] text-[var(--dash-muted)] group-hover:text-[var(--dash-text)]/82"
            }`}
          >
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-[var(--dash-text)]">{label}</p>
            <p className="mt-1 text-[13px] text-[var(--dash-text)]/44">{copy}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

const ProjectPreview = ({ project }) => {
  const patternId = `grid-${String(getProjectId(project) ?? project?.name ?? "empty").replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  )}`;

  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-[#0d0b0a]">
      {project?.thumbnail ? (
        <img
          src={project.thumbnail}
          alt={project.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0">
          <svg className="h-full w-full" viewBox="0 0 360 220" fill="none">
            <defs>
              <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" stroke="rgba(196,154,108,0.08)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="360" height="220" fill={`url(#${patternId})`} />
            <rect x="34" y="44" width="114" height="82" stroke="rgba(196,154,108,0.26)" fill="rgba(196,154,108,0.05)" />
            <rect x="156" y="44" width="78" height="100" stroke="rgba(196,154,108,0.18)" fill="rgba(255,255,255,0.02)" />
            <path d="M234 92L284 54L284 144L234 92Z" stroke="rgba(196,154,108,0.22)" fill="rgba(196,154,108,0.04)" />
            <rect x="292" y="72" width="34" height="54" stroke="rgba(196,154,108,0.22)" fill="rgba(255,255,255,0.02)" />
            <path d="M148 44Q148 66 126 66" stroke="rgba(196,154,108,0.32)" />
          </svg>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/76 to-transparent" />
      <div className="absolute left-4 top-4 rounded-full bg-black/36 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--dash-text)]/72 backdrop-blur">
        {(project?.rooms_count ?? 0) > 0 ? "Active" : "Draft"}
      </div>
    </div>
  );
};

const ProjectCard = ({ project, onOpen, onDuplicate, onDelete, onRename }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const cost = formatMoney(getProjectCost(project));
  const relativeModified = formatRelative(project?.last_modified);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[28px] bg-[var(--dash-shell)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.045] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_28px_78px_rgba(0,0,0,0.24)]">
      <button type="button" onClick={() => onOpen(project)} className="block text-left">
        <ProjectPreview project={project} />
      </button>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-medium text-[var(--dash-text)]">
              {project?.name ?? "Untitled Project"}
            </h3>
            <p className="mt-2 text-[13px] text-[var(--dash-text)]/42">
              Last edited {relativeModified}
            </p>
          </div>

          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen((value) => !value);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--dash-text)]/34 hover:bg-white/[0.05] hover:text-[var(--dash-text)]"
            >
              <MoreHorizontal size={17} />
            </button>

            {open && (
              <div className="absolute right-0 top-12 z-20 w-44 rounded-3xl bg-[var(--dash-shell)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.44)]">
                <button
                  type="button"
                  onClick={() => {
                    onOpen(project);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm text-[var(--dash-text)]/62 hover:bg-white/[0.05] hover:text-[var(--dash-text)]"
                >
                  <ExternalLink size={14} />
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRename(project);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm text-[var(--dash-text)]/62 hover:bg-white/[0.05] hover:text-[var(--dash-text)]"
                >
                  <Pencil size={14} />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDuplicate(project);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm text-[var(--dash-text)]/62 hover:bg-white/[0.05] hover:text-[var(--dash-text)]"
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(project);
                    setOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm text-red-300/75 hover:bg-red-400/[0.08] hover:text-red-300"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[var(--dash-text)]/42">
          <span>{project?.rooms_count ?? 0} rooms</span>
          <span className="h-1 w-1 rounded-full bg-[var(--dash-text)]/18" />
          <span>{cost ?? "Estimate pending"}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--dash-text)]/18" />
          <span>{relativeModified}</span>
        </div>

        <button
          type="button"
          onClick={() => onOpen(project)}
          className={`${buttonClass} mt-auto bg-[var(--dash-action)]/10 text-[var(--dash-action)] hover:bg-[var(--dash-action)]/16`}
        >
          Open Editor
          <ExternalLink size={14} />
        </button>
      </div>
    </article>
  );
};

const ProjectGrid = ({
  projects,
  loading,
  onOpen,
  onDuplicate,
  onDelete,
  onRename,
  className = "xl:grid-cols-4",
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[360px] animate-pulse rounded-[28px] bg-[var(--dash-shell)]"
          />
        ))}
      </div>
    );
  }

  if (!projects.length) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No projects yet"
        copy="Create a project and it will appear here from the backend project list."
      />
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${className}`}>
      {projects.map((project) => (
        <ProjectCard
          key={getProjectId(project)}
          project={project}
          onOpen={onOpen}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, copy, action }) => (
  <div className={`${cardClass} flex min-h-[320px] flex-col items-center justify-center text-center`}>
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--dash-action)]/10 text-[var(--dash-action)]">
      <Icon size={26} strokeWidth={1.6} />
    </div>
    <h2 className="text-[22px] font-medium text-[var(--dash-text)]">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-[var(--dash-text)]/50">{copy}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);

const ActivityList = ({ activities, loading, onOpenProject }) => (
  <div className={cardClass}>
    <div className="mb-5 flex items-center justify-between">
      <p className="text-[24px] font-medium text-[var(--dash-text)]">Recent Activity</p>
      <Clock size={16} className="text-[var(--dash-text)]/28" />
    </div>

    {loading ? (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    ) : activities?.length ? (
      <div className="space-y-1">
        {activities.slice(0, 6).map((activity, index) => (
          <button
            key={activity.id ?? index}
            type="button"
            onClick={() => activity.id && onOpenProject?.({ id: activity.id })}
            className="flex w-full items-center gap-4 rounded-2xl p-3 text-left hover:bg-white/[0.03]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] text-xs font-semibold text-[var(--dash-action)]">
              {(activity.action ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] text-[var(--dash-text)]/72">
                {activity.action ?? "Updated"}{" "}
                <span className="text-[var(--dash-action)]">
                  {activity.target ?? activity.project_name ?? "project"}
                </span>
              </p>
              <p className="mt-1 text-[13px] text-[var(--dash-text)]/36">
                {formatRelative(activity.timestamp)}
              </p>
            </div>
          </button>
        ))}
      </div>
    ) : (
      <p className="py-8 text-center text-sm text-[var(--dash-text)]/40">
        No recent activity from the backend yet.
      </p>
    )}
  </div>
);

const MobileBottomNav = ({ activeTab, setActiveTab, onCreateNew }) => (
  <>
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-[#0b0a09]/92 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-6 gap-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[10px] transition-colors ${
                active
                  ? "bg-[var(--dash-action)]/10 text-[var(--dash-action)]"
                  : "text-[var(--dash-text)]/36 hover:bg-white/[0.04] hover:text-[var(--dash-text)]/66"
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>

    <button
      type="button"
      onClick={onCreateNew}
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-[var(--dash-action)] px-5 text-sm font-medium text-[var(--dash-bg)] shadow-[0_18px_42px_rgba(0,0,0,0.34)] lg:hidden"
    >
      <Plus size={17} strokeWidth={2.4} />
      New
    </button>
  </>
);

const ArrowIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
  </svg>
);

const AntDashboardButton = ({
  variant = "quiet",
  style,
  children,
  disabled,
  icon,
  ...props
}) => {
  if (variant === "primary") {
    return (
      <button
        type="button"
        className="lm-animated-button"
        style={style}
        disabled={disabled}
        {...props}
      >
        <ArrowIcon className="arr-2" />
        <span className="text">{children}</span>
        <span className="circle" />
        <ArrowIcon className="arr-1" />
      </button>
    );
  }

  return (
    <Button
      style={{
        ...quietButtonStyle,
        ...style,
      }}
      disabled={disabled}
      icon={icon}
      {...props}
    >
      {children}
    </Button>
  );
};

const AntSectionHeading = ({ eyebrow, title, copy, action }) => (
  <Flex align="flex-end" justify="space-between" gap={24} wrap="wrap">
    <Space direction="vertical" size={8}>
      <Text
        style={{
          color: palette.accent,
          fontSize: 11,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </Text>
      <Title level={2} style={{ margin: 0, color: palette.text, fontSize: 32 }}>
        {title}
      </Title>
      {copy && (
        <Paragraph
          style={{
            margin: 0,
            maxWidth: 640,
            color: palette.muted,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {copy}
        </Paragraph>
      )}
    </Space>
    {action}
  </Flex>
);

const AntSectionHeader = ({ eyebrow, title, action }) => (
  <Flex align="end" justify="space-between" gap={16} wrap="wrap">
    <Space direction="vertical" size={6}>
      <Text
        style={{
          color: palette.accent,
          fontSize: 11,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </Text>
      <Title level={3} style={{ margin: 0, color: palette.text, fontSize: 24 }}>
        {title}
      </Title>
    </Space>
    {action}
  </Flex>
);

const AntSidebar = ({ activeTab, setActiveTab, onCreateNew, collapsed }) => {
  if (collapsed) return null;

  return (
    <Sider width={72} style={antdStyles.sider}>
      <Flex vertical align="center" justify="space-between" style={{ height: "100%" }}>
        <Space direction="vertical" size={24} align="center">
          <img src={lmIcon} alt="Lumiere" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <Space direction="vertical" size={8} align="center">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <Button
                  key={id}
                  type="text"
                  aria-label={label}
                  onClick={() => setActiveTab(id)}
                  icon={<Icon size={19} strokeWidth={1.8} />}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    color: active ? palette.accent : "rgba(234,216,195,0.42)",
                    background: active ? palette.accentSoft : "transparent",
                  }}
                />
              );
            })}
          </Space>
        </Space>
        <Button
          type="text"
          aria-label="New project"
          onClick={onCreateNew}
          icon={<Plus size={18} />}
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            color: palette.accent,
            background: palette.accentSoft,
          }}
        />
      </Flex>
    </Sider>
  );
};

const AntTopbar = ({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  onCreateNew,
  onSearch,
  compact,
  notifications,
  unreadCount,
  onNotificationSelect,
  onMarkAllNotificationsRead,
}) => {
  const accountItems = [
    { key: "settings", label: "Workspace settings", icon: <Settings size={15} /> },
    { type: "divider" },
    { key: "logout", label: "Log out", icon: <LogOut size={15} />, danger: true },
  ];

  const mobileItems = navItems.map(({ id, label }) => ({ key: id, label }));
  const hasNotifications = notifications.length > 0;

  return (
    <>
      <Header style={{ ...antdStyles.header, padding: compact ? "0 16px" : "0 32px" }}>
        <Flex align="center" justify="space-between" gap={16} style={{ height: "100%" }}>
          <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
            {compact && (
              <Dropdown
                menu={{
                  items: mobileItems,
                  selectedKeys: [activeTab],
                  onClick: ({ key }) => setActiveTab(key),
                }}
                trigger={["click"]}
              >
                <Button
                  type="text"
                  icon={<Grid2X2 size={18} />}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 18,
                    color: palette.text,
                    background: "rgba(255,255,255,0.04)",
                  }}
                />
              </Dropdown>
            )}
            <Input
              allowClear
              prefix={<Search size={17} color="rgba(234,216,195,0.38)" />}
              placeholder="Search projects"
              onChange={(event) => onSearch?.(event.target.value)}
              style={{
                maxWidth: compact ? "100%" : 700,
                height: 48,
                border: 0,
                borderRadius: 24,
                color: palette.text,
                background: "rgba(255,255,255,0.045)",
                boxShadow: "inset 0 1px 0 rgba(234,216,195,0.035)",
              }}
            />
          </Flex>
          <Space size={12}>
            {!compact && (
              <AntDashboardButton variant="primary" onClick={onCreateNew}>
                New Project
              </AntDashboardButton>
            )}
            <Dropdown
              trigger={["click"]}
              dropdownRender={() => (
                <div
                  style={{
                    width: compact ? 320 : 360,
                    maxWidth: "calc(100vw - 24px)",
                    padding: 10,
                    borderRadius: 24,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(14,11,10,0.96)",
                    boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ padding: "6px 8px 10px" }}>
                    <div>
                      <Text style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>
                        Notifications
                      </Text>
                      <br />
                      <Text style={{ color: palette.muted, fontSize: 12 }}>
                        {unreadCount > 0
                          ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                          : "All caught up"}
                      </Text>
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        type="text"
                        size="small"
                        onClick={onMarkAllNotificationsRead}
                        style={{ color: palette.accent }}
                      >
                        Mark all read
                      </Button>
                    )}
                  </Flex>

                  {hasNotifications ? (
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => onNotificationSelect?.(notification)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            textAlign: "left",
                            border: 0,
                            borderRadius: 18,
                            cursor: "pointer",
                            background: notification.read
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(201,154,98,0.12)",
                            boxShadow: notification.read
                              ? "inset 0 1px 0 rgba(255,255,255,0.03)"
                              : "inset 0 1px 0 rgba(255,255,255,0.05)",
                          }}
                        >
                          <Flex align="start" gap={12}>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                marginTop: 6,
                                borderRadius: 999,
                                background: notification.read ? "rgba(255,255,255,0.18)" : palette.accent,
                                flex: "0 0 auto",
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Flex align="center" justify="space-between" gap={12}>
                                <Text
                                  style={{
                                    color: palette.text,
                                    fontSize: 14,
                                    fontWeight: notification.read ? 500 : 600,
                                  }}
                                >
                                  {notification.title}
                                </Text>
                                <Text style={{ color: palette.muted, fontSize: 11, whiteSpace: "nowrap" }}>
                                  {notification.timestamp ? formatRelative(notification.timestamp) : "Now"}
                                </Text>
                              </Flex>
                              <Text style={{ color: "rgba(234,216,195,0.62)", fontSize: 12, display: "block", marginTop: 4 }}>
                                {notification.body}
                              </Text>
                              {notification.ctaLabel && (
                                <Text style={{ color: palette.accent, fontSize: 12, display: "block", marginTop: 8 }}>
                                  {notification.ctaLabel}
                                </Text>
                              )}
                            </div>
                          </Flex>
                        </button>
                      ))}
                    </Space>
                  ) : (
                    <div
                      style={{
                        padding: "18px 14px",
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Text style={{ color: palette.muted }}>No notifications yet.</Text>
                    </div>
                  )}
                </div>
              )}
            >
              <Button
                type="text"
                aria-label="Notifications"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  color: unreadCount > 0 ? palette.accent : "rgba(234,216,195,0.5)",
                  background: unreadCount > 0 ? "rgba(201,154,98,0.08)" : "rgba(255,255,255,0.035)",
                }}
              >
                <div style={{ position: "relative", width: 18, height: 18 }}>
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -7,
                        minWidth: 16,
                        height: 16,
                        paddingInline: unreadCount > 9 ? 3 : 0,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: palette.accent,
                        color: "#120f0d",
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              </Button>
            </Dropdown>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: accountItems,
                onClick: ({ key }) => {
                  if (key === "logout") onLogout?.();
                  if (key === "settings") setActiveTab("settings");
                },
              }}
            >
              <Button
                type="text"
                style={{
                  height: 48,
                  borderRadius: 24,
                  paddingInline: 12,
                  color: palette.text,
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                <Space size={10}>
                  <Avatar
                    size={30}
                    icon={<UserCircle size={20} />}
                    style={{ color: palette.accent, background: palette.accentSoft }}
                  />
                  {!compact && <Text style={{ color: palette.text }}>{user?.name ?? "loco"}</Text>}
                  <ChevronDown size={14} color="rgba(234,216,195,0.45)" />
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Flex>
      </Header>
    </>
  );
};

const AntOverviewHero = ({
  user,
  lastProject,
  stats,
  storage,
  onCreateNew,
  onOpenLastProject,
}) => {
  const storageLimit = Number(
    storage?.total_mb ?? storage?.totalMb ?? storage?.limit_mb ?? storage?.limitMb ?? 20
  );
  const storageUsed = Number(storage?.used_mb ?? storage?.usedMb ?? 0);
  const storagePercent = storageLimit > 0 ? Math.min(100, (storageUsed / storageLimit) * 100) : 0;
  const activeProjects = Number(stats?.active_projects ?? stats?.active ?? stats?.projects ?? 0);

  return (
    <Card className="lm-hover-card" style={antdStyles.hero} styles={{ body: antdStyles.heroBody }}>
      <Row gutter={[32, 32]} align="middle">
        <Col xs={24} xl={15}>
          <Space direction="vertical" size={18} style={{ maxWidth: 780 }}>
            <Text
              style={{
                color: palette.accent,
                fontSize: 11,
                letterSpacing: 5,
                textTransform: "uppercase",
              }}
            >
              Lumiere Workspace
            </Text>
            <Title
              style={{
                margin: 0,
                color: palette.text,
                fontSize: "clamp(42px, 5vw, 64px)",
                lineHeight: 0.95,
                fontWeight: 650,
              }}
            >
              Good morning, {user?.name ?? "loco"}.
            </Title>
            <Paragraph
              style={{
                margin: 0,
                maxWidth: 660,
                color: palette.muted,
                fontSize: 16,
                lineHeight: 1.75,
              }}
            >
              Continue the studio work in {lastProject?.name ?? "your latest room"}, or begin a fresh concept with a cleaner canvas.
            </Paragraph>
            <Space size={12} wrap style={{ paddingTop: 14 }}>
              <AntDashboardButton variant="primary" onClick={onCreateNew}>
                New Project
              </AntDashboardButton>
              <AntDashboardButton
                variant="primary"
                onClick={onOpenLastProject}
                disabled={!lastProject}
              >
                Continue Work
              </AntDashboardButton>
            </Space>
          </Space>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            className="lm-hover-card"
            style={{
              ...antdStyles.panel,
              background: "rgba(10, 8, 7, 0.52)",
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <Flex align="center" gap={14}>
                <Avatar
                  size={52}
                  icon={<UserCircle size={28} />}
                  style={{ color: palette.accent, background: palette.accentSoft }}
                />
                <Space direction="vertical" size={2}>
                  <Text style={{ color: palette.text, fontSize: 18, fontWeight: 650 }}>
                    {user?.name ?? "loco"}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(234,216,195,0.42)",
                      fontSize: 11,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    Workspace Profile
                  </Text>
                </Space>
              </Flex>

              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Flex justify="space-between" align="end">
                  <Text style={{ ...antdStyles.metaText, letterSpacing: 3, textTransform: "uppercase" }}>
                    Storage
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>
                    {formatStorage(storageLimit)}
                  </Text>
                </Flex>
                <Title level={2} style={{ margin: 0, color: palette.text, fontSize: 34 }}>
                  {formatStorage(storageUsed)}
                </Title>
                <Progress
                  percent={storagePercent}
                  showInfo={false}
                  strokeColor={palette.accent}
                  trailColor="rgba(255,255,255,0.05)"
                />
              </Space>

              <Row gutter={8}>
                {[
                  ["Projects", stats?.projects ?? 0],
                  ["Active", activeProjects],
                  ["Drafts", stats?.drafts ?? 0],
                ].map(([label, value]) => (
                  <Col span={8} key={label}>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.035)",
                      }}
                    >
                      <Text
                        style={{
                          color: "rgba(234,216,195,0.42)",
                          fontSize: 11,
                          letterSpacing: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </Text>
                      <Title level={4} style={{ margin: "8px 0 0", color: palette.text }}>
                        {value}
                      </Title>
                    </div>
                  </Col>
                ))}
              </Row>
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                Studio health is active with live project data.
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

const AntStatsStrip = ({ stats, projectAssets, projectRenders }) => {
  const metrics = [
    { label: "Projects", value: stats?.projects ?? 0, subtext: `${stats?.rooms ?? 0} rooms`, icon: FolderOpen },
    { label: "Assets", value: projectAssets.length, subtext: "synced library", icon: Boxes },
    { label: "Renders", value: projectRenders.length || stats?.renders || 0, subtext: "exports", icon: Camera },
    { label: "Drafts", value: stats?.drafts ?? 0, subtext: "in progress", icon: Pencil },
  ];

  return (
    <Card className="lm-hover-card" style={antdStyles.panel} styles={{ body: { padding: 0 } }}>
      <Row gutter={[0, 0]}>
        {metrics.map(({ label, value, subtext, icon: Icon }, index) => (
          <Col xs={12} lg={6} key={label}>
            <Flex
              align="center"
              gap={16}
              style={{
                minHeight: 108,
                padding: 24,
                borderLeft: index === 0 ? 0 : `1px solid ${palette.line}`,
              }}
            >
              <Avatar
                className="lm-card-accent-icon"
                size={42}
                icon={<Icon size={19} />}
                style={{ color: palette.accent, background: palette.accentSoft }}
              />
              <Space direction="vertical" size={2}>
                <Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text>
                <Title level={3} style={{ margin: 0, color: palette.text, fontSize: 26 }}>
                  {value}
                </Title>
                <Text style={antdStyles.metaText}>{subtext}</Text>
              </Space>
            </Flex>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

const AntQuickActions = ({ onAction }) => {
  const actions = [
    { id: "new-project", title: "New Project", copy: "Start fresh", icon: Plus },
    { id: "import-design", title: "Import Plan", copy: "Open planner", icon: Upload },
    { id: "create-room", title: "Empty Room", copy: "Jump into 3D", icon: Grid2X2 },
    { id: "ai-generate", title: "AI Assist", copy: "Draft ideas", icon: Wand2 },
  ];

  return (
    <Row gutter={[16, 16]}>
      {actions.map(({ id, title, copy, icon: Icon }) => (
        <Col xs={24} sm={12} xl={6} key={id}>
          <Card
            className="lm-hover-card"
            hoverable
            onClick={() => onAction(id)}
            style={{
              border: 0,
              borderRadius: 24,
              background: palette.surface,
              boxShadow: "inset 0 1px 0 rgba(234,216,195,0.03), 0 18px 50px rgba(0,0,0,0.14)",
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Flex align="center" gap={18}>
              <Avatar
                className="lm-card-accent-icon"
                size={48}
                icon={<Icon size={20} />}
                style={{ color: palette.accent, background: palette.accentSoft }}
              />
              <Space direction="vertical" size={3}>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: 650 }}>
                  {title}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 13 }}>{copy}</Text>
              </Space>
            </Flex>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

const AntProjectPreview = ({ project }) => {
  const scene = getScene(project);
  const walls = Array.isArray(scene.walls) ? scene.walls.slice(0, 5) : [];
  const points =
    walls.length > 1
      ? walls.map((wall, index) => {
          const angle = (index / walls.length) * Math.PI * 2;
          const radius = 34 + ((wall.length ?? 2.5) % 3) * 10;
          return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
        })
      : ["20,72", "42,30", "72,30", "82,66", "58,80", "28,72"];

  if (project?.thumbnail_url || project?.thumbnailUrl) {
    return (
      <img
        className="lm-project-preview"
        src={project.thumbnail_url ?? project.thumbnailUrl}
        alt={project.name}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      className="lm-project-preview"
      style={{
        height: "100%",
        minHeight: 240,
        background:
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px), radial-gradient(circle at 45% 35%, rgba(169,120,78,0.22), transparent 28%), #030303",
        backgroundSize: "18px 18px, 18px 18px, auto, auto",
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <polygon
          points={points.join(" ")}
          fill="rgba(169,120,78,0.18)"
          stroke="rgba(218,184,131,0.72)"
          strokeWidth="1.1"
        />
        {points.map((point, index) => {
          const [cx, cy] = point.split(",");
          return <circle key={index} cx={cx} cy={cy} r="1.6" fill="rgba(234,216,195,0.82)" />;
        })}
      </svg>
    </div>
  );
};

const AntProjectCard = ({ project, onOpen, onDuplicate, onDelete, onRename }) => {
  const rooms = getRoomCount(project);
  const cost = formatMoney(getProjectCost(project));
  const menuItems = [
    { key: "open", label: "Open project", icon: <ExternalLink size={15} /> },
    { key: "rename", label: "Rename", icon: <Pencil size={15} /> },
    { key: "duplicate", label: "Duplicate", icon: <Copy size={15} /> },
    { type: "divider" },
    { key: "delete", label: "Delete", icon: <Trash2 size={15} />, danger: true },
  ];

  return (
    <Card
      className="lm-hover-card"
      hoverable
      style={antdStyles.projectCard}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ position: "relative", aspectRatio: "16 / 10", overflow: "hidden" }}>
        <AntProjectPreview project={project} />
        <span
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            padding: "6px 12px",
            borderRadius: 999,
            color: palette.text,
            background: "rgba(0,0,0,0.54)",
            fontSize: 11,
            letterSpacing: 2.2,
            textTransform: "uppercase",
          }}
        >
          {project?.status ?? "Active"}
        </span>
      </div>
      <div style={{ padding: 24 }}>
        <Flex justify="space-between" align="start" gap={16}>
          <Space direction="vertical" size={7} style={{ minWidth: 0 }}>
            <Title level={4} ellipsis style={{ margin: 0, color: palette.text, fontSize: 20 }}>
              {project?.name ?? "Untitled Room"}
            </Title>
            <Text style={antdStyles.metaText}>Last edited {formatRelative(project?.updated_at)}</Text>
          </Space>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: menuItems,
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (key === "open") onOpen(project);
                if (key === "rename") onRename(project);
                if (key === "duplicate") onDuplicate(project);
                if (key === "delete") onDelete(project);
              },
            }}
          >
            <Button
              type="text"
              aria-label="Project actions"
              onClick={(event) => event.stopPropagation()}
              icon={<MoreHorizontal size={18} />}
              style={{ color: palette.muted, borderRadius: 16 }}
            />
          </Dropdown>
        </Flex>
        <Flex align="center" justify="space-between" gap={16} style={{ marginTop: 20 }}>
          <Space size={12} wrap>
            <Text style={antdStyles.metaText}>{rooms} rooms</Text>
            {cost && <Text style={antdStyles.metaText}>{cost}</Text>}
            <Text style={antdStyles.metaText}>{formatRelative(project?.updated_at)}</Text>
          </Space>
          <AntDashboardButton variant="primary" onClick={() => onOpen(project)}>
            Open
          </AntDashboardButton>
        </Flex>
      </div>
    </Card>
  );
};

const AntProjectGrid = ({ projects, loading, featured = false, ...handlers }) => {
  if (loading) {
    return (
      <Row gutter={[16, 16]}>
        {Array.from({ length: featured ? 2 : 4 }).map((_, index) => (
          <Col xs={24} xl={featured ? 12 : 8} key={index}>
            <Card loading style={antdStyles.projectCard} styles={{ body: { minHeight: 360 } }} />
          </Col>
        ))}
      </Row>
    );
  }

  if (!projects?.length) {
    return (
      <Card style={antdStyles.panel} styles={{ body: { padding: 48 } }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text style={{ color: palette.muted }}>No projects from the backend yet.</Text>}
        />
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {projects.map((project) => (
        <Col xs={24} xl={featured ? 12 : 8} key={getProjectId(project) ?? project?.name}>
          <AntProjectCard project={project} {...handlers} />
        </Col>
      ))}
    </Row>
  );
};

const AntActivityList = ({ activities, loading, onOpenProject }) => (
  <Card className="lm-hover-card" style={antdStyles.panel} styles={{ body: antdStyles.panelBody }}>
    <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
      <Title level={3} style={{ margin: 0, color: palette.text, fontSize: 22 }}>
        Recent Activity
      </Title>
      <Clock size={16} color="rgba(234,216,195,0.42)" />
    </Flex>
    {loading ? (
      <Card loading style={{ border: 0, background: "transparent" }} />
    ) : activities?.length ? (
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        {activities.slice(0, 6).map((activity, index) => (
          <Button
            key={activity.id ?? index}
            type="text"
            onClick={() => activity.id && onOpenProject?.({ id: activity.id })}
            style={{
              width: "100%",
              height: 64,
              justifyContent: "flex-start",
              borderRadius: 18,
              color: palette.text,
            }}
          >
            <Flex align="center" gap={14} style={{ width: "100%" }}>
              <Avatar
                size={40}
                style={{ color: palette.accent, background: palette.accentSoft }}
              >
                {(activity.action ?? "U").charAt(0).toUpperCase()}
              </Avatar>
              <Space direction="vertical" size={2} style={{ minWidth: 0 }}>
                <Text ellipsis style={{ color: "rgba(234,216,195,0.75)" }}>
                  {activity.action ?? "Updated"} {activity.target ?? activity.project_name ?? "project"}
                </Text>
                <Text style={antdStyles.metaText}>{formatRelative(activity.timestamp)}</Text>
              </Space>
            </Flex>
          </Button>
        ))}
      </Space>
    ) : (
      <Text style={{ color: palette.muted }}>No recent activity from the backend yet.</Text>
    )}
  </Card>
);

const AntMobileBottomNav = ({ activeTab, setActiveTab }) => (
  <Flex
    justify="space-around"
    style={{
      position: "fixed",
      left: 12,
      right: 12,
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
      zIndex: 40,
      padding: "10px 10px calc(env(safe-area-inset-bottom, 0px) + 10px)",
      background: "linear-gradient(180deg, rgba(15,12,11,0.94), rgba(8,7,6,0.96))",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 28,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 44px rgba(0,0,0,0.32)",
      backdropFilter: "blur(24px)",
    }}
    className="lg:hidden"
  >
    {navItems.map(({ id, label, icon: Icon }) => (
      <Button
        key={id}
        type="text"
        aria-label={label}
        onClick={() => setActiveTab(id)}
        icon={<Icon size={18} />}
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          color: activeTab === id ? palette.accent : "rgba(234,216,195,0.42)",
          background: activeTab === id ? palette.accentSoft : "transparent",
          boxShadow: activeTab === id ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "none",
        }}
      />
    ))}
  </Flex>
);

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const onboardingTour = useOnboardingTour();
  const {
    projects,
    lastProject,
    stats,
    activities,
    storage,
    loading,
    error,
    createProject,
    deleteProject,
    duplicateProject,
    renameProject,
    searchProjects,
  } = useDashboard();

  const [activeTab, setActiveTab] = useState("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [readNotifications, setReadNotifications] = useState({});
  const screens = AntGrid.useBreakpoint();
  const isMobile = !screens.lg;

  const projectAssets = useMemo(() => projects.flatMap(getProjectAssets), [projects]);
  const projectRenders = useMemo(() => projects.flatMap(getProjectRenders), [projects]);

  useEffect(() => {
    const stored = readStoredNotificationMap();
    setReadNotifications(stored[user?.email ?? user?.name ?? "guest"] ?? {});
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = user?.email ?? user?.name ?? "guest";
    const stored = readStoredNotificationMap();
    stored[key] = readNotifications;
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(stored));
  }, [readNotifications, user?.email, user?.name]);

  const notifications = useMemo(() => {
    const items = buildDashboardNotifications({ projects, activities, storage, lastProject });
    return items.map((item) => ({
      ...item,
      read: Boolean(readNotifications[item.id]),
    }));
  }, [activities, lastProject, projects, readNotifications, storage]);

  const unreadNotifications = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (location.state?.skipDashboardAutoRedirect) return;
    if (loading || projects.length > 0 || onboardingTour.isActive) return;
    if (onboardingTour.state.completed || onboardingTour.state.dismissed) return;
    onboardingTour.start();
    onboardingTour.setStep("create-room");
    navigate("/user/room-2d?tour=first-project");
    return undefined;
  }, [
    loading,
    location.state,
    navigate,
    onboardingTour,
    projects.length,
  ]);

  const openProject = (project) => {
    const projectId = getProjectId(project);
    if (projectId) navigate(`/user/room?projectId=${projectId}`);
  };

  const openCreateModal = () => {
    setCreateOpen(true);
    if (onboardingTour.isActive && onboardingTour.state.step === "new-project") {
      onboardingTour.setStep("project-details");
    }
  };

  const renameProjectFromCard = (project) => {
    setRenameTarget(project);
  };

  const runQuickAction = (id) => {
    if (id === "new-project") openCreateModal();
    if (id === "create-room") navigate("/user/room");
    if (id === "import-design") navigate("/user/room-2d");
    if (id === "ai-generate") navigate("/user/room");
  };

  const projectGridProps = {
    onOpen: openProject,
    onDuplicate: duplicateProject,
    onDelete: setDeleteTarget,
    onRename: renameProjectFromCard,
  };

  const handleTourCreateOpen = () => openCreateModal();

  const markNotificationRead = (id) => {
    if (!id) return;
    setReadNotifications((current) => (current[id] ? current : { ...current, [id]: true }));
  };

  const markAllNotificationsRead = () => {
    setReadNotifications((current) =>
      notifications.reduce((next, notification) => {
        next[notification.id] = true;
        return next;
      }, { ...current })
    );
  };

  const handleNotificationSelect = (notification) => {
    markNotificationRead(notification?.id);
    if (!notification?.action) return;

    if (notification.action.type === "open-project") {
      openProject(notification.action.project);
      return;
    }

    if (notification.action.type === "tab") {
      setActiveTab(notification.action.tab);
      return;
    }

    if (notification.action.type === "create-project") {
      openCreateModal();
    }
  };

  const handleCreateProject = async (payload) => {
    const createdProject = await createProject(payload);
    const projectId = getProjectId(createdProject);

    if (projectId) {
      if (onboardingTour.isActive && onboardingTour.state.step === "project-details") {
        onboardingTour.markProjectCreated(projectId);
      }

      navigate(`/user/room-2d?projectId=${projectId}`);
    }

    return createdProject;
  };

  const startFirstProjectTutorial = () => {
    setCreateOpen(false);
    onboardingTour.reset();
    onboardingTour.start();
    onboardingTour.setStep("create-room");
    navigate("/user/room-2d?tour=first-project");
  };

  const dashboardTourStep =
    onboardingTour.isActive && (onboardingTour.state.step === "welcome" || onboardingTour.state.step === "new-project" || onboardingTour.state.step === "project-details")
      ? onboardingTour.state.step === "welcome"
        ? {
            target: "body",
            placement: "center",
            disableBeacon: true,
            title: "Welcome to Lumiere",
            content:
              "We’ll guide your first setup from the dashboard into the editor, then help you place your first piece of furniture.",
          }
        : onboardingTour.state.step === "new-project"
          ? {
              target: '[data-tour="dashboard-new-project"]',
              placement: "bottom",
              disableBeacon: true,
              title: "Create your first project",
              content:
                "Start by opening the project creator. We’ll use this project as the base for your first room.",
            }
          : {
              target: '[data-tour="project-name-input"]',
              placement: "right",
              disableBeacon: true,
              title: "Name your project",
              content:
                "Give the project a clear name, then click Create Project. As soon as it’s saved, we’ll bring you into the room editor.",
            }
      : null;

  const overviewContent = (
    <div className="space-y-8">
      <OverviewHero
        user={user}
        lastProject={lastProject}
        stats={{ ...stats, projects: stats?.projects ?? projects.length }}
        storage={storage}
        projects={projects}
        onCreateNew={() => setCreateOpen(true)}
        onOpenLastProject={() => lastProject && openProject(lastProject)}
      />

      {error && (
        <div className="flex items-center gap-4 rounded-3xl border border-red-400/15 bg-red-400/[0.06] p-4 text-sm text-red-200/80">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <StatsStrip
        stats={{ ...stats, projects: stats?.projects ?? projects.length }}
        projectAssets={projectAssets}
        projectRenders={projectRenders}
      />

      <QuickActions onAction={runQuickAction} />

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Projects"
          title="Featured Recent Work"
          action={
            <button
              type="button"
              onClick={() => setActiveTab("projects")}
              className="text-sm font-medium text-[var(--dash-action)] hover:text-[var(--dash-text)]"
            >
              View all
            </button>
          }
        />
        <ProjectGrid
          projects={projects.slice(0, 2)}
          loading={loading}
          className="xl:grid-cols-2"
          {...projectGridProps}
        />
      </section>

      <ActivityList
        activities={activities}
        loading={loading}
        onOpenProject={openProject}
      />
    </div>
  );

  const content = {
    overview: overviewContent,
    projects: (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Project Hub"
          title="All Projects"
          copy="Every project shown here is loaded through the dashboard backend hook."
          action={
            <PrimaryButton onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              New Project
            </PrimaryButton>
          }
        />
        <ProjectGrid projects={projects} loading={loading} {...projectGridProps} />
      </div>
    ),
    renders: (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Renders"
          title="Renders Gallery"
          copy="Project thumbnails and exported render records discovered from backend project data."
        />
        {projectRenders.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {projectRenders.map((render) => (
              <div
                key={render.id}
                className="overflow-hidden rounded-[28px] bg-[var(--dash-shell)] shadow-[0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl"
              >
                <div className="aspect-video bg-black/25">
                  {render.url ? (
                    <img
                      src={render.url}
                      alt={render.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Camera className="text-[var(--dash-muted)]/55" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="truncate text-[15px] font-medium text-[var(--dash-text)]">
                    {render.name}
                  </p>
                  <p className="mt-2 text-[13px] text-[var(--dash-text)]/45">
                    {render.projectName} · {formatDate(render.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Camera}
            title="No renders found"
            copy="When projects include thumbnails, screenshots, or export records from the backend, they will appear here."
          />
        )}
      </div>
    ),
    settings: (
      <WorkspaceSettingsShell onClose={() => setActiveTab("overview")} />
    ),
  };

  const antdOverviewContent = (
    <Space direction="vertical" size={32} style={{ width: "100%" }}>
      <AntOverviewHero
        user={user}
        lastProject={lastProject}
        stats={{ ...stats, projects: stats?.projects ?? projects.length }}
        storage={storage}
        onCreateNew={() => setCreateOpen(true)}
        onOpenLastProject={() => lastProject && openProject(lastProject)}
      />

      {error && (
        <Alert
          type="error"
          showIcon
          icon={<AlertCircle size={17} />}
          message={error}
          style={{
            border: 0,
            borderRadius: 18,
            color: "#ffd7d7",
            background: "rgba(255, 82, 82, 0.08)",
          }}
        />
      )}

      <AntStatsStrip
        stats={{ ...stats, projects: stats?.projects ?? projects.length }}
        projectAssets={projectAssets}
        projectRenders={projectRenders}
      />

      <AntQuickActions onAction={runQuickAction} />

      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <AntSectionHeader
          eyebrow="Projects"
          title="Featured Recent Work"
          action={
            <Button
              type="text"
              onClick={() => setActiveTab("projects")}
              style={{ color: palette.accent, fontWeight: 650 }}
            >
              View all
            </Button>
          }
        />
        <AntProjectGrid
          projects={projects.slice(0, 2)}
          loading={loading}
          featured
          {...projectGridProps}
        />
      </Space>

      <AntActivityList activities={activities} loading={loading} onOpenProject={openProject} />
    </Space>
  );

  const antdContent = {
    overview: antdOverviewContent,
    projects: (
      <Space direction="vertical" size={32} style={{ width: "100%" }}>
        <AntSectionHeading
          eyebrow="Project Hub"
          title="All Projects"
          copy="Every project shown here is loaded through the dashboard backend hook."
          action={
            <AntDashboardButton
              variant="primary"
              onClick={() => setCreateOpen(true)}
            >
              New Project
            </AntDashboardButton>
          }
        />
        <AntProjectGrid projects={projects} loading={loading} {...projectGridProps} />
      </Space>
    ),
    renders: (
      <Space direction="vertical" size={32} style={{ width: "100%" }}>
        <AntSectionHeading
          eyebrow="Renders"
          title="Renders Gallery"
          copy="Project thumbnails and exported render records discovered from backend project data."
        />
        {projectRenders.length ? (
          <Row gutter={[16, 16]}>
            {projectRenders.map((render) => (
              <Col xs={24} md={12} xl={8} key={render.id}>
                <Card className="lm-hover-card" style={antdStyles.projectCard} styles={{ body: { padding: 0 } }}>
                  <div style={{ aspectRatio: "16 / 10", background: "#030303" }}>
                    {render.url ? (
                      <img className="lm-card-visual" src={render.url} alt={render.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Flex align="center" justify="center" style={{ height: "100%" }}>
                        <Camera color="rgba(234,216,195,0.45)" />
                      </Flex>
                    )}
                  </div>
                  <div style={{ padding: 24 }}>
                    <Title level={5} ellipsis style={{ margin: 0, color: palette.text }}>
                      {render.name}
                    </Title>
                    <Text style={antdStyles.metaText}>
                      {render.projectName} - {formatDate(render.created_at)}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Card style={antdStyles.panel} styles={{ body: { padding: 48 } }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<Text style={{ color: palette.muted }}>No renders found yet.</Text>}
            />
          </Card>
        )}
      </Space>
    ),
    tutorials: (
      <Space direction="vertical" size={32} style={{ width: "100%" }}>
        <AntSectionHeading
          eyebrow="Tutorials"
          title="Guided Experiences"
          copy="Replay hands-on walkthroughs anytime. These are available even if you already have projects."
        />
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14} xl={10}>
            <Card
              className="lm-hover-card"
              style={{
                ...antdStyles.panel,
                overflow: "hidden",
                background:
                  "radial-gradient(circle at top right, rgba(196,154,108,0.22), transparent 32%), linear-gradient(135deg, rgba(36,28,24,0.98), rgba(20,16,14,0.98))",
              }}
              styles={{ body: { ...antdStyles.panelBody, padding: 28 } }}
            >
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(196,154,108,0.14)",
                    border: "1px solid rgba(196,154,108,0.18)",
                  }}
                >
                  <Wand2 size={24} color={palette.accent} />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0, color: palette.text }}>
                    First Project Onboarding
                  </Title>
                  <Paragraph style={{ margin: "10px 0 0", color: "rgba(234,216,195,0.68)" }}>
                    Walk through the full beginner flow: welcome, create a project,
                    sketch your first room, switch to 3D, and add furniture.
                  </Paragraph>
                </div>
                <Space size={12} wrap>
                  <Button
                    type="primary"
                    onClick={startFirstProjectTutorial}
                    style={{
                      ...primaryButtonStyle,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Wand2 size={16} />
                    Start tutorial
                  </Button>
                  <Button
                    onClick={() => setActiveTab("overview")}
                    style={{
                      ...quietButtonStyle,
                      border: 0,
                    }}
                  >
                    Back to dashboard
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    ),
    settings: (
      <WorkspaceSettingsShell onClose={() => setActiveTab("overview")} />
    ),
  };

  return (
    <Layout style={antdStyles.root}>
      <OnboardingJoyride
        step={dashboardTourStep}
        onSkip={onboardingTour.dismiss}
        primaryLabel="Open creator"
        onPrimaryAction={handleTourCreateOpen}
        showPrimary={onboardingTour.state.step !== "project-details"}
      />
      <style>{animatedButtonCss}</style>

      <AntSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCreateNew={openCreateModal}
        collapsed={isMobile}
      />

      <Layout
        style={{
          minWidth: 0,
          height: "100%",
          minHeight: 0,
          background: "transparent",
        }}
      >
        <AntTopbar
          user={user}
          onLogout={onLogout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onCreateNew={openCreateModal}
          onSearch={searchProjects}
          compact={isMobile}
          notifications={notifications}
          unreadCount={unreadNotifications}
          onNotificationSelect={handleNotificationSelect}
          onMarkAllNotificationsRead={markAllNotificationsRead}
        />

        <Content
          style={{
            ...antdStyles.content,
            paddingTop: isMobile ? 16 : 32,
            paddingRight: isMobile ? 16 : 32,
            paddingBottom: 128,
            paddingLeft: isMobile ? 16 : 32,
          }}
        >
          <div style={antdStyles.shell}>
            {loading && activeTab !== "overview" ? (
              <Flex
                align="center"
                justify="center"
                gap={10}
                style={{ minHeight: 360, color: "rgba(234,216,195,0.45)" }}
              >
                <Loader2 size={18} className="animate-spin" />
                Loading dashboard data
              </Flex>
            ) : (
              antdContent[activeTab] ?? antdContent.overview
            )}
          </div>
        </Content>
      </Layout>

      {isMobile && (
        <AntMobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onCreateNew={() => setCreateOpen(true)}
        />
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateProject}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteProject}
        project={deleteTarget}
      />

      <RenameProjectModal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        onConfirm={renameProject}
        project={renameTarget}
      />
    </Layout>
  );
};

export default Dashboard;
