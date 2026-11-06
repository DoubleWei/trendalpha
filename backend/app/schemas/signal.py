"""所有外掛的統一輸出規範。前端 `types/market.ts` 與此檔一一對應。"""
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class FactorCategory(str, Enum):
    MACRO = "macro"          # 全球總經
    US_TECH = "us_tech"      # 美國科技股
    COMMODITY = "commodity"  # 原物料 / 風險情緒
    TW_FLOW = "tw_flow"      # 台灣內部籌碼


class EventSignal(BaseModel):
    """單一事件訊號。四個核心欄位為必填；其餘為可選的擴充欄位，供前端顯示細節。"""

    model_config = ConfigDict(frozen=True)

    source_name: str = Field(..., min_length=1, description="數據源名稱")
    trend_score: float = Field(..., ge=-1.0, le=1.0, description="多空方向分數 -1 ~ +1")
    weight: float = Field(..., ge=0.0, le=1.0, description="對台股的影響權重 0 ~ 1")
    description: str = Field(..., description="當前狀態的極簡摘要")

    # ---- 擴充欄位（可選）----
    category: FactorCategory | None = Field(default=None, description="所屬維度（由外掛自動填入）")
    raw_value: float | None = Field(default=None, description="原始數值，例如 4.21")
    unit: str | None = Field(default=None, description="原始數值單位，例如 %、bp、億")
