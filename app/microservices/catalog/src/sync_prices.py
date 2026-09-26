"""Copy product prices from seed/catalog.json into an existing catalog database.

The seed is only loaded into an empty database (see seed.seed_if_empty), so prices
added to the JSON later never reach a running installation. This script closes that
gap without re-seeding: it only writes `products.price`, and by default only where
the database has no price yet.

Usage (inside the catalog container, from /app):
    python -m src.sync_prices              # dry run: report only, writes nothing
    python -m src.sync_prices --apply      # fill prices that are still empty
    python -m src.sync_prices --apply --overwrite
                                           # also replace prices that differ
                                           # (e.g. ones edited in the admin panel)
"""

import argparse
import asyncio
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select

from .database import AsyncSessionLocal
from .models import Product
from .seed import SEED_FILE


@dataclass
class SyncReport:
    filled: list[tuple[str, int]] = field(default_factory=list)  # (ref, new price) where DB had none
    replaced: list[tuple[str, int, int]] = field(default_factory=list)  # (ref, old, new) with --overwrite
    conflicts: list[tuple[str, int, int]] = field(default_factory=list)  # (ref, db, seed) left untouched
    unchanged: int = 0
    missing: list[str] = field(default_factory=list)  # refs in the seed but not in the database

    @property
    def changes(self) -> int:
        return len(self.filled) + len(self.replaced)


def load_seed_prices(path: Path = SEED_FILE) -> dict[str, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {p["ref"]: int(p["price"]) for p in data["products"] if p.get("price") is not None}


async def sync_prices(apply: bool = False, overwrite: bool = False, path: Path = SEED_FILE) -> SyncReport:
    seed_prices = load_seed_prices(path)
    report = SyncReport()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Product).where(Product.ref.in_(seed_prices)))
        products = {p.ref: p for p in result.scalars()}

        for ref, new_price in seed_prices.items():
            product = products.get(ref)
            if product is None:
                report.missing.append(ref)
            elif product.price == new_price:
                report.unchanged += 1
            elif product.price is None:
                report.filled.append((ref, new_price))
                product.price = new_price
            elif overwrite:
                report.replaced.append((ref, product.price, new_price))
                product.price = new_price
            else:
                report.conflicts.append((ref, product.price, new_price))

        if apply and report.changes:
            await session.commit()
        else:
            await session.rollback()

    return report


def cop(value: int) -> str:
    return f"${value:,}".replace(",", ".")


def print_report(report: SyncReport, apply: bool, overwrite: bool) -> None:
    mode = "APLICADO" if apply else "SIMULACRO (no se escribió nada; usa --apply)"
    print(f"Sincronización de precios desde {SEED_FILE.name}: {mode}\n")
    print(f"  Precios nuevos (la base no tenía precio): {len(report.filled)}")
    if overwrite:
        print(f"  Precios reemplazados (--overwrite):       {len(report.replaced)}")
    else:
        print(f"  Distintos en la base, sin tocar:          {len(report.conflicts)}")
    print(f"  Ya coincidían:                            {report.unchanged}")
    print(f"  Refs del JSON que no están en la base:    {len(report.missing)}")

    for ref, old, new in report.replaced:
        print(f"    reemplazado {ref}: {cop(old)} -> {cop(new)}")
    for ref, db, seed in report.conflicts:
        print(f"    sin tocar   {ref}: base {cop(db)} / JSON {cop(seed)}")
    for ref in report.missing:
        print(f"    no existe   {ref}")
    if report.conflicts:
        print("\n  Los precios 'sin tocar' pueden venir del panel de administración."
              " Usa --overwrite solo si quieres reemplazarlos por los del JSON.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Copia los precios de seed/catalog.json a la base del catálogo.")
    parser.add_argument("--apply", action="store_true", help="escribe los cambios (sin esto solo se reporta)")
    parser.add_argument("--overwrite", action="store_true", help="reemplaza también precios distintos ya guardados")
    args = parser.parse_args(argv)

    report = asyncio.run(sync_prices(apply=args.apply, overwrite=args.overwrite))
    print_report(report, apply=args.apply, overwrite=args.overwrite)
    return 0


if __name__ == "__main__":
    sys.exit(main())
