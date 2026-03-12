// src/components/helpers/Wall.jsx
import { forwardRef } from "react";

const WallE = forwardRef(({ wall, isSelected, onSelect }, ref) => {
  return (
    <mesh
      ref={ref}
      position={wall.position}
      rotation={wall.rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(wall.id);
      }}
    >
      <boxGeometry args={wall.size} />
      <meshStandardMaterial color={isSelected ? "orange" : "white"} />
    </mesh>
  );
});

export default WallE;