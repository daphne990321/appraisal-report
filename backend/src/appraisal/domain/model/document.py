"""估價模型文件（事務所設定）的 Pydantic 型別。

欄位名稱直接沿用舊版 JSON 的 camelCase，所以輸出時 key 與舊版相同。
舊版允許欄位不存在，所以欄位預設為 None；要保持原樣輸出請用
`model_dump(by_alias=True, exclude_unset=True)`。
"""

from typing import Any

from pydantic import BaseModel, ConfigDict

Num = int | float


class Loose(BaseModel):
    """共同設定：多的欄位保留（舊版檔案可能有事務所自加的欄位）。"""

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class Settings(Loose):
    dateMode: str | None = None
    monthlyRate: Num | None = None
    weightMode: str | None = None
    totalMode: str | None = None
    lim15: Num | None = None
    lim30: Num | None = None
    gapLim: Num | None = None
    minComps: Num | None = None
    diffThreshold: Num | None = None
    unitDec: Num | None = None
    totalDec: Num | None = None
    unitDisplay: str | None = None


class Indicator(Loose):
    """比較法調整指標。group 是 region（區域因素）或 indiv（個別因素）。"""

    id: str
    group: str
    cat: str | None = None
    name: str | None = None
    step: Num | None = None
    stepAmt: Num | None = None
    on: bool | None = None


class ExpItem(Loose):
    """額外調整項目；sets 是適用的因素組（bldg、land、ind）。"""

    id: str
    name: str | None = None
    group: str | None = None
    pct: Num | None = None
    on: bool | None = None
    sets: list[str] | None = None


class Select(Loose):
    sameCounty: bool | None = None
    sameDistrict: bool | None = None
    sameType: bool | None = None
    sameZone: bool | None = None
    months: Num | None = None
    ageTol: Num | None = None
    areaTolPct: Num | None = None
    floorTol: Num | None = None
    excludeSpecial: bool | None = None
    excludePresale: bool | None = None
    keyword: str | None = None
    autoN: Num | None = None
    wDate: Num | None = None
    wAge: Num | None = None
    wArea: Num | None = None
    wFloor: Num | None = None
    wRoad: Num | None = None


class RentSelect(Loose):
    sameCounty: bool | None = None
    sameDistrict: bool | None = None
    sameType: bool | None = None
    months: Num | None = None
    areaTolPct: Num | None = None
    onlyWhole: bool | None = None
    excludeFurnished: bool | None = None


class PurposeRule(Loose):
    w: dict[str, Num] | None = None
    capFloor: Num | None = None
    expMult: Num | None = None


class IncomeDefaults(Loose):
    vacMonths: Num | None = None
    cap: Num | None = None


class Sources(Loose):
    lvr: bool | None = None
    own: bool | None = None


class Lda(Loose):
    """土地開發分析法的預設值。"""

    profit: Num | None = None
    design: Num | None = None
    adSell: Num | None = None
    mgmt: Num | None = None
    tax: Num | None = None
    ownRatio: Num | None = None
    ownRate: Num | None = None
    loanRate: Num | None = None
    freeFactor: Num | None = None
    saleFactor: Num | None = None
    firstFloorRatio: Num | None = None
    util1F: Num | None = None
    utilStep: Num | None = None
    baseFloor: Num | None = None
    pingPerCar: Num | None = None


class Texts(Loose):
    validMonths: Num | None = None
    stance: list[str] | None = None
    assumptions: list[str] | None = None
    limits: list[str] | None = None


class CostRow(Loose):
    name: str | None = None
    unit: Num | None = None


class CostDefaults(Loose):
    unitCost: Num | None = None
    design: Num | None = None
    adSell: Num | None = None
    mgmt: Num | None = None
    tax: Num | None = None
    interest: Num | None = None
    profit: Num | None = None
    life: Num | None = None
    salvage: Num | None = None
    table: list[CostRow] | None = None


class ModelDocument(Loose):
    """估價模型：事務所可設定的選取條件、權重、預設值與固定條文。"""

    id: str
    name: str
    updated: str | None = None
    note: str | None = None
    settings: Settings | None = None
    indicators: list[Indicator] | None = None
    indicatorSets: dict[str, list[Indicator]] | None = None
    exp: list[ExpItem] | None = None
    select: Select | None = None
    rentSelect: RentSelect | None = None
    purpose: dict[str, PurposeRule] | None = None
    kindWeights: dict[str, dict[str, Num] | None] | None = None
    income: IncomeDefaults | None = None
    sources: Sources | None = None
    lda: Lda | None = None
    texts: Texts | None = None
    cost: CostDefaults | None = None

    def to_dict(self) -> dict[str, Any]:
        """輸出成舊版形狀的 dict（只含有設定的欄位）。"""
        return self.model_dump(by_alias=True, exclude_unset=True)
