import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useToast } from "../ui/ToastNotification";

const PERFORMANCE_STORAGE_KEY = "lumiere-performance-mode";
const PERFORMANCE_OPTIONS = ["auto", "high", "lite"];

const QUALITY_PROFILES = {
  high: {
    reduceMotion: false,
    editorDpr: [1, 1.5],
    landingDpr: [1, 1.6],
    logoDpr: [1, 1.5],
    shadows: true,
    antialias: true,
    preserveDrawingBuffer: true,
    contactShadows: true,
    environment: true,
    floatEffects: true,
    lightAnimation: true,
    glowAnimation: true,
    headBob: true,
    maxDynamicLights: Number.POSITIVE_INFINITY,
  },
  lite: {
    reduceMotion: true,
    editorDpr: [1, 1],
    landingDpr: [1, 1.05],
    logoDpr: [1, 1],
    shadows: false,
    antialias: false,
    preserveDrawingBuffer: true,
    contactShadows: false,
    environment: false,
    floatEffects: false,
    lightAnimation: false,
    glowAnimation: false,
    headBob: false,
    maxDynamicLights: 2,
  },
};

const PerformanceModeContext = createContext(null);

function getStoredPreference() {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(PERFORMANCE_STORAGE_KEY);
  return PERFORMANCE_OPTIONS.includes(stored) ? stored : "auto";
}

function detectAutoMode() {
  if (typeof window === "undefined") return "high";

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const touchDevice = (navigator.maxTouchPoints ?? 0) > 0;
  const deviceMemory = navigator.deviceMemory ?? 8;
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 8;
  const narrowViewport = window.innerWidth < 900;
  const oldWebKit = /OS (1[0-5]|9)_\d/i.test(navigator.userAgent);

  const shouldUseLite =
    reducedMotion ||
    oldWebKit ||
    deviceMemory <= 4 ||
    hardwareConcurrency <= 4 ||
    (touchDevice && narrowViewport && (deviceMemory <= 6 || hardwareConcurrency <= 6));

  return shouldUseLite ? "lite" : "high";
}

export function PerformanceModeProvider({ children }) {
  const toast = useToast();
  const [preference, setPreferenceState] = useState(getStoredPreference);
  const [autoBaseMode, setAutoBaseMode] = useState(() => detectAutoMode());
  const [autoLiteTriggered, setAutoLiteTriggered] = useState(false);
  const lowFpsCountRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateAutoMode = () => setAutoBaseMode(detectAutoMode());
    updateAutoMode();
    window.addEventListener("resize", updateAutoMode);
    return () => window.removeEventListener("resize", updateAutoMode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PERFORMANCE_STORAGE_KEY, preference);
  }, [preference]);

  const effectiveMode = preference === "auto"
    ? (autoLiteTriggered ? "lite" : autoBaseMode)
    : preference;

  const setPreference = useCallback((nextPreference) => {
    const normalized = PERFORMANCE_OPTIONS.includes(nextPreference) ? nextPreference : "auto";
    lowFpsCountRef.current = 0;
    setAutoLiteTriggered(false);
    setPreferenceState(normalized);
  }, []);

  const reportFrameSample = useCallback((fps, meta = {}) => {
    if (preference !== "auto" || effectiveMode === "lite" || autoLiteTriggered) return;

    if (fps < 28) {
      lowFpsCountRef.current += 1;
    } else if (fps > 34) {
      lowFpsCountRef.current = 0;
    }

    if (lowFpsCountRef.current < 2) return;

    lowFpsCountRef.current = 0;
    setAutoLiteTriggered(true);

    const surfaceLabel = meta?.label ? ` for ${meta.label}` : "";
    toast?.info?.(
      `Performance mode switched to Lite${surfaceLabel} to keep motion smoother on this device.`,
      "Performance Mode"
    );
  }, [autoLiteTriggered, effectiveMode, preference, toast]);

  const value = useMemo(() => {
    const quality = QUALITY_PROFILES[effectiveMode] ?? QUALITY_PROFILES.high;
    return {
      preference,
      effectiveMode,
      autoBaseMode,
      autoLiteTriggered,
      isLite: effectiveMode === "lite",
      isAuto: preference === "auto",
      quality,
      setPreference,
      reportFrameSample,
    };
  }, [autoBaseMode, autoLiteTriggered, effectiveMode, preference, reportFrameSample, setPreference]);

  return (
    <PerformanceModeContext.Provider value={value}>
      {children}
    </PerformanceModeContext.Provider>
  );
}

export function usePerformanceMode() {
  const context = useContext(PerformanceModeContext);
  if (!context) {
    throw new Error("usePerformanceMode must be used within a PerformanceModeProvider.");
  }
  return context;
}

export function PerformanceFrameMonitor({ label = "scene", sampleMs = 2000 }) {
  const { reportFrameSample } = usePerformanceMode();
  const sampleRef = useRef({ frames: 0, elapsedMs: 0 });

  useFrame((_, delta) => {
    sampleRef.current.frames += 1;
    sampleRef.current.elapsedMs += delta * 1000;

    if (sampleRef.current.elapsedMs < sampleMs) return;

    const fps = sampleRef.current.frames / (sampleRef.current.elapsedMs / 1000);
    reportFrameSample(fps, { label });
    sampleRef.current.frames = 0;
    sampleRef.current.elapsedMs = 0;
  });

  return null;
}

export function PerformanceModeDock() {
  const { preference, effectiveMode, autoBaseMode, autoLiteTriggered, setPreference } = usePerformanceMode();
  const [open, setOpen] = useState(false);

  const statusCopy = preference === "auto"
    ? autoLiteTriggered
      ? "Auto selected Lite after detecting slow frame rates."
      : `Auto is currently using ${autoBaseMode === "lite" ? "Lite" : "High"}.`
    : `Manual mode is set to ${effectiveMode === "lite" ? "Lite" : "High"}.`;

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 9997 }}>
      {open && (
        <div
          style={{
            width: 250,
            marginBottom: 10,
            padding: 14,
            borderRadius: 16,
            background: "rgba(20, 16, 13, 0.94)",
            border: "1px solid rgba(196, 154, 108, 0.28)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div style={{ color: "#f2e5d5", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            Performance Mode
          </div>
          <div style={{ color: "rgba(242, 229, 213, 0.72)", fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>
            {statusCopy}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {PERFORMANCE_OPTIONS.map((option) => {
              const active = preference === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPreference(option)}
                  style={{
                    border: active ? "1px solid rgba(196, 154, 108, 0.64)" : "1px solid rgba(196, 154, 108, 0.18)",
                    borderRadius: 10,
                    background: active ? "rgba(196, 154, 108, 0.16)" : "rgba(255,255,255,0.02)",
                    color: "#f2e5d5",
                    padding: "9px 8px",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {option === "auto" ? "Auto" : option === "lite" ? "Lite" : "High"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open performance mode settings"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid rgba(196, 154, 108, 0.24)",
          borderRadius: 999,
          background: "rgba(20, 16, 13, 0.92)",
          color: "#f2e5d5",
          padding: "10px 14px",
          cursor: "pointer",
          boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: effectiveMode === "lite" ? "#e8a838" : "#7fb069",
            boxShadow: `0 0 10px ${effectiveMode === "lite" ? "rgba(232,168,56,0.4)" : "rgba(127,176,105,0.4)"}`,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {preference === "auto" ? `Auto: ${effectiveMode === "lite" ? "Lite" : "High"}` : effectiveMode === "lite" ? "Lite" : "High"}
        </span>
      </button>
    </div>
  );
}
