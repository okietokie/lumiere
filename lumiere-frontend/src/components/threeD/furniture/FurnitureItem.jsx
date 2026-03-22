// src/components/threeD/furniture/FurnitureItem.jsx
//
// TWO-GROUP ARCHITECTURE — solves both the scale-explosion bug and the
// "gizmo handles are far from the object" bug:
//
//   <outerGroup  position rotation scale={userScale}>   ← TransformControls target
//     <innerGroup scale={normScale}>                    ← normScale only, never touched by gizmo
//       <centerGroup position={-centroid}>              ← shifts model so its bbox centre is at origin
//         <primitive object={clonedScene} />
//       </centerGroup>
//     </innerGroup>
//   </outerGroup>
//
// • TransformControls attaches to outerGroup.
//   Its scale is userScale only — no normScale mixing.
// • React sets outerGroup.scale = userScale every render: that's clean, no fighting.
// • normScale lives in innerGroup which the gizmo never touches.
// • centroid offset ensures the gizmo handles appear centred on the visible mesh.
// • __normScale is still stored on outerGroup for the gizmo to read.

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

// ── Target sizes per category ─────────────────────────────────────────────────
const CATEGORY_TARGETS = {
  sofa:       { axis: 'x', size: 2.0 },
  sofas:      { axis: 'x', size: 2.0 },
  bed:        { axis: 'x', size: 2.0 },
  beds:       { axis: 'x', size: 2.0 },
  table:      { axis: 'y', size: 0.8 },
  tables:     { axis: 'y', size: 0.8 },
  chair:      { axis: 'y', size: 1.0 },
  chairs:     { axis: 'y', size: 1.0 },
  cupboard:   { axis: 'y', size: 1.8 },
  cupboards:  { axis: 'y', size: 1.8 },
  lamp:       { axis: 'y', size: 1.6 },
  lamps:      { axis: 'y', size: 1.6 },
  chandelier: { axis: 'y', size: 0.6 },
  curtain:    { axis: 'y', size: 2.4 },
  stair:      { axis: 'y', size: 2.4 },
  window:     { axis: 'y', size: 1.2 },
  others:     { axis: 'y', size: 1.2 },
};
const DEFAULT_TARGET = { axis: 'y', size: 1.2 };

function computeNormAndCentroid(scene, category) {
  try {
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return { normScale: 1, centroid: [0, 0, 0] };

    const size     = new THREE.Vector3();
    const centre   = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);

    const target  = CATEGORY_TARGETS[category?.toLowerCase()] || DEFAULT_TARGET;
    const current = size[target.axis];
    const norm    = (!current || !isFinite(current) || current < 0.0001)
      ? 1
      : Math.max(0.01, Math.min(100, target.size / current));

    // We shift the scene so that its bbox centre lands at the outer group's origin.
    // After normScale is applied the centroid offset must also be scaled:
    // innerGroup(normScale) -> centerGroup(-centroid) so we pass the pre-scaled offset.
    return {
      normScale: norm,
      centroid:  [centre.x, centre.y, centre.z],
    };
  } catch {
    return { normScale: 1, centroid: [0, 0, 0] };
  }
}

// Guard wrapper
const FurnitureItem = forwardRef((props, ref) => {
  if (!props.item?.url) return null;
  return <FurnitureInner ref={ref} {...props} />;
});

const FurnitureInner = forwardRef(({ item, isSelected, onSelect, setOrbitEnabled }, ref) => {
  const { scene }  = useGLTF(item.url);
  const [hovered, setHovered] = useState(false);
  const outerRef   = useRef();   // ← this is what TransformControls attaches to
  const innerRef   = useRef();   // normScale group — gizmo never touches this

  const { clonedScene, normScale, centroid } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const { normScale: ns, centroid: c } = computeNormAndCentroid(scene, item.category);
    return { clonedScene: clone, normScale: ns, centroid: c };
  }, [scene, item.category]);

  // Expose outerRef to parent, tagged with __normScale so FurnitureGizmo can read it
  useImperativeHandle(ref, () => {
    if (outerRef.current) outerRef.current.__normScale = normScale;
    return outerRef.current;
  }, [normScale]);

  useEffect(() => {
    if (outerRef.current) outerRef.current.__normScale = normScale;
  }, [normScale]);

  // Keep innerGroup scale in sync with normScale imperatively
  // (React sets it via JSX too, but this ensures it's always right)
  useEffect(() => {
    if (innerRef.current) innerRef.current.scale.setScalar(normScale);
  }, [normScale]);

  // Emissive highlight
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!mat?.emissive) return;
        if (isSelected)   { mat.emissive.set('#C49A6C'); mat.emissiveIntensity = 0.35; }
        else if (hovered) { mat.emissive.set('#8B6914'); mat.emissiveIntensity = 0.2;  }
        else              { mat.emissive.set('#000000'); mat.emissiveIntensity = 0;     }
      });
    });
  }, [isSelected, hovered, clonedScene]);

  const rawScale = Array.isArray(item.scale) ? item.scale : [1, 1, 1];

  return (
    // outerGroup — position / rotation / userScale — TransformControls target
    <group
      ref={outerRef}
      position={item.position}
      rotation={item.rotation}
      scale={rawScale}
      onClick={(e)       => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut={()   => {                      setHovered(false); document.body.style.cursor = 'auto';    }}
    >
      {/* innerGroup — normScale only — gizmo never touches this */}
      <group ref={innerRef} scale={[normScale, normScale, normScale]}>
        {/* centerGroup — shifts bbox centre to origin so handles sit on the mesh */}
        <group position={[-centroid[0], -centroid[1], -centroid[2]]}>
          <primitive object={clonedScene} />
        </group>
      </group>
    </group>
  );
});

export default FurnitureItem;