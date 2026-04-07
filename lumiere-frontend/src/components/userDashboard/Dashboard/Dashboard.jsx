import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import barba from '@barba/core';
import { useNavigate } from 'react-router-dom';

import Navbar from '../Navbar/Navbar';
import WelcomePanel from '../WelcomePanel/WelcomePanel';
import QuickActions from '../QuickActions/QuickActions';
import ProjectGrid from '../ProjectGrid/ProjectGrid';
import RecentActivity from '../RecentActivity/RecentActivity';
import StoragePanel from '../StoragePanel/StoragePanel';
import TipsPanel from '../TipsPanel/TipsPanel';
import CreateProjectModal from '../modals/CreateProjectModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

import useDashboard from '../../../hooks/useDashboard';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const {
    projects, lastProject, stats, activities, storage,
    loading, error,
    createProject, deleteProject, duplicateProject, renameProject,
    searchProjects,
  } = useDashboard();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const rootRef = useRef(null);
  const contentRef = useRef(null);

  const activeProjects = projects.filter((project) => (project.rooms_count ?? 0) > 0).length;
  const draftProjects = projects.length - activeProjects;
  const recentProjects = projects.filter((project) => {
    if (!project.last_modified) return false;
    const diffHours = (Date.now() - new Date(project.last_modified).getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }).length;
  const storageUsagePercent = storage?.total_mb
    ? Math.min(100, Math.round(((storage?.used_mb ?? 0) / storage.total_mb) * 100))
    : 0;
  const storageAvailable = Math.max(0, (storage?.total_mb ?? 500) - (storage?.used_mb ?? 0));

  const sidebarSections = [
    { id: 'overview', label: 'Overview', caption: 'Snapshot and next steps' },
    { id: 'workspace', label: 'Workspace', caption: 'Create and continue' },
    { id: 'projects', label: 'Projects', caption: 'Organized project library' },
    { id: 'activity', label: 'Activity', caption: 'Recent changes and motion' },
    { id: 'resources', label: 'Resources', caption: 'Storage and guidance' },
  ];

  const projectCategories = [
    {
      label: 'Active',
      value: activeProjects,
      description: 'Projects with at least one room ready for design work.',
    },
    {
      label: 'Drafts',
      value: draftProjects,
      description: 'Early concepts still waiting for a first room or layout.',
    },
    {
      label: 'Updated today',
      value: recentProjects,
      description: 'Projects touched in the last 24 hours.',
    },
  ];

  const handleQuickAction = (id) => {
    if (id === 'new-project') setCreateOpen(true);
    if (id === 'upload-plan') navigate('/user/room');
    if (id === 'create-room') navigate('/user/room');
    if (id === 'import-room') navigate('/user/room');
  };

  const handleOpenProject = (project) => {
    const projectId = project.id ?? project._id;
    navigate(`/user/room?projectId=${projectId}`);
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const content = contentRef.current;
    if (!content) return undefined;

    const data = {
      current: { namespace: 'dashboard' },
      next: { namespace: activeSection },
      trigger: 'dashboard-tab',
    };

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo(
      content,
      { autoAlpha: 0, x: 20 },
      { autoAlpha: 1, x: 0, duration: 0.28 }
    );

    barba.hooks.do('beforeEnter', data);
    barba.hooks.do('afterEnter', data);

    return () => {
      tl.kill();
    };
  }, [activeSection, projects.length, loading]);

  return (
    <div className="dashboard-root" ref={rootRef}>
      <Navbar
        user={user}
        onLogout={onLogout}
        onSearch={searchProjects}
      />

      <main className="dashboard-main">
        {error && (
          <div className="dashboard-error">
            <svg viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6v4.5M10 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        <div className="dashboard-shell">
          <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
            <div className="dashboard-sidebar__box">
              <div className="dashboard-sidebar__header">
                <span className="dashboard-sidebar__eyebrow">Dashboard</span>
                <h2 className="dashboard-sidebar__title">Your design workspace</h2>
                <p className="dashboard-sidebar__subtitle">
                  Everything is grouped so users can move from overview to action without hunting around.
                </p>
              </div>

              <nav className="dashboard-sidebar__nav" aria-label="Dashboard sections">
                {sidebarSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`dashboard-sidebar__nav-item${activeSection === section.id ? ' is-active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="dashboard-sidebar__nav-label">{section.label}</span>
                    <span className="dashboard-sidebar__nav-caption">{section.caption}</span>
                  </button>
                ))}
              </nav>

              <div className="dashboard-sidebar__group">
                <span className="dashboard-sidebar__group-title">Project categories</span>
                <div className="dashboard-sidebar__category-list">
                  {projectCategories.map((category) => (
                    <div key={category.label} className="dashboard-sidebar__category-card">
                      <div className="dashboard-sidebar__category-top">
                        <span>{category.label}</span>
                        <strong>{category.value}</strong>
                      </div>
                      <p>{category.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-sidebar__summary">
                <span className="dashboard-sidebar__summary-label">Available storage</span>
                <strong>{storageAvailable} MB free</strong>
                <p>{storageUsagePercent}% of your workspace capacity is currently in use.</p>
              </div>
            </div>
          </aside>

          <div className="dashboard-content" ref={contentRef}>
            {activeSection === 'overview' && (
              <section className="dashboard-section dashboard-section--hero">
                <div className="dashboard-section__intro">
                  <span className="dashboard-section__eyebrow">Overview</span>
                  <h2 className="dashboard-section__title">A clearer home base for every user</h2>
                  <p className="dashboard-section__copy">
                    High-priority information stays at the top, active creation tools live together,
                    and project management is separated from support resources.
                  </p>
                </div>

                <WelcomePanel
                  user={user}
                  stats={stats}
                  lastProject={lastProject}
                  onContinue={() => lastProject && handleOpenProject(lastProject)}
                  onCreate={() => setCreateOpen(true)}
                  recentProjects={recentProjects}
                />
              </section>
            )}

            {activeSection === 'workspace' && (
              <section className="dashboard-section">
                <div className="dashboard-panel dashboard-panel--soft">
                  <div className="dashboard-panel__header">
                    <div>
                      <span className="dashboard-panel__eyebrow">Workspace</span>
                      <h3 className="dashboard-panel__title">Start, import, or continue work</h3>
                    </div>
                    <p className="dashboard-panel__description">
                      Core creation actions are grouped in one place so users can decide how they want to begin.
                    </p>
                  </div>

                  <section className="dashboard-insights" style={{ animationDelay: '30ms' }}>
                    <article className="dashboard-insight-card">
                      <span className="dashboard-insight-label">Active Projects</span>
                      <strong className="dashboard-insight-value">{activeProjects}</strong>
                      <span className="dashboard-insight-meta">{draftProjects} drafts still waiting for detail</span>
                    </article>
                    <article className="dashboard-insight-card">
                      <span className="dashboard-insight-label">Edited Today</span>
                      <strong className="dashboard-insight-value">{recentProjects}</strong>
                      <span className="dashboard-insight-meta">Projects touched in the last 24 hours</span>
                    </article>
                    <article className="dashboard-insight-card">
                      <span className="dashboard-insight-label">Storage Use</span>
                      <strong className="dashboard-insight-value">{storageUsagePercent}%</strong>
                      <span className="dashboard-insight-meta">{storage?.used_mb ?? 0} MB used of {storage?.total_mb ?? 500} MB</span>
                    </article>
                  </section>

                  <QuickActions onAction={handleQuickAction} />
                </div>
              </section>
            )}

            {activeSection === 'projects' && (
              <section className="dashboard-section">
                <div className="dashboard-panel">
                  <div className="dashboard-panel__header">
                    <div>
                      <span className="dashboard-panel__eyebrow">Projects</span>
                      <h3 className="dashboard-panel__title">Organized project library</h3>
                    </div>
                    <p className="dashboard-panel__description">
                      Users can browse all work, focus on room-ready projects, or return to drafts from one categorized area.
                    </p>
                  </div>

                  <ProjectGrid
                    projects={projects}
                    loading={loading}
                    onOpen={handleOpenProject}
                    onDuplicate={duplicateProject}
                    onDelete={(project) => setDeleteTarget(project)}
                    onRename={(project) => {
                      const name = window.prompt('New project name:', project.name);
                      if (name?.trim()) renameProject(project, name.trim());
                    }}
                    onCreateNew={() => setCreateOpen(true)}
                  />
                </div>
              </section>
            )}

            {activeSection === 'activity' && (
              <section className="dashboard-section">
                <div className="dashboard-panel">
                  <div className="dashboard-panel__header">
                    <div>
                      <span className="dashboard-panel__eyebrow">Activity</span>
                      <h3 className="dashboard-panel__title">Track recent changes</h3>
                    </div>
                    <p className="dashboard-panel__description">
                      Recent edits are separated from storage and help content so users can scan progress without distraction.
                    </p>
                  </div>

                  <RecentActivity activities={activities} loading={loading} onOpenProject={handleOpenProject} />
                </div>
              </section>
            )}

            {activeSection === 'resources' && (
              <section className="dashboard-section">
                <div className="dashboard-resource-grid">
                  <div className="dashboard-panel">
                    <div className="dashboard-panel__header">
                      <div>
                        <span className="dashboard-panel__eyebrow">Resources</span>
                        <h3 className="dashboard-panel__title">Usage and limits</h3>
                      </div>
                      <p className="dashboard-panel__description">
                        Account capacity lives alongside support guidance, giving users a practical utility zone.
                      </p>
                    </div>
                    <StoragePanel storage={storage} />
                  </div>
                </div>

                <div className="dashboard-resource-grid">
                  <div className="dashboard-panel">
                    <div className="dashboard-panel__header">
                      <div>
                        <span className="dashboard-panel__eyebrow">Help</span>
                        <h3 className="dashboard-panel__title">Tips and tutorials</h3>
                      </div>
                      <p className="dashboard-panel__description">
                        Onboarding guidance is boxed into its own section so it feels supportive, not mixed into operational data.
                      </p>
                    </div>
                    <TipsPanel />
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createProject}
      />
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteProject}
        project={deleteTarget}
      />
    </div>
  );
};

export default Dashboard;
