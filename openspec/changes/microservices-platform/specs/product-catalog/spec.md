# product-catalog Specification (delta: ADDED)

## Purpose

Make the catalog service the single source of truth for products, replacing the HTML catalog and the advisor's hard-coded catalog text.

## Requirements

### Requirement: The catalog SHALL be seeded from the legacy site

On first start with an empty database the service MUST load the 10 categories, the need groups and the 209 legacy products, each with its image.

#### Scenario: First start

- GIVEN an empty `salud_catalog` database
- WHEN the service starts
- THEN `GET /products?limit=1000` returns 209 items and every item has an `image_url`

### Requirement: Every product SHALL be addressable by slug

Each product MUST have a unique, stable, URL-safe slug.

#### Scenario: Product detail

- GIVEN an active product with slug `magnesium-complex-8-en-1-vw-158`
- WHEN a client calls `GET /products/magnesium-complex-8-en-1-vw-158`
- THEN the service returns that product with its benefits, INVIMA registry and a non-empty description

#### Scenario: Inactive product is hidden from the public

- GIVEN the admin set `is_active=false` on a product
- WHEN a client requests it by slug or lists products without `include_inactive`
- THEN the product is not returned

### Requirement: The catalog SHALL support filtering

`GET /products` MUST filter by category, need, viral, trending and an accent-insensitive text query over name, ref and benefits.

#### Scenario: Accent-insensitive search

- GIVEN products whose benefits mention "sueño"
- WHEN a client searches `q=sueno`
- THEN those products are returned

### Requirement: Prices SHALL be optional and admin-managed

`price` MUST be `null` until set, and MUST be a positive integer in pesos when set.

#### Scenario: Admin sets a price

- GIVEN a product without price
- WHEN the gateway sends `PATCH /products/VW-158 {"price": 45000}` with the internal token
- THEN subsequent reads return `"price": 45000`
