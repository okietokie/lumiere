import { useEffect, useRef } from "react";
import styled from "@emotion/styled";

const InputShell = styled.div(({ accent = "#5748f2", isMobileView = false }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: 220,
  minWidth: 220,
  ".pending-room-field": {
    position: "relative",
    overflow: "visible",
  },
  ".pending-room-input": {
    position: "relative",
    width: "100%",
    padding: "20px 10px 10px",
    background: "transparent",
    outline: "none",
    boxShadow: "none",
    border: "none",
    color: "#23242a",
    fontSize: "1em",
    letterSpacing: "0.05em",
    transition: "0.5s",
    zIndex: 10,
  },
  ".pending-room-input::placeholder": {
    color: "#8f8f8f",
    opacity: 1,
    letterSpacing: "0.02em",
  },
  ".pending-room-bar": {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    height: 2,
    background: accent,
    borderRadius: 4,
    transition: "0.5s",
    pointerEvents: "none",
    zIndex: 9,
  },
  '.pending-room-input:focus ~ .pending-room-bar, .pending-room-input:not(:placeholder-shown) ~ .pending-room-bar': {
    height: 44,
  },
  ".pending-room-metrics": {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
  },
  ".pending-room-metric": {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "8px 10px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.78)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
  },
  ".pending-room-metric-label": {
    color: "#5e534b",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  ".pending-room-metric-input": {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#23242a",
    fontSize: 14,
    fontWeight: 700,
  },
  ".pending-room-hint": {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    textAlign: "center",
  },
  ...(isMobileView
    ? {
        width: "min(220px, calc(100vw - 148px))",
        minWidth: 0,
      }
    : {}),
}));

export default function PendingRoomNameInput({
  value,
  onChange,
  accent,
  showDimensions = false,
  dimensions,
  onDimensionChange,
  onNameEnter,
  onSubmit,
  isMobileView = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [showDimensions]);

  return (
    <InputShell accent={accent} isMobileView={isMobileView}>
      
      <div className="pending-room-field">
        <input
          ref={inputRef}
          className="pending-room-input"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onNameEnter?.();
            }
          }}
          placeholder="Type room name"
        />
        <i className="pending-room-bar" />
      </div>
      {showDimensions && (
        <>
          <div className="pending-room-metrics">
            {[
              { key: "width", label: "Width" },
              { key: "height", label: "Height" },
              { key: "depth", label: "Depth" },
            ].map(({ key, label }) => (
              <div key={key} className="pending-room-metric">
                <span className="pending-room-metric-label">{label}</span>
                <input
                  className="pending-room-metric-input"
                  type="number"
                  min={key === "height" ? 2 : 0.5}
                  step="0.1"
                  value={dimensions?.[key] ?? ""}
                  onChange={(event) => onDimensionChange?.(key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSubmit?.();
                    }
                  }}
                />
              </div>
            ))}
          </div>
          <div className="pending-room-hint">Press Enter to create room</div>
        </>
      )}
    </InputShell>
  );
}
