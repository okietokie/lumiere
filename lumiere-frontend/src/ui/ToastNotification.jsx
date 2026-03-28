import { useState, useCallback, useRef, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const show = useCallback((title, message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type, visible: true }]);

    timers.current[id] = setTimeout(() => {
      // Fade out
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, visible: false } : t));
      // Remove after fade
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, 350);
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
  }, []);

  const info = useCallback((message, title = 'Info') => {
    show(title, message, 'info');
  }, [show]);

  const success = useCallback((message, title = 'Success') => {
    show(title, message, 'success');
  }, [show]);

  const error = useCallback((message, title = 'Warning') => {
    show(title, message, 'warning');
  }, [show]);

  return (
    <ToastContext.Provider value={{ show, info, success, error }}>
      {children}
      {/* Toast container — fixed bottom-left, above score panel */}
      <div style={{
        position:      'fixed',
        bottom:        24,
        left:          24,
        zIndex:        9998,
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TYPE_STYLES = {
  info:    { accent: '#C49A6C', icon: 'ℹ️' },
  success: { accent: '#7FB069', icon: '✓'  },
  warning: { accent: '#E8A838', icon: '!'  },
};

function Toast({ toast, onDismiss }) {
  const { accent, icon } = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <div
      onClick={onDismiss}
      style={{
        display:        'flex',
        alignItems:     'flex-start',
        gap:            12,
        padding:        '12px 16px',
        background:     'rgba(12,9,7,0.96)',
        border:         `1px solid ${accent}50`,
        borderLeft:     `3px solid ${accent}`,
        borderRadius:   10,
        backdropFilter: 'blur(16px)',
        boxShadow:      `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent}15`,
        maxWidth:       300,
        pointerEvents:  'auto',
        cursor:         'pointer',
        opacity:        toast.visible ? 1 : 0,
        transform:      toast.visible ? 'translateY(0)' : 'translateY(8px)',
        transition:     'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{
          color:       accent,
          fontSize:    12,
          fontWeight:  600,
          fontFamily:  'Inter, sans-serif',
          marginBottom: 3,
          letterSpacing: '0.02em',
        }}>
          {toast.title}
        </div>
        <div style={{
          color:      'rgba(220,205,190,0.85)',
          fontSize:   11,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.5,
        }}>
          {toast.message}
        </div>
      </div>
    </div>
  );
}
