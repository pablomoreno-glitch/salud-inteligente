import httpx

INTERNAL_HEADERS = {"X-Internal-Token": "test-internal-token"}

CATALOG_URL = "http://catalog.test"
INVENTORY_URL = "http://inventory.test"
BUSINESS_URL = "http://business.test"


def make_product(ref="VW-158", price=45000, is_active=True, name="Magnesium Complex 8 en 1", slug=None):
    slug = slug or f"{name.lower().replace(' ', '-')}-{ref.lower()}"
    return {
        "ref": ref,
        "slug": slug,
        "name": name,
        "category": {"slug": "virales", "name": "Productos Virales"},
        "need": {"slug": "sueno", "name": "Sueño, estrés y ansiedad"},
        "type": "Greensofg",
        "format": "100 cáps",
        "presentation": "100 cáps",
        "invima": "NSA-2040-2025",
        "benefits": ["Reduce el estrés y mejora el sueño"],
        "description": "Descripción",
        "advisor_tags": [],
        "image_url": f"/media/products/{slug}.webp",
        "price": price,
        "is_viral": True,
        "is_trending": False,
        "is_active": is_active,
    }


def mock_by_refs(respx_mock, products):
    respx_mock.get(url__startswith=f"{CATALOG_URL}/products/by-refs").mock(
        return_value=httpx.Response(200, json=products)
    )


def mock_reserve_ok(respx_mock):
    respx_mock.post(f"{INVENTORY_URL}/stock/reserve").mock(return_value=httpx.Response(200, json={}))


def mock_reserve_conflict(respx_mock, refs):
    respx_mock.post(f"{INVENTORY_URL}/stock/reserve").mock(
        return_value=httpx.Response(409, json={"error": "Stock insuficiente", "refs": refs})
    )


def mock_release_ok(respx_mock):
    respx_mock.post(f"{INVENTORY_URL}/stock/release").mock(return_value=httpx.Response(200, json={}))


def mock_whatsapp(respx_mock, whatsapp="573001234567"):
    respx_mock.get(f"{BUSINESS_URL}/contacts").mock(return_value=httpx.Response(200, json={"whatsapp": whatsapp}))


def mock_business_down(respx_mock):
    respx_mock.get(f"{BUSINESS_URL}/contacts").mock(side_effect=httpx.ConnectError("down"))


async def create_cart_with_item(client, respx_mock, ref="VW-158", quantity=1, price=45000, source="catalog"):
    mock_by_refs(respx_mock, [make_product(ref=ref, price=price)])
    cart_resp = await client.post("/carts")
    token = cart_resp.json()["token"]
    await client.put(f"/carts/{token}/items/{ref}", json={"quantity": quantity, "source": source})
    return token


async def checkout_order(client, respx_mock, token, ref="VW-158", **overrides):
    mock_reserve_ok(respx_mock)
    mock_whatsapp(respx_mock)
    payload = {
        "cart_token": token,
        "customer_name": "María Pérez",
        "customer_phone": "300 111 2222",
        "customer_city": "Bogotá",
    }
    payload.update(overrides)
    return await client.post("/orders", json=payload)
