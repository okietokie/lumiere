import { useEffect, useRef, useState } from "react";
import { COLORS } from "../../../utils/colors";

export default function RevealActionButton({
  label,
  icon: Icon,
  active = false,
  onClick,
  variant = "reveal",
  dataTour,
  endAdornment = null,
  expandedWidthOverride = null,
  compactSidebar = false,
}) {
  const revealCollapsedSize = 44;
  const revealExpandedWidth = 124;
  const revealHeight = 44;
  const [revealed, setRevealed] = useState(false);
  const revealTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (revealTimeoutRef.current) {
      window.clearTimeout(revealTimeoutRef.current);
    }
  }, []);

  const revealTemporarily = () => {
    setRevealed(true);
    if (revealTimeoutRef.current) {
      window.clearTimeout(revealTimeoutRef.current);
    }
    revealTimeoutRef.current = window.setTimeout(() => {
      setRevealed(false);
    }, 1600);
  };

  const isPill = variant === "pill";
  const isPanel = variant === "panel";
  const isSidebar = variant === "sidebar";
  const expandedWidth = expandedWidthOverride ?? revealExpandedWidth;
  const expanded = isPill ? true : revealed;
  const showIcon = !isPill && !!Icon;
  const baseBackground = active ? COLORS.accent : "#1f1814";
  const hoverBackground = active ? COLORS.action : COLORS.surface;
  const borderColor = active ? COLORS.action : `${COLORS.secondary}99`;
  const ringColor = active ? "rgba(196, 154, 108, 0.32)" : "rgba(122, 101, 89, 0.28)";
  const textColor = COLORS.text;
  const iconColor = active ? COLORS.background : textColor;

  if (isSidebar) {
    const sidebarButtonSize = compactSidebar ? 48 : 62;
    const sidebarOrbSize = compactSidebar ? 38 : 50;
    const sidebarOrbRadius = compactSidebar ? 13 : 18;
    const sidebarTopOffset = compactSidebar ? 5 : 5;
    const sidebarIconSize = compactSidebar ? 18 : 24;

    return (
      <button
        type="button"
        aria-label={label}
        data-tour={dataTour}
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        onFocus={() => setRevealed(true)}
        onBlur={() => setRevealed(false)}
        onClick={() => {
          revealTemporarily();
          onClick?.();
        }}
        style={{
          position: "relative",
          width: sidebarButtonSize,
          height: sidebarButtonSize,
          padding: 0,
          border: "none",
          background: "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          outline: "none",
          overflowX: "visible",
          overflowY: "clip",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: sidebarTopOffset,
            width: sidebarOrbSize,
            height: sidebarOrbSize,
            borderRadius: sidebarOrbRadius,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: expanded
              ? `linear-gradient(135deg, ${hoverBackground} 0%, ${baseBackground} 100%)`
              : `linear-gradient(135deg, ${baseBackground} 0%, ${hoverBackground} 100%)`,
            color: iconColor,
            border: `1px solid ${borderColor}`,
            boxShadow: `0 0 0 4px ${ringColor}, 0 16px 28px rgba(0, 0, 0, 0.28)`,
            transform: expanded ? "scale(0.62)" : "scale(1)",
            transformOrigin: "top center",
            transition: "transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease",
          }}
        >
          {showIcon && <Icon style={{ fontSize: sidebarIconSize, color: iconColor }} />}
        </span>
        <span
          style={{
            position: "absolute",
            left: "50%",
            bottom: expanded ? 8 : -18,
            transform: "translateX(-50%)",
            opacity: expanded ? 1 : 0,
            transition: "bottom 0.3s ease, opacity 0.3s ease",
            color: active ? COLORS.action : textColor,
            fontSize: compactSidebar ? 9 : 10,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {label}
        </span>
      </button>
    );
  }

  if (isPanel) {
    return (
      <button
        type="button"
        aria-label={label}
        data-tour={dataTour}
        onClick={onClick}
        style={{
          position: "relative",
          width: "100%",
          minWidth: 0,
          minHeight: 62,
          padding: "0 18px",
          borderRadius: 999,
          border: `1px solid ${borderColor}`,
          background: active
            ? `linear-gradient(135deg, ${COLORS.action} 0%, ${COLORS.accent} 100%)`
            : `linear-gradient(180deg, rgba(62, 48, 41, 0.94) 0%, rgba(41, 31, 27, 0.96) 100%)`,
          color: active ? COLORS.background : textColor,
          boxShadow: active
            ? "0 16px 28px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.14)"
            : `0 0 0 4px ${ringColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.01em",
          transition: "transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease, background 0.24s ease, color 0.24s ease",
          outline: "none",
        }}
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        onFocus={() => setRevealed(true)}
        onBlur={() => setRevealed(false)}
      >
        {Icon && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: active ? "rgba(28, 22, 18, 0.16)" : "rgba(196, 154, 108, 0.12)",
              color: active ? COLORS.background : COLORS.action,
              boxShadow: active ? "none" : "inset 0 1px 0 rgba(255,255,255,0.05)",
              transform: revealed ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.2s ease",
            }}
          >
            <Icon style={{ fontSize: 16 }} />
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      data-tour={dataTour}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      onClick={() => {
        revealTemporarily();
        onClick?.();
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        width: isPill ? "auto" : (expanded ? expandedWidth : revealCollapsedSize),
        minWidth: isPill ? 120 : (expanded ? expandedWidth : revealCollapsedSize),
        height: isPill ? 50 : revealHeight,
        minHeight: isPill ? 50 : revealHeight,
        padding: isPill ? "0 20px" : (expanded && endAdornment ? "0 38px 0 0" : 0),
        borderRadius: isPill ? 50 : (expanded ? revealHeight : "50%"),
        border: isPill ? `1px solid ${borderColor}` : "none",
        backgroundColor: expanded ? hoverBackground : baseBackground,
        color: textColor,
        boxShadow: `0 0 0 4px ${ringColor}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "pointer",
        fontWeight: 600,
        transitionDuration: "0.3s",
        transitionProperty: "width, min-width, border-radius, background-color, box-shadow",
        whiteSpace: "nowrap",
        outline: "none",
      }}
    >
      {showIcon && (
        <span
          style={{
            position: "absolute",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 10,
            lineHeight: 0,
            transform: expanded ? "translateY(-200%)" : "translateY(0)",
            transitionDuration: "0.3s",
            pointerEvents: "none",
          }}
        >
          <Icon style={{ fontSize: 15, color: textColor }} />
        </span>
      )}
      <span
        style={{
          position: isPill ? "relative" : "absolute",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          inset: isPill ? "auto" : 0,
          opacity: expanded ? 1 : 0,
          transform: isPill
            ? "translateY(0)"
            : (expanded ? "translateY(0)" : "translateY(20px)"),
          transitionDuration: "0.3s",
          whiteSpace: "nowrap",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.01em",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
      {expanded && endAdornment && (
        <span
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          {endAdornment}
        </span>
      )}
    </button>
  );
}
