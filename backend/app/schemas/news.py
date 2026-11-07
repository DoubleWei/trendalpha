from datetime import datetime

from pydantic import BaseModel, Field


class NewsArticle(BaseModel):
    title: str
    url: str | None = None
    source: str
    published_at: datetime
    industry: str = Field(..., description="產業代碼，例如 semis")
    industry_label: str
    symbols: list[str] = Field(default_factory=list)
    sentiment: float = Field(..., ge=-1, le=1, description="標題情緒分數")
    matched: list[str] = Field(default_factory=list, description="命中的情緒關鍵字，方便檢查判讀依據")
    provider: str = Field(..., description="finmind / yfinance / mock")


class IndustryPulse(BaseModel):
    key: str
    label: str
    score: float = Field(..., ge=-1, le=1)
    article_count: int
    bullish: int
    bearish: int
    top_headline: str | None = None


class NewsDigest(BaseModel):
    industries: list[IndustryPulse]
    articles: list[NewsArticle]
    providers: dict[str, int] = Field(default_factory=dict, description="各數據源取得的新聞數")
    generated_at: datetime
