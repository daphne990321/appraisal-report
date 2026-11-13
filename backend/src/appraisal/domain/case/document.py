"""案件文件（CaseDocument）：各區段型別在 sections.py。"""

from typing import Any

from appraisal.domain.case.sections import (
    Analysis,
    Appraiser,
    Basic,
    Comp,
    CompSettings,
    Cost,
    Final,
    Income,
    Land,
    Loose,
    Methods,
    Parcel,
    Report,
    Special,
    Survey,
)
from appraisal.domain.model.document import ModelDocument


class CaseDocument(Loose):
    """案件文件。id、signed、modelSnapshot 與資料表欄位重複，寫入時由 Service 強制一致。"""

    id: str
    kind: str | None = None
    signed: bool | None = None
    signedAt: str | None = None
    modelId: str | None = None
    modelSnapshot: ModelDocument | None = None
    subjFlags: dict[str, bool] | None = None
    parcels: list[Parcel] | None = None
    buildings: list[dict[str, Any]] | None = None
    special: Special | None = None
    report: Report | None = None
    basic: Basic | None = None
    survey: Survey | None = None
    analysis: Analysis | None = None
    methods: Methods | None = None
    comp: CompSettings | None = None
    comps: list[Comp] | None = None
    income: Income | None = None
    cost: Cost | None = None
    land: Land | None = None
    final: Final | None = None
    other: str | None = None
    appraiser: Appraiser | None = None

    def to_dict(self) -> dict[str, Any]:
        """輸出成舊版形狀的 dict（只含有設定的欄位）。"""
        return self.model_dump(by_alias=True, exclude_unset=True)
