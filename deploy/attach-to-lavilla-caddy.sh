#!/usr/bin/env bash
#
# Publish api.saludinteligente.lat through the Caddy that already serves
# lavillasb.com on the shared VPS. Run it from this checkout once the DNS
# record `api` -> VPS exists:
#
#   VPS_HOST=2.28.14.216 bash deploy/attach-to-lavilla-caddy.sh
#
# Safe by construction: it backs up laVillaSB's Caddyfile, appends one site
# block in place (the file is bind-mounted, so its inode must not change),
# validates the result inside the running Caddy and restores the backup if
# validation fails, so lavillasb.com is never served a broken config.
# Idempotent: does nothing if the block is already there.

set -euo pipefail

VPS_HOST="${VPS_HOST:?set VPS_HOST}"
API_HOST="${API_HOST:-api.saludinteligente.lat}"
CADDYFILE="${CADDYFILE:-/opt/lavillasb/deploy/Caddyfile}"
CADDY_CONTAINER="${CADDY_CONTAINER:-lavilla_caddy}"

resolve_a() {
  getent ahostsv4 "$1" 2>/dev/null | awk '/STREAM|RAW/ {print $1; exit}' && return 0
  python3 -c 'import socket,sys; print(socket.gethostbyname(sys.argv[1]))' "$1" 2>/dev/null || true
}

got="$(resolve_a "$API_HOST" | head -1)"
if [[ "$got" != "$VPS_HOST" ]]; then
  echo "$API_HOST resolves to '${got:-<unset>}', expected $VPS_HOST." >&2
  echo "Add the A record 'api' -> $VPS_HOST at Porkbun, wait a few minutes, then re-run." >&2
  exit 1
fi

ssh -o BatchMode=yes "root@$VPS_HOST" bash -s -- "$API_HOST" "$CADDYFILE" "$CADDY_CONTAINER" <<'REMOTE'
set -euo pipefail
api_host="$1"; caddyfile="$2"; caddy="$3"

if grep -q "^$api_host {" "$caddyfile"; then
  echo "Block for $api_host already present."
else
  backup="$caddyfile.bak-$(date +%Y%m%d%H%M%S)"
  cp -p "$caddyfile" "$backup"
  cat >> "$caddyfile" <<BLOCK

# --- Salud Inteligente API (stack in /opt/salud-inteligente) ------------------
# The storefront lives on Netlify and proxies /api/* here. Only the gateway is
# reachable; it joined this network through docker-compose.shared.yml.
$api_host {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}
	reverse_proxy salud_gateway:8110
}
BLOCK
  if ! docker exec "$caddy" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/caddy-validate.log 2>&1; then
    cat "$backup" > "$caddyfile"   # restore in place, keeping the inode
    echo "Validation failed, Caddyfile restored from $backup:" >&2
    cat /tmp/caddy-validate.log >&2
    exit 1
  fi
  echo "Block added (backup: $backup)."
fi

docker exec "$caddy" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "Caddy reloaded."
REMOTE

echo "Waiting for the certificate and the API over TLS..."
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 "https://$API_HOST/api/v1/health" >/dev/null 2>&1; then
    curl -fsS "https://$API_HOST/api/v1/health"; echo
    exit 0
  fi
  sleep 5
done
echo "The API did not answer over TLS yet. Check: ssh root@$VPS_HOST 'docker logs --tail 50 $CADDY_CONTAINER'" >&2
exit 1
