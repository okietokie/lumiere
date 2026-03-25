import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';
import { resolveGlbUrl, resolveModelPreviewUrls } from './FurnitureItem';

function SpinnerMesh() {
  const ref = useRef(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 2;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.3, 0.06, 8, 32]} />
      <meshBasicMaterial color="#C49A6C" />
    </mesh>
  );
}

class CardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <mesh>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#7A6559" wireframe />
        </mesh>
      );
    }
    return this.props.children;
  }
}

function RotatingModel({ url, filename }) {
  const { scene } = useGLTF(resolveGlbUrl(url, filename));
  const cloned = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  return (
    <Bounds fit clip observe margin={1.3}>
      <Center>
        <primitive object={cloned} />
      </Center>
    </Bounds>
  );
}

function CardPreview({ url, filename }) {
  const [ready, setReady] = useState(false);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!ready && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${COLORS.surface}CC`,
          borderRadius: 8,
        }}>
          <div style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `2px solid ${COLORS.action}40`,
            borderTopColor: COLORS.action,
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
      <Canvas
        frameloop="demand"
        camera={{ position: [1.5, 1.5, 1.5], fov: 45 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent', borderRadius: 8 }}
        onCreated={() => setReady(true)}
      >
        <ambientLight intensity={0.5} color="#FFF5E6" />
        <directionalLight position={[3, 5, 3]} intensity={0.8} color="#FFEAD2" />
        <pointLight position={[-2, 2, -2]} intensity={0.3} color="#C49A6C" />

        <CardErrorBoundary>
          <Suspense fallback={<SpinnerMesh />}>
            <RotatingModel url={url} filename={filename} />
          </Suspense>
        </CardErrorBoundary>

        <OrbitControls
          autoRotate
          autoRotateSpeed={3}
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
        />
      </Canvas>
    </div>
  );
}

function ThumbnailPreview({ previewUrl, url, filename, alt, onFallback }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = useMemo(
    () => resolveModelPreviewUrls(url, filename, previewUrl),
    [previewUrl, url, filename],
  );

  useEffect(() => {
    setCandidateIndex(0);
  }, [previewUrl, url, filename]);

  useEffect(() => {
    if (!candidates.length) onFallback();
  }, [candidates, onFallback]);

  const activeSrc = candidates[candidateIndex];
  if (!activeSrc) return null;

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex((current) => current + 1);
        } else {
          onFallback();
        }
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
      }}
    />
  );
}

function isTouchPreferred() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

export default function FurnitureModelCard({ model, onPlace }) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [useCanvasPreview, setUseCanvasPreview] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [touchPreferred, setTouchPreferred] = useState(isTouchPreferred);
  const cardRef = useRef(null);
  const unmountTimer = useRef(null);

  useEffect(() => {
    const updateTouchMode = () => setTouchPreferred(isTouchPreferred());
    updateTouchMode();
    window.addEventListener('resize', updateTouchMode);
    return () => window.removeEventListener('resize', updateTouchMode);
  }, []);

  useEffect(() => {
    setUseCanvasPreview(false);
    setMobilePreviewOpen(false);
  }, [model.url, model.filename, model.preview_url]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(unmountTimer.current);
          setVisible(true);
        } else {
          unmountTimer.current = setTimeout(() => setVisible(false), 4000);
        }
      },
      { threshold: 0.05, rootMargin: '80px' },
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(unmountTimer.current);
    };
  }, []);

  const shouldShowLivePreview = Boolean(model.url) && visible && (
    useCanvasPreview || (!touchPreferred && hovered) || (touchPreferred && mobilePreviewOpen)
  );

  const handleClick = () => {
    if (touchPreferred && model.url && !mobilePreviewOpen) {
      setMobilePreviewOpen(true);
      return;
    }
    onPlace();
  };

  let previewContent;
  if (!model.url) {
    previewContent = (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        color: COLORS.secondary,
        letterSpacing: '0.08em',
      }}>
        MODEL
      </div>
    );
  } else if (shouldShowLivePreview) {
    previewContent = <CardPreview url={model.url} filename={model.filename} />;
  } else {
    previewContent = (
      <ThumbnailPreview
        previewUrl={model.preview_url}
        url={model.url}
        filename={model.filename}
        alt={model.name}
        onFallback={() => setUseCanvasPreview(true)}
      />
    );
  }

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (!touchPreferred) setMobilePreviewOpen(false);
      }}
      title={`Place ${model.name}`}
      style={{
        background: hovered ? `${COLORS.action}18` : `${COLORS.surface}80`,
        border: `1px solid ${hovered ? COLORS.action : COLORS.secondary + '50'}`,
        borderRadius: 12,
        padding: 8,
        cursor: 'pointer',
        transition: 'all 0.18s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        color: COLORS.text,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: '100%',
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
      }}>
        {previewContent}
      </div>

      {model.size_bytes > 0 && (
        <div style={{
          position: 'absolute',
          top: 6,
          left: 6,
          background: 'rgba(0,0,0,0.55)',
          color: 'rgba(200,185,170,0.7)',
          fontSize: 8,
          padding: '1px 5px',
          borderRadius: 4,
          fontFamily: 'Inter, sans-serif',
          pointerEvents: 'none',
        }}>
          {model.size_bytes < 1_000_000
            ? `${Math.round(model.size_bytes / 1024)}KB`
            : `${(model.size_bytes / 1_000_000).toFixed(1)}MB`}
        </div>
      )}

      <span style={{
        fontSize: 11,
        color: hovered ? COLORS.action : COLORS.text,
        textAlign: 'center',
        lineHeight: 1.3,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
        transition: 'color 0.18s',
        fontFamily: 'Inter, sans-serif',
      }}>
        {model.name}
      </span>

      {hovered && !touchPreferred && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: COLORS.action + 'DD',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          letterSpacing: '0.04em',
          pointerEvents: 'none',
        }}>
          + PLACE
        </div>
      )}

      {touchPreferred && model.url && !mobilePreviewOpen && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: `${COLORS.background}DD`,
          color: COLORS.text,
          fontSize: 8,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 4,
          letterSpacing: '0.04em',
          pointerEvents: 'none',
        }}>
          TAP TO PREVIEW
        </div>
      )}
    </button>
  );
}
