import React from 'react';
import './WelcomePanel.css';

const WelcomePanel = ({ user, stats, lastProject, onContinue, onCreate, recentProjects = 0 }) => {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <section className="welcome" style={{ animationDelay: '0ms' }}>
      <div className="welcome__grain" />

      <div className="welcome__content">
        <div className="welcome__main">
          <div className="welcome__text">
            <div className="welcome__eyebrow-row">
              <p className="welcome__greeting">{greeting()}</p>
              <span className="welcome__status">Workspace overview</span>
            </div>

            <div className="welcome__heading-block">
              <h1 className="welcome__name">{user?.name ?? 'Designer'}</h1>
              <p className="welcome__summary">
                Start a new concept, return to active work, or scan current space activity from one clean control point.
              </p>
            </div>

            <div className="welcome__stats-grid">
              <article className="welcome__stat-card">
                <span className="welcome__stat-label">Projects</span>
                <strong className="welcome__stat-num">{stats?.projects ?? 0}</strong>
              </article>
              <article className="welcome__stat-card">
                <span className="welcome__stat-label">Rooms</span>
                <strong className="welcome__stat-num">{stats?.rooms ?? 0}</strong>
              </article>
              <article className="welcome__stat-card">
                <span className="welcome__stat-label">Assets</span>
                <strong className="welcome__stat-num">{stats?.assets ?? 0}</strong>
              </article>
            </div>
          </div>

          <aside className="welcome__aside">
            <div className="welcome__focus-card">
              <span className="welcome__focus-label">Current focus</span>
              {lastProject ? (
                <>
                  <strong className="welcome__focus-title">{lastProject.name}</strong>
                  <p className="welcome__focus-copy">Pick up where you left off and keep the same momentum.</p>
                </>
              ) : (
                <>
                  <strong className="welcome__focus-title">No recent project yet</strong>
                  <p className="welcome__focus-copy">Create your first project to start organizing rooms, assets, and ideas.</p>
                </>
              )}
            </div>

            <div className="welcome__substats">
              <span className="welcome__substat-chip">{recentProjects} touched today</span>
              <span className="welcome__substat-chip">{stats?.projects ?? 0} total spaces in progress</span>
            </div>
          </aside>
        </div>

        <div className="welcome__actions">
          {lastProject && (
            <button className="btn-primary" onClick={onContinue}>
              <span className="btn-primary__icon">
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="btn-primary__text">Continue Last Project</span>
            </button>
          )}
          <button className="btn-secondary" onClick={onCreate}>
            <span className="btn-secondary__icon">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="btn-secondary__text">Create New Project</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default WelcomePanel;
