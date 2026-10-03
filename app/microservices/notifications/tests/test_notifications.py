import httpx
import respx

from .conftest import AUTH, TWILIO_ENV

TWILIO_URL = "https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json"

EVENT = {
    "order_code": "SI-000007",
    "customer_name": "Ana Pérez",
    "customer_phone": "3001234567",
    "customer_city": "Pasto",
    "items": [{"name": "Silimarina 300 mg", "quantity": 2}, {"name": "Combo 1", "quantity": 1}],
    "total": 100000,
    "has_unpriced": True,
}


async def test_health(make_client):
    async with make_client() as client:
        response = await client.get("/health")
    assert response.json() == {"status": "ok", "service": "notifications"}


async def test_internal_endpoints_require_the_token(make_client):
    async with make_client() as client:
        assert (await client.post("/events/order-created", json=EVENT)).status_code == 401
        assert (await client.get("/notifications")).status_code == 401


@respx.mock
async def test_new_order_texts_every_order_phone(make_client):
    route = respx.post(TWILIO_URL).mock(return_value=httpx.Response(201, json={"sid": "SM123"}))

    async with make_client(**TWILIO_ENV) as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)

    assert response.status_code == 201
    sent = response.json()
    assert [n["recipient"] for n in sent] == ["+573043486001", "+573245710972"]
    assert all(n["status"] == "sent" and n["provider_id"] == "SM123" for n in sent)

    forms = [dict(httpx.QueryParams(call.request.content.decode())) for call in route.calls]
    assert [form["To"] for form in forms] == ["+573043486001", "+573245710972"]
    form = forms[0]
    assert form["From"] == "+15005550006"
    assert "SI-000007" in form["Body"]
    assert "Ana Pérez (Pasto)" in form["Body"]
    assert "$100.000 + a consultar" in form["Body"]
    assert "2x Silimarina 300 mg" in form["Body"]


@respx.mock
async def test_order_phones_come_from_a_comma_separated_list(make_client):
    route = respx.post(TWILIO_URL).mock(return_value=httpx.Response(201, json={"sid": "SM1"}))

    async with make_client(**TWILIO_ENV, ORDER_SMS_TO=" +573001112233 , ,+573001112233,+573004445566") as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)
        status = (await client.get("/status", headers=AUTH)).json()

    assert [n["recipient"] for n in response.json()] == ["+573001112233", "+573004445566"]
    assert route.call_count == 2
    assert status["order_sms_to"] == ["+573001112233", "+573004445566"]


@respx.mock
async def test_one_failed_phone_does_not_stop_the_others(make_client):
    respx.post(TWILIO_URL).mock(
        side_effect=[
            httpx.Response(400, json={"code": 21608, "message": "Unverified number"}),
            httpx.Response(201, json={"sid": "SM2"}),
        ]
    )

    async with make_client(**TWILIO_ENV) as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)

    assert [n["status"] for n in response.json()] == ["failed", "sent"]


async def test_without_twilio_the_message_is_recorded_as_skipped(make_client):
    async with make_client() as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)
        listing = await client.get("/notifications", headers=AUTH)

    assert response.status_code == 201
    assert {n["status"] for n in response.json()} == {"skipped"}
    assert listing.json()["total"] == 2


@respx.mock
async def test_twilio_error_is_recorded_without_failing(make_client):
    respx.post(TWILIO_URL).mock(
        return_value=httpx.Response(400, json={"code": 21211, "message": "Invalid 'To' Phone Number"})
    )

    async with make_client(**TWILIO_ENV) as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)

    assert response.status_code == 201
    for notification in response.json():
        assert notification["status"] == "failed"
        assert "21211" in notification["error"]
        assert "secret" not in notification["error"]


async def test_long_orders_are_trimmed_to_two_sms_segments(make_client):
    many = {**EVENT, "items": [{"name": f"Producto de nombre largo {i}", "quantity": 1} for i in range(30)]}
    async with make_client() as client:
        response = await client.post("/events/order-created", json=many, headers=AUTH)
    body = response.json()[0]["body"]
    assert len(body) <= 300
    assert body.endswith("...")


async def test_status_reports_configuration(make_client):
    async with make_client(**TWILIO_ENV) as client:
        status = (await client.get("/status", headers=AUTH)).json()
    assert status == {"sms_configured": True, "order_sms_to": ["+573043486001", "+573245710972"]}
