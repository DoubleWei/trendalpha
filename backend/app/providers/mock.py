"""可重現的 Mock 行情：同一分鐘內數值固定，跨分鐘做隨機漫步，讓前端看得到「跳動」。"""
import random
import time


class MockMarket:
    def __init__(self, bucket_seconds: int = 60) -> None:
        self.bucket_seconds = bucket_seconds

    def _rng(self, key: str) -> random.Random:
        bucket = int(time.time() // self.bucket_seconds)
        return random.Random(f"{key}:{bucket}")

    def around(self, key: str, base: float, spread: float) -> float:
        """在 base 附近 ±spread 的範圍內產生一個值。"""
        return base + self._rng(key).uniform(-spread, spread)
