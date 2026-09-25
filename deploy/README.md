# Deploying Salud Inteligente

The storefront runs on Netlify, the API runs on one VPS, and the domain `saludinteligente.lat` ties them together.

| Piece | Where | Notes |
| --- | --- | --- |
| Storefront (React build of `app/frontend`) | Netlify | Built on every push to the production branch; see `netlify.toml` |
| Gateway, six FastAPI services, Postgres | VPS with Docker Compose behind Caddy | `docker-compose.yml` + `docker-compose.prod.yml` + `docker-compose.caddy.yml` or `docker-compose.shared.yml` |
| DNS | Porkbun | Apex and `www` already point at Netlify; `api` must point at the VPS |

## How the pieces talk

```
browser --https--> saludinteligente.lat (Netlify CDN, React SPA)
                        |
                        | /api/*  (Netlify 200 proxy, same origin for the browser)
                        v
                  api.saludinteligente.lat (Caddy, TLS)  -->  gateway (Laravel)  -->  business / catalog / inventory / orders / advisor
                                                                                            |
                                                                                        PostgreSQL
```

Only Caddy listens on the public interface of the VPS.
Postgres, the gateway and every microservice stay on the internal Docker network.

## Current setup: shared with laVillaSB

Today the API runs on the laVillaSB VPS (`2.28.14.216`), next to lavillasb.com, in `/opt/salud-inteligente`:

- The stack starts with `docker compose -p salud -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.shared.yml up -d --build`.
- No Salud container publishes a port. laVillaSB's Caddy terminates TLS and proxies `api.saludinteligente.lat` to `salud_gateway:8110`, because the gateway also joins the `lavillasb_lavilla` network.
- On that shared network the gateway reaches our own containers by their unique names (`salud_postgres`, `salud_catalog`, ...), never by short names that belong to laVillaSB.
- Secrets live in `/opt/salud-inteligente/.env` (generated on the server, `chmod 600`).

Publishing the API once the DNS record `api` -> `2.28.14.216` exists:

```bash
VPS_HOST=2.28.14.216 bash deploy/attach-to-lavilla-caddy.sh
```

It backs up laVillaSB's Caddyfile, appends the site block, validates it inside the running Caddy (restoring the backup on failure) and reloads it.
The same block should be committed to the laVillaSB repository so its own deploys keep it.

Updating the API after new commits on this repository:

```bash
git archive --format=tar dev | ssh root@2.28.14.216 'tar -x -C /opt/salud-inteligente'
ssh root@2.28.14.216 'cd /opt/salud-inteligente && docker compose -p salud -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.shared.yml up -d --build'
```

The rest of this guide describes a dedicated server for Salud Inteligente, for when it outgrows the shared one.

## 1. Get a VPS

Any 2 vCPU / 4 GB Ubuntu 22.04 or 24.04 box works (Hetzner CX22, DigitalOcean, Vultr, Linode).
Make sure you can `ssh root@<ip>`.

## 2. Point `api` at it

At Porkbun, `saludinteligente.lat` -> DNS, add:

| Type | Host | Answer |
| --- | --- | --- |
| A | `api` | the VPS IPv4 |

Keep the existing apex `ALIAS` and `www` `CNAME` records that point at Netlify.
The record must resolve before the first start, or Caddy cannot get a certificate.

## 3. Deploy the API

From a checkout of this repository:

```bash
VPS_HOST=<vps-ip> ACME_EMAIL=<you@example.com> ANTHROPIC_API_KEY=sk-ant-... \
BUSINESS_WHATSAPP=57XXXXXXXXXX BRANCH=main \
  bash deploy/deploy-vps.sh
```

The script checks DNS, provisions the host (Docker, swap, firewall, unattended upgrades), clones the branch, generates every secret on the server, starts the stack and waits until `https://api.saludinteligente.lat/api/v1/health` answers.
It is idempotent: re-running it updates the code and keeps the existing secrets.

Read the generated admin password with:

```bash
ssh root@<vps-ip> 'grep ADMIN_ /opt/salud-inteligente/.env'
```

Then sign in at `https://saludinteligente.lat/admin` and change it.

## 4. Deploy the storefront

Netlify builds `app/frontend` automatically when the production branch is pushed (settings live in `netlify.toml`).
No environment variables are needed in Netlify: the Claude key now lives only on the VPS.

Deploy the API (step 3) before merging `dev` into the production branch, otherwise the new storefront loads but its `/api` calls fail.

## Updating

```bash
ssh root@<vps-ip> 'cd /opt/salud-inteligente && git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build'
```

## Rollback

- Storefront: in Netlify, publish a previous deploy, or set the build to `publish = "public"` with no base or command to serve the legacy static site.
- API: `git checkout <previous-commit>` on the VPS and run the update command.

## Environment variables

See `deploy/env.example` for every variable and its purpose.
