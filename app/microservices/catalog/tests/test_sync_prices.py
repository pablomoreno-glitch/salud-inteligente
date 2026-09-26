import importlib

from sqlalchemy import select

from .conftest import SEED, SEED_PRICED

PRICED_REFS = [p["ref"] for p in SEED["products"] if p.get("price") is not None]


async def _db():
    database = importlib.import_module("src.database")
    models = importlib.import_module("src.models")
    return database.AsyncSessionLocal, models.Product


async def _set_prices(changes: dict[str, int | None]) -> None:
    session_factory, Product = await _db()
    async with session_factory() as session:
        for ref, price in changes.items():
            product = (await session.execute(select(Product).where(Product.ref == ref))).scalar_one()
            product.price = price
            product.description = f"editado {ref}"
        await session.commit()


async def _get(ref: str):
    session_factory, Product = await _db()
    async with session_factory() as session:
        return (await session.execute(select(Product).where(Product.ref == ref))).scalar_one()


async def test_fresh_seed_is_already_in_sync(client):
    sync = importlib.import_module("src.sync_prices")
    report = await sync.sync_prices(apply=True)
    assert report.unchanged == SEED_PRICED
    assert report.changes == 0 and not report.conflicts and not report.missing


async def test_dry_run_writes_nothing(client):
    empty, edited = PRICED_REFS[0], PRICED_REFS[1]
    await _set_prices({empty: None, edited: 999000})

    sync = importlib.import_module("src.sync_prices")
    report = await sync.sync_prices()
    assert [r for r, _ in report.filled] == [empty]
    assert [r for r, _, _ in report.conflicts] == [edited]

    assert (await _get(empty)).price is None
    assert (await _get(edited)).price == 999000


async def test_apply_fills_empty_prices_and_keeps_admin_edits(client):
    empty, edited = PRICED_REFS[0], PRICED_REFS[1]
    seed_price = {p["ref"]: p["price"] for p in SEED["products"] if p.get("price") is not None}
    await _set_prices({empty: None, edited: 999000})

    sync = importlib.import_module("src.sync_prices")
    report = await sync.sync_prices(apply=True)
    assert [r for r, _ in report.filled] == [empty]
    assert [r for r, _, _ in report.conflicts] == [edited]

    filled = await _get(empty)
    assert filled.price == seed_price[empty]
    assert filled.description == f"editado {empty}"  # other columns are not touched
    assert (await _get(edited)).price == 999000


async def test_overwrite_replaces_different_prices(client):
    edited = PRICED_REFS[1]
    seed_price = {p["ref"]: p["price"] for p in SEED["products"] if p.get("price") is not None}
    await _set_prices({edited: 999000})

    sync = importlib.import_module("src.sync_prices")
    report = await sync.sync_prices(apply=True, overwrite=True)
    assert report.replaced == [(edited, 999000, seed_price[edited])]
    assert (await _get(edited)).price == seed_price[edited]
