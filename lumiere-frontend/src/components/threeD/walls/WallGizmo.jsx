// src/components/walls/WallGizmo.jsx
import React from 'react';
import { TransformControls } from "@react-three/drei";

export default function WallGizmo({ selectedWall, wallRef, gizmoMode, updateWall, setOrbitEnabled }) {
  if (!selectedWall || !wallRef.current) return null;

  return (
    <TransformControls
      object={wallRef.current}
      mode={gizmoMode}

      onMouseDown={() => setOrbitEnabled(false)}
      onMouseUp={() => {
        setOrbitEnabled(true);
        const obj = wallRef.current;

        // 1. Get the new center position from the Gizmo
        const cx = obj.position.x;
        const cz = obj.position.z;

        // 2. Get the new rotation angle (We use -y because of ThreeJS orientation)
        const newAngle = -obj.rotation.y;

        // 3. Get the new scales
        const scaleX = obj.scale.x;
        const scaleY = obj.scale.y;
        const scaleZ = obj.scale.z;

        // 4. Calculate original length
        const origLength = Math.hypot(selectedWall.end[0] - selectedWall.start[0], selectedWall.end[1] - selectedWall.start[1]);

        // 5. Apply the scales to the dimensions
        const newLength = origLength * scaleX;
        const newHeight = selectedWall.height * scaleY;
        const newThickness = selectedWall.thickness * scaleZ;

        // 6. Calculate the new start and end points based on the new angle and center!
        const dx = (Math.cos(newAngle) * newLength) / 2;
        const dz = (Math.sin(newAngle) * newLength) / 2;

        const newStart = [cx - dx, cz - dz];
        const newEnd = [cx + dx, cz + dz];

        // 7. Reset the 3D mesh scale back to 1 before React updates to prevent visual glitches
        obj.scale.set(1, 1, 1);

        // 8. Update the main React state
        updateWall(selectedWall.id, {
          start: newStart,
          end: newEnd,
          height: newHeight,
          thickness: newThickness
        });
      }}
    />
  );
}