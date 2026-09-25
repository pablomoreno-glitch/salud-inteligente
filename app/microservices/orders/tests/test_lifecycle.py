from tests.helpers import (
    INTERNAL_HEADERS,
    checkout_order,
    create_cart_with_item,
    mock_release_ok,
)


async def _create_order(client, respx_mock):
    token = await create_cart_with_item(client, respx_mock, ref="VW-158", quantity=1, price=45000)
    resp = await checkout_order(client, respx_mock, token)
    return resp.json()["order"]


async def test_internal_endpoint_requires_token(client, respx_mock):
    order = await _create_order(client, respx_mock)
    resp = await client.get(f"/orders/{order['id']}")
    assert resp.status_code == 401
    assert resp.json() == {"error": "No autorizado"}


async def test_internal_endpoint_accepts_token(client, respx_mock):
    order = await _create_order(client, respx_mock)
    resp = await client.get(f"/orders/{order['id']}", headers=INTERNAL_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["code"] == order["code"]


async def test_valid_transition_sequence_records_history(client, respx_mock):
    order = await _create_order(client, respx_mock)
    order_id = order["id"]

    for target in ["confirmed", "shipped", "delivered"]:
        resp = await client.patch(
            f"/orders/{order_id}/status", json={"status": target}, headers=INTERNAL_HEADERS
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == target

    final = await client.get(f"/orders/{order_id}", headers=INTERNAL_HEADERS)
    history = final.json()["history"]
    assert [h["to_status"] for h in history] == ["pending", "confirmed", "shipped", "delivered"]


async def test_invalid_transition_from_delivered_is_rejected(client, respx_mock):
    order = await _create_order(client, respx_mock)
    order_id = order["id"]
    for target in ["confirmed", "shipped", "delivered"]:
        await client.patch(f"/orders/{order_id}/status", json={"status": target}, headers=INTERNAL_HEADERS)

    resp = await client.patch(
        f"/orders/{order_id}/status", json={"status": "pending"}, headers=INTERNAL_HEADERS
    )
    assert resp.status_code == 422

    unchanged = await client.get(f"/orders/{order_id}", headers=INTERNAL_HEADERS)
    assert unchanged.json()["status"] == "delivered"


async def test_cancel_from_pending_releases_stock(client, respx_mock):
    order = await _create_order(client, respx_mock)
    mock_release_ok(respx_mock)

    resp = await client.patch(
        f"/orders/{order['id']}/status", json={"status": "cancelled"}, headers=INTERNAL_HEADERS
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


async def test_cancel_twice_is_rejected(client, respx_mock):
    order = await _create_order(client, respx_mock)
    mock_release_ok(respx_mock)
    await client.patch(f"/orders/{order['id']}/status", json={"status": "cancelled"}, headers=INTERNAL_HEADERS)

    resp = await client.patch(
        f"/orders/{order['id']}/status", json={"status": "confirmed"}, headers=INTERNAL_HEADERS
    )
    assert resp.status_code == 422
