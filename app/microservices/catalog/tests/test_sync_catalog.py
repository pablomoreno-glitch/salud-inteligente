import importlib

from sqlalchemy import select

from .conftest import SEED

ACTIVE_REF = next(p["ref"] for p in SEED["products"] if p.get("is_active", True) and p.get("price"))
INACTIVE_REF = next(p["ref"] for p in SEED["products"] if not p.get("is_active", True))


async def _session():
    database = importlib.import_module("src.database")
    models = importlib.import_module("src.models")
    return database.AsyncSessionLocal, models


async def _get(ref):
    session_factory, models = await _session()
    async with session_factory() as session:
        return (await session.execute(select(models.Product).where(models.Product.ref == ref))).scalar_one_or_none()


async def _drift_database():
    """Simulate a database that diverged from the JSON: a stray product, an edited price, wrong flags."""
    session_factory, models = await _session()
    async with session_factory() as session:
        template = (await session.execute(select(models.Product).where(models.Product.ref == ACTIVE_REF))).scalar_one()
        session.add(models.Product(
            ref="XX-999", slug="producto-viejo-xx-999", name="Producto viejo", category_slug=template.category_slug,
            need_slug=template.need_slug, benefits=[], advisor_tags=[], price=1000, is_active=True, search_text="viejo",
        ))
        template.price = 1
        template.is_active = False
        (await session.execute(select(models.Product).where(models.Product.ref == INACTIVE_REF))).scalar_one().is_active = True
        await session.commit()


async def test_fresh_seed_is_in_sync(client):
    sync = importlib.import_module("src.sync_catalog")
    report = await sync.sync_catalog()
    assert report.changes == 0
    assert report.unchanged == len(SEED["products"])


async def test_dry_run_writes_nothing(client):
    await _drift_database()
    sync = importlib.import_module("src.sync_catalog")
    report = await sync.sync_catalog()
    assert "XX-999" in report.deactivated
    assert (await _get("XX-999")).is_active is True
    assert (await _get(ACTIVE_REF)).price == 1


async def test_apply_matches_the_json_and_hides_unknown_products(client):
    await _drift_database()
    sync = importlib.import_module("src.sync_catalog")
    report = await sync.sync_catalog(apply=True)

    seed_price = next(p["price"] for p in SEED["products"] if p["ref"] == ACTIVE_REF)
    assert (ACTIVE_REF, 1, seed_price) in report.price_changes
    assert ACTIVE_REF in report.activated
    assert set(report.deactivated) == {"XX-999", INACTIVE_REF}

    stray = await _get("XX-999")
    assert stray is not None and stray.is_active is False  # hidden, never deleted
    assert (await _get(ACTIVE_REF)).price == seed_price
    assert (await _get(ACTIVE_REF)).is_active is True
    assert (await _get(INACTIVE_REF)).is_active is False

    again = await sync.sync_catalog(apply=True)
    assert again.changes == 0
