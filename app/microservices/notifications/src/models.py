from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Notification(Base):
    """One outgoing message and what happened to it."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(String(10), default="sms")
    event: Mapped[str] = mapped_column(String(40))
    recipient: Mapped[str] = mapped_column(String(30))
    body: Mapped[str] = mapped_column(Text)
    order_code: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    # sent | failed | skipped (Twilio not configured)
    status: Mapped[str] = mapped_column(String(10))
    provider_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
