"""中英文財經標題的詞典式情緒分析（不需外部金鑰，可重現、可解釋）。

設計：
- 先比對較長的詞，命中後把該片段遮蔽，避免「不如預期」同時被「預期」重複計分
- 否定詞（未、不、沒）緊鄰正向詞時翻轉為負向
- 分數 = (正 − 負) / (正 + 負 + 1)，落在 (-1, 1)

之後若要升級為 LLM 判讀，只需實作同樣的 `score(title) -> (float, list[str])` 介面。
"""
import re

ZH_POSITIVE = [
    "創新高", "新高", "大漲", "漲停", "強漲", "飆漲", "噴出", "強勁", "成長", "高成長", "擴產", "擴廠", "上修", "調升",
    "優於預期", "超乎預期", "超預期", "利多", "大單", "訂單", "急單", "滿載", "熱銷", "供不應求", "缺貨",
    "復甦", "回溫", "突破", "轉盈", "獲利", "營收增", "年增", "月增", "看好", "買超", "加碼", "樂觀",
    "需求旺", "漲價", "受惠", "攀升", "揚升", "反彈", "起飛", "爆發", "旺季", "雙位數成長",
]
ZH_NEGATIVE = [
    "大跌", "重挫", "跌停", "暴跌", "崩跌", "下挫", "衰退", "下修", "調降", "不如預期", "低於預期", "利空",
    "砍單", "庫存調整", "去庫存", "疲弱", "疲軟", "放緩", "趨緩", "虧損", "轉虧", "年減", "月減", "營收減",
    "看壞", "賣超", "減碼", "悲觀", "制裁", "禁令", "出口管制", "關稅", "衝突", "裁員", "停工", "降價",
    "跌價", "走弱", "下滑", "疑慮", "隱憂", "風暴", "淡季", "賣壓", "倒閉", "違約", "承壓",
]
EN_POSITIVE = [
    "surge", "surges", "soar", "soars", "jump", "jumps", "beat", "beats", "record", "upgrade", "upgraded",
    "strong", "growth", "rally", "rallies", "gain", "gains", "raise", "raises", "bullish", "outperform",
    "boost", "boosts", "expands", "expansion", "tops", "climb", "climbs", "rise", "rises", "rebound",
    "rebounds", "upbeat", "optimism", "wins", "best", "accelerates", "breakthrough", "all-time",
    "jumped", "surged", "soared", "rallied", "climbed", "rose", "popped", "bounce", "bounces", "bounced", "beating",
]
EN_NEGATIVE = [
    "plunge", "plunges", "slump", "slumps", "miss", "misses", "downgrade", "downgraded", "weak", "cut",
    "cuts", "fall", "falls", "drop", "drops", "tariff", "tariffs", "ban", "probe", "lawsuit", "bearish",
    "layoffs", "decline", "declines", "selloff", "sell-off", "concern", "concerns", "slowdown", "warns",
    "restrictions", "sanctions", "tumble", "tumbles", "sinks", "sank", "worst", "crash", "slide", "slides",
    "slip", "slips", "plummets", "losses", "rout", "fears", "worries", "downturn", "headwinds", "delay",
    "delays", "shortage", "fell", "dropped", "plunged", "tumbled", "slumped", "slid", "missed", "cutting",
]
NEGATIONS = ("未", "不", "沒", "無")

_ZH_TERMS = sorted([(w, 1) for w in ZH_POSITIVE] + [(w, -1) for w in ZH_NEGATIVE], key=lambda x: -len(x[0]))
_EN_RE = re.compile(r"[a-z][a-z\-]+")
_EN_POS, _EN_NEG = set(EN_POSITIVE), set(EN_NEGATIVE)


def score(title: str) -> tuple[float, list[str]]:
    text = title
    pos = neg = 0
    matched: list[str] = []

    for term, polarity in _ZH_TERMS:
        start = 0
        while (idx := text.find(term, start)) != -1:
            p = polarity
            if p > 0 and idx > 0 and text[idx - 1] in NEGATIONS:
                p = -1
            pos, neg = (pos + 1, neg) if p > 0 else (pos, neg + 1)
            matched.append(term if p == polarity else f"否定:{term}")
            text = text[:idx] + "\u0000" * len(term) + text[idx + len(term):]
            start = idx + len(term)

    for word in _EN_RE.findall(text.lower()):
        if word in _EN_POS:
            pos += 1
            matched.append(word)
        elif word in _EN_NEG:
            neg += 1
            matched.append(word)

    return (pos - neg) / (pos + neg + 1), matched
