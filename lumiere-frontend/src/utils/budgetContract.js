export const BUDGET_CURRENCY = 'AED';

export const BUDGET_TARGET_TYPES = Object.freeze([
  'furniture',
  'decor',
  'wall',
  'floor',
  'ceiling',
  'door',
  'window',
  'light',
]);

export const FIXED_COST_TARGET_TYPES = Object.freeze([
  'furniture',
  'decor',
  'light',
  'door',
  'window',
]);

export const LIGHT_BUDGET_CATEGORY_TYPES = Object.freeze([
  'ceilingLight',
  'pendantLight',
  'wallLight',
  'floorLamp',
  'stripLight',
]);

export const AREA_COST_TARGET_TYPES = Object.freeze([
  'wall',
  'floor',
  'ceiling',
]);

export const BUDGET_PRICING_MODES = Object.freeze({
  FIXED: 'fixed',
  PER_SQM: 'perSqm',
});

export const BUDGET_UNITS = Object.freeze({
  ITEM: 'item',
  SQM: 'sqm',
});

export const BUDGET_RULE_SCOPES = Object.freeze({
  GLOBAL_TYPE: 'globalType',
  ROOM_TYPE: 'roomType',
  SINGLE_ITEM: 'singleItem',
});

export const BUDGET_COST_SOURCES = Object.freeze({
  MANUAL: 'manual',
  ESTIMATED: 'estimated',
  IMPORTED: 'imported',
  DEFAULT_TEMPLATE: 'defaultTemplate',
});

export const BUDGET_COST_SOURCE_LABELS = Object.freeze({
  [BUDGET_COST_SOURCES.MANUAL]: 'Manual',
  [BUDGET_COST_SOURCES.ESTIMATED]: 'Estimated',
  [BUDGET_COST_SOURCES.IMPORTED]: 'Imported',
  [BUDGET_COST_SOURCES.DEFAULT_TEMPLATE]: 'Default template',
});

export const FIXED_COST_RULE_PRIORITY = Object.freeze([
  BUDGET_RULE_SCOPES.SINGLE_ITEM,
  BUDGET_RULE_SCOPES.GLOBAL_TYPE,
]);

export const AREA_COST_RULE_PRIORITY = Object.freeze([
  BUDGET_RULE_SCOPES.SINGLE_ITEM,
  BUDGET_RULE_SCOPES.ROOM_TYPE,
  BUDGET_RULE_SCOPES.GLOBAL_TYPE,
]);

export const EMPTY_BUDGET_TOTALS = Object.freeze({
  grandTotal: 0,
  furnitureTotal: 0,
  decorTotal: 0,
  wallTotal: 0,
  floorTotal: 0,
  ceilingTotal: 0,
  doorTotal: 0,
  windowTotal: 0,
  lightTotal: 0,
});

export function createEmptySceneBudget(overrides = {}) {
  return {
    ...overrides,
    enabled: overrides.enabled ?? false,
    currency: overrides.currency ?? BUDGET_CURRENCY,
    rules: overrides.rules ?? [],
    totals: { ...EMPTY_BUDGET_TOTALS, ...(overrides.totals ?? {}) },
    grandTotal: overrides.grandTotal ?? overrides.totals?.grandTotal ?? 0,
    byCategory: overrides.byCategory ?? {},
    byRoom: overrides.byRoom ?? {},
    breakdown: overrides.breakdown ?? [],
    quotation: overrides.quotation ?? null,
    snapshots: overrides.snapshots ?? [],
    last_calculated_at: overrides.last_calculated_at ?? null,
  };
}

export function getBudgetPricingDefaults(targetType) {
  if (FIXED_COST_TARGET_TYPES.includes(targetType)) {
    return {
      pricingMode: BUDGET_PRICING_MODES.FIXED,
      unit: BUDGET_UNITS.ITEM,
    };
  }

  if (AREA_COST_TARGET_TYPES.includes(targetType)) {
    return {
      pricingMode: BUDGET_PRICING_MODES.PER_SQM,
      unit: BUDGET_UNITS.SQM,
    };
  }

  return null;
}

export function isBudgetRuleScopeAllowed(targetType, scope) {
  if (scope === BUDGET_RULE_SCOPES.ROOM_TYPE) {
    return AREA_COST_TARGET_TYPES.includes(targetType);
  }

  return Object.values(BUDGET_RULE_SCOPES).includes(scope);
}

export function normalizeBudgetRuleScopeFields(rule = {}) {
  const scope = rule.scope ?? BUDGET_RULE_SCOPES.SINGLE_ITEM;
  const normalizedRule = {
    ...rule,
    costSource: rule.costSource ?? BUDGET_COST_SOURCES.MANUAL,
  };

  if (scope === BUDGET_RULE_SCOPES.GLOBAL_TYPE) {
    return {
      ...normalizedRule,
      targetId: null,
      roomId: null,
      scope,
    };
  }

  if (scope === BUDGET_RULE_SCOPES.ROOM_TYPE) {
    return {
      ...normalizedRule,
      targetId: null,
      roomId: rule.roomId ?? null,
      scope,
    };
  }

  return {
    ...normalizedRule,
    targetId: rule.targetId ?? null,
    roomId: rule.roomId ?? null,
    scope,
  };
}
