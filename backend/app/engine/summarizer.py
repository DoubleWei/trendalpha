"""摘要產生器介面。目前為規則式；未來可換成 LLM 實作（例如呼叫 Claude API），不需動引擎。"""
from typing import Protocol

from app.schemas.signal import EventSignal


class Summarizer(Protocol):
    async def summarize(self, score: float, regime_label: str, confidence: float, signals: list[EventSignal]) -> str: ...


class RuleBasedSummarizer:
    async def summarize(self, score: float, regime_label: str, confidence: float, signals: list[EventSignal]) -> str:
        if not signals:
            return "目前沒有可用的全球訊號，暫停預測。"
        ranked = sorted(signals, key=lambda s: s.trend_score * s.weight)
        tailwinds = [s for s in reversed(ranked) if s.trend_score > 0.15][:2]
        headwinds = [s for s in ranked if s.trend_score < -0.15][:2]

        parts = [f"全球因子綜合評分 {score:+.0f}，研判台股處於「{regime_label}」格局。"]
        if tailwinds:
            parts.append("主要推力來自" + "、".join(f"{s.source_name}（{s.description}）" for s in tailwinds) + "。")
        if headwinds:
            parts.append("需留意" + "、".join(f"{s.source_name}（{s.description}）" for s in headwinds) + "。")
        if confidence >= 0.6:
            parts.append(f"多空訊號一致度 {confidence:.0%}，方向明確，可順勢操作。")
        elif confidence >= 0.3:
            parts.append(f"多空訊號一致度 {confidence:.0%}，分歧仍在，建議控制部位。")
        else:
            parts.append(f"多空訊號一致度僅 {confidence:.0%}，市場缺乏共識，宜觀望。")
        return "".join(parts)
