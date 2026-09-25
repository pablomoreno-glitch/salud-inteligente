# orders

FastAPI microservice for carts, checkout, order lifecycle, tracking and sales metrics.
Part of the `salud-inteligente` microservices platform (design section 4.4).

## Run locally

```
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
DATABASE_URL=sqlite+aiosqlite:///./orders.db .venv/bin/uvicorn src.main:app --reload --port 9204
```

## Test

```
.venv/bin/python -m pytest -q
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://salud:salud@postgres:5432/salud_orders` | Async SQLAlchemy connection string |
| `INTERNAL_TOKEN` | `local-internal-token` | Shared secret required on internal endpoints and sent to upstream services |
| `CATALOG_URL` | `http://catalog:9202` | Catalog service base URL |
| `INVENTORY_URL` | `http://inventory:9203` | Inventory service base URL |
| `BUSINESS_URL` | `http://business:9201` | Business service base URL |

## Endpoints

See `openspec/changes/microservices-platform/design.md` section 4.4 for the full contract:
carts (`POST /carts`, `GET /carts/{token}`, `PUT`/`DELETE /carts/{token}/items/...`), checkout (`POST /orders`),
public tracking (`GET /orders/track/{code}`), and internal admin endpoints
(`GET /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/status`, `GET /metrics`).
