from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.signal import EventSignal, FactorCategory


class Regime(str, Enum):
    EXTREME_BULL = "extreme_bull"
    STRONG_BULL = "strong_bull"
    MILD_BULL = "mild_bull"
    NEUTRAL = "neutral"
    MILD_BEAR = "mild_bear"
    STRONG_BEAR = "strong_bear"
    EXTREME_BEAR = "extreme_bear"


class GlobalScoreResponse(BaseModel):
    score: float = Field(..., ge=-100, le=100, description="台股全球預測總分")
    regime: Regime
    regime_label: str = Field(..., description="例如：穩健多頭")
    confidence: float = Field(..., ge=0, le=1, description="訊號一致度（多空共識程度）")
    summary: str = Field(..., description="AI 總體文字摘要")
    signal_count: int
    failed_sources: list[str] = Field(default_factory=list)
    data_mode: Literal["live", "mock"] = "live"
    generated_at: datetime


class FactorItem(BaseModel):
    category: FactorCategory
    label: str
    score: float = Field(..., ge=-1, le=1, description="該維度加權分數")
    weight_share: float = Field(..., ge=0, le=1, description="該維度占總權重比例")
    contribution: float = Field(..., description="對總分的貢獻點數（-100 ~ +100 尺度）")
    is_extreme: bool
    signals: list[EventSignal]


class FactorsResponse(BaseModel):
    factors: list[FactorItem]
    extreme_threshold: float
    generated_at: datetime
