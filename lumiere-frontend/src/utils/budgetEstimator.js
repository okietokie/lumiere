import { AREA_COST_TARGET_TYPES, BUDGET_COST_SOURCES, EMPTY_BUDGET_TOTALS } from './budgetContract';
import {
  getCeilingArea,
  getFloorArea,
  getRoomIdForPosition,
  getWallArea,
} from './measurements';

const CATEGORY_KEYS = Object.freeze({
  furniture: 'furniture',
  decor: 'decor',
  wall: 'walls',
  floor: 'floor',
  ceiling: 'ceiling',
  door: 'doors',
  window: 'windows',
  light: 'lights',
});

const TOTAL_KEYS = Object.freeze({
  furniture: 'furnitureTotal',
  decor: 'decorTotal',
  wall: 'wallTotal',
  floor: 'floorTotal',
  ceiling: 'ceilingTotal',
  door: 'doorTotal',
  window: 'windowTotal',
  light: 'lightTotal',
});

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function roundMoney(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function isDecorItem(item = {}) {
  const category = String(item.category ?? item.type ?? '').toLowerCase();
  return category.includes('decor') || category.includes('rug') || category.includes('mirror');
}

function getRules(rules = []) {
  return Array.isArray(rules) ? rules.filter((rule) => rule?.targetType && rule?.scope) : [];
}

function buildBudgetQuotation(scene, summary) {
  const projectName = scene.projectName ?? scene.title ?? scene.name ?? 'Untitled Room';
  const currency = scene.budget?.currency ?? 'AED';
  return {
    projectName,
    date: scene.budget?.quotation?.date ?? new Date().toISOString(),
    currency,
    roomBreakdown: summary.byRoom,
    lineItems: summary.breakdown.map((item) => ({
      id: item.targetId,
      targetId: item.targetId,
      targetType: item.targetType,
      label: item.label,
      roomId: item.roomId ?? null,
      quantity: item.quantity,
      areaSqm: item.areaSqm,
      unitPrice: item.amount,
      unit: item.unit,
      pricingMode: item.pricingMode,
      costSource: item.costSource,
      appliedRuleId: item.appliedRuleId,
      total: item.calculatedCost,
      customOverride: item.customOverride,
    })),
    totals: summary.totals,
    grandTotal: summary.grandTotal,
  };
}

function findAppliedRule(element, rules) {
  if (AREA_COST_TARGET_TYPES.includes(element.targetType)) {
    return (
      rules.find((rule) => (
        rule.scope === 'singleItem' &&
        rule.targetType === element.targetType &&
        rule.targetId === element.targetId
      )) ??
      rules.find((rule) => (
        rule.scope === 'roomType' &&
        rule.targetType === element.targetType &&
        rule.roomId === element.roomId
      )) ??
      rules.find((rule) => (
        rule.scope === 'globalType' &&
        rule.targetType === element.targetType
      )) ??
      null
    );
  }

  return (
    rules.find((rule) => (
      rule.scope === 'singleItem' &&
      rule.targetType === element.targetType &&
      rule.targetId === element.targetId
    )) ??
    rules.find((rule) => (
      rule.scope === 'globalType' &&
      rule.targetType === element.targetType
    )) ??
    null
  );
}

function getSceneRooms(scene = {}) {
  return Array.isArray(scene.rooms) ? scene.rooms : [];
}

function getSceneFurniture(scene = {}) {
  if (Array.isArray(scene.furniture)) return scene.furniture;
  return Array.isArray(scene.placedItems) ? scene.placedItems : [];
}

function collectBudgetElements(scene = {}) {
  const rooms = getSceneRooms(scene);
  const walls = Array.isArray(scene.walls) ? scene.walls : [];
  const furniture = getSceneFurniture(scene);
  const placedLights = Array.isArray(scene.lighting?.placedLights) ? scene.lighting.placedLights : [];
  const floorMaterial = scene.materials?.floor ?? scene.floorMaterial ?? {};
  const ceilingMaterial = scene.materials?.ceiling ?? scene.ceilingMaterial ?? {};

  const elements = [];

  rooms.forEach((room) => {
    if (!room?.id) return;
    const roomMeasurements = room.measurements ?? {};
    elements.push({
      targetId: `floor:${room.id}`,
      targetType: 'floor',
      roomId: room.id,
      label: `${room.name ?? room.label ?? 'Room'} floor`,
      areaSqm: finiteNumber(roomMeasurements.floorAreaSqm, getFloorArea(floorMaterial, room)),
    });
    elements.push({
      targetId: `ceiling:${room.id}`,
      targetType: 'ceiling',
      roomId: room.id,
      label: `${room.name ?? room.label ?? 'Room'} ceiling`,
      areaSqm: finiteNumber(roomMeasurements.ceilingAreaSqm, getCeilingArea(ceilingMaterial, room)),
    });
  });

  walls.forEach((wall) => {
    if (!wall?.id) return;
    elements.push({
      targetId: wall.id,
      targetType: 'wall',
      roomId: wall.roomId ?? null,
      label: wall.label ?? 'Wall',
      areaSqm: finiteNumber(wall.measurements?.areaSqm, getWallArea(wall)),
    });

    (wall.doors ?? []).forEach((door) => {
      if (!door?.id) return;
      elements.push({
        targetId: door.id,
        targetType: 'door',
        roomId: door.roomId ?? wall.roomId ?? null,
        label: door.label ?? 'Door',
        quantity: finiteNumber(door.measurements?.quantity, 1),
      });
    });

    (wall.windows ?? []).forEach((window) => {
      if (!window?.id) return;
      elements.push({
        targetId: window.id,
        targetType: 'window',
        roomId: window.roomId ?? wall.roomId ?? null,
        label: window.label ?? 'Window',
        quantity: finiteNumber(window.measurements?.quantity, 1),
      });
    });
  });

  furniture.forEach((item) => {
    if (!item?.id) return;
    const targetType = isDecorItem(item) ? 'decor' : 'furniture';
    elements.push({
      targetId: item.id,
      targetType,
      roomId: item.roomId ?? getRoomIdForPosition(rooms, item.position),
      label: item.label ?? item.name ?? item.filename ?? 'Furniture',
      quantity: finiteNumber(item.measurements?.quantity, 1),
    });
  });

  placedLights.forEach((light) => {
    if (!light?.id) return;
    elements.push({
      targetId: light.id,
      targetType: 'light',
      roomId: light.roomId ?? getRoomIdForPosition(rooms, light.position),
      label: light.label ?? `${light.budgetCategory ?? light.type ?? 'Light'} light`,
      lightType: light.type ?? null,
      budgetCategory: light.budgetCategory ?? null,
      quantity: finiteNumber(light.measurements?.quantity, finiteNumber(light.quantity, 1)),
    });
  });

  return elements;
}

export function calculateBudgetSummary(scene = {}, rules = []) {
  const validRules = getRules(rules);
  const byCategory = {
    furniture: 0,
    decor: 0,
    walls: 0,
    floor: 0,
    ceiling: 0,
    doors: 0,
    windows: 0,
    lights: 0,
  };
  const byRoom = {};
  const totals = { ...EMPTY_BUDGET_TOTALS };

  const breakdown = collectBudgetElements(scene).map((element) => {
    const appliedRule = findAppliedRule(element, validRules);
    const isAreaBased = AREA_COST_TARGET_TYPES.includes(element.targetType);
    const quantity = isAreaBased ? finiteNumber(element.areaSqm) : finiteNumber(element.quantity, 1);
    const amount = finiteNumber(appliedRule?.amount);
    const calculatedCost = roundMoney(quantity * amount);
    const categoryKey = CATEGORY_KEYS[element.targetType];
    const totalKey = TOTAL_KEYS[element.targetType];

    if (categoryKey) byCategory[categoryKey] = roundMoney((byCategory[categoryKey] ?? 0) + calculatedCost);
    if (totalKey) totals[totalKey] = roundMoney((totals[totalKey] ?? 0) + calculatedCost);
    if (element.roomId) byRoom[element.roomId] = roundMoney((byRoom[element.roomId] ?? 0) + calculatedCost);

    return {
      ...element,
      quantity: isAreaBased ? undefined : quantity,
      areaSqm: isAreaBased ? quantity : undefined,
      appliedRuleId: appliedRule?.id ?? null,
      pricingMode: appliedRule?.pricingMode ?? null,
      unit: appliedRule?.unit ?? null,
      costSource: appliedRule?.costSource ?? (appliedRule ? BUDGET_COST_SOURCES.MANUAL : null),
      amount,
      calculatedCost,
      customOverride: appliedRule?.scope === 'singleItem',
    };
  });

  const grandTotal = roundMoney(Object.values(byCategory).reduce((sum, value) => sum + value, 0));
  totals.grandTotal = grandTotal;

  const summary = {
    grandTotal,
    byCategory,
    byRoom,
    breakdown,
    totals,
    snapshots: breakdown.map((item) => ({
      targetId: item.targetId,
      targetType: item.targetType,
      roomId: item.roomId,
      quantity: item.quantity,
      areaSqm: item.areaSqm,
      appliedRuleId: item.appliedRuleId,
      calculatedCost: item.calculatedCost,
      costSource: item.costSource,
      customOverride: item.customOverride,
    })),
  };
  return {
    ...summary,
    quotation: buildBudgetQuotation(scene, summary),
  };
}
