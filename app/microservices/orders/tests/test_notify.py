import json

import httpx

from .helpers import NOTIFICATIONS_URL, checkout_order, create_cart_with_item


async def test_checkout_announces_the_new_order(client, respx_mock):
    token = await create_cart_with_item(client, respx_mock, ref="VW-158", quantity=2, price=45000)
    route = respx_mock.post(f"{NOTIFICATIONS_URL}/events/order-created", name="notify").mock(
        return_value=httpx.Response(201, json={"status": "sent"})
    )

    resp = await checkout_order(client, respx_mock, token)

    assert resp.status_code == 201
    assert route.called
    event = json.loads(route.calls.last.request.content)
    assert event["order_code"] == resp.json()["order"]["code"]
    assert event["customer_city"] == "Bogotá"
    assert event["items"] == [{"name": event["items"][0]["name"], "quantity": 2}]
    assert event["total"] == 90000
    assert route.calls.last.request.headers["X-Internal-Token"]


async def test_checkout_succeeds_when_notifications_is_down(client, respx_mock):
    token = await create_cart_with_item(client, respx_mock, ref="VW-158", quantity=1, price=45000)
    respx_mock.post(f"{NOTIFICATIONS_URL}/events/order-created", name="notify").mock(
        side_effect=httpx.ConnectError("down")
    )

    resp = await checkout_order(client, respx_mock, token)

    assert resp.status_code == 201
    assert resp.json()["order"]["code"].startswith("SI-")
