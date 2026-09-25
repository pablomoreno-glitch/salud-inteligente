from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db, init_db
from .errors import install_error_handlers
from .models import Notification
from .schemas import NotificationOut, OrderCreatedEvent
from .security import require_internal
from .sms import order_created_body, send_sms


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Salud Inteligente - notifications", lifespan=lifespan)
install_error_handlers(app)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "notifications"}


@app.post("/events/order-created", response_model=NotificationOut, status_code=201,
          dependencies=[Depends(require_internal)])
async def order_created(event: OrderCreatedEvent, db: AsyncSession = Depends(get_db)):
    """Text the business phone about a new order and record the outcome."""
    body = order_created_body(event)
    result = await send_sms(settings.order_sms_to, body)
    notification = Notification(
        channel="sms",
        event="order_created",
        recipient=settings.order_sms_to,
        body=body,
        order_code=event.order_code,
        status=result.status,
        provider_id=result.provider_id,
        error=result.error,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


@app.get("/notifications", dependencies=[Depends(require_internal)])
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count(Notification.id)))).scalar_one()
    rows = (
        await db.execute(
            select(Notification).order_by(Notification.id.desc()).offset(offset).limit(limit)
        )
    ).scalars().all()
    return {"items": [NotificationOut.model_validate(r).model_dump(mode="json") for r in rows], "total": total}


@app.get("/status", dependencies=[Depends(require_internal)])
async def status():
    return {"sms_configured": settings.sms_configured, "order_sms_to": settings.order_sms_to}
