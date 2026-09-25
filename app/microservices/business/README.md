# business

FastAPI microservice for the "Salud Inteligente" business profile: contact channels, services, media and incoming contact messages.

## Endpoints

| Method and path | Access | Notes |
| --- | --- | --- |
| `GET /health` | public | `{"status": "ok", "service": "business"}` |
| `GET /business` | public | `{profile, contacts, services, media}` |
| `GET /contacts` | public | Unset contact channels are `null` |
| `GET /services` | public | `[{id, title, description, icon}]` |
| `GET /media?kind=` | public | Kinds: `hero`, `need`, `gallery` |
| `POST /contact-messages` | public | Requires `name`, `message`, and phone or email |
| `GET /contact-messages?status=` | internal | `{items, total}`, newest first |
| `PATCH /contact-messages/{id}` | internal | `{status: new\|read\|archived}` |
| `PATCH /profile` | internal | Any profile or contact field |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Async SQLAlchemy connection string |
| `INTERNAL_TOKEN` | Shared secret required in `X-Internal-Token` for internal endpoints |
| `BUSINESS_WHATSAPP`, `BUSINESS_PHONE`, `BUSINESS_EMAIL`, `BUSINESS_ADDRESS`, `BUSINESS_CITY`, `BUSINESS_HOURS`, `BUSINESS_INSTAGRAM`, `BUSINESS_FACEBOOK` | Seed contact channels only while the stored value is still `null`; nothing is invented |

## Seed

On first start the service creates the profile row, 4 services and 11 media entries (hero, nosotros, one per need with an image). On every start, any contact field that is still `null` gets filled from its environment variable, so admin edits via `PATCH /profile` survive restarts.

## Running tests

```bash
python -m venv /tmp/venv-business
source /tmp/venv-business/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
```
