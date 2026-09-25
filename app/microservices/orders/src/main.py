import re
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.clients import (
    StockConflict,
    get_products_by_refs,
    get_whatsapp_number,
    notify_order_created,
    release_stock,
    reserve_stock,
)
from src.database import get_db, init_db
from src.errors import register_error_handlers
from src.models import Cart, CartItem, Order, OrderItem, OrderStatusHistory
from src.schemas import CartItemUpdate, CheckoutRequest, StatusUpdate
from src.security import require_internal

STATUS_SEQUENCE = ["pending", "confirmed", "shipped", "delivered"]
ALL_STATUSES = STATUS_SEQUENCE + ["cancelled"]
PHONE_RE = re.compile(r"^\d{7,20}$")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)
register_error_handlers(app)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "orders"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def normalize_phone(raw: str) -> str | None:
    digits = re.sub(r"[\s+\-]", "", raw or "")
    return digits if PHONE_RE.match(digits) else None


def normalize_digits(raw: str) -> str:
    return re.sub(r"\D", "", raw or "")


def format_price(value: int) -> str:
    return "$" + format(value, ",").replace(",", ".")


def serialize_order_item(item: OrderItem) -> dict:
    return {
        "ref": item.ref,
        "slug": item.slug,
        "name": item.name,
        "image_url": item.image_url,
        "unit_price": item.unit_price,
        "quantity": item.quantity,
        "line_total": item.line_total,
        "source": item.source,
    }


def serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "code": order.code,
        "status": order.status,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "customer_city": order.customer_city,
        "notes": order.notes,
        "items": [serialize_order_item(i) for i in order.items],
        "total": order.total,
        "has_unpriced": order.has_unpriced,
        "created_at": order.created_at.isoformat() + "Z",
        "updated_at": order.updated_at.isoformat() + "Z",
        "history": [
            {"from_status": h.from_status, "to_status": h.to_status, "at": h.at.isoformat() + "Z"}
            for h in sorted(order.history, key=lambda h: h.at)
        ],
    }


def serialize_cart(cart: Cart, products_by_ref: dict) -> dict:
    lines = []
    for item in cart.items:
        product = products_by_ref.get(item.ref)
        if product is None:
            continue
        price = product.get("price")
        line_total = price * item.quantity if price is not None else None
        lines.append(
            {
                "ref": item.ref,
                "slug": product["slug"],
                "name": product["name"],
                "image_url": product.get("image_url"),
                "price": price,
                "quantity": item.quantity,
                "line_total": line_total,
                "source": item.source,
            }
        )
    return {
        "token": cart.token,
        "items": lines,
        "item_count": sum(line["quantity"] for line in lines),
        "subtotal": sum(line["line_total"] for line in lines if line["line_total"] is not None),
        "has_unpriced": any(line["line_total"] is None for line in lines),
    }


async def active_products_by_ref(refs: list[str]) -> dict:
    if not refs:
        return {}
    products = await get_products_by_refs(refs)
    return {p["ref"]: p for p in products if p.get("is_active")}


def build_order_summary(order_code: str, items: list[dict], total: int | None, has_unpriced: bool, name: str, city: str) -> str:
    lines = [f"¡Hola! Quiero confirmar mi pedido {order_code}:"]
    for item in items:
        lines.append(f"{item['quantity']} x {item['name']} (Ref. {item['ref']})")
    if has_unpriced or total is None:
        lines.append("Total: precios por confirmar")
    else:
        lines.append(f"Total: {format_price(total)}")
    lines.append(f"Cliente: {name} - {city}")
    return "\n".join(lines)


def build_whatsapp_url(whatsapp_number: str, order_code: str, items: list[dict], total: int | None, has_unpriced: bool, name: str, city: str) -> str:
    digits = normalize_digits(whatsapp_number)
    summary = build_order_summary(order_code, items, total, has_unpriced, name, city)
    return f"https://wa.me/{digits}?text={quote(summary)}"


def is_valid_transition(current: str, target: str) -> bool:
    if current in ("delivered", "cancelled"):
        return False
    if target == "cancelled":
        return True
    try:
        return STATUS_SEQUENCE.index(target) == STATUS_SEQUENCE.index(current) + 1
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# Carts
# ---------------------------------------------------------------------------


@app.post("/carts", status_code=201)
async def create_cart(db: AsyncSession = Depends(get_db)):
    cart = Cart()
    db.add(cart)
    await db.commit()
    await db.refresh(cart)
    return serialize_cart(cart, {})


@app.get("/carts/{token}")
async def get_cart(token: str, db: AsyncSession = Depends(get_db)):
    cart = await db.get(Cart, token)
    if cart is None:
        raise HTTPException(404, "Carrito no encontrado")
    products_by_ref = await active_products_by_ref([item.ref for item in cart.items])
    return serialize_cart(cart, products_by_ref)


@app.put("/carts/{token}/items/{ref}")
async def put_cart_item(token: str, ref: str, payload: CartItemUpdate, db: AsyncSession = Depends(get_db)):
    if not (0 <= payload.quantity <= 99):
        raise HTTPException(422, "La cantidad debe estar entre 0 y 99.")
    source = payload.source or "catalog"
    if source not in ("catalog", "advisor"):
        raise HTTPException(422, 'El origen debe ser "catalog" o "advisor".')

    cart = await db.get(Cart, token)
    if cart is None:
        raise HTTPException(404, "Carrito no encontrado")

    products = await get_products_by_refs([ref])
    if not products:
        raise HTTPException(404, "Producto no encontrado")

    existing = next((item for item in cart.items if item.ref == ref), None)
    if payload.quantity == 0:
        if existing is not None:
            cart.items.remove(existing)
    elif existing is not None:
        existing.quantity = payload.quantity
        existing.source = source
    else:
        cart.items.append(CartItem(ref=ref, quantity=payload.quantity, source=source))

    await db.commit()
    await db.refresh(cart)

    products_by_ref = await active_products_by_ref([item.ref for item in cart.items])
    return serialize_cart(cart, products_by_ref)


@app.delete("/carts/{token}/items/{ref}")
async def delete_cart_item(token: str, ref: str, db: AsyncSession = Depends(get_db)):
    cart = await db.get(Cart, token)
    if cart is None:
        raise HTTPException(404, "Carrito no encontrado")
    existing = next((item for item in cart.items if item.ref == ref), None)
    if existing is not None:
        cart.items.remove(existing)
        await db.commit()
        await db.refresh(cart)
    products_by_ref = await active_products_by_ref([item.ref for item in cart.items])
    return serialize_cart(cart, products_by_ref)


@app.delete("/carts/{token}/items")
async def clear_cart(token: str, db: AsyncSession = Depends(get_db)):
    cart = await db.get(Cart, token)
    if cart is None:
        raise HTTPException(404, "Carrito no encontrado")
    cart.items = []
    await db.commit()
    await db.refresh(cart)
    return serialize_cart(cart, {})


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


@app.post("/orders", status_code=201)
async def checkout(
    payload: CheckoutRequest, background: BackgroundTasks, db: AsyncSession = Depends(get_db)
):
    name = (payload.customer_name or "").strip()
    city = (payload.customer_city or "").strip()
    notes = (payload.notes or "").strip() or None
    phone_digits = normalize_phone(payload.customer_phone or "")

    if not (2 <= len(name) <= 80):
        raise HTTPException(422, "El nombre debe tener entre 2 y 80 caracteres.")
    if phone_digits is None:
        raise HTTPException(422, "El teléfono debe tener entre 7 y 20 dígitos.")
    if not (2 <= len(city) <= 60):
        raise HTTPException(422, "La ciudad debe tener entre 2 y 60 caracteres.")
    if notes is not None and len(notes) > 500:
        raise HTTPException(422, "Las notas no pueden superar 500 caracteres.")

    cart = await db.get(Cart, payload.cart_token)
    if cart is None:
        raise HTTPException(404, "Carrito no encontrado")
    if not cart.items:
        raise HTTPException(422, "El carrito está vacío.")

    refs = [item.ref for item in cart.items]
    products_by_ref = await active_products_by_ref(refs)

    order_items_data = []
    for item in cart.items:
        product = products_by_ref.get(item.ref)
        if product is None:
            continue
        price = product.get("price")
        line_total = price * item.quantity if price is not None else None
        order_items_data.append(
            {
                "ref": item.ref,
                "slug": product["slug"],
                "name": product["name"],
                "image_url": product.get("image_url"),
                "unit_price": price,
                "quantity": item.quantity,
                "line_total": line_total,
                "source": item.source,
            }
        )

    if not order_items_data:
        raise HTTPException(422, "El carrito está vacío.")

    priced_totals = [d["line_total"] for d in order_items_data if d["line_total"] is not None]
    total = sum(priced_totals) if priced_totals else None
    has_unpriced = any(d["unit_price"] is None for d in order_items_data)

    order = Order(
        status="pending",
        customer_name=name,
        customer_phone=phone_digits,
        customer_city=city,
        notes=notes,
        total=total,
        has_unpriced=has_unpriced,
        items=[OrderItem(**d) for d in order_items_data],
        history=[OrderStatusHistory(from_status=None, to_status="pending")],
    )
    db.add(order)
    await db.flush()

    code = f"SI-{order.id:06d}"
    order.code = code

    try:
        await reserve_stock(code, [{"ref": d["ref"], "quantity": d["quantity"]} for d in order_items_data])
    except StockConflict as exc:
        await db.rollback()
        names = [next((d["name"] for d in order_items_data if d["ref"] == ref), ref) for ref in exc.refs]
        raise HTTPException(
            409,
            {"error": f"No hay stock suficiente para: {', '.join(names)}.", "refs": exc.refs},
        )

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        await release_stock(code)
        raise HTTPException(500, "No se pudo crear el pedido. Intenta de nuevo.")

    cart.items = []
    await db.commit()
    await db.refresh(order, attribute_names=["items", "history"])

    whatsapp_number = await get_whatsapp_number()
    whatsapp_url = None
    if whatsapp_number:
        whatsapp_url = build_whatsapp_url(
            whatsapp_number, code, order_items_data, total, has_unpriced, name, city
        )

    serialized = serialize_order(order)
    background.add_task(notify_order_created, serialized)
    return {"order": serialized, "whatsapp_url": whatsapp_url}


@app.get("/orders/track/{code}")
async def track_order(code: str, phone: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.code == code))
    order = result.scalar_one_or_none()
    if order is None or normalize_digits(phone) != order.customer_phone:
        raise HTTPException(404, "Pedido no encontrado")
    return serialize_order(order)


@app.get("/orders", dependencies=[Depends(require_internal)])
async def list_orders(
    status: str | None = None,
    q: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    stmt = select(Order)
    if status:
        stmt = stmt.where(Order.status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Order.customer_name.ilike(like),
                Order.code.ilike(like),
                Order.customer_phone.ilike(like),
            )
        )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.order_by(Order.created_at.desc()).limit(limit).offset(offset)
    orders = (await db.execute(stmt)).scalars().all()
    return {"items": [serialize_order(o) for o in orders], "total": total}


@app.get("/orders/{order_id}", dependencies=[Depends(require_internal)])
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "Pedido no encontrado")
    return serialize_order(order)


@app.patch("/orders/{order_id}/status", dependencies=[Depends(require_internal)])
async def update_order_status(order_id: int, payload: StatusUpdate, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "Pedido no encontrado")

    target = payload.status
    if target not in ALL_STATUSES:
        raise HTTPException(422, "Estado inválido.")
    if not is_valid_transition(order.status, target):
        raise HTTPException(422, "Transición de estado inválida.")

    previous = order.status
    order.status = target
    order.history.append(OrderStatusHistory(from_status=previous, to_status=target))

    if target == "cancelled":
        await release_stock(order.code)

    await db.commit()
    await db.refresh(order)
    return serialize_order(order)


@app.get("/metrics", dependencies=[Depends(require_internal)])
async def metrics(days: int = Query(30, ge=7, le=365), db: AsyncSession = Depends(get_db)):
    orders_total = (await db.execute(select(func.count()).select_from(Order))).scalar_one()

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)
    start_dt = datetime.combine(start_date, datetime.min.time())

    result = await db.execute(select(Order).where(Order.created_at >= start_dt))
    orders_in_range = result.scalars().all()
    n_range = len(orders_in_range)

    by_status = {s: 0 for s in ALL_STATUSES}
    for order in orders_in_range:
        by_status[order.status] = by_status.get(order.status, 0) + 1

    revenue_orders = [
        o for o in orders_in_range if o.status in ("confirmed", "shipped", "delivered") and o.total is not None
    ]
    revenue = sum(o.total for o in revenue_orders)
    avg_order_value = round(revenue / len(revenue_orders)) if revenue_orders else 0

    non_cancelled = [o for o in orders_in_range if o.status != "cancelled"]
    units_sold = sum(item.quantity for o in non_cancelled for item in o.items)

    cancelled_count = by_status.get("cancelled", 0)
    cancellation_rate = round(cancelled_count / n_range, 2) if n_range else 0.0

    advisor_orders = sum(1 for o in orders_in_range if any(item.source == "advisor" for item in o.items))
    advisor_share = round(advisor_orders / n_range, 2) if n_range else 0.0

    daily_map: dict[str, dict] = {}
    cursor = start_date
    while cursor <= today:
        key = cursor.isoformat()
        daily_map[key] = {"date": key, "orders": 0, "revenue": 0}
        cursor += timedelta(days=1)
    for order in orders_in_range:
        key = order.created_at.date().isoformat()
        if key in daily_map:
            daily_map[key]["orders"] += 1
            if order.status in ("confirmed", "shipped", "delivered") and order.total is not None:
                daily_map[key]["revenue"] += order.total
    daily = [daily_map[key] for key in sorted(daily_map.keys())]

    product_stats: dict[str, dict] = {}
    for order in non_cancelled:
        for item in order.items:
            entry = product_stats.setdefault(item.ref, {"ref": item.ref, "name": item.name, "units": 0, "revenue": 0})
            entry["units"] += item.quantity
            if item.line_total is not None:
                entry["revenue"] += item.line_total
    top_products = sorted(product_stats.values(), key=lambda e: e["units"], reverse=True)[:5]

    return {
        "range_days": days,
        "orders_total": orders_total,
        "orders_in_range": n_range,
        "by_status": by_status,
        "revenue": revenue,
        "avg_order_value": avg_order_value,
        "units_sold": units_sold,
        "cancellation_rate": cancellation_rate,
        "advisor_share": advisor_share,
        "daily": daily,
        "top_products": top_products,
    }
