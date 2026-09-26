# catalog

FastAPI microservice for the Salud Inteligente product catalog: categories, needs, products, prices and descriptions.

## Endpoints

| Method and path | Access | Notes |
| --- | --- | --- |
| `GET /health` | public | `{"status": "ok", "service": "catalog"}` |
| `GET /categories` | public | Categories in catalog order with `product_count` |
| `GET /needs` | public | Needs with `image_url` and `product_count` |
| `GET /products` | public | Filters: `category`, `need`, `q`, `viral`, `trending`, `limit`, `offset`, `include_inactive` |
| `GET /products/by-refs?refs=A,B` | public | Products for the given refs, unknown refs omitted |
| `GET /products/{slug}` | public | Product detail, `404` if missing or inactive |
| `GET /products/{slug}/related` | public | Up to 4 related products (same need, then same category) |
| `PATCH /products/{ref}` | internal | Body any of `price`, `description`, `is_active`, `name`, `benefits` |
| `GET /summary` | internal | `{products, active, unpriced}` |

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://salud:salud@postgres:5432/salud_catalog` | Async SQLAlchemy connection string |
| `INTERNAL_TOKEN` | `change-me` | Shared secret required in `X-Internal-Token` for internal endpoints |

## Seed

On first start, if the `products` table is empty, the service loads `seed/catalog.json` (10 categories, 10 needs, 209 products).

## Updating prices in an existing database

The seed only runs on an empty database, so prices added to `seed/catalog.json` later are not applied automatically. `src/sync_prices.py` copies them into a running installation. It only writes `products.price`; orders, inventory and every other column are left alone.

```bash
# after deploying the new image (git pull + docker compose ... up -d --build)
docker exec salud_catalog python -m src.sync_prices            # dry run, writes nothing
docker exec salud_catalog python -m src.sync_prices --apply    # fill prices that are still empty
```

By default a product whose price in the database differs from the JSON (for example one edited in the admin panel) is reported and left as is. Add `--overwrite` to replace those too. The run is a single transaction and can be repeated safely.

## Running tests

```bash
python -m venv /tmp/venv-catalog
source /tmp/venv-catalog/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
```
