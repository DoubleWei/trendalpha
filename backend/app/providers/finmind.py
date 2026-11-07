"""FinMind API 接口（台股籌碼）。文件：https://finmind.github.io/"""
from datetime import date, timedelta
from typing import Any

import httpx

FINMIND_URL = "https://api.finmindtrade.com/api/v4/data"


class FinMindProvider:
    def __init__(self, token: str | None, timeout: float = 8.0) -> None:
        self.token = token
        self.timeout = timeout

    async def dataset(self, dataset: str, days: int = 14, data_id: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "dataset": dataset,
            "start_date": (date.today() - timedelta(days=days)).isoformat(),
        }
        if data_id:
            params["data_id"] = data_id
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(FINMIND_URL, params=params, headers=headers)
            resp.raise_for_status()
            payload = resp.json()
        if payload.get("status") != 200:
            raise RuntimeError(f"FinMind error: {payload.get('msg')}")
        return payload.get("data", [])

    async def dataset_range(self, dataset: str, *, data_id: str, start: date, end: date) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "dataset": dataset,
            "data_id": data_id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        }
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(FINMIND_URL, params=params, headers=headers)
            resp.raise_for_status()
            payload = resp.json()
        if payload.get("status") != 200:
            raise RuntimeError(f"FinMind error: {payload.get('msg')}")
        return payload.get("data", [])
