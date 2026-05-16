import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckOutlined,
  DeleteOutlined,
  ExportOutlined,
  FolderOpenOutlined,
  LeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Empty, Input, Switch } from 'antd';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined';
import { COLORS } from '../../../utils/colors';

function formatTimestamp(value) {
  if (!value) return 'Recently saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently saved';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function panelCardStyle(active = false) {
  return {
    width: '100%',
    borderRadius: 20,
    border: `1px solid ${active ? 'rgba(239, 171, 89, 0.7)' : 'rgba(196, 154, 108, 0.2)'}`,
    background: active
      ? 'linear-gradient(145deg, rgba(114, 73, 37, 0.6) 0%, rgba(52, 38, 30, 0.95) 48%, rgba(24, 20, 18, 0.98) 100%)'
      : 'linear-gradient(180deg, rgba(34, 28, 25, 0.96) 0%, rgba(22, 18, 16, 0.99) 100%)',
    boxShadow: active
      ? '0 0 0 1px rgba(239, 171, 89, 0.14), 0 14px 34px rgba(0,0,0,0.24), inset 0 0 32px rgba(214, 146, 71, 0.13)'
      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
  };
}

function Header({ eyebrow, title, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            style={{
              width: 32,
              height: 32,
              borderRadius: 11,
              border: '1px solid rgba(232, 176, 92, 0.35)',
              background: 'linear-gradient(180deg, rgba(62, 45, 31, 0.92) 0%, rgba(36, 28, 24, 0.98) 100%)',
              color: '#f0c07f',
              boxShadow: '0 0 0 1px rgba(235, 173, 88, 0.08), 0 10px 24px rgba(0, 0, 0, 0.18), inset 0 0 24px rgba(214, 146, 71, 0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <LeftOutlined />
          </button>
        )}
        <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {eyebrow}
        </div>
      </div>
      <div style={{ color: '#f4eadf', fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
        {title}
      </div>
    </div>
  );
}

function ProjectPreview({ project, size = 72 }) {
  const src = project?.thumbnail_url || project?.thumbnail || null;
  if (!src) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: 'linear-gradient(145deg, rgba(76, 60, 48, 0.95) 0%, rgba(25, 21, 18, 0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.action,
        flexShrink: 0,
      }}>
        <FolderOpenOutlined style={{ fontSize: Math.max(18, size * 0.34) }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={project?.title || project?.name || 'Project'}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        objectFit: 'cover',
        display: 'block',
        border: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(30, 25, 22, 0.94)',
        flexShrink: 0,
      }}
    />
  );
}

function PrimaryButton({ children, onClick, disabled = false, ghost = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 40,
        padding: '0 16px',
        borderRadius: 14,
        border: ghost ? '1px solid rgba(196, 154, 108, 0.22)' : '1px solid rgba(214, 164, 93, 0.42)',
        background: ghost
          ? 'rgba(255,255,255,0.03)'
          : 'linear-gradient(135deg, rgba(191, 139, 75, 0.92) 0%, rgba(123, 81, 43, 0.98) 100%)',
        color: disabled ? 'rgba(245, 234, 223, 0.46)' : '#fff7ef',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
      }}
    >
      {children}
    </button>
  );
}

function QuietPill({ children, active = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 30,
        padding: '0 12px',
        borderRadius: 999,
        border: `1px solid ${active ? 'rgba(239, 171, 89, 0.55)' : 'rgba(196, 154, 108, 0.18)'}`,
        background: active ? 'rgba(214, 157, 89, 0.16)' : 'rgba(255,255,255,0.03)',
        color: disabled ? 'rgba(240, 224, 208, 0.38)' : '#eadacc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function ProjectRow({ project, isCurrent, busy, onOpen, onOptions }) {
  return (
    <div style={{ ...panelCardStyle(isCurrent), padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProjectPreview project={project} size={62} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f5eadf', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.title || project.name || 'Untitled Room'}
          </div>
          <div style={{ color: 'rgba(237, 224, 211, 0.66)', fontSize: 10, marginTop: 4 }}>
            Last opened {formatTimestamp(project.last_opened_at || project.updated_at || project.last_modified)}
          </div>
          {isCurrent && (
            <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>
              Current project
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <PrimaryButton onClick={onOpen} disabled={busy}>
          {busy ? 'Opening...' : 'Open'}
        </PrimaryButton>
        <button
          type="button"
          onClick={onOptions}
          style={{
            width: 40,
            minWidth: 40,
            height: 40,
            borderRadius: 14,
            border: '1px solid rgba(196, 154, 108, 0.22)',
            background: 'rgba(255,255,255,0.03)',
            color: '#ebdcca',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <SettingOutlined />
        </button>
      </div>
    </div>
  );
}

function DisabledFeatureCard({ icon, title, description }) {
  return (
    <div style={{ ...panelCardStyle(false), padding: 16, opacity: 0.56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          border: '1px solid rgba(196, 154, 108, 0.18)',
          background: 'rgba(255,255,255,0.03)',
          color: COLORS.action,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eadbc8', fontSize: 13, fontWeight: 700 }}>{title}</div>
          <div style={{ color: 'rgba(237, 224, 211, 0.58)', fontSize: 10, marginTop: 3, lineHeight: 1.45 }}>
            {description}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <QuietPill disabled>Soon</QuietPill>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

export default function ProjectsSidebarPanel({
  currentProjectId,
  currentProjectName,
  listProjects,
  loadProject,
  deleteProject,
  createNewProject,
  saveProject,
  setProjectName,
  projectName,
  exportJSON,
  autosaveEnabled,
  setAutosaveEnabled,
  onProjectOpened,
}) {
  const [page, setPage] = useState('list');
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('idle');
  const [searchValue, setSearchValue] = useState('');
  const [busyProjectId, setBusyProjectId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [draftProjectName, setDraftProjectName] = useState(projectName || '');

  const refreshProjects = useCallback(async () => {
    setStatus('loading');
    try {
      const items = await listProjects();
      setProjects(Array.isArray(items) ? items : []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [listProjects]);

  useEffect(() => {
    refreshProjects().catch(() => {});
  }, [refreshProjects]);

  useEffect(() => {
    setDraftProjectName(projectName || '');
  }, [projectName]);

  const filteredProjects = useMemo(() => {
    const needle = searchValue.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => String(project.title || project.name || '').toLowerCase().includes(needle));
  }, [projects, searchValue]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentProjectId) ?? null,
    [projects, currentProjectId]
  );

  const selectedIsCurrent = selectedProject?.id === currentProjectId;

  const openProject = useCallback(async (projectId) => {
    setBusyProjectId(projectId);
    try {
      await loadProject(projectId);
      await refreshProjects();
      onProjectOpened?.();
    } finally {
      setBusyProjectId(null);
    }
  }, [loadProject, onProjectOpened, refreshProjects]);

  const handleCreateBlankProject = useCallback(async () => {
    createNewProject();
    setDraftProjectName('Untitled Room');
    setPage('created');
    await refreshProjects();
  }, [createNewProject, refreshProjects]);

  const saveRenamedCurrentProject = useCallback(async () => {
    const nextName = draftProjectName.trim();
    if (!nextName || nextName === projectName) return;
    setProjectName(nextName);
    await saveProject(nextName, true);
    await refreshProjects();
  }, [draftProjectName, projectName, refreshProjects, saveProject, setProjectName]);

  const handleDeleteProject = useCallback(async (projectId) => {
    setBusyProjectId(projectId);
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        setPage('list');
      }
    } finally {
      setBusyProjectId(null);
    }
  }, [deleteProject, selectedProjectId]);

  const listContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Header eyebrow="Projects" title="Projects" />

      <div style={{ ...panelCardStyle(Boolean(currentProject)), padding: 16 }}>
        <SectionLabel>Workspace</SectionLabel>
        <div style={{ color: '#f3e7dc', fontSize: 15, fontWeight: 700, marginTop: 10 }}>
          {currentProject?.title || currentProject?.name || currentProjectName || 'Untitled Room'}
        </div>
        <div style={{ color: 'rgba(237, 224, 211, 0.66)', fontSize: 11, lineHeight: 1.55, marginTop: 6 }}>
          {currentProject
            ? `Continue from where you left off. Last opened ${formatTimestamp(currentProject.last_opened_at || currentProject.updated_at || currentProject.last_modified)}.`
            : 'Start a fresh project or jump back into one of your saved spaces.'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <PrimaryButton onClick={() => setPage('new')}>
            <PlusOutlined />
            New Project
          </PrimaryButton>
          <button
            type="button"
            onClick={() => refreshProjects()}
            style={{
              width: 40,
              minWidth: 40,
              height: 40,
              borderRadius: 14,
              border: '1px solid rgba(196, 154, 108, 0.22)',
              background: 'rgba(255,255,255,0.03)',
              color: '#eadac8',
              cursor: 'pointer',
            }}
          >
            <ReloadOutlined />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Saved Projects</SectionLabel>
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search projects..."
          prefix={<SearchOutlined style={{ color: 'rgba(233, 214, 196, 0.55)' }} />}
          style={{
            height: 38,
            borderRadius: 13,
            border: '1px solid rgba(196, 154, 108, 0.18)',
            background: 'rgba(24, 20, 18, 0.92)',
            color: '#f2e8de',
          }}
        />
      </div>

      {status === 'loading' && <div style={{ color: 'rgba(240, 224, 208, 0.72)', fontSize: 12 }}>Loading your projects...</div>}
      {status === 'error' && <div style={{ color: '#f0b3a8', fontSize: 12 }}>Could not load saved projects right now.</div>}
      {status === 'ready' && !filteredProjects.length && (
        <div style={{ ...panelCardStyle(false), padding: '16px 0' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'rgba(240, 224, 208, 0.68)' }}>No projects found</span>}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredProjects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            isCurrent={project.id === currentProjectId}
            busy={busyProjectId === project.id}
            onOpen={() => openProject(project.id)}
            onOptions={() => {
              setSelectedProjectId(project.id);
              setPage('options');
            }}
          />
        ))}
      </div>
    </div>
  );

  const newProjectContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Header eyebrow="New Project" title="New Project" onBack={() => setPage('list')} />
      <div style={{ color: '#e7d8c8', fontSize: 12, lineHeight: 1.6 }}>
        Choose how you want to begin your next design.
      </div>

      <button
        type="button"
        onClick={() => setPage('blank')}
        style={{
          ...panelCardStyle(true),
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          color: '#fff1e2',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 15,
          border: '1px solid rgba(239, 171, 89, 0.22)',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.action,
          flexShrink: 0,
        }}>
          <ViewInArOutlinedIcon style={{ fontSize: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Blank Room</div>
          <div style={{ fontSize: 11, color: 'rgba(241, 226, 211, 0.74)', marginTop: 4, lineHeight: 1.45 }}>
            Start with an empty room and design from scratch.
          </div>
        </div>
      </button>

      <DisabledFeatureCard
        icon={<WidgetsOutlinedIcon style={{ fontSize: 18 }} />}
        title="Room Templates"
        description="Choose from pre-designed templates."
      />

      <DisabledFeatureCard
        icon={<UploadOutlined style={{ fontSize: 18 }} />}
        title="Import Project"
        description="Coming soon in a future implementation."
      />
    </div>
  );

  const blankContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Header eyebrow="Blank Room" title="Room Setup" onBack={() => setPage('new')} />

      <div style={{ ...panelCardStyle(false), padding: 14 }}>
        <div style={{
          height: 124,
          borderRadius: 14,
          background: 'linear-gradient(180deg, rgba(79, 62, 49, 0.85) 0%, rgba(41, 31, 26, 0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 74% 26%, rgba(255, 214, 159, 0.24) 0%, rgba(255, 214, 159, 0) 28%)' }} />
          <div style={{ position: 'absolute', inset: '22px 18px 18px 18px', border: '1px solid rgba(243, 227, 211, 0.22)', borderBottom: '7px solid rgba(168, 122, 76, 0.72)', borderRadius: 4 }} />
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {[
            ['Room Size', '6.0m × 6.0m'],
            ['Ceiling Height', '3.0m'],
            ['Units', 'Meters'],
            ['Default Style', 'Current defaults'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#efe3d7', fontSize: 12 }}>{label}</span>
              <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <PrimaryButton onClick={handleCreateBlankProject}>Create Project</PrimaryButton>
    </div>
  );

  const createdContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Header eyebrow="Project Created" title="Project Created!" onBack={() => setPage('list')} />

      <div style={{ ...panelCardStyle(false), padding: 16, textAlign: 'center' }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 999,
          margin: '0 auto',
          background: 'radial-gradient(circle, rgba(214, 157, 89, 0.28) 0%, rgba(214, 157, 89, 0.1) 62%, rgba(214, 157, 89, 0) 100%)',
          border: '1px solid rgba(214, 157, 89, 0.24)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.action,
          fontSize: 24,
        }}>
          <CheckOutlined />
        </div>

        <div style={{ color: '#f3e7dc', fontSize: 15, fontWeight: 700, marginTop: 14 }}>
          Your new project is ready.
        </div>

        <div style={{ ...panelCardStyle(false), padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', marginTop: 14 }}>
          <div style={{
            width: 78,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(79, 62, 49, 0.85) 0%, rgba(41, 31, 26, 0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
          }} />
          <div>
            <div style={{ color: '#f4eadf', fontSize: 13, fontWeight: 700 }}>{currentProjectName || projectName || 'Untitled Room'}</div>
            <div style={{ color: 'rgba(237, 224, 211, 0.66)', fontSize: 10, marginTop: 4 }}>Created just now</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          <PrimaryButton onClick={() => setPage('list')}>Back to Projects</PrimaryButton>
        </div>
      </div>
    </div>
  );

  const optionsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Header eyebrow="Project Options" title={selectedProject?.title || selectedProject?.name || 'Project'} onBack={() => setPage('list')} />

      {selectedProject && (
        <>
          <div style={{ ...panelCardStyle(selectedIsCurrent), padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProjectPreview project={selectedProject} size={68} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#f4eadf', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedProject.title || selectedProject.name || 'Untitled Room'}
                </div>
                <div style={{ color: 'rgba(237, 224, 211, 0.66)', fontSize: 10, marginTop: 4 }}>
                  Last opened {formatTimestamp(selectedProject.last_opened_at || selectedProject.updated_at || selectedProject.last_modified)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              <PrimaryButton onClick={() => openProject(selectedProject.id)}>Open Project</PrimaryButton>
              <PrimaryButton onClick={exportJSON} disabled={!selectedIsCurrent} ghost>
                <ExportOutlined />
                {selectedIsCurrent ? 'Export Current Project' : 'Open First To Export'}
              </PrimaryButton>
            </div>
          </div>

          <div style={{ ...panelCardStyle(false), padding: 14 }}>
            <SectionLabel>Rename</SectionLabel>
            <Input
              value={draftProjectName}
              onChange={(event) => setDraftProjectName(event.target.value)}
              disabled={!selectedIsCurrent}
              placeholder="Project name"
              style={{
                height: 38,
                borderRadius: 13,
                border: '1px solid rgba(196, 154, 108, 0.18)',
                background: 'rgba(24, 20, 18, 0.92)',
                color: '#f2e8de',
                marginTop: 10,
              }}
            />
            <div style={{ marginTop: 10 }}>
              {selectedIsCurrent ? (
                <PrimaryButton onClick={saveRenamedCurrentProject} ghost>Save Name</PrimaryButton>
              ) : (
                <div style={{ color: 'rgba(237, 224, 211, 0.6)', fontSize: 10, lineHeight: 1.45 }}>
                  Open this project first to rename it safely.
                </div>
              )}
            </div>
          </div>

          <div style={{ ...panelCardStyle(false), padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              <SettingOutlined />
              Project Settings
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ color: '#f2e8de', fontSize: 12, fontWeight: 700 }}>Auto Save</div>
                <div style={{ color: 'rgba(237, 224, 211, 0.62)', fontSize: 10, marginTop: 3, lineHeight: 1.45 }}>
                  Automatically save your progress as you work.
                </div>
              </div>
              <Switch checked={autosaveEnabled} onChange={setAutosaveEnabled} />
            </div>

            <div style={{ marginTop: 14 }}>
              <DisabledFeatureCard
                icon={<UploadOutlined style={{ fontSize: 17 }} />}
                title="Import Project"
                description="Planned for a future implementation."
              />
            </div>
          </div>

          <div style={{ ...panelCardStyle(false), padding: 14 }}>
            <SectionLabel>Danger Zone</SectionLabel>
            <div style={{ color: 'rgba(237, 224, 211, 0.66)', fontSize: 11, lineHeight: 1.5, marginTop: 10 }}>
              Permanently remove this project and its saved scene data.
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => handleDeleteProject(selectedProject.id)}
                style={{
                  width: '100%',
                  minHeight: 40,
                  padding: '0 16px',
                  borderRadius: 14,
                  border: '1px solid rgba(232, 132, 116, 0.32)',
                  background: 'rgba(94, 36, 31, 0.3)',
                  color: '#efc1b6',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <DeleteOutlined />
                Delete Project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const content =
    page === 'new' ? newProjectContent :
    page === 'blank' ? blankContent :
    page === 'created' ? createdContent :
    page === 'options' ? optionsContent :
    listContent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {content}
    </div>
  );
}
