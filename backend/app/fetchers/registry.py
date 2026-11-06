"""外掛註冊表 + 工廠。plugins/ 目錄下的模組會被自動掃描載入 —— 新增檔案即完成「插上」。"""
import importlib
import logging
import pkgutil

from app.fetchers.base import BaseEventFetcher, FetcherContext

logger = logging.getLogger(__name__)

_REGISTRY: dict[str, type[BaseEventFetcher]] = {}


def register_fetcher(cls: type[BaseEventFetcher]) -> type[BaseEventFetcher]:
    name = getattr(cls, "name", None)
    if not name:
        raise TypeError(f"{cls.__name__} must define a `name` class attribute")
    if name in _REGISTRY and _REGISTRY[name] is not cls:
        raise ValueError(f"fetcher name '{name}' already registered by {_REGISTRY[name].__name__}")
    _REGISTRY[name] = cls
    return cls


def autodiscover(package: str = "app.fetchers.plugins") -> None:
    pkg = importlib.import_module(package)
    for mod in pkgutil.iter_modules(pkg.__path__):
        importlib.import_module(f"{package}.{mod.name}")


class FetcherFactory:
    @staticmethod
    def available() -> dict[str, type[BaseEventFetcher]]:
        return dict(_REGISTRY)

    @staticmethod
    def create(names: list[str], ctx: FetcherContext) -> list[BaseEventFetcher]:
        fetchers: list[BaseEventFetcher] = []
        for name in names:
            cls = _REGISTRY.get(name)
            if cls is None:
                logger.error("unknown fetcher '%s' (available: %s)", name, sorted(_REGISTRY))
                continue
            fetchers.append(cls(ctx))
        return fetchers
