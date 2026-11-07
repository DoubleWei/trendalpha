"""全域設定：所有參數皆可透過環境變數 (TA_ 前綴) 或 .env 覆寫。"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TA_", env_file=".env", extra="ignore")

    app_name: str = "TrendAlpha"
    api_prefix: str = "/api/v1"

    # 數據模式：True = yfinance / FinMind 真實數據（預設）；False = 本機開發用的 Mock 模擬數據
    # 真實模式下抓取失敗的外掛會被列入 failed_sources，絕不會偷偷以模擬數據頂替
    use_live_data: bool = True
    finmind_token: str | None = None

    # 外掛控制：只要把名稱加進清單即可啟用（名稱 = 外掛的 `name` 類別屬性）
    enabled_fetchers: list[str] = ["macro", "global_market", "commodity", "taiwan_flow", "industry_news"]

    # 維度層級的權重乘數（可在不改程式碼的情況下調整策略偏好）
    category_multipliers: dict[str, float] = {
        "macro": 1.0,
        "us_tech": 1.0,
        "commodity": 1.0,
        "tw_flow": 1.0,
        "news": 1.0,
    }

    fetcher_timeout_sec: float = 8.0
    cache_ttl_sec: int = 60
    extreme_threshold: float = 0.8

    # 歷史走勢：匯出時從這個網址讀回上一版 history.json 再接續（GitHub Pages 上的舊資料）
    history_url: str | None = None
    history_max_points: int = 672  # 30 分鐘一點 ≈ 14 天

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
