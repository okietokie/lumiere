// src/hooks/useRecorder.js
//
// Dual-mode recorder for Lumiere Maison.
//
// AUTO mode  — animates a smooth 360° orbit then stops automatically.
//              The resulting blob is uploaded to the backend and a URL
//              is returned so it can be saved with the project.
//
// MANUAL mode — starts recording immediately; user controls the camera;
//               user presses stop; the blob is downloaded to their device.
//
// Both modes work by calling canvas.captureStream(fps) — no external libs.
// The canvas ref must come from the R3F <Canvas> element (preserveDrawingBuffer
// does NOT need to be true for captureStream — it's a different API path).

import { useState, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Resolution caps
const DESKTOP_W = 1280, DESKTOP_H = 720;
const MOBILE_W  = 854,  MOBILE_H  = 480;
const FPS       = 30;

// Auto-capture: how long the full 360° orbit takes (ms)
const AUTO_DURATION_MS = 6000;

function isMobile() {
  return window.innerWidth < 768;
}

function getCanvas(canvasWrapperRef) {
  if (!canvasWrapperRef?.current) return null;
  return canvasWrapperRef.current.querySelector('canvas')
      ?? canvasWrapperRef.current;
}

function buildRecorder(canvas) {
  const stream = canvas.captureStream(FPS);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';
  const opts = mimeType ? { mimeType, videoBitsPerSecond: 3_000_000 } : {};
  return new MediaRecorder(stream, opts);
}

export default function useRecorder({ canvasWrapperRef, orbitControlsRef, projectId }) {
  const [recState,    setRecState]    = useState('idle');
  // idle | auto-starting | auto-recording | manual-recording | processing | done | error
  const [progress,    setProgress]    = useState(0);   // 0-100, auto mode only
  const [lastVideoUrl, setLastVideoUrl] = useState(null); // object URL of last recording

  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(0);
  const autoResolveRef = useRef(null);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      try { mediaRecRef.current.stop(); } catch (_) {}
    }
    chunksRef.current = [];
  }, []);

  // ── Upload blob to backend (auto mode) ────────────────────────────────────
  const uploadBlob = useCallback(async (blob) => {
    if (!projectId) return null;
    const fd = new FormData();
    fd.append('video', blob, 'preview.webm');
    fd.append('project_id', projectId);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/video`, {
        method: 'POST',
        body:   fd,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.video_url ?? null;
    } catch {
      return null;
    }
  }, [projectId]);

  // ── Download blob locally (manual mode) ──────────────────────────────────
  const downloadBlob = useCallback((blob, filename = 'lumiere_recording.webm') => {
    const url = URL.createObjectURL(blob);
    setLastVideoUrl(url);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = filename;
    a.click();
    // Don't revoke immediately — keep for the preview player
  }, []);

  // ── Shared: collect chunks ────────────────────────────────────────────────
  function attachListeners(recorder, onStop) {
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'video/webm',
      });
      onStop(blob);
    };
  }

  // ── AUTO CAPTURE ──────────────────────────────────────────────────────────
  const startAutoCapture = useCallback(async () => {
    const canvas = getCanvas(canvasWrapperRef);
    if (!canvas) { setRecState('error'); return; }

    setRecState('auto-starting');
    setProgress(0);
    cancelAnimationFrame(animFrameRef.current);

    // Snapshot the orbit controls' current state so we can restore it
    const ctrl   = orbitControlsRef?.current;
    const origAutoRotate = ctrl?.autoRotate ?? false;
    const origEnabled    = ctrl?.enabled    ?? true;

    // Give the UI one frame to update before starting heavy work
    await new Promise((r) => setTimeout(r, 80));

    const recorder = buildRecorder(canvas);
    mediaRecRef.current = recorder;

    return new Promise((resolve) => {
      autoResolveRef.current = resolve;

      attachListeners(recorder, async (blob) => {
        setRecState('processing');
        // Restore controls
        if (ctrl) { ctrl.autoRotate = origAutoRotate; ctrl.enabled = origEnabled; }

        const videoUrl = await uploadBlob(blob);
        setLastVideoUrl(URL.createObjectURL(blob));
        setRecState('done');
        setProgress(100);
        resolve(videoUrl);
      });

      recorder.start(200); // collect chunks every 200ms
      setRecState('auto-recording');
      startTimeRef.current = performance.now();

      // Animate: enable auto-rotate on OrbitControls for the duration
      if (ctrl) {
        ctrl.enabled    = true;
        ctrl.autoRotate = true;
        ctrl.autoRotateSpeed = 360 / (AUTO_DURATION_MS / 1000); // full 360° in AUTO_DURATION_MS
      }

      // Progress ticker + auto-stop
      const tick = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const pct     = Math.min(100, (elapsed / AUTO_DURATION_MS) * 100);
        setProgress(Math.round(pct));

        if (elapsed >= AUTO_DURATION_MS) {
          recorder.stop();
          cancelAnimationFrame(animFrameRef.current);
          return;
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    });
  }, [canvasWrapperRef, orbitControlsRef, uploadBlob]);

  // ── MANUAL RECORD ─────────────────────────────────────────────────────────
  const startManualRecording = useCallback(() => {
    const canvas = getCanvas(canvasWrapperRef);
    if (!canvas) { setRecState('error'); return; }

    const recorder = buildRecorder(canvas);
    mediaRecRef.current = recorder;

    attachListeners(recorder, (blob) => {
      setRecState('processing');
      const name = `lumiere_walkthrough_${Date.now()}.webm`;
      downloadBlob(blob, name);
      setRecState('done');
    });

    recorder.start(200);
    setRecState('manual-recording');
    startTimeRef.current = performance.now();
  }, [canvasWrapperRef, downloadBlob]);

  const stopManualRecording = useCallback(() => {
    if (mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.stop();
    }
  }, []);

  // ── CANCEL ────────────────────────────────────────────────────────────────
  const cancelRecording = useCallback(() => {
    cleanup();
    setRecState('idle');
    setProgress(0);
    autoResolveRef.current?.(null);
    autoResolveRef.current = null;
  }, [cleanup]);

  // ── RESET to idle (after done/error) ──────────────────────────────────────
  const resetRecorder = useCallback(() => {
    setRecState('idle');
    setProgress(0);
  }, []);

  const isRecording = recState === 'auto-recording' || recState === 'manual-recording';
  const isBusy      = recState !== 'idle' && recState !== 'done' && recState !== 'error';

  return {
    recState,
    progress,
    lastVideoUrl,
    isRecording,
    isBusy,
    startAutoCapture,
    startManualRecording,
    stopManualRecording,
    cancelRecording,
    resetRecorder,
  };
}