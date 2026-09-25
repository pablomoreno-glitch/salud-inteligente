from tests.helpers import (
    checkout_order,
    create_cart_with_item,
    make_product,
    mock_business_down,
    mock_by_refs,
    mock_reserve_conflict,
    mock_reserve_ok,
    mock_whatsapp,
)


async def test_successful_checkout_returns_whatsapp_url(client, respx_mock):
    token = await create_cart_with_item(client, respx_mock, ref="VW-158", quantity=2, price=45000)
    resp = await checkout_order(client, respx_mock, token)
    assert resp.status_code == 201
    body = resp.json()
    assert body["order"]["status"] == "pending"
    assert body["order"]["code"].startswith("SI-")
    assert body["order"]["total"] == 90000
    assert body["order"]["has_unpriced"] is False
    assert body["whatsapp_url"].startswith("https://wa.me/573001234567?text=")
    assert "VW-158" in body["whatsapp_url"] or "Ref." in body["whatsapp_url"]


async def test_empty_cart_checkout_422(client, respx_mock):
    cart = (await client.post("/carts")).json()
    resp = await checkout_order(client, respx_mock, cart["token"])
    assert resp.status_code == 422


async def test_checkout_unknown_cart_404(client, respx_mock):
    resp = await checkout_order(client, respx_mock, "does-not-exist")
    assert resp.status_code == 404


async def test_checkout_invalid_phone_422(client, respx_mock):
    token = await create_cart_with_item(client, respx_mock, ref="VW-158", quantity=1)
    resp = await checkout_order(client, respx_mock, token, customer_phone="abc")
    assert resp.status_code == 422


async def test_checkout_stock_conflict_returns_409_with_refs(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart = (await client.post("/carts")).json()
    token = cart["token"]
    await client.put(f"/carts/{token}/items/VW-158", json={"quantity": 5})

    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    mock_reserve_conflict(respx_mock, ["VW-158"])
    resp = await client.post(
        "/orders",
        json={
            "cart_token": token,
            "customer_name": "María Pérez",
            "customer_phone": "3001112222",
            "customer_city": "Bogotá",
        },
    )
    assert resp.status_code == 409
    body = resp.json()
    assert body["refs"] == ["VW-158"]
    assert "error" in body

    # The cart must remain untouched after a failed checkout.
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=45000)])
    cart_resp = await client.get(f"/carts/{token}")
    assert cart_resp.json()["item_count"] == 5


async def test_checkout_whatsapp_null_when_business_unreachable(client, respx_mock):
    token = await create_cart_with_item(client, respx_mock, ref="VW-158", quantity=1)
    mock_reserve_ok(respx_mock)
    mock_business_down(respx_mock)
    resp = await client.post(
        "/orders",
        json={
            "cart_token": token,
            "customer_name": "María Pérez",
            "customer_phone": "3001112222",
            "customer_city": "Bogotá",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["whatsapp_url"] is None


async def test_checkout_unpriced_line_reports_precios_por_confirmar(client, respx_mock):
    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=None)])
    cart = (await client.post("/carts")).json()
    token = cart["token"]
    await client.put(f"/carts/{token}/items/VW-158", json={"quantity": 1})

    mock_by_refs(respx_mock, [make_product(ref="VW-158", price=None)])
    mock_reserve_ok(respx_mock)
    mock_whatsapp(respx_mock)
    resp = await client.post(
        "/orders",
        json={
            "cart_token": token,
            "customer_name": "María Pérez",
            "customer_phone": "3001112222",
            "customer_city": "Bogotá",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["order"]["has_unpriced"] is True
    assert body["order"]["total"] is None

    # Cart is emptied after a successful checkout.
    cart_resp = await client.get(f"/carts/{token}")
    assert cart_resp.status_code == 404 or cart_resp.json()["items"] == []
