# admin-dashboard Specification (delta: ADDED)

## Purpose

Give the business owner one place to see key performance indicators and run the store: orders, inventory, products and contact messages.

## Requirements

### Requirement: The dashboard SHALL show the key indicators

The `/admin` home MUST show, for a selectable range of 7, 30 or 90 days: orders, revenue, average order value, units sold, cancellation rate, advisor share of orders, pending orders, a daily orders and revenue chart, top products, most recommended products, low and out-of-stock counts, unpriced products and new messages.

#### Scenario: Fresh install

- GIVEN no orders yet
- WHEN the admin opens the dashboard
- THEN every KPI shows zero and the chart shows an empty range instead of an error

### Requirement: The admin SHALL manage orders

The admin MUST be able to list and filter orders by status, open one, and move it through the lifecycle.

#### Scenario: Confirm an order

- GIVEN a pending order
- WHEN the admin confirms it
- THEN its status is `confirmed` and the revenue KPI includes it

### Requirement: The admin SHALL edit inventory and products

The admin MUST be able to set stock quantity and threshold per product, and price, description and active flag per product.

#### Scenario: Price appears in the store

- GIVEN a product without price
- WHEN the admin saves a price of 45000
- THEN the product page shows "$ 45.000"
