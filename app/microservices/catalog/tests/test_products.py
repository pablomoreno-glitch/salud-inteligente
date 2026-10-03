from .conftest import SEED, SEED_ACTIVE, SEED_PRICED, SEED_PRODUCTS, TEST_INTERNAL_TOKEN


async def test_get_product_by_slug_returns_brand_benefits_and_description(client):
    response = await client.get("/products/naturpro-valeriana-pasiflora-600-ml")
    assert response.status_code == 200

    body = response.json()
    assert body["ref"] == "NP-007"
    assert body["brand"] == "Naturpro"
    seed_item = next(p for p in SEED["products"] if p["ref"] == "NP-007")
    assert body["benefits"] == seed_item["benefits"]
    assert body["description"] == seed_item["description"]


async def test_get_product_by_slug_404_when_missing(client):
    response = await client.get("/products/no-existe")
    assert response.status_code == 404
    assert response.json() == {"error": "Producto no encontrado"}


async def test_inactive_product_is_hidden_from_detail_and_list(client):
    patch = await client.patch(
        "/products/NP-007",
        json={"is_active": False},
        headers={"X-Internal-Token": TEST_INTERNAL_TOKEN},
    )
    assert patch.status_code == 200

    detail = await client.get("/products/naturpro-valeriana-pasiflora-600-ml")
    assert detail.status_code == 404

    listing = await client.get("/products", params={"limit": 1000})
    refs = [item["ref"] for item in listing.json()["items"]]
    assert "NP-007" not in refs


async def test_list_products_filters_by_category_and_need(client):
    response = await client.get("/products", params={"category": "jarabes", "need": "sueno"})
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["category"]["slug"] == "jarabes"
        assert item["need"]["slug"] == "sueno"


async def test_search_is_accent_insensitive(client):
    with_accent = await client.get("/products", params={"q": "sueño"})
    without_accent = await client.get("/products", params={"q": "sueno"})

    assert with_accent.status_code == 200
    assert without_accent.status_code == 200
    assert with_accent.json()["total"] == without_accent.json()["total"]
    assert with_accent.json()["total"] > 0


async def test_products_by_refs_omits_unknown_refs(client):
    response = await client.get("/products/by-refs", params={"refs": "NP-007,DOES-NOT-EXIST"})
    assert response.status_code == 200
    refs = [item["ref"] for item in response.json()]
    assert refs == ["NP-007"]


async def test_related_products_prefers_same_need_then_category(client):
    response = await client.get("/products/naturpro-valeriana-pasiflora-600-ml/related")
    assert response.status_code == 200

    items = response.json()
    assert len(items) <= 4
    refs = [item["ref"] for item in items]
    assert "NP-007" not in refs


async def test_patch_product_sets_price(client):
    response = await client.patch(
        "/products/NP-007",
        json={"price": 45000},
        headers={"X-Internal-Token": TEST_INTERNAL_TOKEN},
    )
    assert response.status_code == 200
    assert response.json()["price"] == 45000

    detail = await client.get("/products/naturpro-valeriana-pasiflora-600-ml")
    assert detail.json()["price"] == 45000


async def test_patch_product_rejects_non_positive_price(client):
    response = await client.patch(
        "/products/NP-007",
        json={"price": 0},
        headers={"X-Internal-Token": TEST_INTERNAL_TOKEN},
    )
    assert response.status_code == 422
    assert "error" in response.json()


async def test_patch_product_without_internal_token_is_rejected(client):
    response = await client.patch("/products/NP-007", json={"price": 45000})
    assert response.status_code == 401
    assert response.json() == {"error": "No autorizado"}


async def test_patch_product_updates_search_text(client):
    await client.patch(
        "/products/NP-007",
        json={"benefits": ["Ayuda con el insomnio total"]},
        headers={"X-Internal-Token": TEST_INTERNAL_TOKEN},
    )

    response = await client.get("/products", params={"q": "insomnio"})
    refs = [item["ref"] for item in response.json()["items"]]
    assert "NP-007" in refs


async def test_summary_requires_internal_token(client):
    response = await client.get("/summary")
    assert response.status_code == 401


async def test_summary_counts_products(client):
    response = await client.get("/summary", headers={"X-Internal-Token": TEST_INTERNAL_TOKEN})
    assert response.status_code == 200

    body = response.json()
    assert body["products"] == SEED_PRODUCTS
    assert body["active"] == SEED_ACTIVE
    assert body["unpriced"] == SEED_PRODUCTS - SEED_PRICED
