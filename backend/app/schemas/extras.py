from datetime import datetime

from pydantic import BaseModel


class Quote(BaseModel):
    symbol: str
    name: str
    last: float
    change_pct: float
    as_of: str


class QuotesResponse(BaseModel):
    quotes: list[Quote]
    generated_at: datetime


class HistoryPoint(BaseModel):
    t: datetime
    score: float
    regime_label: str


class HistoryResponse(BaseModel):
    points: list[HistoryPoint]
