"""外掛基類。新增任何全球數據源 = 繼承 BaseEventFetcher + 加上 @register_fetcher。"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import ClassVar, Generic, TypeVar

from app.core.config import Settings
from app.core.scoring import clamp
from app.providers.finmind import FinMindProvider
from app.providers.mock import MockMarket
from app.providers.yfinance_provider import YFinanceProvider
from app.schemas.signal import EventSignal, FactorCategory

logger = logging.getLogger(__name__)

TSnapshot = TypeVar("TSnapshot")


@dataclass
class FetcherContext:
    """注入給每個外掛的共用資源（設定 + 數據提供者）。測試時可整包替換。"""

    settings: Settings
    yf: YFinanceProvider = field(default_factory=YFinanceProvider)
    finmind: FinMindProvider | None = None
    mock: MockMarket = field(default_factory=MockMarket)

    def __post_init__(self) -> None:
        if self.finmind is None:
            self.finmind = FinMindProvider(self.settings.finmind_token, self.settings.fetcher_timeout_sec)


class BaseEventFetcher(ABC):
    """所有事件外掛的非同步抽象基類。"""

    #: 唯一識別名，對應設定檔 enabled_fetchers
    name: ClassVar[str]
    #: 所屬維度，決定前端顯示在哪張卡片
    category: ClassVar[FactorCategory]

    def __init__(self, ctx: FetcherContext) -> None:
        self.ctx = ctx

    @abstractmethod
    async def fetch_signals(self) -> list[EventSignal]:
        """抓取數據並轉換成 EventSignal 清單。"""

    def artifacts(self) -> dict:
        """（可選）本次抓取附帶的額外資料，例如新聞清單。key 會成為 snapshot.extras 的鍵。"""
        return {}

    def signal(
        self,
        source_name: str,
        trend_score: float,
        weight: float,
        description: str,
        *,
        raw_value: float | None = None,
        unit: str | None = None,
    ) -> EventSignal:
        """建立訊號的便捷方法：自動夾限分數範圍並帶入 category。"""
        return EventSignal(
            source_name=source_name,
            trend_score=round(clamp(trend_score), 4),
            weight=clamp(weight, 0.0, 1.0),
            description=description,
            category=self.category,
            raw_value=None if raw_value is None else round(raw_value, 4),
            unit=unit,
        )


class SnapshotFetcher(BaseEventFetcher, Generic[TSnapshot]):
    """「先取快照、再計分」的範本：外掛只需專注取數與計算邏輯。"""

    async def fetch_signals(self) -> list[EventSignal]:
        return self.score(await self.load())

    async def load(self) -> TSnapshot:
        if self.ctx.settings.use_live_data:
            # 失敗直接拋出，由引擎隔離並標記於 failed_sources（不以模擬數據頂替）
            return await self.load_live()
        return self.load_mock()

    async def load_live(self) -> TSnapshot:
        raise NotImplementedError

    @abstractmethod
    def load_mock(self) -> TSnapshot: ...

    @abstractmethod
    def score(self, snap: TSnapshot) -> list[EventSignal]: ...
