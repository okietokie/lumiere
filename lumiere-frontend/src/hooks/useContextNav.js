// src/hooks/useContextNav.js
// Handles sidebar tab switching + scroll-to-section navigation.
// Both ContextToolbar and BottomSheet call this hook.
import { useCallback } from 'react';

export default function useContextNav(setActiveTab) {
  // Navigate to a tab and optionally scroll to a section within it.
  // sectionId should match the id= on a DOM element inside the panel.
  const navigateTo = useCallback((tab, sectionId = null) => {
    setActiveTab(tab);

    if (!sectionId) return;

    // Small delay to let the tab render before scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Brief highlight pulse so user knows where to look
          el.style.transition = 'outline 0.1s';
          el.style.outline = `2px solid #C49A6C`;
          setTimeout(() => { el.style.outline = 'none'; }, 900);
        }
      }, 120);
    });
  }, [setActiveTab]);

  return { navigateTo };
}
