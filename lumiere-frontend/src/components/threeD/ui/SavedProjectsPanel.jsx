import { useEffect, useState } from 'react';
import { DeleteOutlined, FolderOpenOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
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

export default function SavedProjectsPanel({
  currentProjectId,
  currentProjectName,
  listProjects,
  loadProject,
  deleteProject,
  createNewProject,
}) {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('idle');
  const [busyProjectId, setBusyProjectId] = useState(null);

  const refreshProjects = async () => {
    setStatus('loading');
    try {
      const items = await listProjects();
      setProjects(items);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    refreshProjects().catch(() => {});
  }, []);

  const handleOpen = async (projectId) => {
    setBusyProjectId(projectId);
    try {
      await loadProject(projectId);
      await refreshProjects();
    } finally {
      setBusyProjectId(null);
    }
  };

  const handleDelete = async (projectId) => {
    setBusyProjectId(projectId);
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    } finally {
      setBusyProjectId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        background: `linear-gradient(180deg, ${COLORS.surface}D8 0%, ${COLORS.background}F0 100%)`,
        borderRadius: 22,
        border: `1px solid ${COLORS.secondary}55`,
      }}>
        <div>
          <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            Saved Projects
          </div>
          <div style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.5 }}>
            Start a fresh design or open any saved room and continue from where you left off.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={createNewProject}
            style={{
              minHeight: 42,
              padding: '0 16px',
              borderRadius: 999,
              border: `1px solid ${COLORS.action}66`,
              background: `linear-gradient(135deg, ${COLORS.action}22 0%, ${COLORS.accent}1F 100%)`,
              color: COLORS.text,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <PlusOutlined />
            New Project
          </button>
          <button
            type="button"
            onClick={() => refreshProjects()}
            style={{
              minWidth: 42,
              height: 42,
              borderRadius: 999,
              border: `1px solid ${COLORS.secondary}55`,
              background: `${COLORS.background}D0`,
              color: COLORS.text,
              cursor: 'pointer',
            }}
          >
            <ReloadOutlined />
          </button>
        </div>
      </div>

      {status === 'loading' && (
        <div style={{ color: `${COLORS.text}B5`, fontSize: 13 }}>Loading your saved rooms...</div>
      )}

      {status === 'error' && (
        <div style={{ color: '#f0b3a8', fontSize: 13 }}>
          Could not load saved projects right now.
        </div>
      )}

      {status === 'ready' && !projects.length && (
        <div style={{
          padding: '16px 18px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${COLORS.secondary}44`,
          color: `${COLORS.text}B5`,
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          No saved projects yet. Save your current room once and it will appear here.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {projects.map((project) => {
          const isCurrent = project.id === currentProjectId;
          const isBusy = busyProjectId === project.id;
          return (
            <div
              key={project.id}
              style={{
                padding: '14px 16px',
                borderRadius: 20,
                border: `1px solid ${isCurrent ? COLORS.action : `${COLORS.secondary}44`}`,
                background: isCurrent
                  ? `linear-gradient(180deg, ${COLORS.action}18 0%, rgba(255,255,255,0.04) 100%)`
                  : 'rgba(255,255,255,0.03)',
                boxShadow: isCurrent ? '0 10px 24px rgba(0,0,0,0.18)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <FolderOpenOutlined style={{ color: isCurrent ? COLORS.action : COLORS.text }} />
                    <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {project.title || project.name}
                    </div>
                  </div>
                  <div style={{ color: `${COLORS.text}90`, fontSize: 11, marginBottom: 8 }}>
                    Last opened {formatTimestamp(project.last_opened_at || project.updated_at)}
                  </div>
                  {isCurrent && (
                    <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Current project{currentProjectName ? `: ${currentProjectName}` : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleOpen(project.id)}
                    style={{
                      minHeight: 36,
                      padding: '0 12px',
                      borderRadius: 999,
                      border: `1px solid ${COLORS.action}88`,
                      background: isCurrent ? `${COLORS.action}18` : 'transparent',
                      color: COLORS.text,
                      cursor: isBusy ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isBusy ? 'Opening...' : isCurrent ? 'Open Again' : 'Open'}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(project.id)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: `1px solid ${COLORS.secondary}55`,
                      background: 'transparent',
                      color: '#e3a193',
                      cursor: isBusy ? 'wait' : 'pointer',
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
