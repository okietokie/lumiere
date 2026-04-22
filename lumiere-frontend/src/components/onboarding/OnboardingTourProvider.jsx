import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStoredUser, subscribeToAuthChange } from "../../utils/authStorage";

const STORAGE_KEY_PREFIX = "lumiere:onboarding-tour";

const DEFAULT_STATE = {
  active: false,
  dismissed: false,
  completed: false,
  step: "welcome",
  projectId: null,
};

const OnboardingTourContext = createContext(null);

function getUserScopeKey() {
  if (typeof window === "undefined") return `${STORAGE_KEY_PREFIX}:guest`;

  const user = getStoredUser();
  const identifier = user?.id ?? user?._id ?? user?.email ?? "guest";
  return `${STORAGE_KEY_PREFIX}:${identifier}`;
}

function readStoredState(storageKey) {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function OnboardingTourProvider({ children }) {
  const [storageKey, setStorageKey] = useState(getUserScopeKey);
  const [state, setState] = useState(() => readStoredState(getUserScopeKey()));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  useEffect(() => {
    const syncScope = () => {
      const nextStorageKey = getUserScopeKey();
      setStorageKey((currentStorageKey) => {
        if (currentStorageKey === nextStorageKey) return currentStorageKey;
        setState(readStoredState(nextStorageKey));
        return nextStorageKey;
      });
    };

    syncScope();
    const unsubscribe = subscribeToAuthChange(syncScope);
    return unsubscribe;
  }, []);

  const value = useMemo(() => {
    const updateState = (updates) => {
      setState((current) => ({
        ...current,
        ...(typeof updates === "function" ? updates(current) : updates),
      }));
    };

    return {
      state,
      isActive: state.active && !state.completed && !state.dismissed,
      start: () =>
        updateState({
          active: true,
          dismissed: false,
          completed: false,
          step: "welcome",
          projectId: null,
        }),
      setStep: (step, extra = {}) =>
        updateState({
          active: true,
          step,
          ...extra,
        }),
      markProjectCreated: (projectId) =>
        updateState({
          active: true,
          step: "create-room",
          projectId,
        }),
      markRoomCreated: () =>
        updateState({
          active: true,
          step: "edit-room",
        }),
      markSwitchedTo3D: () =>
        updateState({
          active: true,
          step: "hide-walls",
        }),
      complete: () =>
        updateState({
          active: false,
          completed: true,
          dismissed: false,
          step: "complete",
        }),
      dismiss: () =>
        updateState({
          active: false,
          dismissed: true,
        }),
      reset: () => setState(DEFAULT_STATE),
    };
  }, [state]);

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
    </OnboardingTourContext.Provider>
  );
}

export function useOnboardingTour() {
  const context = useContext(OnboardingTourContext);
  if (!context) {
    throw new Error("useOnboardingTour must be used within OnboardingTourProvider");
  }
  return context;
}
