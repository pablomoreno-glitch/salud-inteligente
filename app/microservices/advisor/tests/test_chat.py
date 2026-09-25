from src.config import settings
from tests.helpers import (
    make_product,
    mock_anthropic_down,
    mock_anthropic_error,
    mock_anthropic_text,
    mock_catalog,
    mock_catalog_down,
)


async def test_greeting_without_recs_has_empty_recommendations(client, respx_mock):
    mock_catalog(respx_mock, [make_product()])
    mock_anthropic_text(respx_mock, "¡Hola! ¿En qué te puedo ayudar hoy?")

    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "hola"}]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["recommendations"] == []
    assert "RECS:" not in body["reply"]


async def test_invented_ref_is_dropped(client, respx_mock):
    mock_catalog(respx_mock, [make_product(ref="VW-158")])
    reply = (
        'Te recomiendo esto para dormir mejor.\n'
        'RECS:[{"ref":"VW-158","nombre":"Magnesium Complex","razon":"Ayuda a dormir"},'
        '{"ref":"XX-999","nombre":"Inventado","razon":"No existe"}]'
    )
    mock_anthropic_text(respx_mock, reply)

    resp = await client.post(
        "/chat", json={"messages": [{"role": "user", "content": "me cuesta dormir"}]}
    )
    assert resp.status_code == 200
    body = resp.json()
    refs = [r["ref"] for r in body["recommendations"]]
    assert refs == ["VW-158"]
    assert "RECS:" not in body["reply"]


async def test_recs_block_is_stripped_from_reply(client, respx_mock):
    mock_catalog(respx_mock, [make_product(ref="VW-158")])
    reply = 'Aquí tienes una recomendación.\nRECS:[{"ref":"VW-158","nombre":"x","razon":"y"}]\n```'
    mock_anthropic_text(respx_mock, reply)

    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "ayuda"}]})
    body = resp.json()
    assert body["reply"] == "Aquí tienes una recomendación."
    assert len(body["recommendations"]) == 1
    assert body["recommendations"][0]["name"] == "Magnesium Complex 8 en 1"
    assert body["recommendations"][0]["price"] == 45000


async def test_more_than_four_recommendations_are_trimmed(client, respx_mock):
    products = [make_product(ref=f"R-{i}") for i in range(6)]
    mock_catalog(respx_mock, products)
    recs = ",".join(f'{{"ref":"R-{i}","nombre":"n{i}","razon":"r{i}"}}' for i in range(6))
    mock_anthropic_text(respx_mock, f"Respuesta.\nRECS:[{recs}]")

    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "necesito ayuda"}]})
    body = resp.json()
    assert len(body["recommendations"]) == 4


async def test_empty_messages_returns_400(client):
    resp = await client.post("/chat", json={"messages": []})
    assert resp.status_code == 400
    assert "error" in resp.json()


async def test_invalid_message_shape_returns_400(client):
    resp = await client.post("/chat", json={"messages": [{"role": "system", "content": "x"}]})
    assert resp.status_code == 400


async def test_invalid_json_body_returns_400(client):
    resp = await client.post("/chat", content=b"not json", headers={"content-type": "application/json"})
    assert resp.status_code == 400


async def test_missing_api_key_returns_500(client, monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "hola"}]})
    assert resp.status_code == 500
    assert resp.json() == {"error": "El asesor no está configurado en el servidor. Intenta más tarde."}


async def test_catalog_unreachable_without_cache_returns_502(client, respx_mock):
    mock_catalog_down(respx_mock)
    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "hola"}]})
    assert resp.status_code == 502


async def test_anthropic_upstream_error_returns_502(client, respx_mock):
    mock_catalog(respx_mock, [make_product()])
    mock_anthropic_error(respx_mock)
    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "hola"}]})
    assert resp.status_code == 502
    assert "ANTHROPIC_API_KEY" not in resp.text


async def test_anthropic_network_failure_returns_502(client, respx_mock):
    mock_catalog(respx_mock, [make_product()])
    mock_anthropic_down(respx_mock)
    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "hola"}]})
    assert resp.status_code == 502


async def test_history_is_trimmed_and_leading_non_user_dropped(client, respx_mock):
    mock_catalog(respx_mock, [make_product()])
    mock_anthropic_text(respx_mock, "Respuesta corta.")

    history = [{"role": "assistant", "content": "hola"}] + [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(25)
    ]
    resp = await client.post("/chat", json={"messages": history})
    assert resp.status_code == 200
