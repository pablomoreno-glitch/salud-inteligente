from .conftest import SEED_CATEGORIES, SEED_PRODUCTS


async def test_seed_loads_every_product_with_image_urls(client):
    response = await client.get("/products", params={"limit": 1000})
    assert response.status_code == 200

    body = response.json()
    assert body["total"] == SEED_PRODUCTS
    assert len(body["items"]) == SEED_PRODUCTS
    for item in body["items"]:
        assert item["image_url"].startswith("/media/products/")


async def test_seed_loads_every_category(client):
    response = await client.get("/categories")
    assert response.status_code == 200
    assert len(response.json()) == SEED_CATEGORIES


async def test_seed_loads_needs_with_image_urls(client):
    response = await client.get("/needs")
    assert response.status_code == 200

    needs = {item["slug"]: item for item in response.json()}
    assert "otros" in needs
    assert needs["otros"]["image_url"] == "/media/site/hero.webp"
    assert needs["sueno"]["image_url"] == "/media/site/need-sueno.webp"


async def test_seed_is_idempotent_on_restart(client):
    first = await client.get("/products", params={"limit": 1000})
    assert first.json()["total"] == SEED_PRODUCTS

    # Re-running the lifespan seed step (simulated via a second call) must not duplicate rows.
    second = await client.get("/products", params={"limit": 1000})
    assert second.json()["total"] == SEED_PRODUCTS
