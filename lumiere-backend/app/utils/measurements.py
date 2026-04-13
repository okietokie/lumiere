DEFAULT_ROOM_WIDTH = 6
DEFAULT_ROOM_DEPTH = 6
DEFAULT_ROOM_HEIGHT = 3

EMPTY_BUDGET_TOTALS = {
    "grandTotal": 0,
    "furnitureTotal": 0,
    "decorTotal": 0,
    "wallTotal": 0,
    "floorTotal": 0,
    "ceilingTotal": 0,
    "doorTotal": 0,
    "windowTotal": 0,
    "lightTotal": 0,
}


def _finite_number(value, fallback=0):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else fallback


def _round_measurement(value):
    return round(value, 4) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def _point_pair_length(start=None, end=None):
    start = start or [0, 0]
    end = end or [0, 0]
    sx = _finite_number(start[0] if len(start) > 0 else 0)
    sz = _finite_number(start[1] if len(start) > 1 else 0)
    ex = _finite_number(end[0] if len(end) > 0 else 0)
    ez = _finite_number(end[1] if len(end) > 1 else 0)
    return ((ex - sx) ** 2 + (ez - sz) ** 2) ** 0.5


def get_wall_length(wall=None):
    wall = wall or {}
    if isinstance(wall.get("length"), (int, float)) and not isinstance(wall.get("length"), bool):
        return _round_measurement(wall["length"])
    return _round_measurement(_point_pair_length(wall.get("start"), wall.get("end")))


def get_wall_height(wall=None, fallback_height=DEFAULT_ROOM_HEIGHT):
    wall = wall or {}
    return _round_measurement(_finite_number(wall.get("height"), fallback_height))


def get_wall_area(wall=None, fallback_height=DEFAULT_ROOM_HEIGHT):
    wall = wall or {}
    return _round_measurement(get_wall_length(wall) * get_wall_height(wall, fallback_height))


def get_room_footprint_area(room=None):
    room = room or {}
    footprint = room.get("footprint")
    if isinstance(footprint, list) and len(footprint) >= 3:
        area = 0
        for index, point in enumerate(footprint):
            next_point = footprint[(index + 1) % len(footprint)]
            x1 = _finite_number(point[0] if len(point) > 0 else 0)
            z1 = _finite_number(point[1] if len(point) > 1 else 0)
            x2 = _finite_number(next_point[0] if len(next_point) > 0 else 0)
            z2 = _finite_number(next_point[1] if len(next_point) > 1 else 0)
            area += x1 * z2 - x2 * z1
        return _round_measurement(abs(area / 2))

    width = _finite_number(room.get("width"), DEFAULT_ROOM_WIDTH)
    depth = _finite_number(room.get("depth"), DEFAULT_ROOM_DEPTH)
    return _round_measurement(width * depth)


def get_floor_area(floor=None, room=None):
    floor = floor or {}
    if isinstance(floor.get("areaSqm"), (int, float)) and not isinstance(floor.get("areaSqm"), bool):
        return _round_measurement(floor["areaSqm"])
    if isinstance(floor.get("width"), (int, float)) and isinstance(floor.get("depth"), (int, float)):
        return _round_measurement(floor["width"] * floor["depth"])
    return get_room_footprint_area(room)


def get_ceiling_area(ceiling=None, room=None):
    ceiling = ceiling or {}
    if isinstance(ceiling.get("areaSqm"), (int, float)) and not isinstance(ceiling.get("areaSqm"), bool):
        return _round_measurement(ceiling["areaSqm"])
    if isinstance(ceiling.get("width"), (int, float)) and isinstance(ceiling.get("depth"), (int, float)):
        return _round_measurement(ceiling["width"] * ceiling["depth"])
    return get_room_footprint_area(room)


def get_door_count(doors=None):
    return len(doors) if isinstance(doors, list) else 0


def get_window_count(windows=None):
    return len(windows) if isinstance(windows, list) else 0


def _point_in_polygon(point, polygon):
    inside = False
    previous_index = len(polygon) - 1
    for index, current in enumerate(polygon):
        previous = polygon[previous_index]
        xi = _finite_number(current[0] if len(current) > 0 else 0)
        zi = _finite_number(current[1] if len(current) > 1 else 0)
        xj = _finite_number(previous[0] if len(previous) > 0 else 0)
        zj = _finite_number(previous[1] if len(previous) > 1 else 0)
        intersects = (zi > point[1]) != (zj > point[1]) and point[0] < (
            ((xj - xi) * (point[1] - zi)) / ((zj - zi) or 1e-9) + xi
        )
        if intersects:
            inside = not inside
        previous_index = index
    return inside


def _point_in_room_bounds(point, room):
    width = _finite_number(room.get("width"), DEFAULT_ROOM_WIDTH)
    depth = _finite_number(room.get("depth"), DEFAULT_ROOM_DEPTH)
    x = _finite_number(room.get("x"))
    z = _finite_number(room.get("z"))
    return (
        point[0] >= x - width / 2
        and point[0] <= x + width / 2
        and point[1] >= z - depth / 2
        and point[1] <= z + depth / 2
    )


def get_room_id_for_position(rooms=None, position=None):
    rooms = rooms or []
    position = position or [0, 0, 0]
    point = [
        _finite_number(position[0] if len(position) > 0 else 0),
        _finite_number(position[2] if len(position) > 2 else 0),
    ]
    for room in rooms:
        footprint = room.get("footprint") if isinstance(room, dict) else None
        if isinstance(footprint, list) and len(footprint) >= 3:
            if _point_in_polygon(point, footprint):
                return room.get("id")
        elif isinstance(room, dict) and _point_in_room_bounds(point, room):
            return room.get("id")
    return None


def build_room_measurements(room=None, floor=None, ceiling=None):
    room = room or {}
    return {
        "width": _round_measurement(_finite_number(room.get("width"), DEFAULT_ROOM_WIDTH)),
        "depth": _round_measurement(_finite_number(room.get("depth"), DEFAULT_ROOM_DEPTH)),
        "height": _round_measurement(_finite_number(room.get("height"), DEFAULT_ROOM_HEIGHT)),
        "floorAreaSqm": get_floor_area(floor, room),
        "ceilingAreaSqm": get_ceiling_area(ceiling, room),
    }


def build_wall_measurements(wall=None):
    wall = wall or {}
    return {
        "length": get_wall_length(wall),
        "height": get_wall_height(wall),
        "areaSqm": get_wall_area(wall),
        "doorCount": get_door_count(wall.get("doors")),
        "windowCount": get_window_count(wall.get("windows")),
    }


def build_item_measurements(item=None):
    item = item or {}
    return {
        "quantity": 1,
        "scale": item.get("scale") if isinstance(item.get("scale"), list) else [1, 1, 1],
    }


def build_light_measurements(light=None):
    light = light or {}
    measurements = light.get("measurements") if isinstance(light.get("measurements"), dict) else {}
    return {"quantity": max(1, _round_measurement(_finite_number(light.get("quantity"), measurements.get("quantity", 1))))}


def build_opening_measurements(opening=None):
    opening = opening or {}
    return {
        "quantity": 1,
        "width": _round_measurement(_finite_number(opening.get("width"))),
        "height": _round_measurement(_finite_number(opening.get("height"))),
    }


def build_scene_budget(budget=None):
    budget = budget if isinstance(budget, dict) else {}
    mode = budget.get("mode") if isinstance(budget.get("mode"), dict) else {}
    totals = budget.get("totals") if isinstance(budget.get("totals"), dict) else mode.get("totals")

    return {
        "enabled": bool(budget.get("enabled", mode.get("enabled", False))),
        "currency": budget.get("currency") or mode.get("currency") or "AED",
        "rules": budget.get("rules") if isinstance(budget.get("rules"), list) else [],
        "totals": {
            **EMPTY_BUDGET_TOTALS,
            **(totals if isinstance(totals, dict) else {}),
        },
        "grandTotal": _finite_number(budget.get("grandTotal"), _finite_number(mode.get("grandTotal"))),
        "byCategory": budget.get("byCategory") if isinstance(budget.get("byCategory"), dict) else {},
        "byRoom": budget.get("byRoom") if isinstance(budget.get("byRoom"), dict) else {},
        "breakdown": budget.get("breakdown") if isinstance(budget.get("breakdown"), list) else [],
        "quotation": budget.get("quotation") if isinstance(budget.get("quotation"), dict) else None,
        "snapshots": budget.get("snapshots") if isinstance(budget.get("snapshots"), list) else [],
        "last_calculated_at": budget.get("last_calculated_at"),
    }


def with_scene_measurements(scene=None):
    if not isinstance(scene, dict):
        return {}

    next_scene = {
        **scene,
        "rooms": [],
        "walls": [],
        "budget": build_scene_budget(scene.get("budget")),
    }
    rooms = scene.get("rooms") if isinstance(scene.get("rooms"), list) else []
    walls = scene.get("walls") if isinstance(scene.get("walls"), list) else []
    floor = scene.get("materials", {}).get("floor") or scene.get("floorMaterial") or {}
    ceiling = scene.get("materials", {}).get("ceiling") or scene.get("ceilingMaterial") or {}

    next_scene["rooms"] = [
        {
            **room,
            "label": room.get("label") or room.get("name"),
            "measurements": build_room_measurements(room, floor, ceiling),
        }
        for room in rooms
        if isinstance(room, dict)
    ]

    next_walls = []
    for wall in walls:
        if not isinstance(wall, dict):
            continue
        room_id = wall.get("roomId")
        wall_id = wall.get("id")
        doors = wall.get("doors") if isinstance(wall.get("doors"), list) else []
        windows = wall.get("windows") if isinstance(wall.get("windows"), list) else []
        next_walls.append(
            {
                **wall,
                "type": "wall",
                "doors": [
                    {
                        **door,
                        "type": "door",
                        "roomId": door.get("roomId") or room_id,
                        "wallId": door.get("wallId") or wall_id,
                        "label": door.get("label") or "Door",
                        "measurements": build_opening_measurements(door),
                    }
                    for door in doors
                    if isinstance(door, dict)
                ],
                "windows": [
                    {
                        **window,
                        "type": "window",
                        "roomId": window.get("roomId") or room_id,
                        "wallId": window.get("wallId") or wall_id,
                        "label": window.get("label") or "Window",
                        "measurements": build_opening_measurements(window),
                    }
                    for window in windows
                    if isinstance(window, dict)
                ],
                "measurements": build_wall_measurements(wall),
            }
        )
    next_scene["walls"] = next_walls

    furniture = scene.get("furniture")
    if furniture is None:
        furniture = scene.get("placedItems")
    if isinstance(furniture, list):
        next_furniture = []
        for item in furniture:
            if not isinstance(item, dict):
                continue
            position = item.get("position") if isinstance(item.get("position"), list) else [0, 0, 0]
            next_furniture.append(
                {
                    **item,
                    "type": item.get("type") or item.get("category") or "furniture",
                    "label": item.get("label") or item.get("name") or item.get("filename") or "Furniture",
                    "roomId": item.get("roomId") or get_room_id_for_position(next_scene["rooms"], position),
                    "measurements": build_item_measurements(item),
                }
            )
        next_scene["furniture"] = next_furniture

    lighting = scene.get("lighting")
    if isinstance(lighting, dict):
        placed_lights = lighting.get("placedLights") if isinstance(lighting.get("placedLights"), list) else []
        next_scene["lighting"] = {
            **lighting,
            "placedLights": [
                {
                    **light,
                    "label": light.get("label") or f"{light.get('type') or 'Light'} light",
                    "budgetCategory": light.get("budgetCategory"),
                    "quantity": _finite_number(light.get("quantity"), 1),
                    "roomId": light.get("roomId") or get_room_id_for_position(next_scene["rooms"], light.get("position") or [0, 0, 0]),
                    "measurements": build_light_measurements(light),
                }
                for light in placed_lights
                if isinstance(light, dict)
            ],
        }

    return next_scene
