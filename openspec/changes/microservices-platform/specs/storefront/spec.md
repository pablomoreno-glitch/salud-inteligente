# storefront Specification (delta: MODIFIED, replaces public/index.html)

## Purpose

Deliver a minimalist React storefront that keeps the essentials of the current site: green identity, categories, search, the INVIMA disclaimer and an always-available AI advisor.

## Requirements

### Requirement: Every product SHALL open its own page

Every product card, advisor recommendation and related-product item MUST link to `/producto/:slug`.

#### Scenario: Open a product from the catalog

- GIVEN the catalog page
- WHEN the visitor clicks any product card
- THEN the product page shows its image, name, description, benefits, presentation, INVIMA registry, availability, price or "Precio por confirmar", and an add-to-cart control

### Requirement: The advisor SHALL be reachable everywhere

A visible advisor entry point MUST exist in the header on every page and in the home hero, on desktop and mobile, and MUST NOT be covered by third-party badges.

#### Scenario: Ask from the home hero

- GIVEN the home page
- WHEN the visitor types "me cuesta dormir" in the hero input and submits
- THEN the advisor drawer opens with that message sent and shows recommendation cards that link to product pages and can be added to the cart

### Requirement: The health disclaimer SHALL stay visible

The INVIMA disclaimer MUST appear in the footer, the advisor drawer and every product page.

#### Scenario: Product page disclaimer

- GIVEN any product page
- WHEN it renders
- THEN the disclaimer text is present

### Requirement: The API SHALL be documented for developers

`/api` MUST list every public endpoint with method, path, purpose and an example, and MUST let the visitor run the public GET endpoints live.

#### Scenario: Try an endpoint

- GIVEN the `/api` page
- WHEN the visitor presses "Probar" on `GET /api/v1/catalog/needs`
- THEN the live JSON response and status code are shown
