from app.news.sentiment import score


def test_chinese_positive_and_negative():
    assert score("台積電先進製程訂單滿載，營收創新高")[0] > 0.5
    assert score("面板需求疲弱，第四季營收年減")[0] < -0.5


def test_longest_match_and_negation():
    s, matched = score("聯電營收不如預期")
    assert s < 0 and matched == ["不如預期"]
    assert score("法人不看好下半年")[0] < 0


def test_english_and_neutral():
    assert score("Nvidia shares surge after earnings beat")[0] > 0.5
    assert score("Apple cuts forecast as demand slumps")[0] < -0.5
    assert score("台積電召開股東會")[0] == 0


def test_yfinance_relevance_filter():
    from datetime import datetime, timezone

    from app.core.config import Settings
    from app.fetchers.base import FetcherContext
    from app.fetchers.plugins.industry_news import IndustryNewsFetcher
    from app.news.sources import RawArticle

    f = IndustryNewsFetcher(FetcherContext(settings=Settings(use_live_data=False)))
    now = datetime.now(timezone.utc)
    assert f._relevant(RawArticle("Nvidia unveils new GPU", None, "x", now, "NVDA", "yfinance"))
    assert not f._relevant(RawArticle("How many PepsiCo shares for $500", None, "x", now, "NVDA", "yfinance"))
    assert f._relevant(RawArticle("任意台股新聞", None, "x", now, "2330", "finmind"))
