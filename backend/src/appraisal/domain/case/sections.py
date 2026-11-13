"""案件文件各區段的 Pydantic 型別。

欄位名稱沿用舊版 JSON 的 camelCase。舊版允許欄位不存在（讀取時當 0 或空字串），
所以多數欄位預設為 None；要保持原樣輸出請用
`model_dump(by_alias=True, exclude_unset=True)`。動態 map 用 `dict[str, 值型別]`。
"""

from typing import Any

from pydantic import BaseModel, ConfigDict

Num = int | float
# 表單可能存數字或文字（例如比較標的的屋齡、容積率、面積可為空字串）
NumOrStr = int | float | str


class Loose(BaseModel):
    """共同設定：多的欄位保留。"""

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class Parcel(Loose):
    """地號。"""

    section: str | None = None
    no: str | None = None
    zone: str | None = None
    areaM2: Num | None = None
    share: Num | None = None
    annVal: Num | None = None
    prevVal: Num | None = None
    prevDate: str | None = None
    cpi: Num | None = None
    priceMode: str | None = None
    adjPct: Num | None = None
    annPct: Num | None = None
    unit: Num | None = None
    note: str | None = None


class Special(Loose):
    """特定價格／開發後價格折現。"""

    enabled: bool | None = None
    label: str | None = None
    far: Num | None = None
    years: Num | None = None
    rateMode: str | None = None
    ownRatio: Num | None = None
    ownRate: Num | None = None
    loanRate: Num | None = None
    prem: dict[str, Num] | None = None
    rateInput: Num | None = None
    w: dict[str, Num] | None = None


class Report(Loose):
    caseNo: str | None = None
    docNo: str | None = None
    leader: str | None = None
    surveyRefs: str | None = None
    surveyConclusion: str | None = None
    dataSources: str | None = None
    otherBurden: str | None = None
    market: str | None = None
    marketSupply: str | None = None
    marketDemand: str | None = None
    marketPrice: str | None = None
    regionChecks: dict[str, Any] | None = None
    methodReason: str | None = None
    notUsed: dict[str, Any] | None = None
    format: str | None = None


class Basic(Loose):
    """勘估標的基本資料。"""

    county: str | None = None
    district: str | None = None
    road: str | None = None
    addr: str | None = None
    bldgNo: str | None = None
    landNo: str | None = None
    zone: str | None = None
    btype: str | None = None
    area: Num | None = None
    landShare: Num | None = None
    floorNum: Num | None = None
    totalFloors: Num | None = None
    completed: str | None = None
    floorDesc: str | None = None
    owner: str | None = None
    encumbrance: str | None = None
    purpose: str | None = None
    priceDate: str | None = None
    surveyDate: str | None = None
    priceType: str | None = None
    conditions: str | None = None
    normalPrice: str | None = None
    client: str | None = None
    fee: str | None = None
    contractDate: str | None = None
    scope: str | None = None


class Survey(Loose):
    led: bool | None = None
    indoor: bool | None = None
    photos: Num | None = None
    useStatus: str | None = None
    illegal: str | None = None
    notes: str | None = None
    d: dict[str, str] | None = None


class Analysis(Loose):
    general: str | None = None
    region: str | None = None
    indiv: str | None = None
    hbu: str | None = None
    confirmed: bool | None = None


class Methods(Loose):
    comparison: bool | None = None
    income: bool | None = None
    cost: bool | None = None
    land: bool | None = None
    singleReason: str | None = None


class CompSettings(Loose):
    method: str | None = None
    inputMode: str | None = None
    regVars: list[str] | None = None
    volumeBasis: bool | None = None
    subjFar: Num | None = None


class AdjCell(Loose):
    """某比較標的在某調整項目上的等級、百分率與金額。"""

    lv: Num | None = None
    pct: Num | None = None
    amt: Num | None = None


class Comp(Loose):
    """比較標的。adj 的 key 是調整指標代號；flags 的 key 是額外調整項目代號。"""

    label: str | None = None
    libId: str | None = None
    src: str | None = None
    loc: str | None = None
    floor: str | None = None
    age: NumOrStr | None = None
    date: str | None = None
    price: Num | None = None
    special: str | None = None
    note: str | None = None
    area: NumOrStr | None = None
    zone: str | None = None
    far: NumOrStr | None = None
    priceType: str | None = None
    bargain: Num | None = None
    dataSrc: str | None = None
    shape: str | None = None
    road: str | None = None
    cond: Num | None = None
    condReason: str | None = None
    dateManual: bool | None = None
    dateAdj: Num | None = None
    adj: dict[str, AdjCell] | None = None
    flags: dict[str, bool] | None = None
    weight: Num | None = None
    include: bool | None = None
    exception: bool | None = None
    exceptionReason: str | None = None
    verifyIssue: str | None = None


class Income(Loose):
    """收益法。cap 以外的子結構（risk、dcr、egim、dcf）欄位多且依資本化率模式而異，用 dict。"""

    method: str | None = None
    revMode: str | None = None
    rooms: Num | None = None
    adr: Num | None = None
    occ: Num | None = None
    otherPct: Num | None = None
    opexPct: Num | None = None
    mgmtPct: Num | None = None
    rent: Num | None = None
    rentSource: str | None = None
    vacMonths: Num | None = None
    incomes: list[dict[str, Any]] | None = None
    exp: list[dict[str, Any]] | None = None
    costSource: str | None = None
    manualCost: Num | None = None
    life: Num | None = None
    salvage: Num | None = None
    threeYears: bool | None = None
    capMode: str | None = None
    cap: Num | None = None
    risk: dict[str, Num] | None = None
    extract: list[dict[str, Any]] | None = None
    wacc: list[dict[str, Any]] | None = None
    dcr: dict[str, Num] | None = None
    egim: dict[str, Num] | None = None
    dcf: dict[str, Any] | None = None


class Cost(Loose):
    conMethod: str | None = None
    unitCost: Num | None = None
    indexPct: Num | None = None
    extraLand: Num | None = None
    unitCostNote: str | None = None
    items: list[dict[str, Any]] | None = None
    design: Num | None = None
    extras: list[dict[str, Any]] | None = None
    adSell: Num | None = None
    mgmt: Num | None = None
    tax: Num | None = None
    interest: Num | None = None
    profit: Num | None = None
    depMethod: str | None = None
    sinkRate: Num | None = None
    life: Num | None = None
    salvage: Num | None = None
    ageManual: bool | None = None
    age: Num | None = None
    landUnit: Num | None = None


class Land(Loose):
    """土地開發分析法。utils 的 key 是樓層區段代號。"""

    mode: str | None = None
    sales: list[dict[str, Any]] | None = None
    floorArea: Num | None = None
    conUnit: Num | None = None
    conIndex: Num | None = None
    design: Num | None = None
    adSell: Num | None = None
    mgmt: Num | None = None
    tax: Num | None = None
    profit: Num | None = None
    iMode: str | None = None
    annualRate: Num | None = None
    landRatio: Num | None = None
    years: Num | None = None
    iInput: Num | None = None
    site: Num | None = None
    far: Num | None = None
    bonus: Num | None = None
    freeFactor: Num | None = None
    floorsAbove: Num | None = None
    floorsBelow: Num | None = None
    digRate: Num | None = None
    saleFactor: Num | None = None
    firstFloorRatio: Num | None = None
    baseUnit: Num | None = None
    baseFloor: Num | None = None
    util1F: Num | None = None
    utilStep: Num | None = None
    utils: dict[str, Num] | None = None
    cars: Num | None = None
    pingPerCar: Num | None = None
    carPrice: Num | None = None
    ownRatio: Num | None = None
    ownRate: Num | None = None
    loanRate: Num | None = None
    buildMonths: Num | None = None
    landMonths: Num | None = None


class Final(Loose):
    useModelWeights: bool | None = None
    w: dict[str, Num] | None = None
    reviewed: bool | None = None
    reason: str | None = None


class Appraiser(Loose):
    name: str | None = None
    certNo: str | None = None
    licenseNo: str | None = None
    licenseExp: str | None = None
    office: str | None = None
    guild: str | None = None
    guildNo: str | None = None
