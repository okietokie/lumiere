import { Input, InputNumber, Select, Space } from "antd";

const ROOM_TYPE_OPTIONS = [
  { value: "room", label: "Room" },
  { value: "bedroom", label: "Bedroom" },
  { value: "living", label: "Living" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
];

function MetricInput({ value, onChange, min, step }) {
  return (
    <Space.Compact style={{ width: "100%", }}>
      <InputNumber
        className="room-creation-input room-creation-number"
        min={min}
        step={step}
        value={value}
        onChange={onChange}
        style={{ width: "100%" }}
      />
      <div style={{ margin: 5 }} />
      <Input
        className="room-creation-unit"
        value="m"
        readOnly
        tabIndex={-1}
        style={{ width: 52, textAlign: "center" }}
      />
    </Space.Compact>
  );
}

export default function RoomCreationPanel({
  pendingRoomCreation,
  selectedRoom,
  isMobileVariant = false,
  openingFieldCardStyle,
  cancelPendingRoomCreation,
  updatePendingRoomCreation,
  submitPendingRoomCreation,
}) {
  if (!pendingRoomCreation || !selectedRoom) return null;

  return (
    <div
      className="room-creation-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: isMobileVariant ? "20px" : "24px",
        borderRadius: 28,
        marginTop: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: isMobileVariant ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: isMobileVariant ? "wrap" : "nowrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#d2a472", fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
            Add {pendingRoomCreation.direction}
          </div>
          <div style={{ color: "#f6ede6", fontSize: isMobileVariant ? 18 : 22, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            Create a room next to {selectedRoom.name}
          </div>
          <div style={{ color: "rgba(228, 211, 198, 0.72)", fontSize: 12, lineHeight: 1.55, marginTop: 8, maxWidth: 320 }}>
            Set the room name, type, and dimensions, then CREATE it neatly beside the selected room.
          </div>
        </div>
        <button
          type="button"
          className="room-creation-top-action"
          onClick={cancelPendingRoomCreation}
        >
          Cancel
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: isMobileVariant ? "wrap" : "nowrap",
        }}
      >
        <div className="room-creation-source-chip">
          <span className="room-creation-source-dot" />
          Next to {selectedRoom.name}
        </div>
        <div className="room-creation-status-pill">Ready to add</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobileVariant ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="room-creation-field" style={openingFieldCardStyle}>
          <span style={{ color: "rgba(228, 211, 198, 0.82)", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>Name</span>
          <Input
            className="room-creation-input"
            value={pendingRoomCreation.name}
            onChange={(event) => updatePendingRoomCreation("name", event.target.value)}
            placeholder="Room name"
          />
        </div>
        <div className="room-creation-field" style={openingFieldCardStyle}>
          <span style={{ color: "rgba(228, 211, 198, 0.82)", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>Type</span>
          <Select
            className="room-creation-select"
            value={pendingRoomCreation.type}
            onChange={(value) => updatePendingRoomCreation("type", value)}
            options={ROOM_TYPE_OPTIONS}
          />
        </div>
        <div className="room-creation-field" style={openingFieldCardStyle}>
          <span style={{ color: "rgba(228, 211, 198, 0.82)", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>Width</span>
          <MetricInput min={0.5} step={0.1} value={pendingRoomCreation.width} onChange={(value) => updatePendingRoomCreation("width", value)} />
        </div>
        <div className="room-creation-field" style={openingFieldCardStyle}>
          <span style={{ color: "rgba(228, 211, 198, 0.82)", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>Depth</span>
          <MetricInput min={0.5} step={0.1} value={pendingRoomCreation.depth} onChange={(value) => updatePendingRoomCreation("depth", value)} />
        </div>
        <div className="room-creation-field" style={openingFieldCardStyle}>
          <span style={{ color: "rgba(228, 211, 198, 0.82)", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>Height</span>
          <MetricInput min={2} step={0.1} value={pendingRoomCreation.height} onChange={(value) => updatePendingRoomCreation("height", value)} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          paddingTop: 4,
          flexWrap: isMobileVariant ? "wrap" : "nowrap",
        }}
      >
        <div style={{ color: "rgba(228, 211, 198, 0.68)", fontSize: 12 }}>
          Dimensions in meters
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: isMobileVariant ? "wrap" : "nowrap" }}>
          <button type="button" className="room-creation-secondary" onClick={cancelPendingRoomCreation}>
            Cancel
          </button>
          <button type="button" className="room-creation-primary" onClick={submitPendingRoomCreation}>
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}
