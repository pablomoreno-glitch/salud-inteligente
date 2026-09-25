import importlib
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

TEST_INTERNAL_TOKEN = "test-internal-token"
AUTH = {"X-Internal-Token": TEST_INTERNAL_TOKEN}
TWILIO_ENV = {
    "TWILIO_ACCOUNT_SID": "ACtest",
    "TWILIO_AUTH_TOKEN": "secret",
    "TWILIO_FROM_NUMBER": "+15005550006",
}


def _reset_app_modules() -> None:
    for name in list(sys.modules):
        if name == "src" or name.startswith("src."):
            del sys.modules[name]


@pytest.fixture
def make_client(tmp_path, monkeypatch):
    """Build a fresh app on a throwaway SQLite file, with extra environment variables."""

    @asynccontextmanager
    async def factory(**env):
        monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
        monkeypatch.setenv("INTERNAL_TOKEN", TEST_INTERNAL_TOKEN)
        for key in TWILIO_ENV:
            monkeypatch.delenv(key, raising=False)
        for key, value in env.items():
            monkeypatch.setenv(key, value)
        _reset_app_modules()
        main = importlib.import_module("src.main")
        async with main.app.router.lifespan_context(main.app):
            async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as ac:
                yield ac
        _reset_app_modules()

    return factory
