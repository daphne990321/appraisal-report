"""最小平方法（OLS）與 F 檢定 p 值（對應舊版 core/calc.js 的 ols、invert、gammln、betacf、betai）。

逐行移植，不加外部套件；計算順序與舊版相同。
"""

import math
from typing import Any

from appraisal.domain.calc._js import js_div, js_sum, truthy

_GAMMA_C = (
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
)


def gammln(x: float) -> float:
    """對數伽瑪函數。"""
    y = x
    t = x + 5.5
    t -= (x + 0.5) * math.log(t)
    s = 1.000000000190015
    for c in _GAMMA_C:
        y += 1
        s += c / y
    return -t + math.log(2.5066282746310005 * s / x)


def betacf(a: float, b: float, x: float) -> float:
    """不完全貝它函數的連分數。"""
    maxit, eps, fpmin = 200, 3e-12, 1e-300
    qab, qap, qam = a + b, a + 1, a - 1
    c = 1.0
    d = 1 - qab * x / qap
    if abs(d) < fpmin:
        d = fpmin
    d = 1 / d
    h = d
    for m in range(1, maxit + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1 / d
        delta = d * c
        h *= delta
        if abs(delta - 1) < eps:
            break
    return h


def betai(a: float, b: float, x: float) -> float:
    """正規化不完全貝它函數。"""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    bt = math.exp(gammln(a + b) - gammln(a) - gammln(b) + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return bt * betacf(a, b, x) / a
    return 1 - bt * betacf(b, a, 1 - x) / b


def invert(m: list[list[float]]) -> list[list[float]] | None:
    """高斯消去法求反矩陣；主元太小（共線）回傳 None。"""
    k = len(m)
    a = [list(row) + [1.0 if i == j else 0.0 for j in range(k)] for i, row in enumerate(m)]
    for c in range(k):
        p = c
        for r in range(c + 1, k):
            if abs(a[r][c]) > abs(a[p][c]):
                p = r
        if abs(a[p][c]) < 1e-12:
            return None
        a[c], a[p] = a[p], a[c]
        pv = a[c][c]
        for j in range(2 * k):
            a[c][j] /= pv
        for r in range(k):
            if r == c:
                continue
            f = a[r][c]
            if truthy(f):  # JS 的 if (f)：0 與 NaN 都跳過
                for j in range(2 * k):
                    a[r][j] -= f * a[c][j]
    return [row[k:] for row in a]


def _sums(x: list[list[float]], y: list[float], k: int) -> tuple[list[list[float]], list[float]]:
    """X'X 與 X'y。"""
    n_obs = len(y)
    xtx: list[list[float]] = []
    xty: list[float] = []
    for a in range(k):
        xtx.append([])
        xty.append(0.0)
        for b in range(k):
            s = 0.0
            for r in range(n_obs):
                s += x[r][a] * x[r][b]
            xtx[a].append(s)
        for r in range(n_obs):
            xty[a] += x[r][a] * y[r]
    return xtx, xty


def ols(x: list[list[float]], y: list[float]) -> dict[str, Any] | None:
    """最小平方法：回傳係數、標準誤、R²、調整後 R²、F、p；樣本不足或共線回傳 None。"""
    n_obs = len(y)
    k = len(x[0])
    if n_obs <= k:
        return None
    xtx, xty = _sums(x, y, k)
    inv = invert(xtx)
    if not inv:
        return None
    beta = []
    for row in inv:
        s = 0.0
        for j, v in enumerate(row):
            s += v * xty[j]
        beta.append(s)
    mean = js_sum(y) / n_obs
    sse = 0.0
    sst = 0.0
    for r in range(n_obs):
        fit = 0.0
        for j in range(k):
            fit += x[r][j] * beta[j]
        sse += (y[r] - fit) * (y[r] - fit)
        sst += (y[r] - mean) * (y[r] - mean)
    p = k - 1
    df2 = n_obs - k
    mse = sse / df2
    r2v = 1 - sse / sst if sst > 0 else 0.0
    adj = 1 - (1 - r2v) * (n_obs - 1) / df2
    f_stat = ((sst - sse) / p) / mse if p > 0 and mse > 0 else 0.0
    pval = betai(df2 / 2, p / 2, js_div(df2, df2 + p * f_stat)) if p > 0 else 1.0
    se = [math.sqrt(max(0.0, row[i] * mse)) for i, row in enumerate(inv)]
    return {
        "beta": beta,
        "se": se,
        "n": n_obs,
        "k": p,
        "r2": r2v,
        "adjR2": adj,
        "F": f_stat,
        "p": pval,
    }
