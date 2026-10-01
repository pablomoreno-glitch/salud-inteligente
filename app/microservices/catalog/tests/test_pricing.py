from src.pricing import real_margin_percent

from .conftest import TEST_INTERNAL_TOKEN

AUTH = {"X-Internal-Token": TEST_INTERNAL_TOKEN}


def test_margin_is_profit_over_cost():
    assert real_margin_percent(10000, 14000) == 40.0
    assert real_margin_percent(None, 14000) is None


async def test_cost_is_never_public(client):
    item = (await client.get("/products", params={"limit": 1})).json()["items"][0]
    assert "cost_price" not in item and "margin_percent" not in item


async def test_admin_products_requires_internal_token(client):
    assert (await client.get("/admin/products")).status_code == 401


async def test_cost_and_price_are_edited_independently(client):
    resp = await client.patch("/products/NP-007", json={"cost_price": 10000}, headers=AUTH)
    before = resp.json()["price"]
    assert before is not None

    resp = await client.patch("/products/NP-007", json={"price": 15000}, headers=AUTH)
    assert resp.json()["price"] == 15000

    item = next(i for i in (await client.get("/admin/products", headers=AUTH)).json()["items"] if i["ref"] == "NP-007")
    assert item["cost_price"] == 10000
    assert item["margin_percent"] == 50.0
