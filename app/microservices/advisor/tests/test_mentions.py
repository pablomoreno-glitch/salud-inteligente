import httpx

from src.advisor import mentioned_products
from tests.helpers import make_product, mock_anthropic_text, mock_catalog

INVENTORY_URL = "http://inventory.test"

CATALOG = {
    "NH-99": make_product(ref="NH-99", name="QB Max", price=None),
    "LN-68": make_product(ref="LN-68", name="Shilajit Compota"),
    "VW-160": make_product(ref="VW-160", name="Shilajit"),
    "NV-050": make_product(ref="NV-050", name="Enzopro Multicepas de Probióticos"),
}


def test_refs_and_names_are_found_in_order():
    reply = "Te sirve la enzopro multicepas de probioticos y también el QB Max (REF. NH-99)."
    assert [r["ref"] for r in mentioned_products(reply, CATALOG)] == ["NV-050", "NH-99"]


def test_longest_name_wins_over_a_shorter_one_inside_it():
    reply = "Prueba el Shilajit Compota por las mañanas."
    assert [r["ref"] for r in mentioned_products(reply, CATALOG)] == ["LN-68"]


def test_partial_words_do_not_match():
    reply = "Nada que ver con QB Maxima ni con Shilajitos."
    assert mentioned_products(reply, CATALOG) == []


async def test_asking_about_a_product_shows_its_card_even_without_recs(client, respx_mock):
    mock_catalog(respx_mock, [make_product(ref="NH-99", name="QB Max", price=None)])
    respx_mock.get(f"{INVENTORY_URL}/availability").mock(
        return_value=httpx.Response(200, json=[{"ref": "NH-99", "status": "low"}])
    )
    mock_anthropic_text(respx_mock, "¡Claro! El QB Max (REF. NH-99) está en nuestro catálogo.")

    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "hay qb max disponible?"}]})

    assert resp.status_code == 200
    [card] = resp.json()["recommendations"]
    assert card["ref"] == "NH-99"
    assert card["availability"] == "low"


async def test_chat_still_answers_when_inventory_is_down(client, respx_mock):
    mock_catalog(respx_mock, [make_product(ref="VW-158")])
    respx_mock.get(f"{INVENTORY_URL}/availability").mock(side_effect=httpx.ConnectError("down"))
    mock_anthropic_text(respx_mock, 'Te sirve esto.\nRECS:[{"ref":"VW-158","nombre":"x","razon":"Ayuda a dormir"}]')

    resp = await client.post("/chat", json={"messages": [{"role": "user", "content": "me cuesta dormir"}]})

    assert resp.status_code == 200
    assert resp.json()["recommendations"][0]["availability"] == "available"
