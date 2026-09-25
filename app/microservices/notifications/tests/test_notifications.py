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
async def test_new_order_texts_the_business_phone(make_client):
    route = respx.post(TWILIO_URL).mock(return_value=httpx.Response(201, json={"sid": "SM123"}))

    async with make_client(**TWILIO_ENV) as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "sent"
    assert body["provider_id"] == "SM123"
    assert body["recipient"] == "+573018000324"

    form = dict(httpx.QueryParams(route.calls.last.request.content.decode()))
    assert form["To"] == "+573018000324"
    assert form["From"] == "+15005550006"
    assert "SI-000007" in form["Body"]
    assert "Ana Pérez (Pasto)" in form["Body"]
    assert "$100.000 + por confirmar" in form["Body"]
    assert "2x Silimarina 300 mg" in form["Body"]


async def test_without_twilio_the_message_is_recorded_as_skipped(make_client):
    async with make_client() as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)
        listing = await client.get("/notifications", headers=AUTH)

    assert response.status_code == 201
    assert response.json()["status"] == "skipped"
    assert listing.json()["total"] == 1


@respx.mock
async def test_twilio_error_is_recorded_without_failing(make_client):
    respx.post(TWILIO_URL).mock(
        return_value=httpx.Response(400, json={"code": 21211, "message": "Invalid 'To' Phone Number"})
    )

    async with make_client(**TWILIO_ENV) as client:
        response = await client.post("/events/order-created", json=EVENT, headers=AUTH)

    assert response.status_code == 201
    assert response.json()["status"] == "failed"
    assert "21211" in response.json()["error"]
    assert "secret" not in response.json()["error"]


async def test_long_orders_are_trimmed_to_two_sms_segments(make_client):
    many = {**EVENT, "items": [{"name": f"Producto de nombre largo {i}", "quantity": 1} for i in range(30)]}
    async with make_client() as client:
        response = await client.post("/events/order-created", json=many, headers=AUTH)
    assert len(response.json()["body"]) <= 300
    assert response.json()["body"].endswith("...")


async def test_status_reports_configuration(make_client):
    async with make_client(**TWILIO_ENV) as client:
        status = (await client.get("/status", headers=AUTH)).json()
    assert status == {"sms_configured": True, "order_sms_to": "+573018000324"}
