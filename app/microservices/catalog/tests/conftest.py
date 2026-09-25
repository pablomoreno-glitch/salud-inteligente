import importlib
import json
import sys
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

TEST_INTERNAL_TOKEN = "test-internal-token"

# Expected counts come from the seed itself, so adding products does not break the tests.
SEED = json.loads((ROOT / "seed" / "catalog.json").read_text(encoding="utf-8"))
SEED_PRODUCTS = len(SEED["products"])
SEED_CATEGORIES = len(SEED["categories"])
SEED_PRICED = sum(1 for p in SEED["products"] if p.get("price"))


def _reset_app_modules() -> None:
    for name in list(sys.modules):
        if name == "src" or name.startswith("src."):
            del sys.modules[name]


@pytest_asyncio.fixture
async def client(tmp_path, monkeypatch):
    """A fresh app, bound to a throwaway SQLite file, per test."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")
    monkeypatch.setenv("INTERNAL_TOKEN", TEST_INTERNAL_TOKEN)

    _reset_app_modules()
    main = importlib.import_module("src.main")

    async with main.app.router.lifespan_context(main.app):
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    _reset_app_modules()
