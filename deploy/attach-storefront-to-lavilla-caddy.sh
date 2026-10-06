#!/usr/bin/env bash
#
# Serve the storefront (saludinteligente.lat) from the VPS through the Caddy
# that already serves lavillasb.com, instead of Netlify. Run it from this
# checkout once the frontend container is up and the DNS records point here:
#
#   ssh root@2.28.14.216 'cd /opt/salud-inteligente && docker compose -p salud \
#     -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.shared.yml \
#     --profile vps-storefront up -d --build frontend'
#   VPS_HOST=2.28.14.216 bash deploy/attach-storefront-to-lavilla-caddy.sh
#
# Same safety as attach-to-lavilla-caddy.sh: it backs up laVillaSB's Caddyfile,
# appends the site blocks in place (the file is bind-mounted, so its inode must
# not change), validates inside the running Caddy and restores the backup if
# validation fails. Idempotent: does nothing if the blocks are already there.
#
# It refuses to run until both names resolve to the VPS: Caddy requests the
# certificates right away, and failed challenges back off for hours.

set -euo pipefail

VPS_HOST="${VPS_HOST:?set VPS_HOST}"
SITE_HOST="${SITE_HOST:-saludinteligente.lat}"
CADDYFILE="${CADDYFILE:-/opt/lavillasb/deploy/Caddyfile}"
CADDY_CONTAINER="${CADDY_CONTAINER:-lavilla_caddy}"

resolve_a() {
  getent ahostsv4 "$1" 2>/dev/null | awk '/STREAM|RAW/ {print $1; exit}' && return 0
  python3 -c 'import socket,sys; print(socket.gethostbyname(sys.argv[1]))' "$1" 2>/dev/null || true
}

for host in "$SITE_HOST" "www.$SITE_HOST"; do
  got="$(resolve_a "$host" | head -1)"
  if [[ "$got" != "$VPS_HOST" ]]; then
    echo "$host resolves to '${got:-<unset>}', expected $VPS_HOST." >&2
    echo "Point it at $VPS_HOST at Porkbun, wait a few minutes, then re-run." >&2
    exit 1
  fi
done

ssh -o BatchMode=yes "root@$VPS_HOST" bash -s -- "$SITE_HOST" "$CADDYFILE" "$CADDY_CONTAINER" <<'REMOTE'
set -euo pipefail
site_host="$1"; caddyfile="$2"; caddy="$3"

if grep -q "^$site_host {" "$caddyfile"; then
  echo "Block for $site_host already present."
else
  backup="$caddyfile.bak-$(date +%Y%m%d%H%M%S)"
  cp -p "$caddyfile" "$backup"
  cat >> "$caddyfile" <<BLOCK

# --- Salud Inteligente storefront (stack in /opt/salud-inteligente) -----------
# The React build served by nginx in salud_frontend, which also proxies /api to
# salud_gateway. It joined this network through docker-compose.shared.yml.
$site_host {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}
	reverse_proxy salud_frontend:80
}

www.$site_host {
	redir https://$site_host{uri} permanent
}
BLOCK
  if ! docker exec "$caddy" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/caddy-validate.log 2>&1; then
    cat "$backup" > "$caddyfile"   # restore in place, keeping the inode
    echo "Validation failed, Caddyfile restored from $backup:" >&2
    cat /tmp/caddy-validate.log >&2
    exit 1
  fi
  echo "Blocks added (backup: $backup)."
fi

# laVillaSB runs Caddy with `admin off`, so a hot reload is refused; the config
# was validated above, so a restart (about a second of downtime) is safe.
if docker exec "$caddy" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  echo "Caddy reloaded."
else
  docker restart "$caddy" >/dev/null
  echo "Caddy restarted (its admin API is off)."
fi
REMOTE

echo "Waiting for the certificate and the storefront over TLS..."
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 "https://$SITE_HOST/api/v1/health" >/dev/null 2>&1 \
    && curl -fsS --max-time 5 "https://$SITE_HOST/" | grep -q '<div id="root">'; then
    echo "https://$SITE_HOST is served from $VPS_HOST."
    exit 0
  fi
  sleep 5
done
echo "The storefront did not answer over TLS yet. Check: ssh root@$VPS_HOST 'docker logs --tail 50 $CADDY_CONTAINER'" >&2
exit 1
