# Home server deployment

Since 2026-11-19 the whole of Salud Inteligente (storefront, gateway, six services and Postgres) runs on a home server, published through Cloudflare Tunnel.
It replaced the laVillaSB VPS (`2.28.14.216`), which we no longer have access to.
The new database started from the seed data in this repository, so orders and admin edits from the VPS were not carried over.

## How it fits together

```
browser --https--> Cloudflare (DNS + TLS for saludinteligente.lat)
                        |
                        | tunnel, opened outbound by the server (no router or firewall ports)
                        v
                  salud_tunnel (cloudflared)
                        |-- saludinteligente.lat, www  -->  salud-frontend:80  (nginx, proxies /api/ to the gateway)
                        '-- api.saludinteligente.lat   -->  salud-gateway:8110 (Laravel)  -->  six FastAPI services  -->  Postgres
```

No container publishes a host port.
The only way in from the internet is the tunnel, and the only way in for administration is SSH.

| Piece | Where |
| --- | --- |
| Server | `mcs`, user `macreat`, LAN `192.168.40.27`, Ubuntu 26.04, 2.9 GB RAM plus 3.2 GB swap |
| Code | `~/salud` on the server (a copy of the `dev` branch, not a git checkout) |
| Secrets | `~/salud/.env` on the server, `chmod 600`, never committed |
| DNS | Cloudflare (nameservers `amit.ns.cloudflare.com`, `lily.ns.cloudflare.com`); Porkbun is still the registrar |
| Tunnel | `salud-tunnel` in the Cloudflare dashboard, under Networking, Tunnels |
| Remote SSH | Tailscale (the server is `mcs` on the tailnet) |

The same server also hosts the Elite Intel demo in `~/elite`, published separately through Tailscale Funnel.

## The compose command

Every command below runs on the server from `~/salud` and uses the same files:

```bash
cd ~/salud
alias dc='docker compose -p salud -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tunnel.yml'
```

`docker-compose.tunnel.yml` adds the `cloudflared` container and gives the frontend and the gateway the aliases `salud-frontend` and `salud-gateway`.
The aliases exist because Cloudflare's route form rejects the underscores in the container names.

## Tunnel routes

These are configured in the Cloudflare dashboard, on the tunnel's Routes tab, not in this repository:

| Hostname | Service URL |
| --- | --- |
| `saludinteligente.lat` | `http://salud-frontend:80` |
| `www.saludinteligente.lat` | `http://salud-frontend:80` |
| `api.saludinteligente.lat` | `http://salud-gateway:8110` |

The service URL must start with `http://` and must not have spaces.
Use `http`, not `https`: Cloudflare terminates TLS and the containers talk plain HTTP inside the server.

## Secrets in `.env`

| Variable | Notes |
| --- | --- |
| `ROOT_DOMAIN` | `saludinteligente.lat` |
| `POSTGRES_PASSWORD`, `INTERNAL_TOKEN`, `GATEWAY_APP_KEY` | Generated on the server; do not change them on a running database |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin console login at `https://saludinteligente.lat/admin` |
| `CLOUDFLARE_TUNNEL_TOKEN` | The token of `salud-tunnel`, the long string after `--token` on the tunnel's install screen |
| `ANTHROPIC_API_KEY` | Advisor chat; without it the advisor answers with an error and the rest works |
| `TWILIO_*`, `ORDER_SMS_TO` | Optional order SMS; empty means the messages are recorded as skipped |
| `BUSINESS_*` | Contact details shown on the site |

Read the admin password with `grep ADMIN_ ~/salud/.env`.
`deploy/env.example` documents every variable.

## Common changes

### New commits on `dev`

From a checkout of this repository on your PC:

```bash
git archive --format=tar dev | ssh macreat@192.168.40.27 'tar -x -C ~/salud'
```

Then on the server:

```bash
cd ~/salud
nohup docker compose -p salud -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d --build > deploy.log 2>&1 &
tail -f deploy.log
```

A full build takes more than ten minutes on this server.
Run it under `nohup` as shown, so a dropped SSH session cannot stop it halfway.
`git archive` only copies committed files, so commit first.

### A value in `.env`

Edit the file with `nano ~/salud/.env`, then recreate only the containers that read it, for example:

```bash
dc up -d advisor          # ANTHROPIC_API_KEY, CLAUDE_MODEL
dc up -d notifications    # TWILIO_*, ORDER_SMS_TO
dc up -d business         # BUSINESS_*
dc up -d gateway          # ADMIN_*, ROOT_DOMAIN
dc up -d cloudflared      # CLOUDFLARE_TUNNEL_TOKEN
```

`up -d` recreates a container when its configuration changed; `restart` would keep the old values.

### A new public hostname

Add the route on the tunnel in the Cloudflare dashboard.
Cloudflare creates the DNS record itself.
If it says a record already exists, delete the old record under DNS, Records, and add the route again.

### The tunnel token

If the token leaks, refresh it on the tunnel in the Cloudflare dashboard, put the new one in `.env` and run `dc up -d cloudflared`.

## Checking that it works

```bash
dc ps                                                    # every container Up, Postgres healthy
docker logs salud_tunnel 2>&1 | grep Registered | tail   # four registered tunnel connections
curl -s https://api.saludinteligente.lat/api/v1/health   # every service "ok"
curl -sI https://saludinteligente.lat/ | head -1         # HTTP/2 200
```

## When something breaks

| Symptom | Where to look |
| --- | --- |
| Cloudflare error 1033 or "tunnel not connected" | `docker logs salud_tunnel`; check `CLOUDFLARE_TUNNEL_TOKEN`, then `dc up -d cloudflared` |
| Cloudflare 502 or 503 | The route points at a container that is down or misspelled; `dc ps`, and compare the routes with the table above |
| The site loads but `/api` calls fail | `dc logs --tail 80 gateway`, then the service it names |
| The advisor answers with an error | `dc logs --tail 80 advisor`; usually a missing or invalid `ANTHROPIC_API_KEY` |
| A build gets killed | Out of memory; check `free -h` and build one service at a time with `dc up -d --build <service>` |
| Everything is down after a power cut | Containers have `restart: unless-stopped`; check `systemctl status docker` and `dc ps` |

Logs for any service: `dc logs --tail 100 <service>`.

## Rollback

Copy the previous commit instead of `dev` and rebuild:

```bash
git archive --format=tar <previous-commit> | ssh macreat@192.168.40.27 'tar -x -C ~/salud'
```

`tar -x` overwrites files but does not delete files that the newer commit added, so remove those by hand if they matter.

## Still missing

- Nightly encrypted backups of Postgres (`pg_dump` plus `age` or `gpg`), kept off the server. This is health data.
- MX records, if the business uses an `@saludinteligente.lat` email address.
- "Always Use HTTPS" in Cloudflare, under SSL/TLS, Edge Certificates.
