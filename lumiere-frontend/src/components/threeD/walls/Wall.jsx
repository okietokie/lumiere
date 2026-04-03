import { forwardRef } from "react";
import { COLORS } from "../../../utils/colors.js";

const WallE = forwardRef(({ wall, isSelected, onSelect }, ref) => {
  return (
    <mesh
      ref={ref}
      position={wall.position}
      rotation={wall.rotation}
      scale={wall.scale || [1, 1, 1]}
      castShadow
      receiveShadow
      onPointerDown={(e) => {
        e.stopPropagation(); // Prevents clicking through the wall
        onSelect(wall.id);
      }}
    >
      <boxGeometry args={wall.size} />
      <meshStandardMaterial 
        color={isSelected ? COLORS.action : COLORS.text} 
        roughness={0.4}
        metalness={0.1}
        emissive={isSelected ? COLORS.action : "#f3ecec"}
        emissiveIntensity={isSelected ? 0.15 : 0}
      />
    </mesh>
  );
});

export default WallE;
