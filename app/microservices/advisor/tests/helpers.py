import httpx

CATALOG_URL = "http://catalog.test"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


def make_product(ref="VW-158", price=45000, is_active=True, name="Magnesium Complex 8 en 1", need_name="Sueño, estrés y ansiedad"):
    return {
        "ref": ref,
        "slug": f"{name.lower().replace(' ', '-')}-{ref.lower()}",
        "name": name,
        "category": {"slug": "virales", "name": "Productos Virales"},
        "need": {"slug": "sueno", "name": need_name},
        "benefits": ["Reduce el estrés y mejora el sueño"],
        "image_url": f"/media/products/{ref.lower()}.webp",
        "price": price,
        "is_active": is_active,
    }


def mock_catalog(respx_mock, products):
    respx_mock.get(f"{CATALOG_URL}/products").mock(
        return_value=httpx.Response(200, json={"items": products, "total": len(products), "limit": 1000, "offset": 0})
    )


def mock_catalog_down(respx_mock):
    respx_mock.get(f"{CATALOG_URL}/products").mock(side_effect=httpx.ConnectError("down"))


def mock_anthropic_text(respx_mock, text):
    respx_mock.post(ANTHROPIC_URL).mock(
        return_value=httpx.Response(200, json={"content": [{"type": "text", "text": text}]})
    )


def mock_anthropic_error(respx_mock, status_code=500):
    respx_mock.post(ANTHROPIC_URL).mock(
        return_value=httpx.Response(status_code, json={"error": {"type": "api_error", "message": "boom"}})
    )


def mock_anthropic_down(respx_mock):
    respx_mock.post(ANTHROPIC_URL).mock(side_effect=httpx.ConnectError("down"))
