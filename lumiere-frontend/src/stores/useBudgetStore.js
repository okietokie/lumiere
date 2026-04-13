import { create } from 'zustand';
import {
  BUDGET_COST_SOURCES,
  BUDGET_CURRENCY,
  EMPTY_BUDGET_TOTALS,
  createEmptySceneBudget,
  getBudgetPricingDefaults,
} from '../utils/budgetContract';

const EMPTY_SUMMARY = Object.freeze({
  enabled: false,
  currency: BUDGET_CURRENCY,
  totals: EMPTY_BUDGET_TOTALS,
  grandTotal: 0,
  byCategory: {},
  byRoom: {},
  breakdown: [],
  quotation: null,
  rules_count: 0,
  snapshots_count: 0,
  last_calculated_at: null,
});

function createDraftRule(target = null, overrides = {}) {
  const defaults = getBudgetPricingDefaults(target?.targetType);

  return {
    targetType: target?.targetType ?? null,
    targetId: target?.targetId ?? null,
    roomId: target?.roomId ?? null,
    pricingMode: defaults?.pricingMode ?? null,
    amount: '',
    unit: defaults?.unit ?? null,
    label: target?.label ?? '',
    scope: target?.scope ?? (target?.targetId ? 'singleItem' : 'globalType'),
    costSource: BUDGET_COST_SOURCES.MANUAL,
    ...overrides,
  };
}

function normalizeSummary(summary = {}) {
  return {
    ...EMPTY_SUMMARY,
    ...summary,
    totals: {
      ...EMPTY_BUDGET_TOTALS,
      ...(summary.totals ?? {}),
    },
    grandTotal: summary.grandTotal ?? summary.totals?.grandTotal ?? 0,
    byCategory: summary.byCategory ?? {},
    byRoom: summary.byRoom ?? {},
    breakdown: Array.isArray(summary.breakdown) ? summary.breakdown : [],
    quotation: summary.quotation ?? null,
  };
}

export const useBudgetStore = create((set, get) => ({
  budgetEnabled: false,
  selectedBudgetTarget: null,
  budgetPanelOpen: false,
  draftRule: createDraftRule(),
  rules: [],
  summary: normalizeSummary(),
  snapshots: [],
  unsavedChanges: false,

  setBudgetEnabled: (enabled) => set((state) => ({
    budgetEnabled: Boolean(enabled),
    summary: normalizeSummary({ ...state.summary, enabled: Boolean(enabled) }),
    unsavedChanges: true,
  })),

  toggleBudgetEnabled: () => {
    const nextEnabled = !get().budgetEnabled;
    get().setBudgetEnabled(nextEnabled);
  },

  setSelectedBudgetTarget: (target) => set({
    selectedBudgetTarget: target ?? null,
    draftRule: createDraftRule(target),
  }),

  openBudgetPanel: (target = null, draftOverrides = {}) => set({
    budgetPanelOpen: true,
    selectedBudgetTarget: target,
    draftRule: createDraftRule(target, draftOverrides),
  }),

  closeBudgetPanel: () => set({
    budgetPanelOpen: false,
    selectedBudgetTarget: null,
  }),

  setDraftRule: (draftRule) => set({
    draftRule: createDraftRule(null, draftRule),
    unsavedChanges: true,
  }),

  updateDraftRule: (updates) => set((state) => ({
    draftRule: {
      ...state.draftRule,
      ...updates,
    },
    unsavedChanges: true,
  })),

  setRules: (rules) => set({
    rules: Array.isArray(rules) ? rules : [],
    unsavedChanges: true,
  }),

  upsertRule: (rule) => set((state) => {
    if (!rule?.id) {
      return {
        rules: [...state.rules, rule],
        unsavedChanges: true,
      };
    }

    const exists = state.rules.some((candidate) => candidate.id === rule.id);
    return {
      rules: exists
        ? state.rules.map((candidate) => (candidate.id === rule.id ? rule : candidate))
        : [...state.rules, rule],
      unsavedChanges: true,
    };
  }),

  removeRule: (ruleId) => set((state) => ({
    rules: state.rules.filter((rule) => rule.id !== ruleId),
    unsavedChanges: true,
  })),

  setSummary: (summary) => set({
    summary: normalizeSummary(summary),
  }),

  setSnapshots: (snapshots) => set({
    snapshots: Array.isArray(snapshots) ? snapshots : [],
  }),

  markUnsaved: () => set({ unsavedChanges: true }),

  markSaved: () => set({ unsavedChanges: false }),

  hydrateFromSceneBudget: (budget = {}) => set({
    budgetEnabled: Boolean(budget.enabled),
    rules: Array.isArray(budget.rules) ? budget.rules : [],
    snapshots: Array.isArray(budget.snapshots) ? budget.snapshots : [],
    summary: normalizeSummary({
      enabled: Boolean(budget.enabled),
      currency: budget.currency ?? BUDGET_CURRENCY,
      totals: budget.totals ?? EMPTY_BUDGET_TOTALS,
      grandTotal: budget.grandTotal ?? budget.totals?.grandTotal ?? 0,
      byCategory: budget.byCategory ?? {},
      byRoom: budget.byRoom ?? {},
      breakdown: budget.breakdown ?? [],
      quotation: budget.quotation ?? null,
      rules_count: Array.isArray(budget.rules) ? budget.rules.length : 0,
      snapshots_count: Array.isArray(budget.snapshots) ? budget.snapshots.length : 0,
      last_calculated_at: budget.last_calculated_at ?? null,
    }),
    unsavedChanges: false,
  }),

  getSceneBudget: () => {
    const state = get();
    return createEmptySceneBudget({
      enabled: state.budgetEnabled,
      rules: state.rules,
      totals: state.summary.totals,
      grandTotal: state.summary.grandTotal,
      byCategory: state.summary.byCategory,
      byRoom: state.summary.byRoom,
      breakdown: state.summary.breakdown,
      quotation: state.summary.quotation,
      snapshots: state.snapshots,
      last_calculated_at: state.summary.last_calculated_at,
    });
  },

  resetBudgetStore: () => set({
    budgetEnabled: false,
    selectedBudgetTarget: null,
    budgetPanelOpen: false,
    draftRule: createDraftRule(),
    rules: [],
    summary: normalizeSummary(),
    snapshots: [],
    unsavedChanges: false,
  }),
}));

export { createDraftRule };
