// Coordinates tab changes with optional in-panel scrolling.

import { useCallback } from 'react';

export default function useContextNav(setActiveTab) {
  const navigateTo = useCallback((tab, sectionId = null) => {
    setActiveTab(tab);

    if (!sectionId) return;

    // Waits for the tab content to mount before scrolling.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Briefly highlights the target section.
          el.style.transition = 'outline 0.1s';
          el.style.outline = `2px solid #C49A6C`;
          setTimeout(() => { el.style.outline = 'none'; }, 900);
        }
      }, 120);
    });
  }, [setActiveTab]);

  return { navigateTo };
}
