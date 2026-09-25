# cart-and-orders Specification (delta: ADDED)

## Purpose

Let customers build a cart, place an order, and hand it to the distributor over WhatsApp.

## Requirements

### Requirement: Carts SHALL be anonymous and token based

`POST /carts` MUST return a new token; the cart view MUST reflect current catalog names, images and prices.

#### Scenario: Add from the advisor

- GIVEN an empty cart
- WHEN the client puts `VW-158` with quantity 1 and `source=advisor`
- THEN the cart view lists `VW-158` with `source` `advisor` and `item_count` 1

#### Scenario: Unpriced line

- GIVEN a cart line whose product has no price
- WHEN the cart is read
- THEN `has_unpriced` is `true` and that line's `line_total` is `null`

### Requirement: Checkout SHALL create an order from the cart

`POST /orders` MUST snapshot names and prices, reserve stock, create an order with a `SI-` code, and empty the cart.

#### Scenario: Successful checkout

- GIVEN a cart with two lines and a configured business WhatsApp
- WHEN the client posts name, phone and city
- THEN the response is `201` with `order.status` `pending`, a code, and a `whatsapp_url` starting with `https://wa.me/`

#### Scenario: Empty cart

- GIVEN an empty cart
- WHEN checkout is attempted
- THEN the service answers `422`

### Requirement: Order status SHALL follow the lifecycle

Only `pending -> confirmed -> shipped -> delivered` and `-> cancelled` from a non-final state are allowed.

#### Scenario: Invalid transition

- GIVEN a delivered order
- WHEN the admin sets it to `pending`
- THEN the service answers `422` and the status is unchanged

### Requirement: Sales metrics SHALL be computed from orders

`GET /metrics` MUST return the KPIs of design section 4.4, counting revenue only for confirmed, shipped and delivered orders.

#### Scenario: Revenue excludes pending and cancelled

- GIVEN one delivered order of 90000, one pending order of 50000 and one cancelled order of 30000
- WHEN metrics are requested
- THEN `revenue` is 90000 and `cancellation_rate` is one third
