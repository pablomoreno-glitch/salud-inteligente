# inventory

FastAPI microservice that tracks stock only for the products the admin chooses to track, and keeps public availability honest.

## Endpoints

| Method and path | Access | Notes |
| --- | --- | --- |
| `GET /health` | public | `{"status": "ok", "service": "inventory"}` |
| `GET /availability?refs=A,B` | public | `[{ref, status}]`; untracked refs are `available` |
| `GET /stock?status=&q=&limit=&offset=` | internal | `{items, total}`; `status` accepts `low`, `out`, `untracked` |
| `PATCH /stock/{ref}` | internal | `{quantity: int >= 0 \| null, low_stock_threshold?: int >= 0}` |
| `POST /stock/reserve` | internal | All-or-nothing; `409 {"error", "refs": [...]}` when insufficient |
| `POST /stock/release` | internal | `{order_code}`, idempotent |
| `GET /movements?ref=` | internal | Latest 100 movements |
| `GET /summary` | internal | `{tracked, untracked, low, out}` |

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://salud:salud@postgres:5432/salud_inventory` | Async SQLAlchemy connection string |
| `INTERNAL_TOKEN` | `change-me` | Shared secret required in `X-Internal-Token` |
| `DEFAULT_LOW_STOCK_THRESHOLD` | `5` | Threshold used the first time a ref is tracked |

## Rules

- A ref without a stock row, or with `quantity = null`, is untracked and always reports `available`.
- `status` is `out` when `quantity == 0`, `low` when `quantity <= low_stock_threshold`, otherwise `available`.
- `POST /stock/reserve` decrements every tracked line or none of them; untracked refs are never decremented.
- `POST /stock/release` is idempotent: releasing the same `order_code` twice only restores stock once.

## Running tests

```bash
python -m venv /tmp/venv-inventory
source /tmp/venv-inventory/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
```
