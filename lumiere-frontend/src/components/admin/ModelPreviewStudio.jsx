import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Progress, Switch, Typography } from 'antd';
import { Canvas, useThree } from '@react-three/fiber';
import { Center, ContactShadows, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { COLORS } from '../../utils/colors';
import { fetchModelManifest } from '../../hooks/useModelPrefetch';
import { resolveGlbUrl } from '../threeD/furniture/FurnitureItem';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function computeFraming(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.5);
  const normalizedScale = 1.8 / maxDim;
  const scaledHeight = Math.max(size.y * normalizedScale, 0.75);
  const distance = Math.max(2.2, scaledHeight * 2.6);

  return {
    center,
    scale: normalizedScale,
    floorY: -(size.y * normalizedScale) / 2,
    cameraPosition: [distance * 0.82, distance * 0.58, distance],
    lookAt: [0, Math.max(0.08, scaledHeight * 0.03), 0],
    shadowScale: Math.max(2.6, maxDim * normalizedScale * 1.8),
  };
}

function PreviewSubject({ model, onReady }) {
  const { camera, invalidate } = useThree();
  const { scene } = useGLTF(resolveGlbUrl(model.url, model.filename));

  const { clone, framing } = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return {
      clone: cloned,
      framing: computeFraming(cloned),
    };
  }, [scene]);

  useEffect(() => {
    camera.position.set(...framing.cameraPosition);
    camera.lookAt(...framing.lookAt);
    camera.near = 0.01;
    camera.far = 100;
    camera.updateProjectionMatrix();
    invalidate();

    const t1 = requestAnimationFrame(() => {
      const t2 = requestAnimationFrame(() => onReady());
      return () => cancelAnimationFrame(t2);
    });
    return () => cancelAnimationFrame(t1);
  }, [camera, framing, invalidate, onReady]);

  return (
    <>
      <color attach="background" args={['#ece6de']} />
      <fog attach="fog" args={['#ece6de', 5, 14]} />

      <ambientLight intensity={1.1} color="#fff9f2" />
      <hemisphereLight intensity={0.85} color="#fff6ea" groundColor="#d8d0c5" />
      <directionalLight
        castShadow
        intensity={2.1}
        color="#fff8ef"
        position={[4.5, 6, 5]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight intensity={0.8} color="#e7dbc9" position={[-4, 3.5, -2]} />

      <group scale={framing.scale}>
        <Center position={[-framing.center.x * framing.scale, -framing.center.y * framing.scale, -framing.center.z * framing.scale]}>
          <primitive object={clone} />
        </Center>
      </group>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, framing.floorY - 0.02, 0]}>
        <planeGeometry args={[8, 8]} />
        <shadowMaterial opacity={0.12} />
      </mesh>

      <ContactShadows
        position={[0, framing.floorY, 0]}
        opacity={0.28}
        scale={framing.shadowScale}
        blur={2.8}
        far={4.5}
        color="#1f1c18"
      />
    </>
  );
}

async function canvasToPreviewBlob(canvas) {
  const makeBlob = (type, quality) => new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });

  return (
    await makeBlob('image/webp', 0.94) ||
    await makeBlob('image/jpeg', 0.94)
  );
}

function PreviewRenderWorker({ model, forceRefresh, onComplete }) {
  const canvasRef = useRef(null);
  const completedRef = useRef(false);

  const uploadPreview = useCallback(async () => {
    if (completedRef.current || !canvasRef.current) return;
    completedRef.current = true;

    try {
      const blob = await canvasToPreviewBlob(canvasRef.current);
      if (!blob) throw new Error('Could not capture preview image');

      const extension = blob.type.includes('webp') ? 'webp' : 'jpg';
      const formData = new FormData();
      formData.append('file', new File([blob], `${model.id}.${extension}`, { type: blob.type }));

      const response = await fetch(`${API_BASE}/api/models/${model.id}/preview`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || 'Preview upload failed');
      }

      const data = await response.json();
      onComplete({ ok: true, preview_url: data.preview_url });
    } catch (error) {
      onComplete({ ok: false, error: error.message || 'Preview generation failed' });
    }
  }, [model.id, onComplete]);

  useEffect(() => {
    completedRef.current = false;
  }, [model.id, forceRefresh]);

  return (
    <div style={{ width: 420, height: 420, borderRadius: 24, overflow: 'hidden', border: `1px solid ${COLORS.secondary}30` }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 32, position: [2.4, 1.5, 2.9] }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
        }}
      >
        <Suspense fallback={null}>
          <PreviewSubject model={model} onReady={uploadPreview} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default function ModelPreviewStudio() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModelManifest({ force: true });
      setModels(data);
      setCurrentIndex(0);
      setLogs([]);
    } catch (fetchError) {
      setError(fetchError.message || 'Could not load models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const queue = useMemo(
    () => models.filter((model) => forceRefresh || !model.preview_url),
    [models, forceRefresh],
  );

  const currentModel = running ? queue[currentIndex] : null;
  const percent = queue.length ? Math.round((currentIndex / queue.length) * 100) : 100;

  const handleResult = useCallback((result) => {
    if (!currentModel) return;

    setLogs((prev) => [
      {
        id: `${currentModel.id}-${prev.length}`,
        model: currentModel.name,
        ok: result.ok,
        message: result.ok ? 'Preview uploaded' : result.error,
      },
      ...prev,
    ]);

    if (result.ok && result.preview_url) {
      setModels((prev) => prev.map((item) => (
        item.id === currentModel.id ? { ...item, preview_url: result.preview_url } : item
      )));
    }

    setCurrentIndex((index) => {
      const next = index + 1;
      if (next >= queue.length) {
        setRunning(false);
        return 0;
      }
      return next;
    });
  }, [currentModel, queue.length]);

  return (
    <div style={{
      minHeight: '100vh',
      padding: '48px 28px',
      background: `linear-gradient(180deg, ${COLORS.background} 0%, ${COLORS.surface} 100%)`,
      color: COLORS.text,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24 }}>
        <Card style={{ background: `${COLORS.surface}E6`, borderColor: `${COLORS.secondary}40` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <Typography.Title level={2} style={{ color: COLORS.text, margin: 0 }}>
                Model Preview Studio
              </Typography.Title>
              <Typography.Paragraph style={{ color: COLORS.secondary, marginTop: 8, maxWidth: 720 }}>
                Generates polished catalog thumbnails from your real 3D models, uploads them to B2, and stores the returned
                preview URL on each model. The site can then show a beautiful image by default and switch to live 3D on hover or tap.
              </Typography.Paragraph>
            </div>
            <div style={{ display: 'grid', gap: 12, minWidth: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ color: COLORS.text }}>Regenerate all previews</span>
                <Switch checked={forceRefresh} onChange={setForceRefresh} disabled={running} />
              </div>
              <Button type="primary" disabled={loading || running || queue.length === 0} onClick={() => setRunning(true)}>
                {loading ? 'Loading Models...' : running ? 'Generating...' : `Generate ${queue.length} Preview${queue.length === 1 ? '' : 's'}`}
              </Button>
              <Button disabled={running} onClick={loadModels}>
                Refresh Model List
              </Button>
            </div>
          </div>
        </Card>

        {error && <Alert type="error" message={error} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: 24, alignItems: 'start' }}>
          <Card style={{ background: `${COLORS.surface}E6`, borderColor: `${COLORS.secondary}40` }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={{ color: COLORS.secondary, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Progress
                </div>
                <div style={{ color: COLORS.text, fontSize: 22, marginTop: 6 }}>
                  {running && currentModel ? `Rendering ${currentModel.name}` : 'Ready'}
                </div>
              </div>

              <Progress percent={running ? percent : 0} status={running ? 'active' : 'normal'} />

              {currentModel ? (
                <PreviewRenderWorker
                  key={`${currentModel.id}-${forceRefresh ? 'force' : 'missing'}`}
                  model={currentModel}
                  forceRefresh={forceRefresh}
                  onComplete={handleResult}
                />
              ) : (
                <div style={{
                  width: 420,
                  height: 420,
                  maxWidth: '100%',
                  borderRadius: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(180deg, #f2ece3 0%, #ddd4c7 100%)',
                  color: '#7b6f63',
                }}>
                  {queue.length === 0 ? 'All previews are already present.' : 'Press generate to start.'}
                </div>
              )}
            </div>
          </Card>

          <Card style={{ background: `${COLORS.surface}E6`, borderColor: `${COLORS.secondary}40` }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ color: COLORS.secondary }}>
                Missing previews: {models.filter((item) => !item.preview_url).length} / {models.length}
              </div>
              <div style={{ display: 'grid', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
                {logs.length === 0 && (
                  <div style={{ color: COLORS.secondary }}>No preview jobs have run yet.</div>
                )}
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      borderRadius: 14,
                      padding: '12px 14px',
                      border: `1px solid ${entry.ok ? '#7ec28b55' : '#d96d6d55'}`,
                      background: entry.ok ? '#20342655' : '#3b232355',
                    }}
                  >
                    <div style={{ color: COLORS.text, fontWeight: 600 }}>{entry.model}</div>
                    <div style={{ color: entry.ok ? '#9ee2ab' : '#ff9c9c', fontSize: 12, marginTop: 4 }}>
                      {entry.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
