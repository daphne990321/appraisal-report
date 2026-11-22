"""摘要式報告書的題庫與表格欄位（對照舊版 core/survey.js 的 SURVEY、AREA_ROWS、LIEN_COLS）。

題目定義分兩個檔案存放（每檔 ≤ 300 行），這裡合併成唯一的 SURVEY。
"""

from typing import Any, Final

from appraisal.domain.report.survey_data1 import SURVEY_PART1
from appraisal.domain.report.survey_data2 import SURVEY_PART2

SURVEY: Final[list[dict[str, Any]]] = [*SURVEY_PART1, *SURVEY_PART2]

# 面積明細（調資料，依建物謄本；㎡）與他項權利表：摘要式摘要表使用，不影響計算
AREA_ROWS: Final[list[tuple[str, str]]] = [
    ("main", "主建物"),
    ("attach", "附屬建物"),
    ("common1", "公共設施（I）"),
    ("common2", "公共設施（II，含車位）"),
    ("park", "獨立產權車位"),
    ("other", "其他獨立產權"),
]
LIEN_COLS: Final[list[tuple[str, str]]] = [
    ("order", "登記次序"),
    ("kind", "權利種類"),
    ("start", "設定起日"),
    ("end", "設定訖日（債權確定日期）"),
    ("amount", "擔保債權總金額"),
    ("holder", "設定之權利人"),
    ("obligor", "義務人"),
    ("debtor", "債務人"),
]
