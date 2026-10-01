import json
from pathlib import Path

from sqlalchemy import func, select

from .database import AsyncSessionLocal
from .models import Category, Need, PricingSettings, Product
from .pricing import DEFAULT_MARGIN_PERCENT, sale_price
from .text import normalize

SEED_FILE = Path(__file__).resolve().parent.parent / "seed" / "catalog.json"


def build_search_text(ref: str, name: str, benefits: list[str]) -> str:
    parts = [ref, name, *benefits]
    return normalize(" ".join(parts))


async def seed_if_empty() -> None:
    async with AsyncSessionLocal() as session:
        total = (await session.execute(select(func.count(Product.ref)))).scalar_one()
        if total > 0:
            return

        data = json.loads(SEED_FILE.read_text(encoding="utf-8"))

        for item in data["categories"]:
            session.add(
                Category(
                    slug=item["slug"],
                    name=item["name"],
                    tagline=item.get("tagline"),
                    sort_order=item.get("sort_order", 0),
                )
            )

        margin = data.get("pricing", {}).get("margin_percent", DEFAULT_MARGIN_PERCENT)
        session.add(PricingSettings(id=1, margin_percent=margin))

        for item in data["needs"]:
            session.add(Need(slug=item["slug"], name=item["name"]))

        await session.flush()

        for item in data["products"]:
            benefits = item.get("benefits", [])
            session.add(
                Product(
                    ref=item["ref"],
                    slug=item["slug"],
                    name=item["name"],
                    category_slug=item["category"],
                    need_slug=item["need"],
                    type=item.get("type"),
                    format=item.get("format"),
                    presentation=item.get("presentation"),
                    invima=item.get("invima"),
                    benefits=benefits,
                    advisor_tags=item.get("advisor_tags", []),
                    image=item.get("image"),
                    description=None,
                    # With a supplier cost, the price is always cost + margin.
                    price=sale_price(item.get("cost_price"), margin) or item.get("price"),
                    brand=item.get("brand"),
                    cost_price=item.get("cost_price"),
                    supplier_store_price=item.get("supplier_store_price"),
                    market_price=item.get("market_price"),
                    market_source=item.get("market_source"),
                    has_photo=item.get("has_photo", True),
                    is_viral=item.get("is_viral", False),
                    is_trending=item.get("is_trending", False),
                    is_active=True,
                    sort_order=item.get("sort_order", 0),
                    search_text=build_search_text(item["ref"], item["name"], benefits),
                )
            )

        await session.commit()
