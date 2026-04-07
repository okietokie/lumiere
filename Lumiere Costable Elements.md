# Lumiere Costable Elements

This sheet defines every entity in Lumiere that can carry a cost, either now or in later pricing layers.

Layer 1 priority:
- Support manual pricing first.
- Allow each entity to store a suggested price or suggested range later.
- Allow user override without breaking recalculation.

## Group A - Item-based

| Entity name | Category | Pricing style |
| --- | --- | --- |
| Sofa | Item-based | Per item |
| Chair | Item-based | Per item |
| Table | Item-based | Per item |
| Bed | Item-based | Per item |
| Wardrobe | Item-based | Per item |
| Lamp | Item-based | Per item |
| Pendant light | Item-based | Per item |
| Rug | Item-based | Per item |
| Mirror | Item-based | Per item |
| Decor item | Item-based | Per item |
| Door | Item-based | Per unit |
| Window | Item-based | Per unit |

## Group B - Surface-based

| Entity name | Category | Pricing style |
| --- | --- | --- |
| Floor finish | Surface-based | Per square meter |
| Wall paint | Surface-based | Per square meter |
| Wallpaper | Surface-based | Per square meter |
| Ceiling finish | Surface-based | Per square meter |

## Group C - Structural/unit additions

| Entity name | Category | Pricing style |
| --- | --- | --- |
| Added wall | Structural or unit addition | Per linear meter or per square meter |
| Partition wall | Structural or unit addition | Per linear meter or per square meter |
| False ceiling | Structural or unit addition | Per square meter |
| Extra panel | Structural or unit addition | Per unit or per square meter |
| Trim/skirting | Structural or unit addition | Per linear meter |

## Group D - Later extras

| Entity name | Category | Pricing style |
| --- | --- | --- |
| Labor | Later extras | Percentage, lump sum, or per scope item |
| Delivery | Later extras | Lump sum or per supplier/order |
| Tax | Later extras | Percentage |
| Installation | Later extras | Per item, per square meter, or lump sum |

## Notes For System Design

- Current Lumiere entities already aligned with this sheet include furniture items, placed lights, floor material, ceiling material, walls, doors, and windows.
- Layer 1 should treat every costable entity as a record with at least: `entityType`, `category`, `pricingStyle`, `suggestedMin`, `suggestedMax`, `suggestedUnitPrice`, `userOverridePrice`, and `currency`.
- Totals should always resolve from the user override first, then fall back to the suggested value.
- Surface-based and structural entities should be defined now even if their manual pricing UI is added after the first item-based release.
