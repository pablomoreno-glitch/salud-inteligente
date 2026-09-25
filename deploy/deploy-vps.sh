#!/usr/bin/env bash
#
# Provision a fresh VPS and bring the API stack up on it, in one shot.
#
#   VPS_HOST=203.0.113.10 ACME_EMAIL=you@example.com ANTHROPIC_API_KEY=sk-ant-... \
#     bash deploy/deploy-vps.sh
#
# Run it from a checkout on your machine against a bare Ubuntu 22.04/24.04 box
# you can SSH into as root. Adapted from laVillaSB/deploy/deploy-vps.sh.
#
# Re-running is safe: provisioning is idempotent and an existing .env on the
# host is kept, so secrets stay stable across deploys.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

VPS_HOST="${VPS_HOST:?set VPS_HOST to the server IP}"
VPS_USER="${VPS_USER:-root}"
ROOT_DOMAIN="${ROOT_DOMAIN:-saludinteligente.lat}"
ACME_EMAIL="${ACME_EMAIL:?set ACME_EMAIL, the address for certificate expiry notices}"
REPO_URL="${REPO_URL:-https://github.com/pablomoreno-glitch/salud-inteligente.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/salud-inteligente}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${ROOT_DOMAIN}}"

SSH=(ssh -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}")
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

resolve_a() {
  getent ahostsv4 "$1" 2>/dev/null | awk '/STREAM|RAW/ {print $1; exit}' && return 0
  python3 -c 'import socket,sys; print(socket.gethostbyname(sys.argv[1]))' "$1" 2>/dev/null || true
}

log "Checking DNS"
# Caddy cannot complete the ACME challenge unless api.<domain> already points
# here, and failed challenges are rate-limited, so this is a hard gate.
got="$(resolve_a "api.${ROOT_DOMAIN}" | head -1)"
if [[ "$got" != "$VPS_HOST" ]]; then
  echo "api.${ROOT_DOMAIN} resolves to '${got:-<unset>}', expected ${VPS_HOST}." >&2
  echo "Add an A record 'api' -> ${VPS_HOST} at Porkbun, wait for propagation, then re-run." >&2
  exit 1
fi
echo "  api.${ROOT_DOMAIN} -> ${VPS_HOST}"

log "Provisioning the host"
scp -o StrictHostKeyChecking=accept-new "$REPO_ROOT/deploy/provision-vps.sh" "${VPS_USER}@${VPS_HOST}:/tmp/"
"${SSH[@]}" 'bash /tmp/provision-vps.sh'

log "Cloning the repository (${BRANCH})"
"${SSH[@]}" "git config --global --add safe.directory ${APP_DIR} 2>/dev/null || true"
"${SSH[@]}" "test -d ${APP_DIR}/.git || git clone --branch ${BRANCH} ${REPO_URL} ${APP_DIR}"
"${SSH[@]}" "cd ${APP_DIR} && git fetch --quiet origin && git checkout --quiet ${BRANCH} && git pull --quiet"

log "Checking the branch carries the microservices stack"
if ! "${SSH[@]}" "test -f ${APP_DIR}/docker-compose.prod.yml"; then
  echo "Branch '${BRANCH}' has no docker-compose.prod.yml; deploy the branch with the API (e.g. BRANCH=dev)." >&2
  exit 1
fi

log "Writing secrets"
if "${SSH[@]}" "test -f ${APP_DIR}/.env"; then
  echo "  .env already exists on the host, keeping it"
else
  "${SSH[@]}" "cat > ${APP_DIR}/.env" <<ENVFILE
ROOT_DOMAIN=${ROOT_DOMAIN}
ACME_EMAIL=${ACME_EMAIL}
ADMIN_EMAIL=${ADMIN_EMAIL}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:?set ANTHROPIC_API_KEY for the first deploy}
CLAUDE_MODEL=${CLAUDE_MODEL:-}
BUSINESS_WHATSAPP=${BUSINESS_WHATSAPP:-573018000324}
BUSINESS_PHONE=${BUSINESS_PHONE:-+57 301 8000324}
BUSINESS_EMAIL=${BUSINESS_EMAIL:-}
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID:-}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-}
TWILIO_FROM_NUMBER=${TWILIO_FROM_NUMBER:-}
TWILIO_MESSAGING_SERVICE_SID=${TWILIO_MESSAGING_SERVICE_SID:-}
ORDER_SMS_TO=${ORDER_SMS_TO:-+573018000324}
ENVFILE
  # Generated on the server so they never touch this machine's disk or history.
  "${SSH[@]}" bash -s -- "$APP_DIR" <<'REMOTE'
set -euo pipefail
cd "$1"
for key in POSTGRES_PASSWORD INTERNAL_TOKEN ADMIN_PASSWORD; do
  printf '%s=%s\n' "$key" "$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-32)" >> .env
done
printf 'GATEWAY_APP_KEY=base64:%s\n' "$(openssl rand -base64 32)" >> .env
chmod 600 .env
REMOTE
  echo "  generated; read the admin password with: ssh ${VPS_USER}@${VPS_HOST} 'grep ADMIN_ ${APP_DIR}/.env'"
fi

log "Starting the stack (the first build takes a few minutes)"
"${SSH[@]}" "cd ${APP_DIR} && ${COMPOSE} up -d --build"

log "Waiting for the API over TLS"
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 "https://api.${ROOT_DOMAIN}/api/v1/health" >/dev/null 2>&1; then
    echo "  healthy after ${attempt} attempt(s)"
    break
  fi
  if (( attempt == 30 )); then
    echo "  The API did not come up. Logs: ssh ${VPS_USER}@${VPS_HOST} 'cd ${APP_DIR} && ${COMPOSE} logs caddy gateway'" >&2
    exit 1
  fi
  sleep 10
done
curl -fsS "https://api.${ROOT_DOMAIN}/api/v1/health"; echo

cat <<EOF

API is up at https://api.${ROOT_DOMAIN}
Netlify serves the storefront on https://${ROOT_DOMAIN} and proxies /api/* to it (see netlify.toml).
EOF
