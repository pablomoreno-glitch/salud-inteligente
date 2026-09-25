# business-profile Specification (delta: ADDED)

## Purpose

Serve the "Salud Inteligente" business itself: profile, contact channels, services, media, and incoming contact messages.

## Requirements

### Requirement: The business endpoint SHALL describe the business

`GET /business` MUST return profile, contacts, services and media in one response.
Contact channels that were never configured MUST be `null`; the service MUST NOT invent phone numbers, addresses or social accounts.

#### Scenario: Unconfigured WhatsApp

- GIVEN `BUSINESS_WHATSAPP` is not set and the admin has not saved one
- WHEN a client calls `GET /contacts`
- THEN `whatsapp` is `null`

### Requirement: Visitors SHALL be able to send a contact message

`POST /contact-messages` MUST accept a name, a message and at least one of phone or email, and MUST store it with status `new`.

#### Scenario: Message without any way to reply

- GIVEN a body with name and message but no phone and no email
- WHEN it is posted
- THEN the service answers `422`

#### Scenario: Admin reads the message

- GIVEN a stored message
- WHEN the admin lists messages and marks it `read`
- THEN the dashboard count of new messages decreases by one
