import { useCallback, useState } from "react";
import { addRoomAdjacent as positionAdjacentRoom, hasRoomOverlap } from "../../../utils/roomLayout";
import { createRoomEntity } from "../../../utils/sceneEntities";

export default function useRoomCreation({
  rooms,
  setRooms,
  walls,
  setWalls,
  selectedRoom,
  setSelectedRoomId,
  setSelectedWallId,
  setSelectedOpening,
  setSelectedFurnitureId,
  setSelectedLightId,
  setActiveTab,
  rebuildResolvedWalls,
  toast,
}) {
  const [pendingRoomCreation, setPendingRoomCreation] = useState(null);

  const queueRoomAdd = useCallback((direction, room = selectedRoom) => {
    if (!room) {
      toast.info("Select a room first.");
      return;
    }

    setPendingRoomCreation({
      sourceRoomId: room.id,
      direction,
      name: `${room.name} ${direction[0].toUpperCase()}${direction.slice(1)}`,
      type: "room",
      width: 3,
      depth: 4,
      height: room.height ?? 3,
      sceneStep: "name",
    });
    setSelectedRoomId(room.id);
    setActiveTab("room");
    toast.info(`A room will be added to the ${direction}.`);
  }, [selectedRoom, setActiveTab, setSelectedRoomId, toast]);

  const updatePendingRoomCreation = useCallback((field, value) => {
    setPendingRoomCreation((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const advancePendingRoomCreationToDetails = useCallback(() => {
    let advanced = false;

    setPendingRoomCreation((prev) => {
      if (!prev) return prev;

      const name = prev.name?.trim();
      if (!name) {
        toast.info("Enter a room name.");
        return prev;
      }

      advanced = true;
      return {
        ...prev,
        name,
        sceneStep: "details",
      };
    });

    return advanced;
  }, [toast]);

  const cancelPendingRoomCreation = useCallback(() => {
    setPendingRoomCreation(null);
  }, []);

  const createAdjacentRoom = useCallback((sourceRoomId, direction, width, depth, options = {}) => {
    const sourceRoom = rooms.find((room) => room.id === sourceRoomId);
    if (!sourceRoom) {
      toast.error("The selected source room is no longer available.");
      return { ok: false, reason: "missing-source-room" };
    }

    const numericWidth = Number(width);
    const numericDepth = Number(depth);
    const numericHeight = Number(options.height ?? sourceRoom.height ?? 3);

    if (!Number.isFinite(numericWidth) || numericWidth <= 0 || !Number.isFinite(numericDepth) || numericDepth <= 0 || !Number.isFinite(numericHeight) || numericHeight <= 0) {
      toast.info("Width, depth, and height must be greater than 0.");
      return { ok: false, reason: "invalid-dimensions" };
    }

    const name = options.name?.trim();
    const type = options.type?.trim();
    if (!name) {
      toast.info("Enter a room name.");
      return { ok: false, reason: "missing-name" };
    }
    if (!type) {
      toast.info("Enter a room type.");
      return { ok: false, reason: "missing-type" };
    }

    const roomToCreate = createRoomEntity({
      name,
      type,
      width: numericWidth,
      depth: numericDepth,
      height: numericHeight,
    });
    const positionedRoom = positionAdjacentRoom(sourceRoom, direction, roomToCreate);

    if (hasRoomOverlap(positionedRoom, rooms)) {
      toast.error("Room creation cancelled because the new room would overlap an existing room.");
      return { ok: false, reason: "overlap" };
    }

    const nextRooms = [...rooms, positionedRoom];
    const nextWalls = rebuildResolvedWalls(nextRooms, walls);
    setRooms(nextRooms);
    setWalls(nextWalls);
    setSelectedRoomId(positionedRoom.id);
    setSelectedWallId(null);
    setSelectedOpening(null);
    setSelectedFurnitureId(null);
    setSelectedLightId(null);

    return { ok: true, room: positionedRoom };
  }, [
    rebuildResolvedWalls,
    rooms,
    setRooms,
    setWalls,
    setSelectedRoomId,
    setSelectedWallId,
    setSelectedOpening,
    setSelectedFurnitureId,
    setSelectedLightId,
    toast,
    walls,
  ]);

  const submitPendingRoomCreation = useCallback(() => {
    if (!pendingRoomCreation) return;

    const result = createAdjacentRoom(
      pendingRoomCreation.sourceRoomId,
      pendingRoomCreation.direction,
      pendingRoomCreation.width,
      pendingRoomCreation.depth,
      {
        name: pendingRoomCreation.name,
        type: pendingRoomCreation.type,
        height: pendingRoomCreation.height,
      }
    );

    if (!result?.ok) {
      if (result?.reason === "missing-source-room") {
        setPendingRoomCreation(null);
      }
      return;
    }

    setPendingRoomCreation(null);
    toast.success(`${result.room.name} added to the ${pendingRoomCreation.direction}.`);
  }, [createAdjacentRoom, pendingRoomCreation, toast]);

  return {
    pendingRoomCreation,
    queueRoomAdd,
    updatePendingRoomCreation,
    advancePendingRoomCreationToDetails,
    cancelPendingRoomCreation,
    submitPendingRoomCreation,
    setPendingRoomCreation,
  };
}
