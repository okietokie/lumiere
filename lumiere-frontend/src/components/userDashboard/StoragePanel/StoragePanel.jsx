import React from 'react';
import { COLORS } from '../../../utils/colors';
import './StoragePanel.css';

const StoragePanel = ({ storage }) => {
  const {
    used_mb   = 0,
    total_mb  = 500,
    projects  = { used: 0, max: 50 },
    rooms     = { used: 0, max: 200 },
  } = storage ?? {};

  const pct = Math.min(100, Math.round((used_mb / total_mb) * 100));
  const barColor = pct > 80 ? 'var(--danger)' : pct > 60 ? 'var(--action)' : 'var(--success)';

  const fmt = (mb) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  return (
    <section className="storage" style={{ animationDelay: '220ms' }}>
      <div className="section-header">
        <h2 className="section-title">Storage & Usage</h2>
        <span className="storage__pct-badge" style={{ color: barColor }}>{pct}%</span>
      </div>

      {/* Main bar */}
      <div className="storage__bar-wrap">
        <div className="storage__bar-track">
          <div
            className="storage__bar-fill"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <div className="storage__bar-labels">
          <span>{fmt(used_mb)} used</span>
          <span>{fmt(total_mb)} total</span>
        </div>
      </div>

      {/* Sub metrics */}
      <div className="storage__metrics">
        <div className="storage__metric">
          <div className="storage__metric-header">
            <svg viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 7h12" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            <span>Projects</span>
          </div>
          <div className="storage__metric-bar-track">
            <div className="storage__metric-bar-fill" style={{ width: `${(projects.used/projects.max)*100}%` }}/>
          </div>
          <span className="storage__metric-count">{projects.used} / {projects.max}</span>
        </div>

        <div className="storage__metric">
          <div className="storage__metric-header">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12v10H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            <span>Rooms</span>
          </div>
          <div className="storage__metric-bar-track">
            <div className="storage__metric-bar-fill" style={{ width: `${(rooms.used/rooms.max)*100}%` }}/>
          </div>
          <span className="storage__metric-count">{rooms.used} / {rooms.max}</span>
        </div>
      </div>

      {pct > 80 && (
        <div className="storage__warning">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L14.5 13h-13L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M8 6v3.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Storage nearing limit. Consider upgrading your plan.
        </div>
      )}
    </section>
  );
};

export default StoragePanel;
