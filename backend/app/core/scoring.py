"""共用的分數轉換工具：把任意原始數值壓縮到 [-1, 1]。"""
import math


def clamp(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def squash(x: float, scale: float) -> float:
    """tanh 壓縮：x == scale 時約為 ±0.76，2×scale 約 ±0.96。scale 代表「顯著變動」的量級。"""
    if scale <= 0:
        raise ValueError("scale must be positive")
    return math.tanh(x / scale)


def blend(*pairs: tuple[float, float]) -> float:
    """加權混合多個子分數：blend((score, w), (score, w), ...)。"""
    total_w = sum(w for _, w in pairs)
    if total_w == 0:
        return 0.0
    return clamp(sum(s * w for s, w in pairs) / total_w)
