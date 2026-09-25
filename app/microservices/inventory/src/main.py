from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db, init_db
from .errors import install_error_handlers
from .models import Movement, Reservation, Stock, utcnow
from .schemas import (
    AvailabilityOut,
    MovementOut,
    ReleaseRequest,
    ReserveRequest,
    StockListOut,
    StockOut,
    StockPatch,
    SummaryOut,
)
from .security import require_internal


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Salud Inteligente - Inventory", lifespan=lifespan)
install_error_handlers(app)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "inventory"}


def compute_status(stock: Stock | None) -> str:
    if stock is None or stock.quantity is None:
        return "available"
    if stock.quantity == 0:
        return "out"
    if stock.quantity <= stock.low_stock_threshold:
        return "low"
    return "available"


def to_stock_out(stock: Stock) -> StockOut:
    return StockOut(
        ref=stock.ref,
        quantity=stock.quantity,
        low_stock_threshold=stock.low_stock_threshold,
        status=compute_status(stock),
        tracked=stock.quantity is not None,
        updated_at=stock.updated_at,
    )


def to_movement_out(movement: Movement) -> MovementOut:
    return MovementOut(
        id=movement.id,
        ref=movement.ref,
        delta=movement.delta,
        reason=movement.reason,
        order_code=movement.order_code,
        created_at=movement.created_at,
    )


@app.get("/availability", response_model=list[AvailabilityOut])
async def get_availability(refs: str, db: AsyncSession = Depends(get_db)) -> list[AvailabilityOut]:
    ref_list = [item.strip() for item in refs.split(",") if item.strip()]
    if not ref_list:
        return []

    stocks = (await db.execute(select(Stock).where(Stock.ref.in_(ref_list)))).scalars().all()
    by_ref = {stock.ref: stock for stock in stocks}

    return [AvailabilityOut(ref=ref, status=compute_status(by_ref.get(ref))) for ref in ref_list]


@app.get("/stock", response_model=StockListOut, dependencies=[Depends(require_internal)])
async def list_stock(
    status: str | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> StockListOut:
    stmt = select(Stock)
    if q:
        stmt = stmt.where(Stock.ref.like(f"%{q.upper()}%"))

    rows = (await db.execute(stmt)).scalars().all()

    def matches_status(stock: Stock) -> bool:
        if status is None:
            return True
        if status == "untracked":
            return stock.quantity is None
        return compute_status(stock) == status

    filtered = [stock for stock in rows if matches_status(stock)]
    filtered.sort(key=lambda stock: stock.ref)

    total = len(filtered)
    page = filtered[offset : offset + limit]

    return StockListOut(items=[to_stock_out(stock) for stock in page], total=total)


@app.patch("/stock/{ref}", response_model=StockOut, dependencies=[Depends(require_internal)])
async def patch_stock(ref: str, payload: StockPatch, db: AsyncSession = Depends(get_db)) -> StockOut:
    stock = await db.get(Stock, ref)
    changes = payload.model_dump(exclude_unset=True)

    if stock is None:
        stock = Stock(ref=ref, quantity=None, low_stock_threshold=settings.default_low_stock_threshold)
        db.add(stock)
        await db.flush()

    if "quantity" in changes:
        previous_quantity = stock.quantity
        new_quantity = changes["quantity"]

        if previous_quantity != new_quantity:
            if previous_quantity is not None and new_quantity is not None:
                delta = new_quantity - previous_quantity
            elif new_quantity is not None:
                delta = new_quantity
            else:
                delta = -previous_quantity if previous_quantity is not None else 0

            if delta != 0:
                db.add(Movement(ref=ref, delta=delta, reason="adjust", order_code=None))

        stock.quantity = new_quantity

    if "low_stock_threshold" in changes:
        stock.low_stock_threshold = changes["low_stock_threshold"]

    stock.updated_at = utcnow()

    await db.commit()
    await db.refresh(stock)
    return to_stock_out(stock)


@app.post("/stock/reserve", dependencies=[Depends(require_internal)])
async def reserve_stock(payload: ReserveRequest, db: AsyncSession = Depends(get_db)) -> dict:
    stocks: dict[str, Stock | None] = {}
    insufficient_refs: list[str] = []

    for item in payload.items:
        stock = await db.get(Stock, item.ref)
        stocks[item.ref] = stock
        if stock is not None and stock.quantity is not None and stock.quantity < item.quantity:
            insufficient_refs.append(item.ref)

    if insufficient_refs:
        raise HTTPException(
            status_code=409,
            detail={"error": "No hay stock suficiente para completar el pedido", "refs": insufficient_refs},
        )

    for item in payload.items:
        stock = stocks[item.ref]
        if stock is not None and stock.quantity is not None:
            stock.quantity -= item.quantity
            stock.updated_at = utcnow()
            db.add(Movement(ref=item.ref, delta=-item.quantity, reason="order", order_code=payload.order_code))
            db.add(
                Reservation(
                    order_code=payload.order_code,
                    ref=item.ref,
                    quantity=item.quantity,
                    released=False,
                )
            )

    await db.commit()
    return {"order_code": payload.order_code, "reserved": True}


@app.post("/stock/release", dependencies=[Depends(require_internal)])
async def release_stock(payload: ReleaseRequest, db: AsyncSession = Depends(get_db)) -> dict:
    reservations = (
        await db.execute(
            select(Reservation).where(
                Reservation.order_code == payload.order_code,
                Reservation.released.is_(False),
            )
        )
    ).scalars().all()

    for reservation in reservations:
        stock = await db.get(Stock, reservation.ref)
        if stock is not None and stock.quantity is not None:
            stock.quantity += reservation.quantity
            stock.updated_at = utcnow()
            db.add(
                Movement(
                    ref=reservation.ref,
                    delta=reservation.quantity,
                    reason="release",
                    order_code=payload.order_code,
                )
            )
        reservation.released = True

    await db.commit()
    return {"order_code": payload.order_code, "released": True}


@app.get("/movements", response_model=list[MovementOut], dependencies=[Depends(require_internal)])
async def list_movements(ref: str | None = None, db: AsyncSession = Depends(get_db)) -> list[MovementOut]:
    stmt = select(Movement)
    if ref:
        stmt = stmt.where(Movement.ref == ref)
    stmt = stmt.order_by(Movement.id.desc()).limit(100)

    movements = (await db.execute(stmt)).scalars().all()
    return [to_movement_out(movement) for movement in movements]


@app.get("/summary", dependencies=[Depends(require_internal)])
async def get_summary(db: AsyncSession = Depends(get_db)) -> SummaryOut:
    stocks = (await db.execute(select(Stock))).scalars().all()

    tracked = sum(1 for stock in stocks if stock.quantity is not None)
    untracked = sum(1 for stock in stocks if stock.quantity is None)
    low = sum(1 for stock in stocks if compute_status(stock) == "low")
    out = sum(1 for stock in stocks if compute_status(stock) == "out")

    return SummaryOut(tracked=tracked, untracked=untracked, low=low, out=out)
