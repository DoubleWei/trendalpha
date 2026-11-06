import asyncio

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.engine.trend_matrix import TrendMatrixEngine
from app.fetchers.base import BaseEventFetcher
from app.main import create_app
from app.schemas.signal import EventSignal, FactorCategory


class FixedFetcher(BaseEventFetcher):
    name = "fixed"
    category = FactorCategory.US_TECH

    def __init__(self, score: float, weight: float = 1.0) -> None:
        self._s, self._w = score, weight

    async def fetch_signals(self) -> list[EventSignal]:
        return [self.signal("fixed", self._s, self._w, "test")]


class BrokenFetcher(BaseEventFetcher):
    name = "broken"
    category = FactorCategory.MACRO

    async def fetch_signals(self) -> list[EventSignal]:
        raise RuntimeError("boom")


class SlowFetcher(BaseEventFetcher):
    name = "slow"
    category = FactorCategory.MACRO

    async def fetch_signals(self) -> list[EventSignal]:
        await asyncio.sleep(5)
        return []


async def test_weighted_aggregation():
    engine = TrendMatrixEngine([FixedFetcher(0.9, 1.0), FixedFetcher(-0.3, 0.5)])
    snap = await engine.compute()
    # (0.9*1 - 0.3*0.5) / 1.5 = 0.5
    assert snap.global_score.score == 50.0
    assert snap.global_score.regime_label == "穩健多頭"
    assert snap.factors.factors[0].is_extreme is False


async def test_failures_are_isolated():
    engine = TrendMatrixEngine([FixedFetcher(1.0), BrokenFetcher(None), SlowFetcher(None)], timeout_sec=0.1)
    snap = await engine.compute()
    assert snap.global_score.score == 100.0
    assert set(snap.global_score.failed_sources) == {"broken", "slow"}
    assert snap.factors.factors[0].is_extreme is True


def test_api_endpoints_with_mock_plugins():
    with TestClient(create_app(Settings(use_live_data=False))) as client:
        g = client.get("/api/v1/market/global-score").json()
        assert -100 <= g["score"] <= 100 and g["summary"]
        f = client.get("/api/v1/market/factors").json()
        assert {x["category"] for x in f["factors"]} == {"macro", "us_tech", "commodity", "tw_flow"}
        assert set(client.get("/api/v1/market/fetchers").json()["enabled"]) == {
            "macro", "global_market", "commodity", "taiwan_flow"
        }
