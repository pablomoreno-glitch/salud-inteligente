from tests.conftest import INTERNAL_HEADERS
from tests.helpers import make_product, mock_anthropic_text, mock_catalog


async def _send_chat(client, respx_mock, ref="VW-158"):
    mock_anthropic_text(
        respx_mock,
        f'Respuesta.\nRECS:[{{"ref":"{ref}","nombre":"n","razon":"r"}}]',
    )
    return await client.post("/chat", json={"messages": [{"role": "user", "content": "ayuda"}]})


async def test_stats_requires_internal_token(client):
    resp = await client.get("/stats")
    assert resp.status_code == 401


async def test_stats_counts_conversations_and_recommendations(client, respx_mock):
    mock_catalog(respx_mock, [make_product(ref="VW-158"), make_product(ref="CM-14", name="Ashwagandha")])
    await _send_chat(client, respx_mock, ref="VW-158")
    await _send_chat(client, respx_mock, ref="VW-158")
    await _send_chat(client, respx_mock, ref="CM-14")

    resp = await client.get("/stats", params={"days": 30}, headers=INTERNAL_HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert body["conversations"] == 3
    assert body["recommendations"] == 3
    top = {item["ref"]: item["count"] for item in body["top_recommended"]}
    assert top["VW-158"] == 2
    assert top["CM-14"] == 1


async def test_stats_with_no_events(client):
    resp = await client.get("/stats", headers=INTERNAL_HEADERS)
    assert resp.status_code == 200
    assert resp.json() == {"conversations": 0, "recommendations": 0, "top_recommended": []}
