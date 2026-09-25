from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool

from src.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_engine_kwargs = {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool} if _is_sqlite else {}

engine = create_async_engine(settings.DATABASE_URL, echo=False, **_engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
