# inventory Specification (delta: ADDED)

## Purpose

Track stock only for products the admin chooses to track, and keep public availability honest.

## Requirements

### Requirement: Untracked products SHALL be sold as available

A ref without a stock row, or with `quantity = null`, MUST report `available` and MUST NOT block checkout.

#### Scenario: Legacy product without stock data

- GIVEN a ref that was never configured
- WHEN a client calls `GET /availability?refs=VW-158`
- THEN the status is `available`

### Requirement: Checkout SHALL reserve tracked stock atomically

`POST /stock/reserve` MUST decrement every tracked line or none of them.

#### Scenario: Insufficient stock

- GIVEN `VW-158` tracked with quantity 1
- WHEN an order reserves 2 units of `VW-158` and 1 unit of `LN-74`
- THEN the service answers `409` naming `VW-158` and no quantity changes

#### Scenario: Cancelled order returns stock

- GIVEN order `SI-000010` reserved 2 units of `VW-158`
- WHEN the order is cancelled and `POST /stock/release {"order_code": "SI-000010"}` runs twice
- THEN the quantity increases by exactly 2

### Requirement: The storefront SHALL NOT expose exact counts

Public availability MUST be one of `available`, `low`, `out`.

#### Scenario: Low stock

- GIVEN a tracked product with quantity 3 and threshold 5
- WHEN availability is requested
- THEN the status is `low`
