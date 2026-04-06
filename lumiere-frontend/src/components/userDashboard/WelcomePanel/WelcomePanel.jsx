import React from 'react';
import { COLORS } from '../../../utils/colors';
import './WelcomePanel.css';

const WelcomePanel = ({ user, stats, lastProject, onContinue, onCreate }) => {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <section className="welcome" style={{ animationDelay: '0ms' }}>
      {/* Decorative grain overlay */}
      <div className="welcome__grain" />

      <div className="welcome__content">
        <div className="welcome__text">
          <p className="welcome__greeting">{greeting()},</p>
          <h1 className="welcome__name">{user?.name ?? 'Designer'} <span>✦</span></h1>

          <div className="welcome__stats">
            <div className="welcome__stat">
              <span className="welcome__stat-num">{stats?.projects ?? 0}</span>
              <span className="welcome__stat-label">Projects</span>
            </div>
            <div className="welcome__stat-sep" />
            <div className="welcome__stat">
              <span className="welcome__stat-num">{stats?.rooms ?? 0}</span>
              <span className="welcome__stat-label">Rooms</span>
            </div>
            <div className="welcome__stat-sep" />
            <div className="welcome__stat">
              <span className="welcome__stat-num">{stats?.assets ?? 0}</span>
              <span className="welcome__stat-label">Assets</span>
            </div>
          </div>

          {lastProject && (
            <p className="welcome__last-edited">
              Last edited &nbsp;
              <span className="welcome__last-name">{lastProject.name}</span>
            </p>
          )}
        </div>

        <div className="welcome__actions">
          {lastProject && (
            <button className="btn-primary" onClick={onContinue}>
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Continue Last Project
            </button>
          )}
          <button className="btn-secondary" onClick={onCreate}>
            <svg viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Decorative right element */}
      <div className="welcome__deco" aria-hidden="true">
        <div className="welcome__deco-ring welcome__deco-ring--1" />
        <div className="welcome__deco-ring welcome__deco-ring--2" />
        <div className="welcome__deco-ring welcome__deco-ring--3" />
        <span className="welcome__deco-icon">✦</span>
      </div>
    </section>
  );
};

export default WelcomePanel;
