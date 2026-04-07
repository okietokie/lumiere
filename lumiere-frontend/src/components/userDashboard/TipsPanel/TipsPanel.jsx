import React, { useState } from 'react';
import { COLORS } from '../../../utils/colors';
import './TipsPanel.css';

const TIPS = [
  {
    id: 'getting-started',
    icon: '✦',
    title: 'Getting Started',
    steps: [
      'Create your first project',
      'Add a room and define its size',
      'Place doors and windows on walls',
      'Drag furniture into your layout',
      'Save and visualize in 3D',
    ],
  },
  {
    id: 'wall-tools',
    icon: '◈',
    title: 'Using Wall Tools',
    steps: [
      'Select the Wall tool from the toolbar',
      'Click to place wall start point',
      'Drag to set wall direction & length',
      'Double-click to finish the room outline',
      'Adjust thickness in the properties panel',
    ],
  },
  {
    id: 'furniture',
    icon: '◇',
    title: 'Placing Furniture',
    steps: [
      'Open the Furniture Library panel',
      'Search by category or name',
      'Drag items onto your floor plan',
      'Rotate using the handle or R key',
      'Use snap-to-grid for precision',
    ],
  },
];

const TipsPanel = () => {
  const [active, setActive] = useState(null);

  return (
    <section className="tips" style={{ animationDelay: '260ms' }}>
      <div className="section-header">
        <h2 className="section-title">Tips & Tutorials</h2>
      </div>

      <div className="tips__list">
        {TIPS.map((tip) => {
          const open = active === tip.id;
          return (
            <div key={tip.id} className={`tips__item${open ? ' tips__item--open' : ''}`}>
              <button
                className="tips__header"
                onClick={() => setActive(open ? null : tip.id)}
              >
                <span className="tips__icon">{tip.icon}</span>
                <span className="tips__title">{tip.title}</span>
                <svg
                  className="tips__chevron"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {open && (
                <ol className="tips__steps">
                  {tip.steps.map((s, i) => (
                    <li key={i} className="tips__step">
                      <span className="tips__step-num">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TipsPanel;
