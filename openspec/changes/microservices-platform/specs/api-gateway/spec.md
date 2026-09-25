# api-gateway Specification (delta: ADDED)

## Purpose

Define the Laravel gateway as the single public entry point of the Salud Inteligente API.

## Requirements

### Requirement: The gateway SHALL expose only allowlisted routes

The gateway MUST route public traffic only through the explicit routes listed in design section 5.
The gateway MUST NOT expose a catch-all proxy to any service.

#### Scenario: Allowlisted public read is proxied

- GIVEN the catalog service is running
- WHEN a client calls `GET /api/v1/catalog/products?need=sueno`
- THEN the gateway returns the catalog response with the same status code

#### Scenario: Internal service path is not reachable

- GIVEN a client without credentials
- WHEN it calls `GET /api/v1/orders` or `GET /api/v1/inventory/stock`
- THEN the gateway answers `404` or `401` and never reaches the service

### Requirement: Admin routes SHALL require an admin token

Every `/api/admin/*` route except login MUST require a Sanctum bearer token with the `admin` ability belonging to an `is_admin` user.

#### Scenario: Missing token

- GIVEN no `Authorization` header
- WHEN a client calls `GET /api/admin/dashboard`
- THEN the gateway answers `401`

#### Scenario: Valid admin login

- GIVEN the seeded admin user
- WHEN it posts correct credentials to `POST /api/admin/login`
- THEN the gateway returns `{token, user}` and the token opens `GET /api/admin/me`

### Requirement: The gateway SHALL authenticate itself to services

The gateway MUST send `X-Internal-Token` on every upstream call.

#### Scenario: Internal endpoint rejects callers without the token

- GIVEN a request to an internal service endpoint without `X-Internal-Token`
- WHEN the service handles it
- THEN it answers `401`

### Requirement: Failures SHALL degrade gracefully

A down service MUST yield `503 {"error": "Servicio no disponible"}` on its own routes and MUST NOT break unrelated routes or the whole admin dashboard.

#### Scenario: Dashboard with one service down

- GIVEN the advisor service is stopped
- WHEN the admin opens `GET /api/admin/dashboard`
- THEN the response is `200`, `advisor` is `null`, `errors` names `advisor`, and the other sections are filled
