# Design: microservices-platform

## 1. Architecture

The system follows the laVillaSB layering: presentation, gateway, domain services, infrastructure.

```
Browser
  |
  |  https://saludinteligente.lat            (React SPA, Netlify CDN in production, nginx locally)
  |  /api/*  --- same-origin proxy --->       Laravel 12 gateway  (the only public API entry point)
  |                                                |
  |                  +-------------+-------------+-+------------+-------------+
  |                  |             |             |              |             |
  |               business      catalog      inventory       orders        advisor      (FastAPI, Python 3.12)
  |                  |             |             |              |             |
  |                  +-------------+------+------+--------------+-------------+
  |                                       |
  |                               PostgreSQL 16 (one database per service)
  |                                                                            advisor ---> Anthropic Messages API
```

| Layer | Component | Port (local) | Responsibility |
| --- | --- | --- | --- |
| Presentation | `app/frontend` (React 18, Vite, TypeScript, Tailwind, React Router, TanStack Query) | 3200 | Storefront, advisor drawer, `/api` developer page, `/admin` panel |
| Gateway | `app/backend/gateway` (Laravel 12, PHP 8.3, Sanctum) | 8110 | Route allowlist, admin auth, rate limits, CORS, aggregation for the admin dashboard and health |
| Domain | `app/microservices/business` | 9201 | Business profile, contact channels, services, media, contact messages |
| Domain | `app/microservices/catalog` | 9202 | Categories, needs, products, prices, descriptions |
| Domain | `app/microservices/inventory` | 9203 | Stock levels, availability, reservations, movements |
| Domain | `app/microservices/orders` | 9204 | Carts, checkout, orders, order status, sales metrics |
| Domain | `app/microservices/advisor` | 9205 | AI advisor over Claude, recommendation parsing, advisor stats |
| Infrastructure | PostgreSQL 16 | 5632 (host) | Databases `salud_gateway`, `salud_business`, `salud_catalog`, `salud_inventory`, `salud_orders`, `salud_advisor` |

Ports are chosen to avoid the laVillaSB and radioSanyo stacks that run on the same machine.

### Decisions

1. **Gateway is the only public entry.**
   Services listen on the internal Docker network.
   Every route is an explicit allowlist entry in `routes/api.php`; there is no catch-all public proxy.
2. **Database per service, one Postgres instance.**
   Each service owns its schema and never reads another service's tables.
   Cross-service data travels over REST.
   One instance keeps the MVP cheap on a single VPS; splitting instances later needs no code change.
3. **No message broker in the MVP.**
   The few cross-service writes (reserve stock on checkout, release on cancel) are synchronous REST calls with compensation.
   laVillaSB's RabbitMQ is deferred until an asynchronous workflow exists.
4. **Internal token.**
   The gateway sends `X-Internal-Token: $INTERNAL_TOKEN` on every service call.
   Service endpoints marked "internal" below reject requests without it (`401 {"error": "..."}`), as defense in depth behind the network boundary.
5. **Static media on the CDN.**
   Product images (209 WebP files extracted from the legacy base64) and site imagery live in `app/frontend/public/media/`.
   The API returns relative URLs (`/media/products/<slug>.webp`), so the same data works locally and on Netlify.
6. **Prices are optional.**
   The legacy catalog has no prices.
   `price` is `null` until the admin sets it; the storefront shows "Precio por confirmar", carts and orders carry `has_unpriced`, and revenue KPIs only count priced lines.
7. **Stock is optional per product.**
   `quantity = null` means "not tracked" and the product is sold as available.
   Once the admin sets a quantity, the product is tracked, reserved on checkout and shown as `available`, `low` or `out`.
   The storefront never shows exact counts.
8. **Advisor reads the live catalog.**
   The advisor builds its context from `catalog` (cached 10 minutes) instead of a hard-coded string, removing the duplicated catalog.
   It returns structured recommendations, validated against real refs, so the storefront renders product cards.
9. **Same-origin API.**
   The SPA always calls `/api/...`.
   Locally nginx proxies `/api` to the gateway; on Netlify a 200 rewrite proxies `/api/*` to `https://api.saludinteligente.lat/api/:splat`.
   No CORS is needed in the browser in either environment; the gateway still configures CORS for direct API consumers.

## 2. Sequence: advisor chat

```
Browser            Gateway (Laravel)          advisor (FastAPI)        catalog (FastAPI)       Anthropic
   | POST /api/v1/advisor/chat  |                       |                        |                   |
   |--------------------------->| throttle 15/min       |                        |                   |
   |                            | POST /chat + token    |                        |                   |
   |                            |---------------------->| (cache miss)           |                   |
   |                            |                       | GET /products?limit=1000                   |
   |                            |                       |----------------------->|                   |
   |                            |                       |<-----------------------|                   |
   |                            |                       | POST /v1/messages (system = rules + catalog)|
   |                            |                       |------------------------------------------->|
   |                            |                       |<-------------------------------------------|
   |                            |                       | parse RECS, validate refs, enrich, log event|
   |                            |<----------------------| {reply, recommendations[]}                 |
   |<---------------------------|                       |                        |                   |
```

## 3. Sequence: checkout

```
Browser         Gateway            orders                 catalog            inventory           business
  | POST /api/v1/orders  |           |                       |                   |                   |
  |--------------------->|---------->| load cart             |                   |                   |
  |                      |           | GET /products/by-refs |                   |                   |
  |                      |           |---------------------->| (snapshot names, prices, images)      |
  |                      |           | POST /stock/reserve   |                   |                   |
  |                      |           |------------------------------------------>| 409 if not enough |
  |                      |           | insert order, clear cart                  |                   |
  |                      |           | GET /contacts (whatsapp number)                               |
  |                      |           |-------------------------------------------------------------->|
  |<---------------------|<----------| 201 {order, whatsapp_url}                 |                   |
```

If the insert fails after a successful reservation, `orders` calls `POST /stock/release` with the same order code (compensation).

## 4. Service contracts

All bodies are JSON.
Errors from every service and the gateway use `{"error": "<mensaje en español>"}` (FastAPI `detail` is mapped to `error`).
Timestamps are ISO 8601 UTC.
Money is integer Colombian pesos (`*_cop` or `price`).
Every service exposes `GET /health -> {"status": "ok", "service": "<name>"}` and OpenAPI docs at `/docs`.

### 4.1 catalog (9202)

Product object:

```json
{
  "ref": "VW-158",
  "slug": "magnesium-complex-8-en-1-vw-158",
  "name": "Magnesium Complex 8 en 1",
  "category": {"slug": "virales", "name": "Productos Virales"},
  "need": {"slug": "sueno", "name": "Sueño, estrés y ansiedad"},
  "type": "Greensofg",
  "format": "100 cáps",
  "presentation": "100 cáps",
  "invima": "NSA-2040-2025",
  "benefits": ["Reduce el estrés y mejora el sueño", "..."],
  "description": "Text written by the admin, or a sentence built from the benefits when empty",
  "advisor_tags": ["Sueño/Estrés/Ansiedad"],
  "image_url": "/media/products/magnesium-complex-8-en-1-vw-158.webp",
  "price": null,
  "is_viral": true,
  "is_trending": false,
  "is_active": true
}
```

| Method and path | Access | Notes |
| --- | --- | --- |
| `GET /categories` | public | `[{slug, name, tagline, product_count}]` in catalog order |
| `GET /needs` | public | `[{slug, name, image_url, product_count}]`; `image_url` is `/media/site/need-<slug>.webp` |
| `GET /products` | public | Query: `category`, `need`, `q` (name, ref, benefits, accent-insensitive), `viral`, `trending`, `limit` (default 24, max 1000), `offset`, `include_inactive` (internal only). Returns `{items, total, limit, offset}` ordered by `sort_order` |
| `GET /products/by-refs?refs=A,B` | public | `[product]` for the given refs, unknown refs omitted |
| `GET /products/{slug}` | public | Product object, `404` if missing or inactive |
| `GET /products/{slug}/related` | public | Up to 4 active products with the same need, then same category |
| `PATCH /products/{ref}` | internal | Body any of `{price, description, is_active, name, benefits}`; `price` must be `null` or a positive integer |
| `GET /summary` | internal | `{products, active, unpriced}` |

Seed: on first start the service loads `seed/catalog.json` (categories, needs, 209 products) when the products table is empty.

### 4.2 business (9201)

| Method and path | Access | Notes |
| --- | --- | --- |
| `GET /business` | public | `{profile, contacts, services, media}` |
| `GET /contacts` | public | `{whatsapp, phone, email, address, city, hours, instagram, facebook}`; unset values are `null` |
| `GET /services` | public | `[{id, title, description, icon}]` |
| `GET /media?kind=` | public | `[{id, kind, title, url, alt}]`, kinds `hero`, `need`, `gallery` |
| `POST /contact-messages` | public | `{name, phone?, email?, message}`; at least one of phone or email; returns `201` |
| `GET /contact-messages?status=` | internal | `{items, total}` newest first |
| `PATCH /contact-messages/{id}` | internal | `{status: new|read|archived}` |
| `PATCH /profile` | internal | Any profile or contact field |

`profile` is `{name, tagline, description}`.
Contact channels are seeded from environment variables (`BUSINESS_WHATSAPP`, `BUSINESS_EMAIL`, ...) and stay `null` when unset; nothing is invented.

### 4.3 inventory (9203)

| Method and path | Access | Notes |
| --- | --- | --- |
| `GET /availability?refs=A,B` | public | `[{ref, status}]`, `status` in `available`, `low`, `out`; untracked refs are `available` |
| `GET /stock?status=&q=&limit=&offset=` | internal | `{items: [{ref, quantity, low_stock_threshold, status, tracked, updated_at}], total}`; `status` filter accepts `low`, `out`, `untracked` |
| `PATCH /stock/{ref}` | internal | `{quantity: int >= 0 | null, low_stock_threshold?: int >= 0}`; records a movement |
| `POST /stock/reserve` | internal | `{order_code, items: [{ref, quantity}]}`; all-or-nothing; `409 {"error", "refs": [...]}` when a tracked ref lacks stock |
| `POST /stock/release` | internal | `{order_code}`; restores what that order reserved; idempotent |
| `GET /movements?ref=` | internal | Latest 100 movements |
| `GET /summary` | internal | `{tracked, untracked, low, out}` |

Rows are created lazily: a ref without a row is untracked.
`status` is `out` when `quantity == 0`, `low` when `quantity <= low_stock_threshold` (default 5), else `available`.

### 4.4 orders (9204)

Cart view:

```json
{
  "token": "uuid",
  "items": [{"ref": "VW-158", "slug": "...", "name": "...", "image_url": "...", "price": 45000, "quantity": 2, "line_total": 90000, "source": "advisor"}],
  "item_count": 2,
  "subtotal": 90000,
  "has_unpriced": false
}
```

| Method and path | Access | Notes |
| --- | --- | --- |
| `POST /carts` | public | Creates an empty cart, returns the cart view (`201`) |
| `GET /carts/{token}` | public | Cart view enriched from catalog; `404` for unknown tokens |
| `PUT /carts/{token}/items/{ref}` | public | `{quantity: 0..99, source?: "catalog"|"advisor"}`; `0` removes; unknown ref `404` |
| `DELETE /carts/{token}/items/{ref}` | public | Removes one line |
| `DELETE /carts/{token}/items` | public | Empties the cart |
| `POST /orders` | public | `{cart_token, customer_name, customer_phone, customer_city, notes?}`; `422` empty cart, `409` stock; returns `201 {order, whatsapp_url}` |
| `GET /orders/track/{code}?phone=` | public | Order when the phone matches, else `404` |
| `GET /orders?status=&q=&limit=&offset=` | internal | `{items, total}` newest first |
| `GET /orders/{id}` | internal | Order with items and status history |
| `PATCH /orders/{id}/status` | internal | `{status}`; transitions `pending -> confirmed -> shipped -> delivered`, any non-final state `-> cancelled`; cancelling releases stock |
| `GET /metrics?days=30` | internal | See below |

Order object: `{id, code, status, customer_name, customer_phone, customer_city, notes, items: [{ref, slug, name, image_url, unit_price, quantity, line_total, source}], total, has_unpriced, created_at, updated_at, history: [{from_status, to_status, at}]}`.
Codes look like `SI-000123`.
`whatsapp_url` is `https://wa.me/<digits>?text=<order summary>` when the business WhatsApp is configured, else `null`.

Metrics:

```json
{
  "range_days": 30,
  "orders_total": 12,
  "orders_in_range": 9,
  "by_status": {"pending": 2, "confirmed": 3, "shipped": 1, "delivered": 2, "cancelled": 1},
  "revenue": 540000,
  "avg_order_value": 90000,
  "units_sold": 21,
  "cancellation_rate": 0.11,
  "advisor_share": 0.44,
  "daily": [{"date": "2026-09-25", "orders": 3, "revenue": 180000}],
  "top_products": [{"ref": "VW-158", "name": "...", "units": 6, "revenue": 270000}]
}
```

Revenue counts orders in `confirmed`, `shipped` or `delivered` within the range, priced lines only.
`advisor_share` is the fraction of orders in range with at least one line whose `source` is `advisor`.
`daily` covers every day of the range, including zero days.

### 4.5 advisor (9205)

| Method and path | Access | Notes |
| --- | --- | --- |
| `POST /chat` | public | `{messages: [{role, content}]}`; validation and history rules from `docs/spec.md` section 3 (last 20 messages, first must be `user`); returns `{reply, recommendations: [{ref, slug, name, reason, image_url, price}], model}` |
| `GET /stats?days=30` | internal | `{conversations, recommendations, top_recommended: [{ref, name, count}]}` |

Errors keep the legacy contract: `400` invalid body, `500` missing `ANTHROPIC_API_KEY` (generic message), `502` upstream failure (logged without the key).
The model is `CLAUDE_MODEL` (default `claude-sonnet-5`), `max_tokens` 1024, `anthropic-version: 2023-06-01`.
The system prompt keeps every rule of `docs/spec.md` section 4 and the `RECS:[...]` convention; the service strips the block from `reply`, keeps at most 4 recommendations and drops refs that do not exist.

## 5. Gateway routes (Laravel, prefix `/api`)

Public:

| Route | Upstream | Limit |
| --- | --- | --- |
| `GET /v1/health` | all services `/health`, aggregated `{status, services: {name: {status, latency_ms}}}` | none |
| `GET /v1/business`, `/v1/business/contacts`, `/v1/business/services`, `/v1/business/media` | business | 120/min |
| `POST /v1/business/contact-messages` | business | 5/min |
| `GET /v1/catalog/categories`, `/v1/catalog/needs`, `/v1/catalog/products`, `/v1/catalog/products/{slug}`, `/v1/catalog/products/{slug}/related` | catalog | 120/min |
| `GET /v1/inventory/availability` | inventory | 120/min |
| `POST /v1/cart`, `GET /v1/cart/{token}`, `PUT` and `DELETE /v1/cart/{token}/items/{ref}`, `DELETE /v1/cart/{token}/items` | orders `/carts/...` | 60/min |
| `POST /v1/orders` | orders | 10/min |
| `GET /v1/orders/track/{code}` | orders | 30/min |
| `POST /v1/advisor/chat` | advisor | 15/min |

The public catalog list never forwards `include_inactive`.

Admin (Sanctum bearer token with ability `admin`, user `is_admin`):

| Route | Upstream |
| --- | --- |
| `POST /admin/login` (5/min), `GET /admin/me`, `POST /admin/logout` | gateway users table |
| `GET /admin/dashboard` | parallel `Http::pool`: orders `/metrics`, inventory `/summary`, advisor `/stats`, catalog `/summary`, business `/contact-messages?status=new` |
| `GET /admin/orders`, `GET /admin/orders/{id}`, `PATCH /admin/orders/{id}/status` | orders |
| `GET /admin/inventory`, `PATCH /admin/inventory/{ref}` | inventory |
| `GET /admin/products`, `PATCH /admin/products/{ref}` | catalog (with `include_inactive=true`) |
| `GET /admin/messages`, `PATCH /admin/messages/{id}` | business `/contact-messages` |
| `PATCH /admin/business` | business `/profile` |

`GET /admin/dashboard` returns `{orders, inventory, advisor, catalog, messages: {new}}` and replaces any failed section with `null` plus an entry in `errors`, so one slow service never blanks the whole dashboard.
An unreachable service yields `503 {"error": "Servicio no disponible"}` on single-service routes.
The admin user is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` only when it does not exist, so a changed password survives redeploys (lesson from laVillaSB commit `0b34aec`).

## 6. Frontend

Routes:

| Path | Page |
| --- | --- |
| `/` | Home: hero with an inline "tell the advisor what you need" input, needs grid, best sellers, categories, business services strip |
| `/catalogo` | Catalog with category and need filters and search, synced to the query string (`categoria`, `necesidad`, `q`) |
| `/producto/:slug` | Product detail: image, name, format, price or "Precio por confirmar", availability, description, benefits, INVIMA, quantity + add to cart, ask the advisor about this product, related products |
| `/carrito` | Cart with quantity steppers, subtotal, unpriced notice, checkout form |
| `/pedido/:code` | Order confirmation with the WhatsApp button |
| `/nosotros` | Business profile, services, gallery, contact channels, contact form |
| `/api` | Developer page: every public endpoint with method, path, description, example response and a live "Probar" button for GET endpoints |
| `/admin/login`, `/admin`, `/admin/pedidos`, `/admin/inventario`, `/admin/productos`, `/admin/mensajes` | Admin panel |

Global: slim sticky header (wordmark, Catálogo, Nosotros, search, Asesor, cart with count), advisor drawer available everywhere, footer with the INVIMA disclaimer.
The cart token lives in `localStorage`; a missing or expired token creates a new cart.

Design tokens (minimalist, keeping the current green identity and fonts):

| Token | Value | Use |
| --- | --- | --- |
| `forest` | `#1F3D2B` | Primary ink, buttons, header text |
| `leaf` | `#3F7D58` | Accent, links, focus rings |
| `sage` | `#E6EEE7` | Surfaces; matches the background of the Higgsfield imagery |
| `paper` | `#FBFCFA` | Page background |
| `ink` | `#18221C` | Body text |
| `muted` | `#5E6F63` | Secondary text |
| `line` | `#DCE5DD` | Borders |

Typography: Playfair Display for display headings only, DM Sans for everything else (both already part of the brand).
One memorable element: the home hero with the advisor input over the Higgsfield still life; everything else stays quiet.

## 7. Deployment

- **Local**: `docker compose up -d --build` runs Postgres, the five services, the gateway and the frontend (nginx on port 3200 proxying `/api` to the gateway).
- **Production frontend**: Netlify builds `app/frontend` (`npm ci && npm run build`, publish `dist`) with an SPA fallback and the `/api/*` proxy rewrite to `https://api.saludinteligente.lat`.
- **Production backend**: `docker-compose.prod.yml` plus Caddy on a VPS serving `api.saludinteligente.lat` with automatic TLS, following `laVillaSB/deploy`.
  This requires a VPS and an `A` record for `api` at Porkbun, which only the owner can provide.
- The legacy static site keeps working from `main` until `dev` is merged, and stays in the repository for rollback.

## 8. Testing

| Layer | Tool | Scope |
| --- | --- | --- |
| Services | pytest + httpx `ASGITransport`, SQLite (`aiosqlite`) for tests | Every endpoint above, including validation, stock reservation and metrics math |
| Gateway | PHPUnit with `Http::fake()` | Route allowlist, auth, throttling config, dashboard aggregation with a failing service |
| Frontend | Vitest + Testing Library | Price formatting, cart store, RECS-free rendering of advisor replies |
| End to end | Playwright against the running compose stack | Browse, open product, add to cart, checkout, advisor recommendation to cart, admin login, change order status, edit stock and price |
