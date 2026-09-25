# ai-advisor Specification (delta: MODIFIED, moved from netlify/functions/chat.js)

## Purpose

Keep the advisor behavior from `docs/spec.md` while serving it from a FastAPI service that reads the live catalog and returns structured recommendations.

## Requirements

### Requirement: The advisor SHALL keep the safety rules

The system prompt MUST include the INVIMA disclaimer and rules 0 to 5 of `docs/spec.md` section 4: no diagnosis, referral to a professional for serious symptoms, pregnancy, medication or children, at most 3 or 4 products, a reason per product, no unsupported claims.

#### Scenario: Greeting only

- GIVEN a conversation where the user only says hello
- WHEN the advisor answers
- THEN `recommendations` is empty

### Requirement: Recommendations SHALL be real products

The service MUST parse the `RECS:[...]` block, drop refs that are not in the catalog, keep at most 4, strip the block from `reply`, and enrich each item with slug, name, image and price.

#### Scenario: Model invents a ref

- GIVEN a model reply whose RECS block contains `VW-158` and `XX-999`
- WHEN the service processes it
- THEN only `VW-158` is returned and `reply` contains no `RECS:` text

### Requirement: The advisor SHALL keep the legacy error contract

Invalid bodies MUST return `400`, a missing API key `500` with a generic message, and upstream failures `502`, always as `{"error": "..."}` in Spanish and never including the key.

#### Scenario: Empty messages

- GIVEN `{"messages": []}`
- WHEN it is posted to `/chat`
- THEN the service answers `400`
