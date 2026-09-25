# Tasks: microservices-platform

Work on branch `dev`.
Each group is independently verifiable; the owner of each group is noted.

## 1. Foundation (coordinator)

- [x] 1.1 Extract the legacy catalog into `seed/catalog.json` (categories, needs, 209 products) and 209 WebP images.
- [x] 1.5 Add the 128 new products photographed in `reference/docs/catalog/imgs` (names read from the photos, backgrounds replaced with a clean studio background, duplicates of existing products skipped) as refs `NV-001`..`NV-128`, plus the `capsulas` and `combos` categories.
- [x] 1.2 Generate site imagery with Higgsfield (hero, one image per need, advisor band) into `app/frontend/public/media/site/`.
- [x] 1.3 `docker-compose.yml` with Postgres (one database per service), five services, gateway and frontend on non-conflicting ports.
- [x] 1.4 `deploy/env.example` (`.env*` files are protected in this environment) documenting `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `INTERNAL_TOKEN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BUSINESS_*`.

## 2. Domain services (executor A: catalog, business, inventory)

- [x] 2.1 Shared service skeleton: config, async SQLAlchemy, `/health`, internal-token dependency, `{"error"}` handler, Dockerfile, pytest setup on SQLite.
- [x] 2.2 catalog: models, seed loader, every endpoint of design 4.1, tests.
- [x] 2.3 business: models, env-based seed, every endpoint of design 4.2, tests.
- [x] 2.4 inventory: models, availability rules, atomic reserve and idempotent release, every endpoint of design 4.3, tests.

## 3. Domain services (executor B: orders, advisor)

- [x] 3.1 orders: carts, checkout with catalog snapshot, stock reservation and compensation, WhatsApp link, lifecycle, tracking, metrics, tests with mocked upstreams.
- [x] 3.2 advisor: Claude client, catalog context cache, RECS parsing and validation, legacy error contract, stats, tests with a mocked Anthropic API.

## 3b. Notifications (coordinator, owner request 2026-09-25)

- [x] 3.3 notifications service: SMS to +57 301 8000324 for every new order via Twilio, delivery log, admin endpoints, tests with a mocked Twilio API.
- [x] 3.4 Business WhatsApp +57 301 8000324 as the default contact channel; blank contact variables return `null`.

## 4. Gateway (executor C)

- [x] 4.1 Laravel 12 skeleton with Sanctum, Postgres, Dockerfile and entrypoint (migrate, seed admin only if missing).
- [x] 4.2 Public allowlist routes and rate limits of design 5.
- [x] 4.3 Admin auth and admin routes, dashboard aggregation with partial failure, aggregated health.
- [x] 4.4 PHPUnit feature tests with `Http::fake()`.

## 5. Frontend (executor D)

- [x] 5.1 Vite + React + TypeScript + Tailwind + React Router + TanStack Query, design tokens of design 6, nginx Dockerfile proxying `/api`.
- [x] 5.2 Layout: header, advisor drawer, cart count, footer with disclaimer.
- [x] 5.3 Home, catalog, product detail, cart and checkout, order confirmation, business page.
- [x] 5.4 `/api` developer page with live GET requests.
- [x] 5.5 Admin: login, dashboard with KPIs and chart, orders, inventory, products, messages.
- [x] 5.6 Vitest unit tests; `npm run build` and `npm run lint` clean.

## 6. Deployment (coordinator)

- [x] 6.1 `netlify.toml` building `app/frontend` with SPA fallback and the `/api/*` proxy to `api.saludinteligente.lat`.
- [x] 6.2 `docker-compose.prod.yml` and `deploy/Caddyfile` for the API host, with a deploy guide.
- [x] 6.3 README and `docs/spec.md` architecture section updated.

## 7. Verification (coordinator)

- [x] 7.1 All test suites green.
- [x] 7.2 Full stack up locally; Playwright walk-through of storefront, advisor, checkout and admin at desktop and mobile widths.
- [ ] 7.3 Owner reviews the `dev` branch before any push.
