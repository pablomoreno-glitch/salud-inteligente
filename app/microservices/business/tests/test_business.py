from .conftest import TEST_INTERNAL_TOKEN


async def test_business_returns_profile_contacts_services_and_media(client):
    response = await client.get("/business")
    assert response.status_code == 200

    body = response.json()
    assert body["profile"]["name"] == "Salud Inteligente"
    assert body["profile"]["tagline"]
    assert body["profile"]["description"]
    assert len(body["services"]) == 4
    assert len(body["media"]) == 11  # hero + nosotros + 9 needs


async def test_contacts_are_null_when_not_configured(client):
    response = await client.get("/contacts")
    assert response.status_code == 200
    assert response.json() == {
        "whatsapp": None,
        "phone": None,
        "email": None,
        "address": None,
        "city": None,
        "hours": None,
        "instagram": None,
        "facebook": None,
    }


async def test_contacts_are_filled_from_env_vars(client_with_env_contacts):
    response = await client_with_env_contacts.get("/contacts")
    assert response.status_code == 200

    body = response.json()
    assert body["whatsapp"] == "573001234567"
    assert body["email"] == "hola@saludinteligente.lat"
    assert body["phone"] is None
    assert body["city"] is None  # blank env var, not ""


async def test_services_have_icons(client):
    response = await client.get("/services")
    assert response.status_code == 200
    icons = {item["icon"] for item in response.json()}
    assert icons == {"sparkles", "shield-check", "message-circle", "store"}


async def test_media_can_be_filtered_by_kind(client):
    response = await client.get("/media", params={"kind": "need"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 9
    for item in body:
        assert item["kind"] == "need"
        assert item["url"].startswith("/media/site/need-")


async def test_contact_message_requires_phone_or_email(client):
    response = await client.post(
        "/contact-messages", json={"name": "Ana", "message": "Quiero saber mas del catalogo"}
    )
    assert response.status_code == 422
    assert "error" in response.json()


async def test_contact_message_is_created_with_status_new(client):
    response = await client.post(
        "/contact-messages",
        json={"name": "Ana", "phone": "3001234567", "message": "Quiero saber mas del catalogo"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "new"
    assert body["name"] == "Ana"


async def test_contact_message_validates_email_format(client):
    response = await client.post(
        "/contact-messages",
        json={"name": "Ana", "email": "no-es-un-correo", "message": "Hola, tengo una pregunta"},
    )
    assert response.status_code == 422


async def test_contact_messages_listing_requires_internal_token(client):
    response = await client.get("/contact-messages")
    assert response.status_code == 401
    assert response.json() == {"error": "No autorizado"}


async def test_admin_marks_message_as_read(client):
    created = await client.post(
        "/contact-messages",
        json={"name": "Ana", "phone": "3001234567", "message": "Quiero saber mas del catalogo"},
    )
    message_id = created.json()["id"]

    listed = await client.get(
        "/contact-messages", params={"status": "new"}, headers={"X-Internal-Token": TEST_INTERNAL_TOKEN}
    )
    assert listed.json()["total"] == 1

    patched = await client.patch(
        f"/contact-messages/{message_id}",
        json={"status": "read"},
        headers={"X-Internal-Token": TEST_INTERNAL_TOKEN},
    )
    assert patched.status_code == 200
    assert patched.json()["status"] == "read"

    listed_after = await client.get(
        "/contact-messages", params={"status": "new"}, headers={"X-Internal-Token": TEST_INTERNAL_TOKEN}
    )
    assert listed_after.json()["total"] == 0


async def test_patch_profile_updates_fields(client):
    response = await client.patch(
        "/profile",
        json={"whatsapp": "573009999999", "tagline": "Nueva tagline"},
        headers={"X-Internal-Token": TEST_INTERNAL_TOKEN},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["contacts"]["whatsapp"] == "573009999999"
    assert body["profile"]["tagline"] == "Nueva tagline"


async def test_patch_profile_without_internal_token_is_rejected(client):
    response = await client.patch("/profile", json={"tagline": "x"})
    assert response.status_code == 401
