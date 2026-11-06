from fastapi import APIRouter, Query

from app.api.deps import EngineDep
from app.fetchers.registry import FetcherFactory
from app.schemas.market import FactorsResponse, GlobalScoreResponse

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


@router.get("/fetchers", summary="已註冊 / 已啟用的外掛清單")
async def list_fetchers(engine: EngineDep) -> dict[str, list[str]]:
    return {
        "available": sorted(FetcherFactory.available()),
        "enabled": [f.name for f in engine.fetchers],
    }
