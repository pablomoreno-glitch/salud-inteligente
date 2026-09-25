from tests.helpers import make_product, mock_by_refs


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "orders"}


async def test_create_cart_returns_token_and_empty_view(client):
    resp = await client.post("/carts")
    assert resp.status_code == 201
    body = resp.json()
    assert body["token"]
    assert body["items"] == []
    assert body["item_count"] == 0
    assert body["subtotal"] == 0
    assert body["has_unpriced"] is False


async def test_get_unknown_cart_404(client):
    resp = await client.get("/carts/does-not-exist")
    assert resp.status_code == 404
    assert resp.json() == {"error": "Carrito no encontrado"}


async def test_put_item_unknown_ref_404(client, respx_mock):
    mock_by_refs(respx_mock, [])
    cart = (await client.post("/carts")).json()
    resp = await client.put(f"/carts/{cart['token']}/items/XX-999", json={"quantity": 1})
    assert resp.status_code == 404
    assert resp.json() == {"error": "Producto no encontrado"}


async def test_add_from_advisor_sets_source_and_item_count(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart = (await client.post("/carts")).json()
    resp = await client.put(
        f"/carts/{cart['token']}/items/VW-158", json={"quantity": 1, "source": "advisor"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["item_count"] == 1
    assert body["items"][0]["source"] == "advisor"
    assert body["items"][0]["ref"] == "VW-158"


async def test_unpriced_line_has_null_line_total(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=None)])
    cart = (await client.post("/carts")).json()
    await client.put(f"/carts/{cart['token']}/items/VW-158", json={"quantity": 2})

    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=None)])
    resp = await client.get(f"/carts/{cart['token']}")
    body = resp.json()
    assert body["has_unpriced"] is True
    assert body["items"][0]["line_total"] is None


async def test_quantity_zero_removes_item(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart = (await client.post("/carts")).json()
    await client.put(f"/carts/{cart['token']}/items/VW-158", json={"quantity": 1})

    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    resp = await client.put(f"/carts/{cart['token']}/items/VW-158", json={"quantity": 0})
    assert resp.status_code == 200
    assert resp.json()["items"] == []


async def test_quantity_out_of_range_422(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart = (await client.post("/carts")).json()
    resp = await client.put(f"/carts/{cart['token']}/items/VW-158", json={"quantity": 100})
    assert resp.status_code == 422


async def test_inactive_product_dropped_from_view(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart = (await client.post("/carts")).json()
    await client.put(f"/carts/{cart['token']}/items/VW-158", json={"quantity": 1})

    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000, is_active=False)])
    resp = await client.get(f"/carts/{cart['token']}")
    assert resp.json()["items"] == []


async def test_delete_single_item(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart = (await client.post("/carts")).json()
    await client.put(f"/carts/{cart['token']}/items/VW-158", json={"quantity": 1})

    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    resp = await client.delete(f"/carts/{cart['token']}/items/VW-158")
    assert resp.status_code == 200
    assert resp.json()["items"] == []


async def test_clear_cart(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart = (await client.post("/carts")).json()
    await client.put(f"/carts/{cart['token']}/items/VW-158", json={"quantity": 1})

    resp = await client.delete(f"/carts/{cart['token']}/items")
    assert resp.status_code == 200
    assert resp.json()["items"] == []
