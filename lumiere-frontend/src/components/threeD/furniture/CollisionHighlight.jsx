import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function CollisionHighlight({ placedItems, itemStates, furnitureRefs }) {
  const groupRef = useRef();
  const helpers  = useRef({}); // id → Box3Helper

  useFrame(() => {
    if (!groupRef.current) return;

    const activeIds = new Set(
      placedItems
        .filter((i) => itemStates[i.id] === 'collision' || itemStates[i.id] === 'warning')
        .map((i) => i.id)
    );

    // Remove helpers for items no longer in collision/warning
    Object.keys(helpers.current).forEach((id) => {
      if (!activeIds.has(id)) {
        groupRef.current.remove(helpers.current[id]);
        helpers.current[id].dispose?.();
        delete helpers.current[id];
      }
    });

    // Add/update helpers for current items
    activeIds.forEach((id) => {
      const mesh  = furnitureRefs.current?.[id];
      if (!mesh) return;

      const box   = new THREE.Box3().setFromObject(mesh);
      const isCol = itemStates[id] === 'collision';
      const color = isCol ? 0xC0504D : 0xC49A6C;

      if (!helpers.current[id]) {
        const helper = new THREE.Box3Helper(box, color);
        helpers.current[id] = helper;
        groupRef.current.add(helper);
      } else {
        helpers.current[id].box.copy(box);
        helpers.current[id].material.color.set(color);
      }
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(helpers.current).forEach((h) => h.dispose?.());
    };
  }, []);

  return <group ref={groupRef} />;
}

