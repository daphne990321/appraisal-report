"""中文大寫金額（對應舊版 cnAmount）。"""

import math

from appraisal.domain.jsnum import js_round

_DIGITS = "零壹貳參肆伍陸柒捌玖"
_UNITS = ["", "拾", "佰", "仟"]
_BIG = ["", "萬", "億", "兆"]


def _group_text(g: int) -> str:
    """四位數一組的中文（千位到個位），中間的零只補一個。"""
    out = ""
    zero = False
    for k in range(3, -1, -1):
        d = (g // 10**k) % 10
        if d == 0:
            zero = zero or bool(out)
        else:
            if zero:
                out += "零"
                zero = False
            out += _DIGITS[d] + _UNITS[k]
    return out


def cn_amount(v: float) -> str:
    """金額轉中文大寫，例如 12345 → 壹萬貳仟參佰肆拾伍元整；0 以下或非數字回「零元整」。"""
    r = js_round(v)
    if not (r > 0) or math.isinf(r):
        return "零元整"
    value = int(r)
    groups: list[int] = []
    while value > 0:
        groups.append(value % 10000)
        value //= 10000
    out = ""
    for gi in range(len(groups) - 1, -1, -1):
        g = groups[gi]
        if g == 0:
            if out and out[-1] != "零":
                out += "零"
            continue
        if out and g < 1000 and out[-1] != "零":
            out += "零"
        out += _group_text(g) + (_BIG[gi] if gi < len(_BIG) else "undefined")
    return out.rstrip("零") + "元整"
