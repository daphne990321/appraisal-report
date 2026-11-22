"""報告區塊：與輸出格式無關的資料，網頁、Word 與 MCP 共用。

區塊種類（欄位 t）：cover、letter、h1、h2、h3、p、amount、list、kv、table、pb。
字串中以 ⟦…⟧ 標示待填欄位；各輸出格式用 split_placeholders() 切開。
"""

from typing import Any, TypedDict

# 區塊是 JSON 形狀的字典（和舊版、golden 的結構逐字相同），欄位依 t 而不同
Block = dict[str, Any]


class DocxMeta(TypedDict, total=False):
    """Word 頁首與文件屬性用的資料：office（事務所名稱）、case_no（案號）。"""

    office: str
    case_no: str


class Out:
    """依序收集區塊的小工具（對照舊版 build 裡的 P、H1、H2、H3、KV、T、L、PB）。"""

    def __init__(self) -> None:
        self.blocks: list[Block] = []

    def add(self, block: Block) -> None:
        self.blocks.append(block)

    def p(self, text: str) -> None:
        self.blocks.append({"t": "p", "text": text})

    def h1(self, text: str) -> None:
        self.blocks.append({"t": "h1", "text": text})

    def h2(self, text: str) -> None:
        self.blocks.append({"t": "h2", "text": text})

    def h3(self, text: str) -> None:
        self.blocks.append({"t": "h3", "text": text})

    def kv(self, rows: list[list[str]]) -> None:
        self.blocks.append({"t": "kv", "rows": rows})

    def table(
        self,
        head: list[str],
        rows: list[list[str]],
        align: list[str] | None = None,
        small: bool = False,
    ) -> None:
        """表格；align 與 small 沒給就不放進區塊（和舊版沒傳選項時相同）。"""
        block: Block = {"t": "table", "head": head, "rows": rows}
        if align is not None:
            block["align"] = align
        if small:
            block["small"] = True
        self.blocks.append(block)

    def list(self, items: list[str], ordered: bool = True) -> None:
        self.blocks.append({"t": "list", "items": items, "ordered": ordered})

    def pb(self) -> None:
        self.blocks.append({"t": "pb"})
