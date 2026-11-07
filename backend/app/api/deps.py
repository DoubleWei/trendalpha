"""依賴注入：引擎於 lifespan 建立並掛在 app.state，路由透過 Depends 取得（測試可 override）。"""
from typing import Annotated

from fastapi import Depends, Request

from app.core.config import Settings
from app.engine.trend_matrix import TrendMatrixEngine
from app.fetchers.base import FetcherContext
from app.fetchers.registry import FetcherFactory, autodiscover
from app.services.quotes import QuotesService


def build_engine(settings: Settings, ctx: FetcherContext | None = None) -> TrendMatrixEngine:
    autodiscover()
    ctx = ctx or FetcherContext(settings=settings)
    fetchers = FetcherFactory.create(settings.enabled_fetchers, ctx)
    return TrendMatrixEngine(
        fetchers,
        timeout_sec=settings.fetcher_timeout_sec,
        cache_ttl_sec=settings.cache_ttl_sec,
        extreme_threshold=settings.extreme_threshold,
        category_multipliers=settings.category_multipliers,
        data_mode="live" if settings.use_live_data else "mock",
        history_max_points=settings.history_max_points,
    )


def get_engine(request: Request) -> TrendMatrixEngine:
    return request.app.state.engine


def get_quotes(request: Request) -> QuotesService:
    return request.app.state.quotes


EngineDep = Annotated[TrendMatrixEngine, Depends(get_engine)]
QuotesDep = Annotated[QuotesService, Depends(get_quotes)]
