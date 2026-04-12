import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../../utils/apiBase';

const POLL_MS  = 2000;
const _cache = {};   // filename → 'idle' | 'downloading' | 'ready'
const _subs  = {};   // filename → Set of setStatus callbacks
const _polls = {};   // filename → interval id

function subscribe(filename, cb) {
  if (!_subs[filename]) _subs[filename] = new Set();
  _subs[filename].add(cb);
}
function unsubscribe(filename, cb) {
  _subs[filename]?.delete(cb);
}
function notify(filename) {
  _subs[filename]?.forEach((cb) => cb(_cache[filename]));
}

async function _pollOnce(filename) {
  try {
    const res  = await fetch(apiUrl(`/models/status/${filename}`));
    if (!res.ok) return;
    const data = await res.json();
    const next = data.ready ? 'ready' : 'downloading';
    if (_cache[filename] !== next) {
      _cache[filename] = next;
      notify(filename);
    }
    if (next === 'ready' && _polls[filename]) {
      clearInterval(_polls[filename]);
      delete _polls[filename];
    }
  } catch { /* retry next tick */ }
}

function _startPolling(filename) {
  if (_polls[filename] || _cache[filename] === 'ready') return;
  if (!_cache[filename]) _cache[filename] = 'downloading';
  _pollOnce(filename); // check immediately
  _polls[filename] = setInterval(() => _pollOnce(filename), POLL_MS);
}
export async function prefetchModel(filename) {
  if (_cache[filename] === 'ready') return;
  _startPolling(filename); // start polling right away (optimistic)
  try {
    await fetch(apiUrl(`/models/prefetch/${filename}`), { method: 'POST' });
  } catch { /* ignore network errors */ }
}
export function useModelStatus(filename) {
  const [status, setStatus] = useState(_cache[filename] || 'idle');

  useEffect(() => {
    setStatus(_cache[filename] || 'idle');
    subscribe(filename, setStatus);
    return () => unsubscribe(filename, setStatus);
  }, [filename]);

  return status;
}
export function useModelPolling(filename, active) {
  useEffect(() => {
    if (active && _cache[filename] !== 'ready') {
      _startPolling(filename);
    }
  }, [filename, active]);
}
export class ModelErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e) { console.warn('[ModelErrorBoundary]', e?.message); }
  render() {
    if (this.state.error) return this.props.fallback || null;
    return this.props.children;
  }
}
export function LoadingPlaceholder({ scale = [1, 1, 1] }) {
  return (
    <mesh scale={scale}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial color="#C49A6C" wireframe opacity={0.35} transparent />
    </mesh>
  );
}
