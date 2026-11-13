"""參考資料的來源與合併：實價登錄（內建、匯入、雲端）、租賃與本所案例。"""

from dataclasses import dataclass, field
from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import n


def merge_lib(parts: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """依序合併內建、匯入、雲端；有 serial 且已出現過的略過，雲端優先（由後往前掃再還原順序）。"""
    seen: set[Any] = set()
    out: list[dict[str, Any]] = []
    for part_in in reversed(parts):
        part = []
        for x in part_in:
            if truthy(x.get("serial")):
                if x["serial"] in seen:
                    continue
                seen.add(x["serial"])
            part.append(x)
        out = part + out
    return out


def lvr_row_to_record(r: dict[str, Any]) -> dict[str, Any]:
    """雲端 lvr_records 一列（snake_case）轉成匯入實價登錄的物件形狀。"""

    def n0(v: Any) -> float:
        return 0.0 if v is None else n(v)

    def t(v: Any) -> str:
        return "" if v is None else str(v)

    o: dict[str, Any] = {
        "id": "L" + str(r["serial"]),
        "kind": r["kind"],
        "src": "實價登錄",
        "serial": r["serial"],
        "imported": "雲端實價登錄",
        "county": t(r.get("county")),
        "district": t(r.get("district")),
        "type": t(r.get("type")),
        "zone": t(r.get("zone")),
        "date": t(r.get("ym")),
        "floorNum": n0(r.get("floor_num")),
        "completed": t(r.get("completed")),
        "age": "" if r.get("age") is None else n(r["age"]),
        "areaPing": n0(r.get("area_ping")),
        "note": t(r.get("note")),
        "addr": t(r.get("addr")),
        "road": t(r.get("road")),
    }
    if r["kind"] == "rent":
        o["rentTotal"] = n0(r.get("rent_total"))
        o["rentPerPing"] = n0(r.get("rent_per_ping"))
        o["furnished"] = truthy(r.get("furnished"))
        o["lease"] = t(r.get("lease"))
        return o
    o["totalFloors"] = n0(r.get("total_floors"))
    o["unitWan"] = n0(r.get("unit_wan"))
    o["totalWan"] = n0(r.get("total_wan"))
    o["park"] = truthy(r.get("park"))
    o["special"] = t(r.get("special"))
    o["presale"] = truthy(r.get("presale"))
    if r["kind"] == "sale":
        o["elevator"] = truthy(r.get("elevator"))
        o["mgmt"] = truthy(r.get("mgmt"))
    return o


def _library(
    builtin: list[dict[str, Any]],
    imported: list[dict[str, Any]],
    hide_builtin: bool,
    cloud: list[dict[str, Any]] | None,
    cloud_counties: list[str] | None,
) -> list[dict[str, Any]]:
    """對應舊版 libOf：沒有雲端資料時是內建＋匯入；有雲端時內建略過雲端涵蓋的縣市並去重。"""
    if cloud_counties is None:
        return ([] if hide_builtin else list(builtin)) + list(imported)
    shown = [] if hide_builtin else [x for x in builtin if x.get("county") not in cloud_counties]
    return merge_lib([shown, list(imported), list(cloud or [])])


@dataclass(frozen=True)
class ReferenceData:
    """計算用的參考資料，都已轉成舊版 record 形狀。

    sales、rents 是合併後的實價登錄（內建、匯入、雲端，已套用 hideBuiltin 與去重）；
    own 是本所案例。哪些來源要用，由模型的 sources 決定（見 all_sales）。
    """

    sales: list[dict[str, Any]] = field(default_factory=list)
    rents: list[dict[str, Any]] = field(default_factory=list)
    own: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_parts(
        cls,
        builtin_sales: list[dict[str, Any]],
        builtin_rents: list[dict[str, Any]],
        imported_sales: list[dict[str, Any]],
        imported_rents: list[dict[str, Any]],
        own: list[dict[str, Any]],
        hide_builtin: bool = False,
        cloud: dict[str, Any] | None = None,
    ) -> "ReferenceData":
        """依舊版 libOf 的規則合併各來源；cloud 為 {sales, rents, counties} 或 None。"""
        counties = None if cloud is None else list(cloud.get("counties") or [])
        cs = None if cloud is None else list(cloud.get("sales") or [])
        cr = None if cloud is None else list(cloud.get("rents") or [])
        return cls(
            sales=_library(builtin_sales, imported_sales, hide_builtin, cs, counties),
            rents=_library(builtin_rents, imported_rents, hide_builtin, cr, counties),
            own=list(own),
        )


def reference_from_db(db: dict[str, Any]) -> ReferenceData:
    """從舊版 db 形狀（golden inputs/db.json）建立 ReferenceData；測試用。"""
    imported = db.get("imported") or {}
    cloud = db.get("cloudLvr")
    return ReferenceData.from_parts(
        db["builtin"]["sales"],
        db["builtin"]["rents"],
        imported.get("sales") or [],
        imported.get("rents") or [],
        db.get("own") or [],
        truthy(db.get("hideBuiltin")),
        cloud,
    )


def all_sales(ref: ReferenceData, model: dict[str, Any]) -> list[dict[str, Any]]:
    """模型 sources 選到的買賣資料：實價登錄與（或）本所案例；沒設定時兩者都用。"""
    s = model.get("sources") or {"lvr": True, "own": True}
    return (ref.sales if s.get("lvr") else []) + (ref.own if s.get("own") else [])


def lib_find(ref: ReferenceData, record_id: Any) -> dict[str, Any] | None:
    """依 id 找實價登錄或本所案例。"""
    for x in ref.sales + ref.own:
        if x.get("id") == record_id:
            return x
    return None
