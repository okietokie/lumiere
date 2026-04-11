import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Layers,
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
  Wallet,
  Wand2,
} from "lucide-react";
import useDashboard from "../../../hooks/useDashboard";
import lmIcon from "../../../assets/lm no-bg.png";
import CreateProjectModal from "../modals/CreateProjectModal";
import ConfirmDeleteModal from "../modals/ConfirmDeleteModal";

const navItems = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "assets", label: "Assets", icon: Boxes },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "renders", label: "Renders", icon: ImageIcon },
  { id: "settings", label: "Settings", icon: Settings },
];

const formatDate = (value) => {
  if (!value) return "Not edited yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not edited yet";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
      name: modelAssets[key.replace("_url", "_filename")] ?? key.replace("_url", "").toUpperCase(),
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

const SectionHeading = ({ eyebrow, title, copy, action }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{eyebrow}</p>}
      <h1 className="font-serif text-3xl leading-none text-white sm:text-4xl">{title}</h1>
      {copy && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">{copy}</p>}
    </div>
    {action}
  </div>
);

const EmptyState = ({ icon: Icon, title, copy, action }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-[#14110f] px-6 py-14 text-center shadow-2xl shadow-black/20">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[#c49a6c]/15 bg-[#c49a6c]/[0.06] text-[#c49a6c]/70">
      <Icon size={26} strokeWidth={1.6} />
    </div>
    <h2 className="font-serif text-2xl text-white">{title}</h2>
    <p className="mt-3 max-w-md text-sm leading-6 text-white/40">{copy}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);

const Sidebar = ({ activeTab, setActiveTab, onCreateNew }) => (
  <aside className="hidden h-screen w-[78px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0d0c0b] px-3 py-5 lg:flex 2xl:w-[248px] 2xl:px-4">
    <div className="flex h-14 items-center justify-center gap-3 2xl:justify-start 2xl:px-2">
      <img src={lmIcon} alt="Lumiere" className="h-9 w-9 object-contain drop-shadow-[0_0_14px_rgba(196,154,108,0.28)]" />
      <div className="hidden leading-tight 2xl:block">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white">Lumiere</p>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#c49a6c]/60">Maison</p>
      </div>
    </div>

    <nav className="mt-8 flex flex-1 flex-col gap-2">
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex h-11 items-center justify-center gap-3 rounded-lg border px-3 text-left transition-colors 2xl:justify-start ${
              active
                ? "border-[#c49a6c]/25 bg-[#c49a6c]/10 text-[#d7ae80]"
                : "border-transparent text-white/35 hover:bg-white/[0.04] hover:text-white/70"
            }`}
          >
            <Icon size={18} strokeWidth={1.7} />
            <span className="hidden text-[13px] font-medium tracking-wide 2xl:block">{label}</span>
          </button>
        );
      })}
    </nav>

    <button
      type="button"
      onClick={onCreateNew}
      className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c49a6c] px-3 text-[13px] font-bold text-[#0d0c0b] transition-colors hover:bg-[#d8b184]"
    >
      <Plus size={16} strokeWidth={2.4} />
      <span className="hidden 2xl:inline">New Project</span>
    </button>
  </aside>
);

const Topbar = ({ user, onLogout, activeTab, setActiveTab, onCreateNew, onSearch }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#11100f]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1480px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <img src={lmIcon} alt="Lumiere" className="h-9 w-9 object-contain" />
          <div className="leading-tight">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white">Lumiere</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#c49a6c]/60">Maison</p>
          </div>
        </div>

        <form
          className="hidden h-10 w-full max-w-[430px] items-center rounded-lg border border-white/[0.07] bg-[#181513] px-3 focus-within:border-[#c49a6c]/35 sm:flex"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch?.(query);
          }}
        >
          <Search size={16} className="shrink-0 text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="ml-3 w-full bg-transparent text-sm text-white/80 outline-none placeholder:text-white/25"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateNew}
            className="hidden h-10 items-center gap-2 rounded-lg bg-[#c49a6c] px-4 text-[13px] font-bold text-[#11100f] transition-colors hover:bg-[#d8b184] sm:flex"
          >
            <Plus size={16} strokeWidth={2.4} />
            New Project
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/45 hover:text-white/75">
            <Bell size={17} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex h-10 items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.03] pl-2 pr-3 text-white/70 hover:text-white"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#c49a6c]/10 text-[#c49a6c]">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name ?? "User"} className="h-full w-full rounded-md object-cover" />
                ) : (
                  <UserCircle size={18} />
                )}
              </div>
              <span className="hidden max-w-[140px] truncate text-sm md:block">{user?.name ?? "Designer"}</span>
              <ChevronDown size={14} className="text-white/35" />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/[0.08] bg-[#171411] p-1.5 shadow-2xl shadow-black/60">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("settings");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"
                >
                  <Settings size={14} /> Settings
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300/75 hover:bg-red-400/[0.08] hover:text-red-300"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
        {navItems.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold ${
              activeTab === id
                ? "border-[#c49a6c]/25 bg-[#c49a6c]/10 text-[#d7ae80]"
                : "border-white/[0.06] text-white/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
};

const MetricCard = ({ label, value, detail, icon: Icon, tone = "neutral" }) => {
  const accent = tone === "accent";
  return (
    <div className={`min-h-[138px] rounded-xl border p-5 shadow-xl shadow-black/20 ${accent ? "border-[#c49a6c]/20 bg-[#c49a6c]/[0.08]" : "border-white/[0.06] bg-[#15120f]"}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">{label}</p>
        <div className={`rounded-lg p-2 ${accent ? "bg-[#c49a6c]/10 text-[#d8b184]" : "bg-white/[0.04] text-white/40"}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-5 font-serif text-4xl leading-none text-white">{value}</p>
      <p className="mt-3 text-sm leading-5 text-white/38">{detail}</p>
    </div>
  );
};

const QuickActions = ({ onAction }) => {
  const actions = [
    { id: "new-project", label: "New Project", copy: "Start a workspace", icon: Plus, accent: true },
    { id: "import-design", label: "Import Design", copy: "Open the 2D planner", icon: Upload },
    { id: "create-room", label: "Empty Room", copy: "Jump into 3D", icon: Grid2X2 },
    { id: "ai-generate", label: "AI Design", copy: "Draft with guidance", icon: Wand2 },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map(({ id, label, copy, icon: Icon, accent }) => (
        <button
          key={id}
          type="button"
          onClick={() => onAction(id)}
          className={`group min-h-[118px] rounded-xl border p-4 text-left transition-colors ${
            accent
              ? "border-[#c49a6c]/25 bg-[#c49a6c]/[0.08] hover:bg-[#c49a6c]/[0.12]"
              : "border-white/[0.06] bg-[#15120f] hover:border-white/[0.12] hover:bg-[#191511]"
          }`}
        >
          <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-[#c49a6c]/10 text-[#d8b184]" : "bg-white/[0.04] text-white/45 group-hover:text-white/70"}`}>
            <Icon size={18} />
          </div>
          <p className={accent ? "text-sm font-semibold text-[#d8b184]" : "text-sm font-semibold text-white/75"}>{label}</p>
          <p className="mt-1 text-xs text-white/32">{copy}</p>
        </button>
      ))}
    </div>
  );
};

const ProjectPreview = ({ project }) => {
  const patternId = `grid-${String(getProjectId(project) ?? project?.name ?? "empty").replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b border-white/[0.05] bg-[#0f0d0b]">
      {project?.thumbnail ? (
        <img src={project.thumbnail} alt={project.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      ) : (
        <div className="absolute inset-0">
          <svg className="h-full w-full" viewBox="0 0 360 270" fill="none">
            <defs>
              <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" stroke="rgba(196,154,108,0.08)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="360" height="270" fill={`url(#${patternId})`} />
            <rect x="48" y="42" width="132" height="88" stroke="rgba(196,154,108,0.28)" fill="rgba(196,154,108,0.05)" />
            <rect x="188" y="42" width="112" height="54" stroke="rgba(196,154,108,0.18)" fill="rgba(255,255,255,0.02)" />
            <rect x="48" y="140" width="88" height="76" stroke="rgba(196,154,108,0.18)" fill="rgba(255,255,255,0.02)" />
            <rect x="146" y="140" width="154" height="76" stroke="rgba(196,154,108,0.2)" fill="rgba(196,154,108,0.04)" />
            <path d="M180 42Q180 66 156 66" stroke="rgba(196,154,108,0.35)" />
          </svg>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent" />
      <div className="absolute left-3 top-3 rounded-full border border-white/[0.08] bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65 backdrop-blur">
        {(project?.rooms_count ?? 0) > 0 ? "Active" : "Draft"}
      </div>
    </div>
  );
};

const ProjectCard = ({ project, onOpen, onDuplicate, onDelete, onRename }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const cost = formatMoney(getProjectCost(project));

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#15120f] shadow-2xl shadow-black/20 transition-colors hover:border-[#c49a6c]/25">
      <button type="button" onClick={() => onOpen(project)} className="block text-left">
        <ProjectPreview project={project} />
      </button>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white/88">{project?.name ?? "Untitled Project"}</h3>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/30">{formatRelative(project?.last_modified)}</p>
          </div>
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen((value) => !value);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 hover:bg-white/[0.05] hover:text-white"
            >
              <MoreHorizontal size={17} />
            </button>
            {open && (
              <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-white/[0.08] bg-[#171411] p-1.5 shadow-2xl shadow-black/60">
                <button type="button" onClick={() => { onOpen(project); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white">
                  <ExternalLink size={14} /> Open
                </button>
                <button type="button" onClick={() => { onRename(project); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white">
                  <Pencil size={14} /> Rename
                </button>
                <button type="button" onClick={() => { onDuplicate(project); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white">
                  <Copy size={14} /> Duplicate
                </button>
                <button type="button" onClick={() => { onDelete(project); setOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300/75 hover:bg-red-400/[0.08] hover:text-red-300">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-white/[0.05] bg-black/[0.12] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Rooms</p>
            <p className="mt-1 font-serif text-xl text-white">{project?.rooms_count ?? 0}</p>
          </div>
          <div className="rounded-lg border border-white/[0.05] bg-black/[0.12] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Estimate</p>
            <p className="mt-1 truncate font-serif text-xl text-[#c49a6c]">{cost ?? "Pending"}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(project)}
          className="mt-auto flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c49a6c]/20 bg-[#c49a6c]/[0.07] text-sm font-semibold text-[#d8b184] hover:bg-[#c49a6c]/[0.12]"
        >
          Open Editor <ExternalLink size={14} />
        </button>
      </div>
    </article>
  );
};

const ProjectGrid = ({ projects, loading, onOpen, onDuplicate, onDelete, onRename }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[330px] animate-pulse rounded-xl border border-white/[0.05] bg-[#15120f]" />
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

const ActivityList = ({ activities, loading, onOpenProject }) => (
  <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-5 shadow-xl shadow-black/20">
    <div className="mb-4 flex items-center justify-between">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Recent Activity</p>
      <Clock size={16} className="text-white/30" />
    </div>
    {loading ? (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-lg bg-white/[0.04]" />
        ))}
      </div>
    ) : activities?.length ? (
      <div className="space-y-1">
        {activities.slice(0, 6).map((activity, index) => (
          <button
            key={activity.id ?? index}
            type="button"
            onClick={() => activity.id && onOpenProject?.({ id: activity.id })}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-white/[0.03]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-[11px] font-bold text-[#c49a6c]">
              {(activity.action ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white/68">
                {activity.action ?? "Updated"} <span className="text-[#c49a6c]">{activity.target ?? activity.project_name ?? "project"}</span>
              </p>
              <p className="text-xs text-white/25">{formatRelative(activity.timestamp)}</p>
            </div>
          </button>
        ))}
      </div>
    ) : (
      <p className="py-8 text-center text-sm text-white/35">No recent activity from the backend yet.</p>
    )}
  </div>
);

const RightRail = ({ user, storage, projects }) => {
  const used = storage?.used_mb ?? 0;
  const total = storage?.total_mb ?? 0;
  const storagePct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const activeProjects = projects.filter((project) => (project?.rooms_count ?? 0) > 0).length;

  return (
    <aside className="hidden w-[318px] shrink-0 xl:block">
      <div className="sticky top-[98px] space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-5 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#c49a6c]/15 bg-[#c49a6c]/[0.07] text-[#c49a6c]">
              <UserCircle size={24} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white/80">{user?.name ?? "Designer"}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-white/28">Workspace owner</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-5 shadow-xl shadow-black/20">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Storage</p>
          <div className="mt-5 flex items-end justify-between">
            <p className="font-serif text-3xl text-white">{formatStorage(used)}</p>
            <p className="text-sm text-white/35">{formatStorage(total)}</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
            <div className="h-full rounded-full bg-[#c49a6c]" style={{ width: `${storagePct}%` }} />
          </div>
          <p className="mt-3 text-xs text-white/35">{storagePct}% used from live backend storage.</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-5 shadow-xl shadow-black/20">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Workspace Health</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/[0.05] bg-black/[0.12] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Active</p>
              <p className="mt-2 font-serif text-2xl text-white">{activeProjects}</p>
            </div>
            <div className="rounded-lg border border-white/[0.05] bg-black/[0.12] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">Drafts</p>
              <p className="mt-2 font-serif text-2xl text-white">{Math.max(0, projects.length - activeProjects)}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
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

  const projectAssets = useMemo(() => projects.flatMap(getProjectAssets), [projects]);
  const projectRenders = useMemo(() => projects.flatMap(getProjectRenders), [projects]);
  const budgetItems = useMemo(
    () =>
      projects
        .map((project) => ({ project, amount: Number(getProjectCost(project)) }))
        .filter((item) => Number.isFinite(item.amount) && item.amount > 0),
    [projects]
  );
  const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);

  const openProject = (project) => {
    const projectId = getProjectId(project);
    if (projectId) navigate(`/user/room?projectId=${projectId}`);
  };

  const renameProjectFromCard = async (project) => {
    const nextName = window.prompt("New project name", project?.name ?? "");
    if (nextName?.trim()) await renameProject(project, nextName.trim());
  };

  const runQuickAction = (id) => {
    if (id === "new-project") setCreateOpen(true);
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

  const content = {
    overview: (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
        <div className="min-w-0 space-y-6">
          <SectionHeading
            eyebrow="Overview"
            title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user?.name?.split(" ")[0] ?? "Designer"}.`}
            copy={lastProject ? `Last active project: ${lastProject.name}.` : "Your live project data will appear here as soon as the backend returns it."}
            action={
              <button type="button" onClick={() => setCreateOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#c49a6c] px-4 text-sm font-bold text-[#11100f] hover:bg-[#d8b184]">
                <Plus size={16} /> New Project
              </button>
            }
          />

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">
              <AlertCircle size={17} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Projects" value={stats?.projects ?? projects.length} detail={`${stats?.rooms ?? 0} rooms from backend`} icon={FolderOpen} tone="accent" />
            <MetricCard label="Assets" value={stats?.assets ?? projectAssets.length} detail={`${projectAssets.length} synced project assets`} icon={Boxes} />
            <MetricCard label="Renders" value={projectRenders.length} detail="Thumbnails and exported media found" icon={Camera} />
          </div>

          <QuickActions onAction={runQuickAction} />

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Projects</p>
                <h2 className="mt-2 font-serif text-2xl text-white">Recent Work</h2>
              </div>
              <button type="button" onClick={() => setActiveTab("projects")} className="text-sm font-semibold text-[#c49a6c] hover:text-white">
                View all
              </button>
            </div>
            <ProjectGrid projects={projects.slice(0, 3)} loading={loading} {...projectGridProps} />
          </section>

          <ActivityList activities={activities} loading={loading} onOpenProject={openProject} />
        </div>
        <RightRail user={user} storage={storage} projects={projects} />
      </div>
    ),
    projects: (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Project Hub"
          title="All Projects"
          copy="Every project shown here is loaded through the dashboard backend hook."
          action={
            <button type="button" onClick={() => setCreateOpen(true)} className="flex h-10 items-center gap-2 rounded-lg bg-[#c49a6c] px-4 text-sm font-bold text-[#11100f] hover:bg-[#d8b184]">
              <Plus size={16} /> New Project
            </button>
          }
        />
        <ProjectGrid projects={projects} loading={loading} {...projectGridProps} />
      </div>
    ),
    assets: (
      <div className="space-y-6">
        <SectionHeading eyebrow="Assets" title="Asset Library" copy="Uploaded GLB/USDZ files and scene assets discovered from your saved backend projects." />
        {projectAssets.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {projectAssets.map((asset) => (
              <div key={asset.id} className="rounded-xl border border-white/[0.06] bg-[#15120f] p-4">
                <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-white/[0.05] bg-black/20">
                  {asset.url ? <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" /> : <Layers size={30} className="text-[#c49a6c]/45" />}
                </div>
                <p className="truncate text-sm font-semibold text-white/80">{asset.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/30">{asset.kind}</p>
                <p className="mt-3 truncate text-xs text-white/35">{asset.projectName}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Boxes} title="No assets found" copy="No uploaded models, saved furniture, or material assets were returned by the backend project data." />
        )}
      </div>
    ),
    budget: (
      <div className="space-y-6">
        <SectionHeading eyebrow="Budget" title="Budget Overview" copy="This view only uses cost fields that exist on backend projects. Missing estimates stay empty instead of using fake numbers." />
        {budgetItems.length ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Total Estimated Cost</p>
              <p className="mt-5 font-serif text-5xl text-white">{formatMoney(totalBudget)}</p>
              <div className="mt-6 space-y-3">
                {budgetItems.map(({ project, amount }) => (
                  <div key={getProjectId(project)} className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.05] bg-black/[0.12] px-4 py-3">
                    <span className="truncate text-sm text-white/65">{project.name}</span>
                    <span className="font-serif text-lg text-[#c49a6c]">{formatMoney(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Coverage</p>
              <p className="mt-5 font-serif text-4xl text-white">{budgetItems.length}</p>
              <p className="mt-3 text-sm leading-6 text-white/40">Projects with backend cost or estimate fields.</p>
            </div>
          </div>
        ) : (
          <EmptyState icon={Wallet} title="No budget fields yet" copy="Add estimate or cost values to project records and this page will populate from live backend data." />
        )}
      </div>
    ),
    renders: (
      <div className="space-y-6">
        <SectionHeading eyebrow="Renders" title="Renders Gallery" copy="Project thumbnails and exported render records discovered from backend project data." />
        {projectRenders.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projectRenders.map((render) => (
              <div key={render.id} className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#15120f]">
                <div className="aspect-video bg-black/25">
                  {render.url ? <img src={render.url} alt={render.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Camera className="text-[#c49a6c]/45" /></div>}
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-semibold text-white/80">{render.name}</p>
                  <p className="mt-1 text-xs text-white/35">{render.projectName} - {formatDate(render.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Camera} title="No renders found" copy="When projects include thumbnails, screenshots, or export records from the backend, they will appear here." />
        )}
      </div>
    ),
    settings: (
      <div className="space-y-6">
        <SectionHeading eyebrow="Settings" title="Workspace Settings" copy="Display-only profile and workspace preferences. Nothing here pretends to save unless a backend handler exists." />
        <div className="max-w-3xl space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Profile</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-white/35">Name</label>
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/[0.12] px-3 py-3 text-sm text-white/70">{user?.name ?? "Designer"}</div>
              </div>
              <div>
                <label className="text-xs text-white/35">Email</label>
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/[0.12] px-3 py-3 text-sm text-white/70">{user?.email ?? "Not available"}</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#15120f] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">Preferences</p>
            <div className="mt-5 flex items-center justify-between gap-5 rounded-lg border border-white/[0.05] bg-black/[0.12] p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/75">Metric measurements</p>
                <p className="mt-1 text-xs text-white/35">Used by the editor interface.</p>
              </div>
              <div className="h-6 w-11 shrink-0 rounded-full bg-[#c49a6c] p-1">
                <div className="ml-auto h-4 w-4 rounded-full bg-[#11100f]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#f5efe7]">
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onCreateNew={() => setCreateOpen(true)} />
        <div className="min-w-0 flex-1 bg-[#11100f]">
          <Topbar user={user} onLogout={onLogout} activeTab={activeTab} setActiveTab={setActiveTab} onCreateNew={() => setCreateOpen(true)} onSearch={searchProjects} />
          <main className="mx-auto min-h-[calc(100vh-74px)] max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {loading && activeTab !== "overview" ? (
              <div className="flex min-h-[360px] items-center justify-center text-white/45">
                <Loader2 className="mr-2 animate-spin" size={18} /> Loading dashboard data
              </div>
            ) : (
              content[activeTab]
            )}
          </main>
        </div>
      </div>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createProject} />
      <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteProject} project={deleteTarget} />
    </div>
  );
};

export default Dashboard;
