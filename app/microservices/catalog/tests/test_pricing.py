from src.pricing import real_margin_percent, sale_price

from .conftest import SEED, TEST_INTERNAL_TOKEN

AUTH = {"X-Internal-Token": TEST_INTERNAL_TOKEN}


def test_sale_price_adds_the_margin_and_rounds_up_to_500():
    assert sale_price(7000, 40) == 10000
    assert sale_price(11500, 40) == 16500
    assert sale_price(None, 40) is None


def test_real_margin():
    assert real_margin_percent(10000, 14000) == 40.0


async def test_every_seeded_price_is_cost_plus_margin(client):
    margin = SEED["pricing"]["margin_percent"]
    body = (await client.get("/admin/products", headers=AUTH)).json()
    assert body["margin_percent"] == margin
    for item in body["items"]:
        if item["cost_price"]:
            assert item["price"] == sale_price(item["cost_price"], margin)
        else:
            # Without a supplier cost, the price is the median market price.
            assert item["price"] == item["market_price"]


async def test_cost_is_never_public(client):
    item = (await client.get("/products", params={"limit": 1})).json()["items"][0]
    assert "cost_price" not in item and "margin_percent" not in item
    assert "market_price" in item and "brand" in item


async def test_admin_products_requires_internal_token(client):
    assert (await client.get("/admin/products")).status_code == 401
    assert (await client.put("/pricing", json={"margin_percent": 50})).status_code == 401


async def test_changing_the_margin_reprices_everything(client):
    resp = await client.put("/pricing", json={"margin_percent": 50}, headers=AUTH)
    assert resp.status_code == 200
    with_cost = [p for p in SEED["products"] if p.get("cost_price")]
    assert resp.json()["products_repriced"] == len(with_cost)
    body = (await client.get("/admin/products", headers=AUTH)).json()
    for i in body["items"]:
        expected = sale_price(i["cost_price"], 50) if i["cost_price"] else i["market_price"]
        assert i["price"] == expected


async def test_changing_the_cost_updates_the_price(client):
    resp = await client.patch("/products/NP-007", json={"cost_price": 10000}, headers=AUTH)
    assert resp.status_code == 200
    margin = SEED["pricing"]["margin_percent"]
    assert resp.json()["price"] == sale_price(10000, margin)
