"""摘要式報告書的現勘題庫（對照舊版 core/survey.js 的 SURVEY）。

本檔：產權、使用現況、增建、瑕疵、嫌惡設施、宗地條件。

依據：全聯會第十四號公報附件「摘要式不動產估價報告書範本」與注意須知第四、六點。
題目、選項都是資料：拿到各銀行實際格式後只改這裡，畫面與報告依此產生。
答案存在案件 chk[key]：one＝字串、many＝字串陣列、num＝數字、text＝字串、yn＝true/false。
step：在哪一步填（docs 調資料、survey 現勘、decide 決定價格）；land：土地案件是否顯示。
show：條件顯示 {k:另一題, v:值或值陣列} 或 {k:另一題, not:值陣列}；
other：選「其他」時多一格說明（存在 key+"_x"）。
"""

from typing import Any, Final

SURVEY_PART1: Final[list[dict[str, Any]]] = [
    {
        "id": "title",
        "step": "docs",
        "title": "產權與謄本狀況",
        "law": "公報摘要式第八項",
        "land": True,
        "items": [
            {
                "k": "titleStatus",
                "label": "產權狀況",
                "type": "many",
                "opts": ["產權清楚", "查封登記", "預告登記", "未辦保存登記"],
                "other": True,
            },
            {
                "k": "copyStatus",
                "label": "謄本狀況",
                "type": "one",
                "opts": ["完整", "只申請節本", "查無謄本"],
            },
            {
                "k": "copyParts",
                "label": "節本部數",
                "type": "num",
                "unit": "部",
                "show": {"k": "copyStatus", "v": "只申請節本"},
            },
            {
                "k": "ownerRel",
                "label": "建物及土地關連性",
                "type": "one",
                "opts": ["同屬一人", "分屬不同人"],
            },
            {
                "k": "ownerRelN",
                "label": "分屬人數",
                "type": "num",
                "unit": "人",
                "show": {"k": "ownerRel", "v": "分屬不同人"},
            },
        ],
    },
    {
        "id": "use",
        "step": "survey",
        "title": "使用現況",
        "law": "公報摘要式第九項",
        "land": True,
        "items": [
            {
                "k": "entered",
                "label": "是否入內勘察",
                "type": "one",
                "opts": ["已入內", "未能入內"],
                "hint": "未能入內時報告會自動揭露（注意須知四）",
            },
            {
                "k": "photoByClient",
                "label": "內部照片由委託人提供",
                "type": "yn",
                "show": {"k": "entered", "v": "未能入內"},
            },
            {
                "k": "useNow",
                "label": "使用現況",
                "type": "one",
                "opts": ["自用", "出租", "閒置", "使用借貸", "過戶中", "無法判斷"],
                "other": False,
            },
            {
                "k": "useNow_x",
                "label": "無法判斷的說明",
                "type": "text",
                "show": {"k": "useNow", "v": "無法判斷"},
            },
            {
                "k": "bldgUse",
                "label": "整棟建物使用型態",
                "type": "text",
                "ph": "例：1 樓店面、2 樓以上住家",
            },
        ],
    },
    {
        "id": "ext",
        "step": "survey",
        "title": "增建與約定",
        "law": "公報摘要式第九項",
        "items": [
            {"k": "ext", "label": "增建情形", "type": "one", "opts": ["無", "有"]},
            {
                "k": "extPing",
                "label": "增建面積",
                "type": "num",
                "unit": "坪",
                "show": {"k": "ext", "v": "有"},
            },
            {
                "k": "extPos",
                "label": "增建位置",
                "type": "text",
                "show": {"k": "ext", "v": "有"},
                "ph": "例：頂樓、陽台外推",
            },
            {
                "k": "extStruct",
                "label": "增建結構",
                "type": "text",
                "show": {"k": "ext", "v": "有"},
                "ph": "例：鐵皮",
            },
            {
                "k": "extDoor",
                "label": "增建物有獨立出入口",
                "type": "yn",
                "show": {"k": "ext", "v": "有"},
            },
            {
                "k": "parkAgree",
                "label": "車位分管協議及圖說",
                "type": "one",
                "opts": ["是", "否", "無法判斷", "無車位"],
            },
            {
                "k": "exclAgree",
                "label": "約定專用協議",
                "type": "one",
                "opts": ["是", "否", "無法判斷"],
            },
        ],
    },
    {
        "id": "defect",
        "step": "survey",
        "title": "瑕疵建物",
        "law": "公報摘要式第九項",
        "items": [
            {
                "k": "defect",
                "label": "標的是否為瑕疵建物",
                "type": "many",
                "opts": ["否", "海砂屋", "輻射屋", "事故屋", "結構安全疑慮"],
                "other": True,
            }
        ],
    },
    {
        "id": "nuis",
        "step": "survey",
        "title": "外在嫌惡設施及負面因素",
        "law": "公報摘要式第十一項之 6、注意須知六（三）",
        "land": True,
        "items": [
            {
                "k": "nuis",
                "label": "嫌惡設施（可複選）",
                "type": "many",
                "opts": [
                    "無",
                    "死巷",
                    "路沖",
                    "反弓路",
                    "基地低於路面",
                    "天橋旁",
                    "地下道兩側",
                    "電線桿",
                    "高壓電塔",
                    "變電所",
                    "神壇或廟旁",
                    "近鐵路",
                    "工廠林立",
                    "瓦斯行",
                    "墳場",
                    "殯儀館",
                    "特種行業",
                    "近高架道路",
                    "瓦斯槽",
                    "加油站",
                    "焚化爐",
                    "垃圾場旁",
                    "棟距窄、隱私及採光差",
                    "車輛無法進出",
                ],
                "other": True,
            },
            {
                "k": "nuisNote",
                "label": "嫌惡設施補充說明（種類、距離、規模）",
                "type": "text",
                "show": {"k": "nuis", "not": ["無"]},
            },
        ],
    },
    {
        "id": "site",
        "step": "survey",
        "title": "宗地條件",
        "law": "公報摘要式第十一項之 8",
        "land": True,
        "items": [
            {
                "k": "roadW",
                "label": "臨接道路寬度",
                "type": "one",
                "opts": [
                    "未達 4 公尺",
                    "4～未達 6 公尺",
                    "6～未達 10 公尺",
                    "10～未達 15 公尺",
                    "15～未達 20 公尺",
                    "20～未達 30 公尺",
                    "30 公尺以上",
                ],
            },
            {"k": "frontM", "label": "基地主要臨路面寬", "type": "num", "unit": "公尺"},
            {"k": "depthM", "label": "基地深度", "type": "num", "unit": "公尺"},
            {"k": "noRoad", "label": "未臨路", "type": "yn"},
            {
                "k": "terrain",
                "label": "相對地勢",
                "type": "one",
                "opts": ["平坦", "陡峭", "低窪", "高低起伏", "緩升", "緩降"],
                "other": True,
            },
            {"k": "lane", "label": "基地包含既成巷道", "type": "one", "opts": ["否", "是"]},
            {
                "k": "lanePing",
                "label": "既成巷道約占",
                "type": "num",
                "unit": "坪",
                "show": {"k": "lane", "v": "是"},
            },
            {
                "k": "shareUse",
                "label": "持分式透天：實際使用與持分面積比較",
                "type": "one",
                "opts": ["不適用", "相當", "大於", "小於"],
            },
            {
                "k": "shareDiff",
                "label": "相差約",
                "type": "num",
                "unit": "坪",
                "show": {"k": "shareUse", "v": ["大於", "小於"]},
            },
        ],
    },
]
