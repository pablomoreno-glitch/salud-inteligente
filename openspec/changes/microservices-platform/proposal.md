# Proposal: microservices-platform

## Intent

Turn Salud Inteligente from a static catalog with one serverless function into an API-first platform.
The business needs a real store: every product with its own page, a cart, orders, inventory and an admin panel with the key performance indicators of the business.
The architecture follows the reference project laVillaSB (Laravel gateway in front of FastAPI domain services), adapted to a React + Vite + Tailwind storefront.

This change delivers roadmap phases 3, 4 and 5 of `docs/spec.md` as an MVP:

| Roadmap item | Delivered by |
| --- | --- |
| 4. Dynamic catalog (single source of truth) | `catalog` service, seeded once from the legacy `public/index.html` |
| 5. Smart filters (by need, category, text) | `catalog` query parameters and the storefront filters |
| 6. Shopping cart (including from advisor recommendations) | `orders` service carts |
| 7. Order system with WhatsApp hand-off | `orders` checkout plus a WhatsApp deep link |
| 9. Metrics dashboard | `/admin` dashboard fed by `orders`, `inventory`, `catalog` and `business` |
| 10. Admin panel and roles (admin only for the MVP) | Laravel Sanctum admin auth in the gateway |

Out of scope for this change: per-user conversation memory (item 3), WhatsApp Business bot (item 8), multi-distributor tenancy, PWA and SaaS billing.

## User-visible impact

- A new minimalist storefront that keeps the essentials of today's page: the green identity, the INVIMA health disclaimer, the category navigation, search, and the AI advisor always one tap away.
- Every product is clickable and opens its own page (`/producto/:slug`) with image, description, benefits, presentation, INVIMA registry, availability, related products and "add to cart".
- Cart and checkout: the customer leaves name, phone and city, gets an order code and a prefilled WhatsApp message to the distributor.
- The advisor recommends products as cards that link to their product page and can be added to the cart directly.
- A business section (about, services, contact channels, image gallery) served by its own endpoint.
- An `/admin` panel: KPIs, order management, inventory editing, product price and description editing, contact messages.
- A public developer page (`/api`) that documents every public endpoint and lets anyone try the read endpoints live.

## Affected boundaries

- Catalog: moves from HTML to the `catalog` service database; images move from base64 to static WebP files.
- Advisor chat: moves from `netlify/functions/chat.js` to the `advisor` service; the catalog context now comes from `catalog` instead of a hard-coded string, which removes the duplicated-catalog debt recorded in `docs/spec.md`.
- Gateway: new Laravel 12 gateway is the only public entry point for the API.
- Hosting: the storefront stays on Netlify; the gateway and services need a container host (see design, "Deployment").

## Safety

The advisor keeps every rule from `docs/spec.md` section 4: INVIMA disclaimer, no diagnosis, at most 3 or 4 recommendations, reasons per product, no unsupported claims.
The disclaimer stays visible in the storefront footer, the advisor panel and every product page.

## Rollback plan

- All work lands on branch `dev`; `main` keeps serving the current static site on https://saludinteligente.lat until `dev` is merged.
- The legacy static site (`public/`, `netlify/functions/chat.js`) is kept intact in the repository, so reverting the Netlify build settings (publish `public`, no build command) restores it in one deploy.
- The gateway and services are additive: shutting them down does not affect the legacy site.

## Success criteria

- `docker compose up` brings up the full stack locally and the storefront, product pages, cart, checkout, advisor and admin work end to end in a browser.
- Automated tests pass for every service (pytest), the gateway (PHPUnit) and the frontend (Vitest).
- The legacy site on `main` is untouched until the owner reviews the `dev` branch and approves the push.
