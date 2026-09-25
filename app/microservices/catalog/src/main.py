from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db, init_db
from .descriptions import build_description
from .errors import install_error_handlers
from .models import Category, Need, Product
from .schemas import (
    CategoryOut,
    CategoryRef,
    NeedOut,
    NeedRef,
    ProductListOut,
    ProductOut,
    ProductPatch,
    SummaryOut,
)
from .seed import build_search_text, seed_if_empty
from .security import require_internal
from .text import normalize


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_if_empty()
    yield


app = FastAPI(title="Salud Inteligente - Catalog", lifespan=lifespan)
install_error_handlers(app)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "catalog"}


def need_image_url(slug: str) -> str:
    if slug == "otros":
        return "/media/site/hero.webp"
    return f"/media/site/need-{slug}.webp"


def to_product_out(product: Product) -> ProductOut:
    return ProductOut(
        ref=product.ref,
        slug=product.slug,
        name=product.name,
        category=CategoryRef(slug=product.category.slug, name=product.category.name),
        need=NeedRef(slug=product.need.slug, name=product.need.name),
        type=product.type,
        format=product.format,
        presentation=product.presentation,
        invima=product.invima,
        benefits=product.benefits or [],
        description=product.description or build_description(product.name, product.benefits or []),
        advisor_tags=product.advisor_tags or [],
        image_url=f"/media/products/{product.image}" if product.image else "",
        price=product.price,
        is_viral=product.is_viral,
        is_trending=product.is_trending,
        is_active=product.is_active,
    )


@app.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[CategoryOut]:
    categories = (await db.execute(select(Category).order_by(Category.sort_order))).scalars().all()

    count_rows = (
        await db.execute(
            select(Product.category_slug, func.count(Product.ref))
            .where(Product.is_active.is_(True))
            .group_by(Product.category_slug)
        )
    ).all()
    counts = dict(count_rows)

    return [
        CategoryOut(
            slug=category.slug,
            name=category.name,
            tagline=category.tagline,
            product_count=counts.get(category.slug, 0),
        )
        for category in categories
    ]


@app.get("/needs", response_model=list[NeedOut])
async def list_needs(db: AsyncSession = Depends(get_db)) -> list[NeedOut]:
    needs = (await db.execute(select(Need))).scalars().all()

    count_rows = (
        await db.execute(
            select(Product.need_slug, func.count(Product.ref))
            .where(Product.is_active.is_(True))
            .group_by(Product.need_slug)
        )
    ).all()
    counts = dict(count_rows)

    return [
        NeedOut(
            slug=need.slug,
            name=need.name,
            image_url=need_image_url(need.slug),
            product_count=counts.get(need.slug, 0),
        )
        for need in needs
    ]


@app.get("/products", response_model=ProductListOut)
async def list_products(
    category: str | None = None,
    need: str | None = None,
    q: str | None = None,
    viral: bool | None = None,
    trending: bool | None = None,
    limit: int = Query(default=24, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
) -> ProductListOut:
    stmt = select(Product)

    if not include_inactive:
        stmt = stmt.where(Product.is_active.is_(True))
    if category:
        stmt = stmt.where(Product.category_slug == category)
    if need:
        stmt = stmt.where(Product.need_slug == need)
    if viral is not None:
        stmt = stmt.where(Product.is_viral.is_(viral))
    if trending is not None:
        stmt = stmt.where(Product.is_trending.is_(trending))
    if q:
        stmt = stmt.where(Product.search_text.like(f"%{normalize(q)}%"))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()

    stmt = stmt.order_by(Product.sort_order).limit(limit).offset(offset)
    products = (await db.execute(stmt)).scalars().all()

    return ProductListOut(
        items=[to_product_out(product) for product in products],
        total=total,
        limit=limit,
        offset=offset,
    )


@app.get("/products/by-refs", response_model=list[ProductOut])
async def get_products_by_refs(refs: str, db: AsyncSession = Depends(get_db)) -> list[ProductOut]:
    ref_list = [item.strip() for item in refs.split(",") if item.strip()]
    if not ref_list:
        return []

    products = (await db.execute(select(Product).where(Product.ref.in_(ref_list)))).scalars().all()
    by_ref = {product.ref: product for product in products}
    ordered = [by_ref[ref] for ref in ref_list if ref in by_ref]

    return [to_product_out(product) for product in ordered]


@app.get("/products/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> ProductOut:
    product = (await db.execute(select(Product).where(Product.slug == slug))).scalar_one_or_none()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return to_product_out(product)


@app.get("/products/{slug}/related", response_model=list[ProductOut])
async def get_related_products(slug: str, db: AsyncSession = Depends(get_db)) -> list[ProductOut]:
    product = (await db.execute(select(Product).where(Product.slug == slug))).scalar_one_or_none()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    same_need = (
        await db.execute(
            select(Product)
            .where(
                Product.need_slug == product.need_slug,
                Product.ref != product.ref,
                Product.is_active.is_(True),
            )
            .order_by(Product.sort_order)
        )
    ).scalars().all()

    results = list(same_need)[:4]

    if len(results) < 4:
        excluded_refs = {item.ref for item in results} | {product.ref}
        same_category = (
            await db.execute(
                select(Product)
                .where(
                    Product.category_slug == product.category_slug,
                    Product.ref.notin_(excluded_refs),
                    Product.is_active.is_(True),
                )
                .order_by(Product.sort_order)
            )
        ).scalars().all()
        results += list(same_category)[: 4 - len(results)]

    return [to_product_out(item) for item in results]


@app.patch("/products/{ref}", response_model=ProductOut, dependencies=[Depends(require_internal)])
async def patch_product(
    ref: str, payload: ProductPatch, db: AsyncSession = Depends(get_db)
) -> ProductOut:
    product = await db.get(Product, ref)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    changes = payload.model_dump(exclude_unset=True)

    if "name" in changes:
        product.name = changes["name"]
    if "benefits" in changes:
        product.benefits = changes["benefits"]
    if "description" in changes:
        product.description = changes["description"]
    if "is_active" in changes:
        product.is_active = changes["is_active"]
    if "price" in changes:
        product.price = changes["price"]

    if "name" in changes or "benefits" in changes:
        product.search_text = build_search_text(product.ref, product.name, product.benefits or [])

    await db.commit()
    await db.refresh(product, ["category", "need"])
    return to_product_out(product)


@app.get("/summary", dependencies=[Depends(require_internal)])
async def get_summary(db: AsyncSession = Depends(get_db)) -> SummaryOut:
    total = (await db.execute(select(func.count(Product.ref)))).scalar_one()
    active = (
        await db.execute(select(func.count(Product.ref)).where(Product.is_active.is_(True)))
    ).scalar_one()
    unpriced = (
        await db.execute(select(func.count(Product.ref)).where(Product.price.is_(None)))
    ).scalar_one()

    return SummaryOut(products=total, active=active, unpriced=unpriced)
