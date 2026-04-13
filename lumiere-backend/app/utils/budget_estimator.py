from app.utils.measurements import (
    EMPTY_BUDGET_TOTALS,
    get_ceiling_area,
    get_floor_area,
    get_room_id_for_position,
    get_wall_area,
)


CATEGORY_KEYS = {
    "furniture": "furniture",
    "decor": "decor",
    "wall": "walls",
    "floor": "floor",
    "ceiling": "ceiling",
    "door": "doors",
    "window": "windows",
    "light": "lights",
}

TOTAL_KEYS = {
    "furniture": "furnitureTotal",
    "decor": "decorTotal",
    "wall": "wallTotal",
    "floor": "floorTotal",
    "ceiling": "ceilingTotal",
    "door": "doorTotal",
    "window": "windowTotal",
    "light": "lightTotal",
}

AREA_COST_TARGET_TYPES = {"wall", "floor", "ceiling"}
DEFAULT_COST_SOURCE = "manual"


def _finite_number(value, fallback=0):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else fallback


def _round_money(value):
    return round(value, 2) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def _is_decor_item(item):
    category = str(item.get("category") or item.get("type") or "").lower()
    return "decor" in category or "rug" in category or "mirror" in category


def _valid_rules(rules):
    return [
        rule for rule in (rules if isinstance(rules, list) else [])
        if isinstance(rule, dict) and rule.get("targetType") and rule.get("scope")
    ]


def _build_budget_quotation(scene_data, summary, project_name=None, generated_at=None):
    budget = scene_data.get("budget") if isinstance(scene_data.get("budget"), dict) else {}
    existing_quotation = budget.get("quotation") if isinstance(budget.get("quotation"), dict) else {}
    return {
        "projectName": project_name or scene_data.get("projectName") or scene_data.get("title") or scene_data.get("name") or "Untitled Room",
        "date": generated_at or existing_quotation.get("date"),
        "currency": budget.get("currency") or "AED",
        "roomBreakdown": summary["byRoom"],
        "lineItems": [
            {
                "id": item["targetId"],
                "targetId": item["targetId"],
                "targetType": item["targetType"],
                "label": item.get("label"),
                "roomId": item.get("roomId"),
                "quantity": item.get("quantity"),
                "areaSqm": item.get("areaSqm"),
                "unitPrice": item.get("amount"),
                "unit": item.get("unit"),
                "pricingMode": item.get("pricingMode"),
                "costSource": item.get("costSource"),
                "appliedRuleId": item.get("appliedRuleId"),
                "total": item.get("calculatedCost"),
                "customOverride": item.get("customOverride"),
            }
            for item in summary["breakdown"]
        ],
        "totals": summary["totals"],
        "grandTotal": summary["grandTotal"],
    }


def _find_applied_rule(element, rules):
    target_type = element["targetType"]

    if target_type in AREA_COST_TARGET_TYPES:
        for scope in ("singleItem", "roomType", "globalType"):
            for rule in rules:
                if rule.get("targetType") != target_type or rule.get("scope") != scope:
                    continue
                if scope == "singleItem" and rule.get("targetId") == element.get("targetId"):
                    return rule
                if scope == "roomType" and rule.get("roomId") == element.get("roomId"):
                    return rule
                if scope == "globalType":
                    return rule
        return None

    for scope in ("singleItem", "globalType"):
        for rule in rules:
            if rule.get("targetType") != target_type or rule.get("scope") != scope:
                continue
            if scope == "singleItem" and rule.get("targetId") == element.get("targetId"):
                return rule
            if scope == "globalType":
                return rule
    return None


def _collect_budget_elements(scene_data):
    rooms = scene_data.get("rooms") if isinstance(scene_data.get("rooms"), list) else []
    walls = scene_data.get("walls") if isinstance(scene_data.get("walls"), list) else []
    furniture = scene_data.get("furniture")
    if furniture is None:
        furniture = scene_data.get("placedItems")
    furniture = furniture if isinstance(furniture, list) else []
    lighting = scene_data.get("lighting") if isinstance(scene_data.get("lighting"), dict) else {}
    placed_lights = lighting.get("placedLights") if isinstance(lighting.get("placedLights"), list) else []
    floor = scene_data.get("materials", {}).get("floor") or scene_data.get("floorMaterial") or {}
    ceiling = scene_data.get("materials", {}).get("ceiling") or scene_data.get("ceilingMaterial") or {}

    elements = []

    for room in rooms:
        if not isinstance(room, dict) or not room.get("id"):
            continue
        measurements = room.get("measurements") if isinstance(room.get("measurements"), dict) else {}
        room_label = room.get("name") or room.get("label") or "Room"
        elements.append({
            "targetId": f"floor:{room['id']}",
            "targetType": "floor",
            "roomId": room["id"],
            "label": f"{room_label} floor",
            "areaSqm": _finite_number(measurements.get("floorAreaSqm"), get_floor_area(floor, room)),
        })
        elements.append({
            "targetId": f"ceiling:{room['id']}",
            "targetType": "ceiling",
            "roomId": room["id"],
            "label": f"{room_label} ceiling",
            "areaSqm": _finite_number(measurements.get("ceilingAreaSqm"), get_ceiling_area(ceiling, room)),
        })

    for wall in walls:
        if not isinstance(wall, dict) or not wall.get("id"):
            continue
        measurements = wall.get("measurements") if isinstance(wall.get("measurements"), dict) else {}
        elements.append({
            "targetId": wall["id"],
            "targetType": "wall",
            "roomId": wall.get("roomId"),
            "label": wall.get("label") or "Wall",
            "areaSqm": _finite_number(measurements.get("areaSqm"), get_wall_area(wall)),
        })

        for door in wall.get("doors") if isinstance(wall.get("doors"), list) else []:
            if not isinstance(door, dict) or not door.get("id"):
                continue
            measurements = door.get("measurements") if isinstance(door.get("measurements"), dict) else {}
            elements.append({
                "targetId": door["id"],
                "targetType": "door",
                "roomId": door.get("roomId") or wall.get("roomId"),
                "label": door.get("label") or "Door",
                "quantity": _finite_number(measurements.get("quantity"), 1),
            })

        for window in wall.get("windows") if isinstance(wall.get("windows"), list) else []:
            if not isinstance(window, dict) or not window.get("id"):
                continue
            measurements = window.get("measurements") if isinstance(window.get("measurements"), dict) else {}
            elements.append({
                "targetId": window["id"],
                "targetType": "window",
                "roomId": window.get("roomId") or wall.get("roomId"),
                "label": window.get("label") or "Window",
                "quantity": _finite_number(measurements.get("quantity"), 1),
            })

    for item in furniture:
        if not isinstance(item, dict) or not item.get("id"):
            continue
        measurements = item.get("measurements") if isinstance(item.get("measurements"), dict) else {}
        target_type = "decor" if _is_decor_item(item) else "furniture"
        elements.append({
            "targetId": item["id"],
            "targetType": target_type,
            "roomId": item.get("roomId") or get_room_id_for_position(rooms, item.get("position") or [0, 0, 0]),
            "label": item.get("label") or item.get("name") or item.get("filename") or "Furniture",
            "quantity": _finite_number(measurements.get("quantity"), 1),
        })

    for light in placed_lights:
        if not isinstance(light, dict) or not light.get("id"):
            continue
        measurements = light.get("measurements") if isinstance(light.get("measurements"), dict) else {}
        elements.append({
            "targetId": light["id"],
            "targetType": "light",
            "roomId": light.get("roomId") or get_room_id_for_position(rooms, light.get("position") or [0, 0, 0]),
            "label": light.get("label") or f"{light.get('budgetCategory') or light.get('type') or 'Light'} light",
            "lightType": light.get("type"),
            "budgetCategory": light.get("budgetCategory"),
            "quantity": _finite_number(measurements.get("quantity"), _finite_number(light.get("quantity"), 1)),
        })

    return elements


def calculate_budget_summary(scene_data, budget_rules, project_name=None, generated_at=None):
    scene_data = scene_data if isinstance(scene_data, dict) else {}
    rules = _valid_rules(budget_rules)
    by_category = {
        "furniture": 0,
        "decor": 0,
        "walls": 0,
        "floor": 0,
        "ceiling": 0,
        "doors": 0,
        "windows": 0,
        "lights": 0,
    }
    by_room = {}
    totals = {**EMPTY_BUDGET_TOTALS}
    breakdown = []

    for element in _collect_budget_elements(scene_data):
        applied_rule = _find_applied_rule(element, rules)
        is_area_based = element["targetType"] in AREA_COST_TARGET_TYPES
        quantity = _finite_number(element.get("areaSqm") if is_area_based else element.get("quantity"), 1)
        amount = _finite_number(applied_rule.get("amount") if applied_rule else None)
        calculated_cost = _round_money(quantity * amount)
        category_key = CATEGORY_KEYS.get(element["targetType"])
        total_key = TOTAL_KEYS.get(element["targetType"])

        if category_key:
            by_category[category_key] = _round_money(by_category.get(category_key, 0) + calculated_cost)
        if total_key:
            totals[total_key] = _round_money(totals.get(total_key, 0) + calculated_cost)
        if element.get("roomId"):
            by_room[element["roomId"]] = _round_money(by_room.get(element["roomId"], 0) + calculated_cost)

        breakdown.append({
            **element,
            "quantity": None if is_area_based else quantity,
            "areaSqm": quantity if is_area_based else None,
            "appliedRuleId": applied_rule.get("id") if applied_rule else None,
            "pricingMode": applied_rule.get("pricingMode") if applied_rule else None,
            "unit": applied_rule.get("unit") if applied_rule else None,
            "costSource": (applied_rule.get("costSource") or DEFAULT_COST_SOURCE) if applied_rule else None,
            "amount": amount,
            "calculatedCost": calculated_cost,
            "customOverride": applied_rule.get("scope") == "singleItem" if applied_rule else False,
        })

    grand_total = _round_money(sum(by_category.values()))
    totals["grandTotal"] = grand_total

    summary = {
        "grandTotal": grand_total,
        "byCategory": by_category,
        "byRoom": by_room,
        "breakdown": breakdown,
        "totals": totals,
        "snapshots": [
            {
                "targetId": item["targetId"],
                "targetType": item["targetType"],
                "roomId": item.get("roomId"),
                "quantity": item.get("quantity"),
                "areaSqm": item.get("areaSqm"),
                "appliedRuleId": item.get("appliedRuleId"),
                "calculatedCost": item["calculatedCost"],
                "costSource": item.get("costSource"),
                "customOverride": item["customOverride"],
            }
            for item in breakdown
        ],
    }
    return {
        **summary,
        "quotation": _build_budget_quotation(scene_data, summary, project_name, generated_at),
    }
