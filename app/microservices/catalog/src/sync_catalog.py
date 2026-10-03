"""Apply seed/catalog.json to an existing catalog database (full catalog replacement).

The seed only loads into an empty database. This script brings a running installation in line
with the JSON without deleting anything:

- categories and needs are created or renamed;
- every product in the JSON is created or updated with its data, price, photo and is_active flag;
- products in the database that are not in the JSON are marked inactive (hidden), so order
  history keeps pointing at them and they can be reactivated from the admin.

Usage (inside the catalog container, from /app):
    python -m src.sync_catalog            # dry run: report only, writes nothing
    python -m src.sync_catalog --apply    # write the changes
"""

import argparse
import asyncio
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select

from .database import AsyncSessionLocal
from .models import Category, Need, Product
from .seed import SEED_FILE, product_fields


@dataclass
class CatalogSyncReport:
    categories_created: list[str] = field(default_factory=list)
    needs_created: list[str] = field(default_factory=list)
    created: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    price_changes: list[tuple[str, int | None, int | None]] = field(default_factory=list)
    activated: list[str] = field(default_factory=list)
    deactivated: list[str] = field(default_factory=list)
    unchanged: int = 0

    @property
    def changes(self) -> int:
        return len(self.categories_created) + len(self.needs_created) + len(self.created) + len(self.updated) + len(self.deactivated)


async def sync_catalog(apply: bool = False, path: Path = SEED_FILE) -> CatalogSyncReport:
    data = json.loads(path.read_text(encoding="utf-8"))
    report = CatalogSyncReport()

    async with AsyncSessionLocal() as session:
        categories = {c.slug: c for c in (await session.execute(select(Category))).scalars()}
        for item in data["categories"]:
            category = categories.get(item["slug"])
            if category is None:
                session.add(Category(slug=item["slug"], name=item["name"], tagline=item.get("tagline"), sort_order=item.get("sort_order", 0)))
                report.categories_created.append(item["slug"])
            else:
                category.name, category.tagline, category.sort_order = item["name"], item.get("tagline"), item.get("sort_order", 0)

        needs = {n.slug: n for n in (await session.execute(select(Need))).scalars()}
        for item in data["needs"]:
            if item["slug"] not in needs:
                session.add(Need(slug=item["slug"], name=item["name"]))
                report.needs_created.append(item["slug"])
            else:
                needs[item["slug"]].name = item["name"]

        await session.flush()

        products = {p.ref: p for p in (await session.execute(select(Product))).scalars()}
        seen = set()
        for item in data["products"]:
            ref = item["ref"]
            seen.add(ref)
            values = product_fields(item)
            product = products.get(ref)
            if product is None:
                session.add(Product(ref=ref, **values))
                report.created.append(ref)
                continue
            changed = {k: v for k, v in values.items() if getattr(product, k) != v}
            if not changed:
                report.unchanged += 1
                continue
            if "price" in changed:
                report.price_changes.append((ref, product.price, values["price"]))
            if changed.get("is_active") is True:
                report.activated.append(ref)
            if changed.get("is_active") is False:
                report.deactivated.append(ref)
            for k, v in changed.items():
                setattr(product, k, v)
            report.updated.append(ref)

        for ref, product in products.items():
            if ref not in seen and product.is_active:
                product.is_active = False
                report.deactivated.append(ref)
                report.updated.append(ref)

        if apply and report.changes:
            await session.commit()
        else:
            await session.rollback()

    return report


def print_report(report: CatalogSyncReport, apply: bool) -> None:
    mode = "APLICADO" if apply else "SIMULACRO (no se escribió nada; usa --apply)"
    print(f"Sincronización del catálogo desde {SEED_FILE.name}: {mode}\n")
    print(f"  Categorías nuevas:           {len(report.categories_created)} {report.categories_created}")
    print(f"  Necesidades nuevas:          {len(report.needs_created)} {report.needs_created}")
    print(f"  Productos nuevos:            {len(report.created)}")
    print(f"  Productos actualizados:      {len(report.updated)}")
    print(f"    con cambio de precio:      {len(report.price_changes)}")
    print(f"    reactivados:               {len(report.activated)}")
    print(f"    ocultos (inactivos):       {len(report.deactivated)}")
    print(f"  Sin cambios:                 {report.unchanged}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Aplica seed/catalog.json a la base del catálogo (reemplazo completo).")
    parser.add_argument("--apply", action="store_true", help="escribe los cambios (sin esto solo se reporta)")
    args = parser.parse_args(argv)
    report = asyncio.run(sync_catalog(apply=args.apply))
    print_report(report, apply=args.apply)
    return 0


if __name__ == "__main__":
    sys.exit(main())
