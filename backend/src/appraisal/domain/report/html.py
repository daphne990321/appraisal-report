"""報告區塊轉成 HTML（對照舊版 core/report.js 的 esc、inl、toHTML）。

所有文字先跳脫再輸出，⟦…⟧ 轉成高亮標記；不可能從案件內容插入 HTML 或指令碼。
"""

from typing import Any

from appraisal.domain.report.blocks import Block
from appraisal.domain.report.fmt import split_placeholders

_ESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}


def _text(x: Any) -> str:
    """對應 String(x == null ? '' : x)。"""
    return "" if x is None else x if isinstance(x, str) else str(x)


def esc(x: Any) -> str:
    """跳脫 HTML 的 & < > " '；None 當空字串。"""
    return "".join(_ESC.get(ch, ch) for ch in _text(x))


def inl(t: Any) -> str:
    """跳脫後，把待填欄位 ⟦…⟧ 轉成 <span class="ph">…</span>。"""
    return "".join(
        '<span class="ph">' + esc(part) + "</span>" if is_ph else esc(part)
        for part, is_ph in split_placeholders(_text(t))
    )


def _kv_rows(rows: list[list[str]]) -> str:
    return "".join("<tr><th>" + inl(r[0]) + "</th><td>" + inl(r[1]) + "</td></tr>" for r in rows)


def _table(bk: Block) -> str:
    align = bk.get("align") or []
    head = "".join("<th>" + inl(h) + "</th>" for h in bk["head"])
    body = "".join(
        "<tr>"
        + "".join(
            "<td" + (' class="r"' if i < len(align) and align[i] == "r" else "") + ">"
            + inl(x) + "</td>"
            for i, x in enumerate(r)
        )
        + "</tr>"
        for r in bk["rows"]
    )  # fmt: skip
    cls = ' class="sm"' if bk.get("small") else ""
    return (
        '<div class="tblx"><table' + cls + "><thead><tr>" + head + "</tr></thead><tbody>"
        + body + "</tbody></table></div>"
    )  # fmt: skip


def _cover(bk: Block) -> str:
    return (
        '<div class="cover"><p class="office">' + inl(bk.get("office")) + "</p><h1>"
        + inl(bk["title"]) + '</h1><table class="kvt">' + _kv_rows(bk["rows"]) + "</table></div>"
    )  # fmt: skip


def _letter(bk: Block) -> str:
    body = "".join('<p class="indent">' + inl(p) + "</p>" for p in bk["body"])
    certs = "".join(
        '<p class="right small">' + inl(r[0]) + "：" + inl(r[1]) + "</p>" for r in bk["certs"]
    )
    return (
        '<div class="letter"><p><b>' + inl(bk["to"]) + "</b>　公鑒：</p>" + body
        + '<p class="right">' + inl(bk.get("office")) + "　估價師 " + inl(bk.get("signer"))
        + "　敬上</p>" + certs + "</div>"
    )  # fmt: skip


def _list(bk: Block) -> str:
    tag = "ol" if bk.get("ordered") else "ul"
    items = "".join("<li>" + inl(x) + "</li>" for x in bk["items"])
    return "<" + tag + ">" + items + "</" + tag + ">"


_SIMPLE = {"h1": "h2", "h2": "h3", "h3": "h4", "p": "p"}


def _one(bk: Block) -> str:
    t = bk["t"]
    if t in _SIMPLE:
        tag = _SIMPLE[t]
        return "<" + tag + ">" + inl(bk["text"]) + "</" + tag + ">"
    if t == "amount":
        return '<p class="amount">' + inl(bk["text"]) + "</p>"
    if t == "kv":
        return '<table class="kvt">' + _kv_rows(bk["rows"]) + "</table>"
    if t == "pb":
        return '<hr class="pb">'
    handlers = {"cover": _cover, "letter": _letter, "list": _list, "table": _table}
    return handlers[t](bk) if t in handlers else ""


def render_html(blocks: list[Block]) -> str:
    """把報告區塊轉成 HTML 片段。"""
    return "".join(_one(bk) for bk in blocks)
