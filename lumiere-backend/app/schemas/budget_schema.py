from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


BudgetCurrency = Literal["AED"]
BudgetTargetType = Literal[
    "furniture",
    "decor",
    "wall",
    "floor",
    "ceiling",
    "door",
    "window",
    "light",
]
BudgetPricingMode = Literal["fixed", "perSqm"]
BudgetUnit = Literal["item", "sqm"]
BudgetRuleScope = Literal["globalType", "roomType", "singleItem"]
BudgetCostSource = Literal["manual", "estimated", "imported", "defaultTemplate"]

FIXED_COST_TARGET_TYPES = {"furniture", "decor", "light", "door", "window"}
AREA_COST_TARGET_TYPES = {"wall", "floor", "ceiling"}
MAX_BUDGET_AMOUNT_DECIMALS = 2


def _validate_budget_amount_precision(value: float | None) -> float | None:
    if value is None:
        return value

    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Budget amount must be a valid number.") from exc

    decimal_places = abs(decimal_value.as_tuple().exponent) if decimal_value.as_tuple().exponent < 0 else 0
    if decimal_places > MAX_BUDGET_AMOUNT_DECIMALS:
        raise ValueError("Budget amount supports a maximum of 2 decimal places.")

    return value


class BudgetTotals(BaseModel):
    grandTotal: float = 0
    furnitureTotal: float = 0
    decorTotal: float = 0
    wallTotal: float = 0
    floorTotal: float = 0
    ceilingTotal: float = 0
    doorTotal: float = 0
    windowTotal: float = 0
    lightTotal: float = 0


class BudgetMode(BaseModel):
    enabled: bool = False
    currency: BudgetCurrency = "AED"
    totals: BudgetTotals = Field(default_factory=BudgetTotals)


class BudgetRuleBase(BaseModel):
    targetType: BudgetTargetType = Field(description="Budget target category for the priced scene element.")
    targetId: str | None = None
    roomId: str | None = None
    pricingMode: BudgetPricingMode = Field(description="Fixed item cost or surface area rate.")
    amount: float = Field(ge=0, description="Budget amount in AED with up to 2 decimal places.")
    unit: BudgetUnit = Field(description="Pricing unit. Fixed targets use item, surfaces use sqm.")
    label: str | None = None
    scope: BudgetRuleScope = Field(description="Rule scope: global type, room surface type, or single item.")
    costSource: BudgetCostSource = Field(default="manual", description="Where this cost came from.")

    @field_validator("amount")
    @classmethod
    def validate_amount_precision(cls, value: float) -> float:
        return _validate_budget_amount_precision(value)

    @model_validator(mode="after")
    def validate_budget_rule(self) -> "BudgetRuleBase":
        if self.targetType in FIXED_COST_TARGET_TYPES:
            if self.pricingMode != "fixed" or self.unit != "item":
                raise ValueError("Fixed-cost targets must use pricingMode='fixed' and unit='item'.")

        if self.targetType in AREA_COST_TARGET_TYPES:
            if self.pricingMode != "perSqm" or self.unit != "sqm":
                raise ValueError("Surface targets must use pricingMode='perSqm' and unit='sqm'.")

        if self.scope == "singleItem" and not self.targetId:
            raise ValueError("singleItem budget rules require targetId.")

        if self.scope == "roomType":
            if self.targetType not in AREA_COST_TARGET_TYPES:
                raise ValueError("roomType budget rules are only allowed for wall, floor, and ceiling.")
            if not self.roomId:
                raise ValueError("roomType budget rules require roomId.")

        if self.scope == "globalType":
            self.targetId = None
            self.roomId = None

        if self.scope == "roomType":
            self.targetId = None

        return self


class BudgetRule(BudgetRuleBase):
    id: str


class BudgetRuleCreate(BudgetRuleBase):
    pass


class BudgetRuleUpdate(BaseModel):
    targetType: BudgetTargetType | None = None
    targetId: str | None = None
    roomId: str | None = None
    pricingMode: BudgetPricingMode | None = None
    amount: float | None = Field(default=None, ge=0, description="Budget amount in AED with up to 2 decimal places.")
    unit: BudgetUnit | None = None
    label: str | None = None
    scope: BudgetRuleScope | None = None
    costSource: BudgetCostSource | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount_precision(cls, value: float | None) -> float | None:
        return _validate_budget_amount_precision(value)

    @model_validator(mode="after")
    def validate_budget_rule_update(self) -> "BudgetRuleUpdate":
        if self.targetType in FIXED_COST_TARGET_TYPES:
            if self.pricingMode is not None and self.pricingMode != "fixed":
                raise ValueError("Fixed-cost targets must use pricingMode='fixed'.")
            if self.unit is not None and self.unit != "item":
                raise ValueError("Fixed-cost targets must use unit='item'.")

        if self.targetType in AREA_COST_TARGET_TYPES:
            if self.pricingMode is not None and self.pricingMode != "perSqm":
                raise ValueError("Surface targets must use pricingMode='perSqm'.")
            if self.unit is not None and self.unit != "sqm":
                raise ValueError("Surface targets must use unit='sqm'.")

        if self.scope == "singleItem" and not self.targetId:
            raise ValueError("singleItem budget rule updates require targetId.")

        if self.scope == "roomType":
            if self.targetType is not None and self.targetType not in AREA_COST_TARGET_TYPES:
                raise ValueError("roomType budget rules are only allowed for wall, floor, and ceiling.")
            if not self.roomId:
                raise ValueError("roomType budget rule updates require roomId.")

        return self


class BudgetItemSnapshot(BaseModel):
    targetId: str
    targetType: BudgetTargetType
    roomId: str | None = None
    quantity: float | None = Field(default=None, ge=0)
    areaSqm: float | None = Field(default=None, ge=0)
    appliedRuleId: str | None = None
    calculatedCost: float = Field(default=0, ge=0)
    costSource: BudgetCostSource | None = None
    customOverride: bool = False

    @model_validator(mode="after")
    def validate_snapshot_measurement(self) -> "BudgetItemSnapshot":
        if self.targetType in FIXED_COST_TARGET_TYPES and self.quantity is None:
            raise ValueError("Fixed-cost budget snapshots require quantity.")

        if self.targetType in AREA_COST_TARGET_TYPES and self.areaSqm is None:
            raise ValueError("Surface budget snapshots require areaSqm.")

        return self


class SceneBudget(BaseModel):
    enabled: bool = False
    currency: BudgetCurrency = "AED"
    rules: list[BudgetRule] = Field(default_factory=list)
    totals: BudgetTotals = Field(default_factory=BudgetTotals)
    grandTotal: float = 0
    byCategory: dict[str, float] = Field(default_factory=dict)
    byRoom: dict[str, float] = Field(default_factory=dict)
    breakdown: list[dict] = Field(default_factory=list)
    quotation: dict | None = None
    snapshots: list[BudgetItemSnapshot] = Field(default_factory=list)
    last_calculated_at: datetime | None = None


class BudgetActivationPayload(BaseModel):
    enabled: bool
    currency: BudgetCurrency = "AED"


class BudgetSummaryResponse(BaseModel):
    enabled: bool = False
    currency: BudgetCurrency = "AED"
    totals: BudgetTotals = Field(default_factory=BudgetTotals)
    grandTotal: float = 0
    byCategory: dict[str, float] = Field(default_factory=dict)
    byRoom: dict[str, float] = Field(default_factory=dict)
    breakdown: list[dict] = Field(default_factory=list)
    quotation: dict | None = None
    rules_count: int = 0
    snapshots_count: int = 0
    last_calculated_at: datetime | None = None
