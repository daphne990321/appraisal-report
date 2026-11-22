"""報告產生時各章節共用的資料（對照舊版 build 開頭的區域變數）。"""

from dataclasses import dataclass
from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import js_round, to_number
from appraisal.domain.report.fmt import MNAME, amt_txt, s

METHOD_KEYS = ("comparison", "income", "cost", "land")


@dataclass
class Env:
    """一次報告產生用到的案件、計算結果、檢核與脈絡，以及常用的衍生字串。"""

    c: dict[str, Any]
    k: dict[str, Any]
    v: dict[str, Any]
    ctx: dict[str, Any]
    S: dict[str, Any]
    fin: dict[str, Any]
    kd: dict[str, Any]
    tx: dict[str, Any]
    R: dict[str, Any]
    land: bool
    has_parcels: bool
    amt: str
    amt_cn: str
    sp_amt: str | None
    case_no: str
    title: str
    methods_used: list[str]

    def method_names(self) -> str:
        """採用方法的中文名稱，用「、」連接。"""
        return "、".join(MNAME[m] for m in self.methods_used)


def make_env(c: dict[str, Any], k: dict[str, Any], v: dict[str, Any], ctx: dict[str, Any]) -> Env:
    """由案件、計算結果、檢核結果與脈絡算出共用資料。"""
    b = c["basic"]
    S, fin, special = k["S"], k["fin"], k.get("special")
    kd = ctx.get("kind") or {"name": "", "id": c.get("kind")}
    report = c.get("report") or {}
    parcels = k.get("parcels")
    sp_amt = None
    if special:
        sp_parcels = special.get("parcels")
        sp_total = sp_parcels.get("total") if sp_parcels else None
        sp_yuan = js_round(to_number(sp_total)) if truthy(sp_total) else None
        sp_amt = amt_txt(special.get("totalWan"), sp_yuan, S)
    return Env(
        c=c, k=k, v=v, ctx=ctx, S=S, fin=fin, kd=kd,
        tx=k["M"].get("texts") or {},
        R=report,
        land=bool(k.get("isLand")),
        has_parcels=bool(parcels and parcels["rows"]),
        amt=amt_txt(fin.get("totalWan"), fin.get("yuan"), S),
        amt_cn=ctx["cn"](fin["yuan"]) if truthy(fin.get("yuan")) else "",
        sp_amt=sp_amt,
        case_no=s(report.get("caseNo") or c.get("id")),
        title=b.get("addr") or "⟦勘估標的⟧",
        methods_used=[m for m in METHOD_KEYS if c["methods"].get(m)],
    )  # fmt: skip


def amount_line(env: Env) -> str:
    """金額加中文大寫：「新臺幣 … 元（大寫）」。"""
    return env.amt + ("（" + env.amt_cn + "）" if env.amt_cn else "")
