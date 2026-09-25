import importlib
import sys
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

TEST_INTERNAL_TOKEN = "test-internal-token"


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
    for field in (
        "BUSINESS_WHATSAPP",
        "BUSINESS_PHONE",
        "BUSINESS_EMAIL",
        "BUSINESS_ADDRESS",
        "BUSINESS_CITY",
        "BUSINESS_HOURS",
        "BUSINESS_INSTAGRAM",
        "BUSINESS_FACEBOOK",
    ):
        monkeypatch.delenv(field, raising=False)

    _reset_app_modules()
    main = importlib.import_module("src.main")

    async with main.app.router.lifespan_context(main.app):
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    _reset_app_modules()


@pytest_asyncio.fixture
async def client_with_env_contacts(tmp_path, monkeypatch):
    """Same as `client`, but with BUSINESS_* env vars set before the first seed."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")
    monkeypatch.setenv("INTERNAL_TOKEN", TEST_INTERNAL_TOKEN)
    monkeypatch.setenv("BUSINESS_WHATSAPP", "573001234567")
    monkeypatch.setenv("BUSINESS_EMAIL", "hola@saludinteligente.lat")

    _reset_app_modules()
    main = importlib.import_module("src.main")

    async with main.app.router.lifespan_context(main.app):
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    _reset_app_modules()
