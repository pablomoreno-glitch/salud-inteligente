import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("INTERNAL_TOKEN", "test-internal-token")
os.environ.setdefault("CATALOG_URL", "http://catalog.test")
os.environ.setdefault("INVENTORY_URL", "http://inventory.test")
os.environ.setdefault("BUSINESS_URL", "http://business.test")
os.environ.setdefault("NOTIFICATIONS_URL", "http://notifications.test")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.database import Base, engine
from src.main import app

INTERNAL_HEADERS = {"X-Internal-Token": "test-internal-token"}


@pytest_asyncio.fixture()
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
