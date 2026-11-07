from fastapi import APIRouter, HTTPException, Query

from app.api.deps import EngineDep, QuotesDep
from app.fetchers.registry import FetcherFactory
from app.schemas.extras import HistoryResponse, QuotesResponse
from app.schemas.market import FactorsResponse, GlobalScoreResponse
from app.schemas.news import NewsDigest

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/global-score", response_model=GlobalScoreResponse, summary="台股全球預測總分")
async def get_global_score(
    engine: EngineDep,
    refresh: bool = Query(False, description="略過快取強制重算"),
) -> GlobalScoreResponse:
    return (await engine.snapshot(force=refresh)).global_score


@router.get("/factors", response_model=FactorsResponse, summary="各全球維度細項分數")
async def get_factors(
    engine: EngineDep,
    refresh: bool = Query(False, description="略過快取強制重算"),
) -> FactorsResponse:
    return (await engine.snapshot(force=refresh)).factors


@router.get("/news", response_model=NewsDigest, summary="產業新聞與情緒熱度")
async def get_news(engine: EngineDep) -> NewsDigest:
    news = (await engine.snapshot()).extras.get("news")
    if news is None:
        raise HTTPException(status_code=503, detail="news plugin disabled or failed")
    return news


@router.get("/history", response_model=HistoryResponse, summary="總分歷史走勢")
async def get_history(engine: EngineDep) -> HistoryResponse:
    await engine.snapshot()
    return HistoryResponse(points=list(engine.history))


@router.get("/quotes", response_model=QuotesResponse, summary="主要商品行情")
async def get_quotes(quotes: QuotesDep) -> QuotesResponse:
    return await quotes.fetch()


@router.get("/fetchers", summary="已註冊 / 已啟用的外掛清單")
async def list_fetchers(engine: EngineDep) -> dict[str, list[str]]:
    return {
        "available": sorted(FetcherFactory.available()),
        "enabled": [f.name for f in engine.fetchers],
    }
