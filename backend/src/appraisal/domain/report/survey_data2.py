"""摘要式報告書的現勘題庫（對照舊版 core/survey.js 的 SURVEY）。

本檔：社區、內部條件、法定管制、區域、市場、負面因素反映。

依據：全聯會第十四號公報附件「摘要式不動產估價報告書範本」與注意須知第四、六點。
題目、選項都是資料：拿到各銀行實際格式後只改這裡，畫面與報告依此產生。
答案存在案件 chk[key]：one＝字串、many＝字串陣列、num＝數字、text＝字串、yn＝true/false。
step：在哪一步填（docs 調資料、survey 現勘、decide 決定價格）；land：土地案件是否顯示。
show：條件顯示 {k:另一題, v:值或值陣列} 或 {k:另一題, not:值陣列}；
other：選「其他」時多一格說明（存在 key+"_x"）。
"""

from typing import Any, Final

SURVEY_PART2: Final[list[dict[str, Any]]] = [
    {
        "id": "bldg",
        "step": "survey",
        "title": "社區與車位",
        "law": "公報摘要式第十一項之 9",
        "items": [
            {"k": "community", "label": "社區名稱", "type": "text"},
            {"k": "households", "label": "總戶數", "type": "num", "unit": "戶"},
            {"k": "guard", "label": "門禁及管理員", "type": "one", "opts": ["有", "無"]},
            {
                "k": "sizeMix",
                "label": "社區主要規劃坪數",
                "type": "one",
                "opts": ["20 坪以下及套房", "20～35 坪", "35～50 坪"],
                "other": True,
            },
            {"k": "bldgVacancy", "label": "所屬大樓或社區空屋率", "type": "num", "unit": "%"},
            {
                "k": "maint",
                "label": "社區管理維護",
                "type": "one",
                "opts": ["良好", "尚可", "不佳"],
            },
            {"k": "gas", "label": "天然氣", "type": "one", "opts": ["有", "無"]},
            {
                "k": "b1Reg",
                "label": "地下室登記用途",
                "type": "one",
                "opts": ["無", "防空避難室兼停車場", "停車場", "住家", "商業用"],
                "other": True,
            },
            {
                "k": "b1Use",
                "label": "地下室使用狀況",
                "type": "one",
                "opts": ["無", "防空避難室兼停車場", "停車場", "住家", "商業用", "閒置"],
                "other": True,
            },
            {"k": "parkOwn", "label": "停車位所有權", "type": "one", "opts": ["無", "有"]},
            {
                "k": "parkOwnN",
                "label": "車位數",
                "type": "num",
                "unit": "個",
                "show": {"k": "parkOwn", "v": "有"},
            },
            {
                "k": "parkOwnFl",
                "label": "車位樓層",
                "type": "text",
                "show": {"k": "parkOwn", "v": "有"},
                "ph": "例：B2",
            },
            {
                "k": "parkKind",
                "label": "車位型式",
                "type": "one",
                "opts": ["平面式", "機械式"],
                "show": {"k": "parkOwn", "v": "有"},
            },
            {
                "k": "parkNo",
                "label": "車位編號",
                "type": "text",
                "show": {"k": "parkOwn", "v": "有"},
            },
            {"k": "parkUse", "label": "停車位使用權", "type": "one", "opts": ["無", "有"]},
            {
                "k": "parkUseN",
                "label": "使用權車位數",
                "type": "num",
                "unit": "個",
                "show": {"k": "parkUse", "v": "有"},
            },
            {
                "k": "parkEase",
                "label": "停車位使用難易度",
                "type": "one",
                "opts": ["良好", "普通", "不佳"],
            },
            {
                "k": "parkWhy",
                "label": "不佳原因",
                "type": "many",
                "opts": ["受柱位影響難停", "位於路底需迴車", "位於機械式下層車位移動不便"],
                "other": True,
                "show": {"k": "parkEase", "v": "不佳"},
            },
        ],
    },
    {
        "id": "inner",
        "step": "survey",
        "title": "建物內部條件",
        "law": "公報摘要式第十一項之 10",
        "items": [
            {
                "k": "inner",
                "label": "內部條件",
                "type": "one",
                "opts": ["良好", "尚可", "不佳", "未入內履勘，無法確認"],
            },
            {
                "k": "innerWhy",
                "label": "不佳原因（可複選）",
                "type": "many",
                "opts": [
                    "暗房",
                    "暗廳",
                    "客廳或房間有過樑",
                    "轉管",
                    "室內淨高太低",
                    "傾斜",
                    "牆面、樑柱龜裂",
                    "屋內滲漏水",
                    "屋形不方正",
                    "樓梯間狹窄，出入不便",
                    "樓梯間髒亂",
                    "鄰棟間距過窄",
                    "隔局差，使用效益低",
                ],
                "other": True,
                "show": {"k": "inner", "v": "不佳"},
            },
        ],
    },
    {
        "id": "law",
        "step": "survey",
        "title": "法定使用管制",
        "law": "公報摘要式第十項",
        "land": True,
        "items": [
            {
                "k": "zoneKind",
                "label": "坐落分區",
                "type": "one",
                "opts": ["都市計畫地區", "非都市計畫地區"],
                "hint": "使用分區名稱填在「調資料」的使用分區欄",
            },
            {
                "k": "landClass",
                "label": "使用地類別",
                "type": "text",
                "show": {"k": "zoneKind", "v": "非都市計畫地區"},
            },
            {
                "k": "lawLimit",
                "label": "法令特殊因素",
                "type": "many",
                "opts": ["無", "山坡地限制區", "行水區限制區", "航高限制區", "斷層帶限制區"],
                "other": True,
            },
        ],
    },
    {
        "id": "area",
        "step": "decide",
        "title": "區域條件",
        "law": "公報摘要式第十一項之 1、2",
        "land": True,
        "items": [
            {
                "k": "mktKm",
                "label": "一般生活所需的市場或購物中心距離",
                "type": "num",
                "unit": "公里",
            },
            {"k": "schoolKm", "label": "最近的國中或國小距離", "type": "num", "unit": "公里"},
            {
                "k": "envQ",
                "label": "小區域環境品質",
                "type": "one",
                "opts": ["良好", "尚可", "不佳"],
            },
            {
                "k": "roadQ",
                "label": "聯外道路狀況",
                "type": "one",
                "opts": ["良好", "尚可", "不佳"],
            },
            {
                "k": "transit",
                "label": "大眾運輸系統",
                "type": "one",
                "opts": ["良好", "尚可", "不佳（需自駕）"],
            },
            {"k": "g1Pct", "label": "區域地面層作為某用途的比例", "type": "num", "unit": "%"},
            {"k": "g1Use", "label": "地面層主要用途", "type": "text", "ph": "例：店面"},
            {"k": "upPct", "label": "二層以上作為某用途的比例", "type": "num", "unit": "%"},
            {"k": "upUse", "label": "二層以上主要用途", "type": "text", "ph": "例：住家"},
            {
                "k": "devPlan",
                "label": "近期區域發展之重大設施與計畫",
                "type": "one",
                "opts": ["無", "有"],
            },
            {
                "k": "devPlan_x",
                "label": "重大設施與計畫說明",
                "type": "text",
                "show": {"k": "devPlan", "v": "有"},
            },
        ],
    },
    {
        "id": "market",
        "step": "decide",
        "title": "市場面分析",
        "law": "公報摘要式第十一項之 3",
        "land": True,
        "items": [
            {"k": "vacancy", "label": "所在區域空屋率", "type": "num", "unit": "%"},
            {
                "k": "supply",
                "label": "區域供需情形",
                "type": "one",
                "opts": ["供需平衡", "供過於求", "供不應求"],
            },
            {
                "k": "supplyDeg",
                "label": "程度",
                "type": "one",
                "opts": ["輕微", "普通", "嚴重"],
                "show": {"k": "supply", "v": ["供過於求", "供不應求"]},
            },
            {
                "k": "clients",
                "label": "消費客群",
                "type": "one",
                "opts": ["在地客多", "外來客多"],
                "other": True,
            },
            {
                "k": "sellPeriod",
                "label": "預計銷售期",
                "type": "one",
                "opts": ["三個月內", "三～六個月內", "半年以上"],
            },
            {
                "k": "trend",
                "label": "未來房價走勢",
                "type": "one",
                "opts": ["平穩", "上漲", "下跌"],
            },
            {"k": "liquidity", "label": "流通性", "type": "one", "opts": ["良好", "尚可", "不佳"]},
            {"k": "bargain", "label": "三個月內售出的議價空間", "type": "num", "unit": "%"},
        ],
    },
    {
        "id": "reflect",
        "step": "decide",
        "title": "負面因素是否已反映於估值",
        "law": "公報摘要式第十一項之 6、10",
        "land": True,
        "items": [
            {
                "k": "nuisReflected",
                "label": "嫌惡設施的影響已反映於估值",
                "type": "one",
                "opts": ["是", "否"],
                "show": {"k": "nuis", "not": ["無"]},
            },
            {
                "k": "innerReflected",
                "label": "室內負面因素的影響已反映於估值",
                "type": "one",
                "opts": ["是", "否"],
                "show": {"k": "inner", "v": "不佳"},
            },
        ],
    },
]
