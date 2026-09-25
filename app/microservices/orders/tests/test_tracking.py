from tests.helpers import checkout_order, create_cart_with_item


async def _create_order(client, respx_mock, phone="300 111 2222"):
    token = await create_cart_with_item(client, respx_mock, ref="VW-158", quantity=1, price=45000)
    resp = await checkout_order(client, respx_mock, token, customer_phone=phone)
    return resp.json()["order"]


async def test_track_order_with_matching_phone(client, respx_mock):
    order = await _create_order(client, respx_mock)
    resp = await client.get(f"/orders/track/{order['code']}", params={"phone": "3001112222"})
    assert resp.status_code == 200
    assert resp.json()["code"] == order["code"]


async def test_track_order_with_wrong_phone_404(client, respx_mock):
    order = await _create_order(client, respx_mock)
    resp = await client.get(f"/orders/track/{order['code']}", params={"phone": "9999999999"})
    assert resp.status_code == 404
    assert resp.json() == {"error": "Pedido no encontrado"}


async def test_track_unknown_code_404(client):
    resp = await client.get("/orders/track/SI-999999", params={"phone": "3001112222"})
    assert resp.status_code == 404
