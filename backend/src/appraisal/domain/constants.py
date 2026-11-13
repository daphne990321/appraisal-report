"""估價用的官方代碼與選項（對照舊版 core/data.js、core/model.js）。"""

from typing import Any, Final

from appraisal.domain.counties import COUNTIES as COUNTIES

# 建物型態：實價登錄資料中實際出現的值（「套房」為歷史資料值，保留以利匯入）
BTYPES: Final[tuple[str, ...]] = (
    "住宅大樓(11層含以上有電梯)",
    "華廈(10層含以下有電梯)",
    "公寓(5樓含以下無電梯)",
    "透天厝",
    "店面(店鋪)",
    "辦公商業大樓",
    "套房(1房1廳1衛)",
    "工廠",
    "廠辦",
    "倉庫",
    "農舍",
    "其他",
)

PARKTYPES: Final[tuple[str, ...]] = (
    "坡道平面",
    "坡道機械",
    "一樓平面",
    "升降機械",
    "升降平面",
    "塔式車位",
    "其他",
)

LEASETYPES: Final[tuple[str, ...]] = (
    "整棟(戶)出租",
    "分層出租",
    "獨立套房",
    "分租套房",
    "分租雅房",
)

PURPOSES: Final[tuple[str, ...]] = (
    "買賣參考",
    "抵押權設定",
    "資產價值證明",
    "繼承、贈與",
    "法院訴訟",
    "都市更新權利變換",
    "企業資產評價",
)

LEVELS: Final[tuple[tuple[int, str], ...]] = (
    (-3, "劣"),
    (-2, "較劣"),
    (-1, "稍劣"),
    (0, "相當"),
    (1, "稍優"),
    (2, "較優"),
    (3, "優"),
)

SPECIALS: Final[tuple[str, ...]] = (
    "急買急賣或急出租急承租",
    "期待因素影響之交易",
    "受債權債務關係影響之交易",
    "親友關係人間之交易",
    "畸零地或有合併使用之交易",
    "地上物處理有糾紛之交易",
    "拍賣",
    "公有土地標售、讓售",
    "受迷信影響之交易",
    "包含公共設施用地之交易",
    "人為哄抬之交易",
    "與法定用途不符之交易",
    "其他特殊交易",
)

REGVARS: Final[tuple[tuple[str, str], ...]] = (
    ("age", "屋齡（年）"),
    ("floor", "樓層"),
    ("area", "建物面積（坪）"),
    ("months", "距價格日期月數"),
    ("totalFloors", "總樓層數"),
)

MNAMES: Final[dict[str, str]] = {
    "comparison": "比較法",
    "income": "收益法",
    "cost": "成本法",
    "land": "土地開發分析法",
}

CAPNAMES: Final[dict[str, str]] = {
    "input": "直接輸入",
    "risk": "風險溢酬法",
    "extract": "市場萃取法",
    "wacc": "加權平均資金成本法",
    "dcr": "債務保障比率法",
    "egim": "有效總收入乘數法",
}

ITEMS15: Final[tuple[str, ...]] = (
    "委託人",
    "勘估標的之基本資料",
    "價格日期及勘察日期",
    "價格種類",
    "估價條件",
    "估價目的",
    "估價金額",
    "所有權、他項權利及其他負擔",
    "勘估標的使用現況",
    "法定使用管制或其他管制事項",
    "價格形成之主要因素分析",
    "估價方法、估算過程及價格決定理由",
    "依本規則規定須敘明之情況",
    "其他與估價相關之必要事項",
    "估價師姓名及證照字號",
)

# 標的類型（估價師建立案件時選擇）
KINDS: Final[list[dict[str, Any]]] = [
    {
        "id": "unit",
        "group": "建物",
        "name": "區分所有建物",
        "hint": "住宅大樓、華廈、公寓、套房",
        "set": "bldg",
        "areaLabel": "建物面積",
        "methods": {"comparison": True, "income": True, "cost": False, "land": False},
    },
    {
        "id": "house",
        "group": "建物",
        "name": "透天厝",
        "hint": "房地合併，含基地",
        "set": "bldg",
        "areaLabel": "建物面積",
        "methods": {"comparison": True, "income": False, "cost": True, "land": False},
    },
    {
        "id": "land",
        "group": "土地",
        "name": "土地",
        "hint": "住商素地、建地、危老或都更基地，可多筆",
        "set": "land",
        "areaLabel": "土地面積",
        "methods": {"comparison": True, "income": False, "cost": False, "land": True},
    },
    {
        "id": "industrial",
        "group": "土地",
        "name": "工業用地",
        "hint": "甲乙丙種工業區、丁種建築用地",
        "set": "ind",
        "areaLabel": "土地面積",
        "methods": {"comparison": True, "income": False, "cost": False, "land": False},
    },
    {
        "id": "hotel",
        "group": "商用",
        "name": "旅館",
        "hint": "營業中旅館、飯店，收益以客房營收計",
        "set": "land",
        "areaLabel": "建物面積",
        "methods": {"comparison": False, "income": True, "cost": True, "land": False},
    },
    {
        "id": "commercial",
        "group": "商用",
        "name": "商辦、商場",
        "hint": "整棟辦公大樓、商場、店面",
        "set": "bldg",
        "areaLabel": "建物面積",
        "methods": {"comparison": True, "income": True, "cost": True, "land": False},
    },
    {
        "id": "factory",
        "group": "商用",
        "name": "廠房",
        "hint": "工業區廠房（房地）",
        "set": "ind",
        "areaLabel": "建物面積",
        "methods": {"comparison": True, "income": False, "cost": True, "land": False},
    },
]

# 因素調整細項：[代號, 大類, 名稱]，第四個值 0 代表預設不啟用
FACTOR_SETS: Final[dict[str, dict[str, Any]]] = {
    "bldg": {
        "name": "建物（區分所有、透天、商辦）",
        "region": [
            ("r1", "交通運輸", "交通"),
            ("r2", "公共設施", "生活機能"),
            ("r3", "公共設施", "學區"),
            ("r4", "公共設施", "公共設施"),
            ("r5", "自然條件", "嫌惡設施"),
            ("r6", "發展潛力", "發展趨勢", 0),
        ],
        "indiv": [
            ("i1", "建物條件", "樓層"),
            ("i2", "建物條件", "景觀"),
            ("i3", "建物條件", "面積"),
            ("i4", "建物條件", "屋齡"),
            ("i5", "建物條件", "採光通風"),
            ("i6", "建物條件", "格局"),
            ("i7", "建物條件", "屋況"),
            ("i8", "建物條件", "管理"),
            ("i9", "建物條件", "公設比", 0),
            ("i10", "道路條件", "臨路寬度", 0),
            ("i11", "宗地條件", "總價與單價關係", 0),
        ],
    },
    "land": {
        "name": "土地（住商、旅館基地）",
        "region": [
            ("L_r1", "交通運輸", "主要道路"),
            ("L_r2", "交通運輸", "捷運、公車便利性"),
            ("L_r3", "交通運輸", "鐵路、交流道接近程度"),
            ("L_r4", "自然條件", "景觀"),
            ("L_r5", "自然條件", "排水、地勢、災害影響"),
            ("L_r6", "公共設施", "學校、市場"),
            ("L_r7", "公共設施", "公園、服務性設施"),
            ("L_r8", "發展潛力", "重大建設"),
            ("L_r9", "發展潛力", "發展趨勢、生活圈"),
        ],
        "indiv": [
            ("L_i1", "道路條件", "道路寬度"),
            ("L_i2", "道路條件", "道路鋪裝、種別"),
            ("L_i3", "接近條件", "接近車站、學校、市場"),
            ("L_i4", "接近條件", "接近公園、停車場、商圈"),
            ("L_i5", "週邊環境", "地勢、日照"),
            ("L_i6", "週邊環境", "嫌惡設施、鄰地使用"),
            ("L_i7", "行政條件", "使用分區、建蔽率"),
            ("L_i8", "行政條件", "容積率、禁限建"),
            ("L_i9", "宗地條件", "面積"),
            ("L_i10", "宗地條件", "面寬、深度"),
            ("L_i11", "宗地條件", "形狀"),
            ("L_i12", "宗地條件", "臨路情形"),
            ("L_i13", "宗地條件", "總價與單價關係"),
            ("L_i14", "宗地條件", "規劃可行性"),
        ],
    },
    "ind": {
        "name": "工業（工業用地、廠房）",
        "region": [
            ("G_r1", "交通運輸", "主要道路、交流道"),
            ("G_r2", "交通運輸", "港口、鐵路"),
            ("G_r3", "公共設施", "電力、產業用水"),
            ("G_r4", "公共設施", "污廢水、廢棄物處理"),
            ("G_r5", "發展潛力", "產業聚集、上下游"),
            ("G_r6", "發展潛力", "擴廠可能性、勞工來源"),
        ],
        "indiv": [
            ("G_i1", "道路條件", "道路寬度"),
            ("G_i2", "道路條件", "道路種別"),
            ("G_i3", "道路條件", "貨車進出便利性"),
            ("G_i4", "宗地條件", "面積"),
            ("G_i5", "宗地條件", "形狀"),
            ("G_i6", "宗地條件", "臨路面數"),
            ("G_i7", "宗地條件", "土壤污染"),
            ("G_i8", "行政條件", "使用變更、轉用"),
            ("G_i9", "建物條件", "廠房結構、樓高", 0),
        ],
    },
}


def kind_of(kind_id: str | None) -> dict[str, Any]:
    """依代號找標的類型；找不到用第一個（區分所有建物）。對應舊版 kindOf。"""
    for k in KINDS:
        if k["id"] == kind_id:
            return k
    return KINDS[0]


def is_land_kind(kind_id: str | None) -> bool:
    """土地類（土地、工業用地）。對應舊版 isLandKind。"""
    return kind_id in ("land", "industrial")
