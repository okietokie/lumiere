import { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);
const COMPACT_VIEWPORT_MAX = 1100;
const SWIPE_DISMISS_THRESHOLD = 72;

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1440 : window.innerWidth
  ));
  const timers = useRef({});

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const show = useCallback((title, message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type, visible: true }]);

    timers.current[id] = window.setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, 350);
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
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

  const swipeEnabled = viewportWidth <= COMPACT_VIEWPORT_MAX;

  return (
    <ToastContext.Provider value={{ show, info, success, error }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: swipeEnabled ? 12 : 24,
          right: swipeEnabled ? 12 : 'auto',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: swipeEnabled ? 'stretch' : 'flex-start',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
            swipeEnabled={swipeEnabled}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TYPE_STYLES = {
  info: { accent: '#C49A6C', icon: 'i' },
  success: { accent: '#7FB069', icon: 'OK' },
  warning: { accent: '#E8A838', icon: '!' },
};

function Toast({ toast, onDismiss, swipeEnabled }) {
  const { accent, icon } = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeExitX, setSwipeExitX] = useState(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef(null);
  const movedRef = useRef(false);

  const resetDrag = useCallback(() => {
    setDragX(0);
    setIsDragging(false);
    setSwipeExitX(null);
    pointerIdRef.current = null;
    movedRef.current = false;
  }, []);

  useEffect(() => {
    if (!toast.visible) {
      setIsDragging(false);
      pointerIdRef.current = null;
      movedRef.current = false;
    }
  }, [toast.visible]);

  const handlePointerDown = useCallback((event) => {
    if (!swipeEnabled) return;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    movedRef.current = false;
    setIsDragging(true);
    setSwipeExitX(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [swipeEnabled]);

  const handlePointerMove = useCallback((event) => {
    if (!swipeEnabled || pointerIdRef.current !== event.pointerId) return;
    const nextX = event.clientX - startXRef.current;
    if (Math.abs(nextX) > 8) movedRef.current = true;
    setDragX(nextX);
  }, [swipeEnabled]);

  const finishSwipeDismiss = useCallback((direction) => {
    const viewport = typeof window === 'undefined' ? 420 : window.innerWidth;
    setSwipeExitX(direction * (viewport + 120));
    setIsDragging(false);
    pointerIdRef.current = null;
    movedRef.current = false;
    window.setTimeout(() => onDismiss(), 18);
  }, [onDismiss]);

  const handlePointerEnd = useCallback((event) => {
    if (!swipeEnabled || pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (Math.abs(dragX) >= SWIPE_DISMISS_THRESHOLD) {
      finishSwipeDismiss(dragX === 0 ? 1 : Math.sign(dragX));
      return;
    }
    resetDrag();
  }, [dragX, finishSwipeDismiss, resetDrag, swipeEnabled]);

  const handleClick = useCallback(() => {
    if (swipeEnabled && movedRef.current) {
      movedRef.current = false;
      return;
    }
    onDismiss();
  }, [onDismiss, swipeEnabled]);

  const effectiveX = swipeExitX ?? dragX;
  const baseY = toast.visible ? 0 : 8;
  const swipeOpacity = swipeEnabled ? Math.max(0.2, 1 - Math.abs(effectiveX) / 180) : 1;
  const opacity = (toast.visible ? 1 : 0) * swipeOpacity;

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        background: 'rgba(12,9,7,0.96)',
        border: `1px solid ${accent}50`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent}15`,
        maxWidth: swipeEnabled ? 'min(100%, 520px)' : 300,
        width: swipeEnabled ? '100%' : 'auto',
        pointerEvents: 'auto',
        cursor: swipeEnabled ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        touchAction: swipeEnabled ? 'pan-y' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity,
        transform: `translate3d(${effectiveX}px, ${baseY}px, 0)`,
        transition: isDragging ? 'none' : 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <span
        style={{
          minWidth: 20,
          color: accent,
          fontSize: 11,
          lineHeight: 1.2,
          fontWeight: 700,
          marginTop: 2,
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        {icon}
      </span>
      <div>
        <div
          style={{
            color: accent,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            marginBottom: 3,
            letterSpacing: '0.02em',
          }}
        >
          {toast.title}
        </div>
        <div
          style={{
            color: 'rgba(220,205,190,0.85)',
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
          }}
        >
          {toast.message}
        </div>
      </div>
    </div>
  );
}
