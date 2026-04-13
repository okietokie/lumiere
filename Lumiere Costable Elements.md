# Lumiere Budget Estimation Contract

This document freezes Step 1 for Budget Estimation. It defines what can be priced, which pricing modes are allowed, how overrides work, and how totals must be calculated before any UI is built.

## Feature Layers

Budget Estimation is split into three layers:

1. Budget mode
   - A scene-level setting that turns budget tools on or off.
   - Budget mode does not change geometry, materials, or object placement.

2. Cost assignment system
   - A rule layer that stores user-entered pricing.
   - Rules can target a whole element type, a room-specific surface type, or one exact item.

3. Estimation engine
   - A calculation layer that reads scene elements and budget rules.
   - It creates item snapshots and totals without mutating the scene geometry.

## Budget Categories

Only these target types are in scope for the first budget contract:

| Target type | Examples | Pricing mode |
| --- | --- | --- |
| `furniture` | sofa, chair, table, bed, wardrobe | `fixed` |
| `decor` | rug, mirror, accessory, decor item | `fixed` |
| `light` | lamp, pendant, placed light | `fixed` |
| `door` | hinged door, sliding door | `fixed` |
| `window` | sliding window, casement window | `fixed` |
| `wall` | wall paint, wallpaper, accent wall finish | `perSqm` |
| `floor` | floor tile, wood finish, floor material | `perSqm` |
| `ceiling` | ceiling paint, false ceiling finish | `perSqm` |

Out of scope for this first contract:

- Labor
- Delivery
- Tax
- Supplier orders
- Linear-meter pricing such as skirting or trim
- Structural additions priced by construction scope

Those can be added later as separate budget target types instead of overloading this contract.

## Scene Element Requirements

Every costable scene element must have a stable ID before it can receive budget rules.

Required identity fields:

| Field | Required for | Notes |
| --- | --- | --- |
| `id` | all costable elements | Stable across edit/save/load cycles |
| `type` | all costable elements | One of the budget target types, or mapped into one |
| `roomId` | walls, floors, ceilings, doors, windows, room-scoped items | Used for room-level surface rules |
| `measurement` | all costable elements | Area for surfaces, quantity for fixed items |

Measurement rules:

- Furniture, decor, lights, doors, and windows use quantity `1` unless the UI later supports grouped quantities.
- Walls use wall area in square meters.
- Floors use room floor area in square meters.
- Ceilings use room ceiling area in square meters.
- Door and window openings may reduce wall paintable area later, but Step 1 only requires the contract to support `areaSqm`.

## Scene Data Audit

Step 2 audit result:

| Element | Current source | Required fields | Status |
| --- | --- | --- | --- |
| Rooms | `scene_data.rooms` | `id`, `type`, `width`, `depth`, `height`, optional `footprint`, `measurements` | Ready after save normalization |
| Walls | `scene_data.walls` | `id`, `type: "wall"`, `roomId`, `start`, `end`, `height`, `measurements.length`, `measurements.areaSqm` | Ready after save normalization |
| Floors | room footprint plus `materials.floor` | room `width * depth` or footprint area, `measurements.floorAreaSqm` | Ready after save normalization |
| Ceilings | room footprint plus `materials.ceiling` | room `width * depth` or footprint area, `measurements.ceilingAreaSqm` | Ready after save normalization |
| Furniture/decor | `scene_data.furniture` | `id`, `type`, `roomId`, `label`, `position`, `scale`, `measurements.quantity` | Ready after save normalization |
| Lights | `scene_data.lighting.placedLights` | `id`, `type`, `roomId`, `label`, `position`, `measurements.quantity` | Ready after save normalization |
| Doors | `scene_data.walls[].doors` | `id`, `type: "door"`, `roomId`, `wallId`, `width`, `height`, `measurements.quantity` | Ready after save normalization |
| Windows | `scene_data.walls[].windows` | `id`, `type: "window"`, `roomId`, `wallId`, `width`, `height`, `measurements.quantity` | Ready after save normalization |

Save normalization means the editor may continue using its existing geometry state, but project save/export payloads must include derived `measurements` blocks. The backend applies the same normalization on save so older/imported payloads are also made budget-ready.

## Measurement Helpers

Frontend source:

- `lumiere-frontend/src/utils/measurements.js`

Backend source:

- `lumiere-backend/app/utils/measurements.py`

Required helper functions:

```ts
getWallArea(wall)
getFloorArea(floor, room)
getCeilingArea(ceiling, room)
getDoorCount(doors)
getWindowCount(windows)
```

Additional budget-ready helpers:

```ts
getWallLength(wall)
getRoomFootprintArea(room)
getRoomIdForPosition(rooms, position)
buildRoomMeasurements(room, floor, ceiling)
buildWallMeasurements(wall)
buildItemMeasurements(item)
buildLightMeasurements(light)
buildOpeningMeasurements(opening)
```

## Pricing Modes

### Fixed Cost

Allowed target types:

- `furniture`
- `decor`
- `light`
- `door`
- `window`

Example:

```ts
{
  targetType: "furniture",
  targetId: "sofa-1",
  pricingMode: "fixed",
  amount: 1200,
  unit: "item",
  scope: "singleItem"
}
```

### Area-Based Cost

Allowed target types:

- `wall`
- `floor`
- `ceiling`

Example:

```ts
{
  targetType: "wall",
  roomId: "living-room",
  pricingMode: "perSqm",
  amount: 35,
  unit: "sqm",
  scope: "roomType"
}
```

### Override Cost

Overrides are not a third pricing mode. An override is a `singleItem` rule that wins over broader rules.

Example:

```ts
{
  targetType: "wall",
  targetId: "accent-wall-1",
  pricingMode: "perSqm",
  amount: 60,
  unit: "sqm",
  label: "Accent wall finish",
  scope: "singleItem"
}
```

## Budget Data Shape

Use a dedicated budget object in scene data. Do not bury pricing fields randomly inside geometry objects.

```ts
type BudgetTotals = {
  grandTotal: number
  furnitureTotal: number
  decorTotal: number
  wallTotal: number
  floorTotal: number
  ceilingTotal: number
  doorTotal: number
  windowTotal: number
  lightTotal: number
}

type BudgetRule = {
  id: string
  targetType: "furniture" | "decor" | "wall" | "floor" | "ceiling" | "door" | "window" | "light"
  targetId?: string
  roomId?: string
  pricingMode: "fixed" | "perSqm"
  amount: number
  unit: "item" | "sqm"
  label?: string
  scope: "globalType" | "roomType" | "singleItem"
  costSource: "manual" | "estimated" | "imported" | "defaultTemplate"
}

type BudgetItemSnapshot = {
  targetId: string
  targetType: "furniture" | "decor" | "wall" | "floor" | "ceiling" | "door" | "window" | "light"
  roomId?: string
  quantity?: number
  areaSqm?: number
  appliedRuleId?: string
  calculatedCost: number
  costSource?: "manual" | "estimated" | "imported" | "defaultTemplate"
  customOverride: boolean
}

type SceneBudget = {
  enabled: boolean
  currency: "AED"
  rules: BudgetRule[]
  totals: BudgetTotals
  snapshots: BudgetItemSnapshot[]
  last_calculated_at: string | null
}
```

Suggested scene storage:

```ts
scene_data: {
  rooms: [],
  walls: [],
  placedItems: [],
  placedLights: [],
  budget: SceneBudget
}
```

## Rule Scope

| Scope | Meaning | Required fields |
| --- | --- | --- |
| `globalType` | Default rule for all elements of one target type | `targetType` |
| `roomType` | Default rule for one surface type inside one room | `targetType`, `roomId` |
| `singleItem` | Direct rule for one exact element | `targetType`, `targetId` |

Scope restrictions:

- `roomType` is only allowed for `wall`, `floor`, and `ceiling`.
- `singleItem` may be used by every target type.
- `globalType` may be used by every target type.
- A `singleItem` rule is the only valid override.

## Calculation Priority

The estimator must apply rules in this order.

### Fixed-cost targets

Applies to:

- `furniture`
- `decor`
- `light`
- `door`
- `window`

Priority:

1. `singleItem` rule for that exact `targetId`
2. `globalType` rule for that `targetType`
3. Cost `0`

Formula:

```ts
calculatedCost = amount * quantity
```

### Area-cost targets

Applies to:

- `wall`
- `floor`
- `ceiling`

Priority:

1. `singleItem` rule for that exact `targetId`
2. `roomType` rule for that `targetType` and `roomId`
3. `globalType` rule for that `targetType`
4. Cost `0`

Formula:

```ts
calculatedCost = amount * areaSqm
```

## Total Rules

Totals are derived from snapshots, not manually edited.

```ts
furnitureTotal = sum snapshots where targetType === "furniture"
decorTotal = sum snapshots where targetType === "decor"
wallTotal = sum snapshots where targetType === "wall"
floorTotal = sum snapshots where targetType === "floor"
ceilingTotal = sum snapshots where targetType === "ceiling"
doorTotal = sum snapshots where targetType === "door"
windowTotal = sum snapshots where targetType === "window"
lightTotal = sum snapshots where targetType === "light"
grandTotal = sum of all category totals
```

Rounding rule:

- Store unrounded numeric costs where possible.
- Display AED totals rounded to two decimals.

## Backend Contract

The backend should accept and validate the same rules:

- Currency is `AED` for this phase.
- Amount cannot be negative.
- Fixed targets must use `pricingMode: "fixed"` and `unit: "item"`.
- Surface targets must use `pricingMode: "perSqm"` and `unit: "sqm"`.
- `singleItem` requires `targetId`.
- `roomType` requires `roomId`.
- `roomType` is only allowed for `wall`, `floor`, and `ceiling`.

Budget data stays inside each saved scene/project document for this phase:

```py
budget = {
    "enabled": True,
    "currency": "AED",
    "rules": [],
    "totals": {},
    "snapshots": [],
    "last_calculated_at": None,
}
```

The backend can still store `scene_data` flexibly, but any budget-specific route or future estimator should use these models:

- `BudgetRuleCreate`
- `BudgetRuleUpdate`
- `BudgetSummaryResponse`
- `BudgetActivationPayload`
- `SceneBudget`

Do not create a separate MongoDB budget collection yet. Budget data is tied to one scene; split it later only if quotation history, revisions, or approvals become separate business objects.

## Frontend Contract

The frontend should use the same constants for:

- Valid target types
- Fixed-cost target types
- Area-cost target types
- Valid scopes
- Rule priority order
- Default empty budget state

Budget UI should not edit `totals` directly. UI edits create or update budget rules, then the estimator recalculates snapshots and totals.

## Frontend Budget Store

Step 5 adds scene-wide budget editing state with Zustand.

Frontend source:

- `lumiere-frontend/src/stores/useBudgetStore.js`

Store state:

```ts
budgetEnabled: boolean
selectedBudgetTarget: BudgetTarget | null
budgetPanelOpen: boolean
draftRule: Partial<BudgetRule>
rules: BudgetRule[]
summary: BudgetSummaryResponse
snapshots: BudgetItemSnapshot[]
unsavedChanges: boolean
```

Store responsibilities:

- Share budget mode between scene controls, context menus, drawers, and summary panels.
- Hold the selected object or surface while the user edits pricing.
- Hold a draft rule before it is saved.
- Hydrate local budget state from `scene_data.budget`.
- Export scene-level budget data when a project is saved.
- Track unsaved budget edits separately from ordinary scene selection.

This belongs in Zustand rather than component-only React state because budget mode is scene-wide and multiple UI surfaces need access to the same editing session.

## Activate Budget Control

Step 6 adds the first visible budget UI.

Frontend behavior:

- A floating `Budget Estimation` switch appears in the 3D scene.
- When enabled, the Budget Summary panel appears.
- When enabled, scene budget badges appear over costable walls, furniture, and lights.
- When enabled, the door/window right-click menu includes `Set budget cost`.
- When disabled, the summary panel, badges, and budget context-menu actions hide.
- Disabling budget mode does not delete rules, snapshots, totals, or draftable budget data.

Backend endpoint:

```http
PATCH /api/projects/{project_id}/budget/activate
PATCH /projects/{project_id}/budget/activate
```

Payload:

```json
{
  "enabled": true
}
```

The endpoint updates only `scene_data.budget.enabled` and preserves existing budget data. Browser CORS allows `PATCH`.

## Right-Click Budget Integration

Step 7 adds scene-element right-click actions.

Frontend behavior:

- Right-clicking a wall, floor, ceiling, furniture item, or placed light opens a custom scene context menu.
- The menu includes `Edit`, `Material`, `Transform`, `Duplicate`, `Budget / Cost`, and `Delete` where the action applies to that element type.
- Floors and ceilings can be edited/material-priced, but they cannot be duplicated, transformed, or deleted from this menu because they are derived from room geometry.
- Lights do not expose `Material` from this menu.
- When Budget Estimation is disabled, the cost action is disabled as `Activate Budget first`.
- When Budget Estimation is enabled, cost actions open the shared budget drawer with the selected target and rule scope.

Budget scopes from the right-click menu:

| Element | Menu choices | Rule scope |
| --- | --- | --- |
| Wall | Apply to this wall only | `singleItem` |
| Wall | Apply to all walls in this room | `roomType` |
| Wall | Apply to all walls in all rooms | `globalType` |
| Floor | Apply to this floor only | `singleItem` |
| Floor | Apply to this room only | `roomType` |
| Floor | Apply to all floors | `globalType` |
| Ceiling | Apply to this ceiling only | `singleItem` |
| Ceiling | Apply to this room only | `roomType` |
| Ceiling | Apply to all ceilings | `globalType` |
| Furniture/decor/light | Budget / Cost | `singleItem` |

Backend behavior:

- No right-click API is needed.
- The backend only participates once a budget value is saved or budget activation is patched.

## Budget Drawer

Step 8 moves budget editing out of the context menu and into a side drawer.

Frontend behavior:

- Context menus only launch budget editing.
- A right-side Ant Design `Drawer` opens for actual cost entry.
- The drawer uses an Ant Design `Form` layout with controlled budget store state.
- The drawer can be opened for walls, floors, ceilings, furniture, decor, lights, doors, and windows.

Drawer content:

| Field | Purpose |
| --- | --- |
| Object name | Editable display label for the rule |
| Object type | Human-readable budget target type |
| Room name | Shows the room scope when the target can be room-owned |
| Measurements | Shows quantity for fixed items, dimensions and area for surfaces |
| Pricing mode | Shows `Fixed` or `Per sq.m` from the target contract |
| Cost input | AED fixed cost or AED/sq.m rate |
| Scope selector | Chooses `singleItem`, `roomType`, or `globalType` where valid |
| Preview calculated cost | Shows the live formula and AED total before saving |

Surface examples:

- Wall: dimensions, area, per-sq.m rate, scope options for this wall, room walls, or all walls.
- Floor: dimensions, area, per-sq.m rate, scope options for this floor, this room, or all floors.
- Ceiling: dimensions, area, per-sq.m rate, scope options for this ceiling, this room, or all ceilings.

Fixed-item examples:

- Furniture/decor/light/door/window: quantity `1`, fixed AED cost, scope options for this item or all items of that type.

Save behavior for this phase:

- Saving creates or updates a local `BudgetRule` in Zustand.
- The rule keeps `pricingMode`, `unit`, `scope`, `targetType`, and the applicable `targetId` or `roomId`.
- Totals are still owned by the future estimation engine. The drawer only previews the selected rule's immediate cost.

## Budget Rule Persistence

Step 9 persists budget rules instead of raw calculated totals.

Why rules are stored:

- Room geometry can change after pricing.
- Surface areas can change after wall, floor, or ceiling edits.
- Furniture, light, door, or window counts can change.
- The estimator must be able to recalculate from the current scene plus saved rules.

Backend endpoints:

```http
POST /api/projects/{project_id}/budget/rules
PATCH /api/projects/{project_id}/budget/rules/{rule_id}
DELETE /api/projects/{project_id}/budget/rules/{rule_id}

POST /projects/{project_id}/budget/rules
PATCH /projects/{project_id}/budget/rules/{rule_id}
DELETE /projects/{project_id}/budget/rules/{rule_id}
```

Behavior:

- `POST` appends a validated `BudgetRule` with a generated stable `id`.
- `PATCH` updates one existing rule and revalidates the merged result.
- `DELETE` removes one rule.
- Rules are stored inside `scene_data.budget.rules`.
- These endpoints do not store only raw totals.
- Rule changes mark calculated budget outputs stale by clearing `last_calculated_at`.

Frontend behavior:

- The Budget Drawer saves via the rule endpoints when the project has an id.
- New unsaved scenes can still keep rules locally in Zustand until the project is saved.
- After a successful backend mutation, the frontend hydrates the budget store from the returned `scene_data.budget`.
- The same request shape can later be moved into TanStack Query mutations without changing the budget contract.

## Estimation Engine

Step 10 adds the calculator layer.

Frontend source:

- `lumiere-frontend/src/utils/budgetEstimator.js`

Frontend API:

```ts
calculateBudgetSummary(scene, rules)
```

Backend source:

- `lumiere-backend/app/utils/budget_estimator.py`

Backend API:

```py
calculate_budget_summary(scene_data, budget_rules)
```

Return shape:

```json
{
  "grandTotal": 8420,
  "byCategory": {
    "furniture": 3200,
    "decor": 0,
    "walls": 1400,
    "floor": 2200,
    "ceiling": 600,
    "doors": 500,
    "windows": 320,
    "lights": 200
  },
  "byRoom": {
    "living-room": 5100,
    "bedroom-1": 3320
  },
  "breakdown": [],
  "totals": {},
  "snapshots": []
}
```

Engine behavior:

- Reads scene measurements and budget rules.
- Applies `singleItem` overrides before room or global defaults.
- Applies room-level surface rules before global surface rules.
- Uses fixed-cost formulas for furniture, decor, lights, doors, and windows.
- Uses area-based formulas for walls, floors, and ceilings.
- Produces category totals, room totals, grand total, element-by-element breakdown, and snapshot-compatible output.

Backend source-of-truth behavior:

- Project save recalculates `scene_data.budget` from current geometry and stored rules.
- Rule create/update/delete recalculates `scene_data.budget` immediately.
- The backend stores rules and derived calculation outputs together, but rules remain the source for recalculation.

Frontend preview behavior:

- The editor recalculates the visible Budget Summary from the current scene and local rules while Budget Estimation is active.
- This gives instant totals before the next project save/export.

## Instant Recalculation

Step 11 makes recalculation automatic.

Frontend triggers:

- Budget rules change.
- Furniture/decor items are added, edited, duplicated, or deleted.
- Lights are added, edited, duplicated, or deleted.
- Wall geometry, height, doors, or windows change.
- Rooms, floors, ceilings, or material-backed surface data change.
- Budget scope changes in the drawer.

Frontend behavior:

- The scene builds a live budget estimation input from current rooms, walls, furniture, materials, and placed lights.
- While Budget Estimation is active, `calculateBudgetSummary(scene, rules)` runs locally whenever that input or the rule list changes.
- The Zustand budget summary and snapshots are updated immediately, so the UI responds without waiting for a save.

Backend triggers:

- Project create.
- Project update/save.
- Budget activation.
- Budget rule create.
- Budget rule update.
- Budget rule delete.

Backend behavior:

- The backend normalizes scene measurements first.
- Then it recalculates budget outputs from current scene data and stored rules.
- Persisted totals, room totals, category totals, breakdown, and snapshots are trusted derived values.
- Saved rules remain the source of truth, not the previous totals.

## In-Scene Budget Badges

Step 12 adds visual budget badges inside the 3D scene.

Display modes:

- `Show final costs`
- `Show rates`
- `Hide badges`

Frontend behavior:

- The Budget Summary panel includes a scene badge display selector.
- Badges read from `budgetSummary.breakdown`, so they match the active estimation engine output.
- Unpriced elements do not show badges.
- Furniture, decor, lights, walls, floors, and ceilings can show budget labels.
- Surface rate mode shows values like `35 AED/sq.m`.
- Final cost mode shows values like `AED 420`.
- Floor and ceiling badges are placed near room centers.
- Wall badges are placed above wall centers.
- Furniture and light badges are placed above the object.

Design rules:

- Badges must stay compact.
- Badges must use subtle contrast and avoid loud scene clutter.
- Badge hiding must be available at all times while Budget Estimation is active.

## Budget Summary Panel

Step 13 expands the always-visible Budget Summary panel while Budget Estimation is active.

Panel content:

- Grand Total
- Furniture
- Walls
- Floor
- Ceiling
- Doors
- Windows
- Lights
- Room-wise breakdown
- Unpriced items count
- Rule count
- Costable item count
- Scene badge display selector

Unpriced items behavior:

- Count every breakdown row without an applied rule.
- Show this count prominently so users know whether the estimate is complete.
- Keep the count visible even when the total is `AED 0`.

Category behavior:

- Furniture includes furniture and decor totals for the compact panel.
- Surface and opening categories use the estimation engine's `byCategory` output.

Room behavior:

- Room totals use `byRoom`.
- Room IDs are displayed as room names when available.
- If no room has priced items yet, show an empty-state line instead of hiding the section.

## Wall, Floor, And Ceiling Scope Logic

Step 14 hardens the scope model for area-based surfaces.

Scope types:

| Scope | Meaning | Stored fields |
| --- | --- | --- |
| `singleItem` | One exact wall, floor, or ceiling | `targetType`, `targetId`, optional `roomId` |
| `roomType` | All surfaces of one type in one room | `targetType`, `roomId` |
| `globalType` | All surfaces of one type in the project | `targetType` |

Examples:

- One wall only -> `singleItem`
- All walls in bedroom -> `roomType`
- All walls in project -> `globalType`
- One floor only -> `singleItem`
- This room's floor -> `roomType`
- All floors -> `globalType`
- One ceiling only -> `singleItem`
- This room's ceiling -> `roomType`
- All ceilings -> `globalType`

Normalization rules:

- `globalType` rules must not store `targetId` or `roomId`.
- `roomType` rules must store `roomId` and must not store `targetId`.
- `singleItem` rules must store `targetId`.
- `roomType` is only valid for `wall`, `floor`, and `ceiling`.

Calculation priority remains:

1. `singleItem`
2. `roomType`
3. `globalType`
4. `0`

## Lighting Budget Support

Step 15 treats lighting as a proper fixed-cost budget target.

Supported lighting budget categories for this phase:

- Ceiling light
- Pendant light
- Wall light
- Floor lamp
- Strip light

Lighting pricing rules:

- Lights use `targetType: "light"`.
- Lights use `pricingMode: "fixed"`.
- Lights use `unit: "item"`.
- A light can store `budgetCategory`.
- A light can store optional `quantity`.
- The estimator calculates light cost as `fixed amount * quantity`.

Frontend behavior:

- The lighting tool offers budget-facing light types for ceiling, pendant, wall, floor lamp, and strip light.
- Existing legacy light types remain compatible.
- The selected light panel exposes `Budget category`.
- The selected light panel exposes `Budget quantity`.
- The Budget Drawer displays the light category and quantity.
- The in-scene light badge uses the estimator output and therefore respects quantity.

Backend behavior:

- Saved light scene data includes `budgetCategory`, `quantity`, and `measurements.quantity`.
- Backend measurement normalization preserves light quantity.
- Backend estimation uses the normalized light quantity.

Later extension points:

- Package-based lighting cost.
- Brand presets.
- Installation cost.
- Supplier/fixture catalog mapping.

## Manual Overrides Everywhere

Step 16 makes budget rules editable and reversible.

Required actions:

- Edit a rule.
- Remove a rule.
- Reset an override to the inherited default.
- Duplicate a rule pattern to similar items.

Fallback behavior:

- If a `singleItem` override is removed, the item falls back to the next matching inherited rule.
- For walls, floors, and ceilings, fallback order is `roomType`, then `globalType`, then `0`.
- For furniture, decor, lights, doors, and windows, fallback order is `globalType`, then `0`.
- If a `roomType` rule is removed, surfaces fall back to the matching `globalType` rule.

Frontend behavior:

- The Budget Drawer is the manual override surface.
- Changing form values edits the current rule.
- `Delete rule` removes the selected active rule.
- `Reset to inherited default` removes the active rule only when an inherited rule exists.
- `Duplicate pattern to similar items` copies the current amount/mode into the next broader scope:
  - `singleItem` surface -> `roomType`
  - `roomType` surface -> `globalType`
  - fixed-cost `singleItem` -> `globalType`
- The drawer shows the inherited default amount when one exists.

Backend behavior:

- Rule deletion recalculates the budget immediately.
- The estimator fallback priority produces the inherited result without storing duplicate calculated values.

## Quotation Export Structure

Step 17 adds export-ready quotation data without building PDF export yet.

Stored quotation fields:

- Project name
- Date
- Currency
- Room breakdown
- Line items
- Totals
- Grand total

Budget storage:

```ts
scene_data.budget.quotation = {
  projectName: string,
  date: string,
  currency: "AED",
  roomBreakdown: Record<string, number>,
  lineItems: BudgetQuotationLineItem[],
  totals: BudgetTotals,
  grandTotal: number
}
```

Line item structure:

```ts
type BudgetQuotationLineItem = {
  id: string
  targetId: string
  targetType: string
  label?: string
  roomId?: string
  quantity?: number
  areaSqm?: number
  unitPrice: number
  unit?: "item" | "sqm"
  pricingMode?: "fixed" | "perSqm"
  appliedRuleId?: string
  total: number
  costSource?: "manual" | "estimated" | "imported" | "defaultTemplate"
  customOverride: boolean
}
```

Frontend behavior:

- `calculateBudgetSummary(scene, rules)` now returns `quotation`.
- The quotation uses the current project name when available.
- The local budget store preserves quotation data for save/export payloads.

Backend behavior:

- `calculate_budget_summary(scene_data, budget_rules, project_name, generated_at)` returns `quotation`.
- Project create/update stores quotation data under `scene_data.budget.quotation`.
- Budget rule create/update/delete recalculates and stores a fresh quotation.

Future uses:

- Downloadable estimate.
- Client quote.
- Admin review.
- PDF export.

## Project Save And Load Integration

Step 18 connects budget state to project save/load.

Reopen behavior:

- Budget mode restores from `scene_data.budget.enabled`.
- Budget rules restore from `scene_data.budget.rules`.
- Totals, room breakdowns, category breakdowns, snapshots, and quotation data restore from `scene_data.budget`.
- The backend recalculates derived budget outputs before returning opened projects, so stale totals are refreshed.

Frontend behavior:

- Project save sends the full `scene_data.budget` section with the scene.
- Project save hydrates the budget store from the backend response, so trusted recalculated totals are reflected locally.
- Project load hydrates Zustand budget state from `scene_data.budget`.
- Imported `.lumiere.json` files hydrate budget state from the imported budget section.

Backend behavior:

- Project create/update recalculates and stores `scene_data.budget`.
- Authenticated latest-project and open-project responses recalculate and persist fresh budget outputs.
- Public project fetch recalculates budget outputs in the response.
- Project responses include the complete budget section with mode, rules, totals, breakdown, snapshots, and quotation data.

TanStack Query note:

- The current implementation uses the existing `axiosClient`.
- The server-state contract is now ready for TanStack Query because project fetches and budget mutations return the refreshed project/budget payload needed for mutation-driven invalidation.

## Budget Validation Rules

Step 19 keeps budget data clean on both frontend and backend.

Frontend validation:

- Budget amount is required before save.
- Budget amount cannot be negative.
- Budget amount can use a maximum of two decimal places.
- Zero is allowed, but the UI warns that the item or pattern will be treated as free.
- The drawer constrains manual input with a non-negative Ant Design `InputNumber`.

Backend validation:

- `BudgetRuleCreate.amount` is required, non-negative, and limited to two decimal places.
- `BudgetRuleUpdate.amount` is optional, but when present it is non-negative and limited to two decimal places.
- Fixed-cost targets (`furniture`, `decor`, `light`, `door`, `window`) must use `pricingMode: "fixed"` and `unit: "item"`.
- Area-cost targets (`wall`, `floor`, `ceiling`) must use `pricingMode: "perSqm"` and `unit: "sqm"`.
- `singleItem` rules require `targetId`.
- `roomType` rules require `roomId` and are only allowed for `wall`, `floor`, and `ceiling`.
- Invalid scope/type combinations are rejected by Pydantic before reaching persistence.

Zero-price behavior:

- Zero prices are valid because users may intentionally mark supplied, existing, gifted, or no-cost items.
- Zero prices still count as priced rules, so they do not appear as unpriced just because their calculated total is `AED 0`.

## Cost Source Labels

Step 20 adds source metadata to every saved budget rule and calculated budget entry.

Supported cost sources:

| Source | Meaning |
| --- | --- |
| `manual` | User-entered cost |
| `estimated` | System or AI suggested estimate |
| `imported` | Imported supplier, spreadsheet, or catalog cost |
| `defaultTemplate` | Project or company default pricing template |

Current behavior:

- New rules default to `manual`.
- The Budget Drawer exposes a `Cost source` selector.
- Existing older rules without a source are treated as `manual`.
- Estimation breakdown rows copy `costSource` from the applied rule.
- Snapshots and quotation line items preserve `costSource`.

Why this matters:

- Future AI/web pricing can mark values as `estimated`.
- Future supplier imports can mark values as `imported`.
- Future company pricing presets can mark values as `defaultTemplate`.
- Exported quotations can explain where every number came from.
