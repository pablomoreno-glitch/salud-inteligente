import importlib
import sqlite3

from httpx import ASGITransport, AsyncClient

from .conftest import SEED, TEST_INTERNAL_TOKEN, _reset_app_modules

AUTH = {"X-Internal-Token": TEST_INTERNAL_TOKEN}
SUPPLIERS = {p["ref"]: p.get("supplier") for p in SEED["products"]}


async def test_admin_products_show_the_catalog_supplier(client):
    items = (await client.get("/admin/products", headers=AUTH)).json()["items"]

    assert {item["ref"]: item["supplier"] for item in items} == SUPPLIERS
    assert {item["supplier"] for item in items if item["is_active"]} == {"Greenlab", "Naturpro", "El Oasis"}


async def test_supplier_is_never_public(client):
    item = (await client.get("/products", params={"limit": 1})).json()["items"][0]
    assert "supplier" not in item


async def test_existing_database_gets_the_supplier_without_losing_admin_edits(tmp_path, monkeypatch):
    db_path = tmp_path / "old.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")
    monkeypatch.setenv("INTERNAL_TOKEN", TEST_INTERNAL_TOKEN)
    ref = next(ref for ref, supplier in SUPPLIERS.items() if supplier)

    # A database from before the supplier column, with a price edited in the admin panel.
    _reset_app_modules()
    main = importlib.import_module("src.main")
    async with main.app.router.lifespan_context(main.app):
        pass
    with sqlite3.connect(db_path) as conn:
        conn.execute("ALTER TABLE products DROP COLUMN supplier")
        conn.execute("UPDATE products SET price = 12345 WHERE ref = ?", (ref,))

    _reset_app_modules()
    main = importlib.import_module("src.main")
    async with main.app.router.lifespan_context(main.app):
        async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
            items = (await client.get("/admin/products", headers=AUTH)).json()["items"]
    _reset_app_modules()

    product = next(item for item in items if item["ref"] == ref)
    assert product["supplier"] == SUPPLIERS[ref]
    assert product["price"] == 12345
