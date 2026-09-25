from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AdvisorEvent(Base):
    __tablename__ = "advisor_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False)
    recommended_refs: Mapped[str] = mapped_column(String, nullable=False, default="[]")
