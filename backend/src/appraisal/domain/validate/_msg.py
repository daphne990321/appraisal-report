"""檢核訊息收集器：bl（必須處理）、notes（報告附註）、warns（提醒），每則帶 section。"""

from typing import Any

# 舊版 tab 值 → 前端步驟 section
TAB_SECTION = {
    "data:subject": "subject",
    "comp": "comps",
    "income": "income",
    "cost": "cost",
    "land": "land",
    "final": "final",
    "survey": "survey",
}


class Messages:
    """依規則順序收集訊息；訊息格式同舊版 {t, law, tab?}，另加 section。"""

    def __init__(self) -> None:
        self.bl: list[dict[str, Any]] = []
        self.notes: list[dict[str, Any]] = []
        self.warns: list[dict[str, Any]] = []

    def block(self, t: str, law: str, tab: str) -> None:
        """必須處理的問題，section 由舊版的 tab 對應。"""
        self.bl.append({"t": t, "law": law, "tab": tab, "section": TAB_SECTION[tab]})

    def note(self, t: str, law: str, section: str) -> None:
        """報告附註。"""
        self.notes.append({"t": t, "law": law, "section": section})

    def warn(self, t: str, law: str, section: str) -> None:
        """提醒（不阻擋）。"""
        self.warns.append({"t": t, "law": law, "section": section})
