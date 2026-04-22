import { useEffect, useState } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";
import { COLORS } from "../../utils/colors";

function waitForTarget(selector, attempts = 24) {
  if (!selector || selector === "body") return Promise.resolve(document.body);

  return new Promise((resolve) => {
    let remaining = attempts;

    const tick = () => {
      const element = document.querySelector(selector);
      if (element || remaining <= 0) {
        resolve(element);
        return;
      }

      remaining -= 1;
      window.setTimeout(tick, 120);
    };

    tick();
  });
}

export default function OnboardingJoyride({
  step,
  onPrimaryAction,
  onSkip,
  primaryLabel = "Continue",
  showPrimary = true,
  showSkip = true,
  useModalOverlay = true,
  exitOnEsc = true,
  keyboardNavigation = true,
  showCancelIcon = true,
}) {
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === "undefined" ? 1440 : window.innerWidth
  ));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!step || typeof window === "undefined") return undefined;

    let cancelled = false;
    let tour = null;

    const launch = async () => {
      const targetElement = await waitForTarget(step.target);
      if (cancelled) return;
      if (!targetElement && step.target && step.target !== "body") return;

      const hasAttachTarget = Boolean(step.target && step.target !== "body" && targetElement);
      const resolvedPlacement = viewportWidth < 768
        ? (step.mobilePlacement ?? "bottom")
        : viewportWidth < 1200
          ? (step.tabletPlacement ?? step.mobilePlacement ?? "bottom")
          : (step.placement ?? "bottom");
      const buttons = [];

      if (showSkip) {
        buttons.push({
          text: "Skip tour",
          classes: "lumiere-shepherd-button lumiere-shepherd-button-secondary",
          action() {
            onSkip?.();
            this.cancel();
          },
        });
      }

      if (showPrimary) {
        buttons.push({
          text: primaryLabel,
          classes: "lumiere-shepherd-button lumiere-shepherd-button-primary",
          action() {
            onPrimaryAction?.();
            this.cancel();
          },
        });
      }

      tour = new Shepherd.Tour({
        useModalOverlay,
        exitOnEsc,
        keyboardNavigation,
        defaultStepOptions: {
          classes: `lumiere-shepherd-theme${hasAttachTarget ? "" : " lumiere-shepherd-centered"}`,
          cancelIcon: {
            enabled: showCancelIcon,
          },
          canClickTarget: true,
          modalOverlayOpeningPadding: viewportWidth < 768 ? 10 : 16,
          modalOverlayOpeningRadius: 22,
          scrollTo: hasAttachTarget
            ? {
                behavior: "smooth",
                block: "center",
              }
            : false,
        },
      });

      tour.addStep({
        id: `lumiere-onboarding-${step.title ?? "step"}`,
        title: step.title,
        text: step.content,
        attachTo: hasAttachTarget
          ? {
              element: step.target,
              on: resolvedPlacement,
            }
          : undefined,
        buttons,
      });

      tour.start();
    };

    launch();

    return () => {
      cancelled = true;
      if (tour) {
        tour.cancel();
      }
    };
  }, [
    exitOnEsc,
    keyboardNavigation,
    onPrimaryAction,
    onSkip,
    primaryLabel,
    showCancelIcon,
    showPrimary,
    showSkip,
    step,
    useModalOverlay,
    viewportWidth,
  ]);

  return (
    <style>{`
      .shepherd-modal-overlay-container {
        z-index: 2000;
      }

      .shepherd-element.lumiere-shepherd-theme {
        max-width: min(360px, calc(100vw - 24px));
        background: linear-gradient(180deg, rgba(36, 29, 25, 0.98) 0%, rgba(22, 18, 15, 0.98) 100%);
        border: 1px solid rgba(196, 154, 108, 0.22);
        border-radius: 24px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-content {
        background: transparent;
        border-radius: 24px;
        color: ${COLORS.text};
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-header {
        padding: 20px 20px 0;
        background: transparent;
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-title {
        color: ${COLORS.action};
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-text {
        padding: 10px 20px 18px;
        color: ${COLORS.text};
        font-size: 15px;
        line-height: 1.65;
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-footer {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 0 20px 18px;
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-button {
        min-height: 42px;
        padding: 0 18px;
        border-radius: 999px;
        font: inherit;
        font-size: 13px;
        font-weight: 800;
        transition: filter 0.2s ease, transform 0.2s ease;
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-button:hover {
        filter: brightness(1.04);
        transform: translateY(-1px);
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-button.lumiere-shepherd-button-primary {
        background: linear-gradient(135deg, ${COLORS.action} 0%, ${COLORS.accent} 100%);
        color: #120f0d;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-button.lumiere-shepherd-button-secondary {
        border: 1px solid rgba(242, 229, 213, 0.14);
        background: rgba(255, 255, 255, 0.04);
        color: rgba(242, 229, 213, 0.72);
      }

      .shepherd-element.lumiere-shepherd-theme .shepherd-arrow:before {
        background: rgba(32, 25, 21, 0.98);
      }

      .shepherd-enabled.shepherd-target {
        border-radius: 22px;
      }

      @media (max-width: 1024px) {
        .shepherd-element.lumiere-shepherd-theme .shepherd-text {
          font-size: 14px;
          line-height: 1.58;
        }
      }

      @media (max-width: 767px) {
        .shepherd-element.lumiere-shepherd-theme {
          border-radius: 20px;
        }

        .shepherd-element.lumiere-shepherd-theme .shepherd-header {
          padding: 16px 16px 0;
        }

        .shepherd-element.lumiere-shepherd-theme .shepherd-text {
          padding: 8px 16px 16px;
          font-size: 13px;
          line-height: 1.55;
        }

        .shepherd-element.lumiere-shepherd-theme .shepherd-footer {
          padding: 0 16px 16px;
          gap: 8px;
        }

        .shepherd-element.lumiere-shepherd-theme .shepherd-button {
          min-height: 40px;
          padding: 0 14px;
          font-size: 12px;
        }
      }
    `}</style>
  );
}
