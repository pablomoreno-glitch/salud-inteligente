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
        assert item["price"] == sale_price(item["cost_price"], margin)


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
    assert resp.json()["products_repriced"] == len(SEED["products"])
    body = (await client.get("/admin/products", headers=AUTH)).json()
    assert all(i["price"] == sale_price(i["cost_price"], 50) for i in body["items"])


async def test_changing_the_cost_updates_the_price(client):
    resp = await client.patch("/products/NP-007", json={"cost_price": 10000}, headers=AUTH)
    assert resp.status_code == 200
    margin = SEED["pricing"]["margin_percent"]
    assert resp.json()["price"] == sale_price(10000, margin)
