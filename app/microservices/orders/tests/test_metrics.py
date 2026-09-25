from src.database import AsyncSessionLocal
from src.models import Order, OrderItem
from tests.helpers import INTERNAL_HEADERS


async def _insert_order(status, total, quantity=1, ref="VW-158", source="catalog", name="Producto"):
    async with AsyncSessionLocal() as session:
        order = Order(
            status=status,
            customer_name="Cliente",
            customer_phone="3000000000",
            customer_city="Bogotá",
            total=total,
            has_unpriced=total is None,
        )
        order.items = [
            OrderItem(
                ref=ref,
                slug=f"{ref.lower()}-slug",
                name=name,
                image_url=None,
                unit_price=total,
                quantity=quantity,
                line_total=total,
                source=source,
            )
        ]
        session.add(order)
        await session.commit()
        await session.refresh(order)
        return order.id


async def test_metrics_requires_internal_token(client):
    resp = await client.get("/metrics")
    assert resp.status_code == 401


async def test_revenue_excludes_pending_and_cancelled(client):
    await _insert_order("delivered", 90000)
    await _insert_order("pending", 50000)
    await _insert_order("cancelled", 30000)

    resp = await client.get("/metrics", params={"days": 30}, headers=INTERNAL_HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert body["revenue"] == 90000
    assert body["cancellation_rate"] == round(1 / 3, 2)
    assert body["avg_order_value"] == 90000


async def test_daily_covers_every_day_in_range(client):
    resp = await client.get("/metrics", params={"days": 7}, headers=INTERNAL_HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["daily"]) == 7
    assert body["orders_total"] == 0


async def test_top_products_ranked_by_units(client):
    await _insert_order("delivered", 10000, quantity=3, ref="AAA", name="Producto A")
    await _insert_order("delivered", 10000, quantity=1, ref="BBB", name="Producto B")

    resp = await client.get("/metrics", headers=INTERNAL_HEADERS)
    top = resp.json()["top_products"]
    assert top[0]["ref"] == "AAA"
    assert top[0]["units"] == 3


async def test_advisor_share_counts_orders_with_advisor_line(client):
    await _insert_order("delivered", 10000, source="advisor")
    await _insert_order("delivered", 10000, source="catalog")

    resp = await client.get("/metrics", headers=INTERNAL_HEADERS)
    assert resp.json()["advisor_share"] == 0.5
