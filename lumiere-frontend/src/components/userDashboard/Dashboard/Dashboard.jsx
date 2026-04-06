import React, { useState } from 'react';
import { COLORS } from '../../../styles/colors';

import Navbar            from '../Navbar/Navbar';
import WelcomePanel      from '../WelcomePanel/WelcomePanel';
import QuickActions      from '../QuickActions/QuickActions';
import ProjectGrid       from '../ProjectGrid/ProjectGrid';
import RecentActivity    from '../RecentActivity/RecentActivity';
import StoragePanel      from '../StoragePanel/StoragePanel';
import TipsPanel         from '../TipsPanel/TipsPanel';
import CreateProjectModal from '../modals/CreateProjectModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

import useDashboard from '../../../hooks/useDashboard';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const {
    projects, lastProject, stats, activities, storage,
    loading, error,
    createProject, deleteProject, duplicateProject, renameProject,
    searchProjects,
  } = useDashboard();

  const [createOpen,  setCreateOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* Quick Actions dispatcher */
  const handleQuickAction = (id) => {
    if (id === 'new-project') setCreateOpen(true);
    if (id === 'upload-plan') window.location.href = '/upload';
    if (id === 'create-room') window.location.href = '/rooms/new';
    if (id === 'import-room') window.location.href = '/rooms/import';
  };

  /* Open a project in the editor */
  const handleOpenProject = (project) => {
    window.location.href = `/editor/${project.id ?? project._id}`;
  };

  return (
    <div className="dashboard-root">
      <Navbar
        user={user}
        onLogout={onLogout}
        onSearch={searchProjects}
      />

      <main className="dashboard-main">
        {error && (
          <div className="dashboard-error">
            <svg viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 6v4.5M10 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Row 1 — Welcome */}
        <WelcomePanel
          user={user}
          stats={stats}
          lastProject={lastProject}
          onContinue={() => lastProject && handleOpenProject(lastProject)}
          onCreate={() => setCreateOpen(true)}
        />

        {/* Row 2 — Quick Actions */}
        <QuickActions onAction={handleQuickAction} />

        {/* Row 3 — Projects (full width) */}
        <ProjectGrid
          projects={projects}
          loading={loading}
          onOpen={handleOpenProject}
          onDuplicate={duplicateProject}
          onDelete={p => setDeleteTarget(p)}
          onRename={(p) => {
            const name = window.prompt('New project name:', p.name);
            if (name?.trim()) renameProject(p, name.trim());
          }}
          onCreateNew={() => setCreateOpen(true)}
        />

        {/* Row 4 — Activity + Right sidebar */}
        <div className="dashboard-bottom">
          <div className="dashboard-bottom__main">
            <RecentActivity activities={activities} loading={loading} />
          </div>
          <div className="dashboard-bottom__side">
            <StoragePanel storage={storage} />
            <TipsPanel />
          </div>
        </div>
      </main>

      {/* Modals */}
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
