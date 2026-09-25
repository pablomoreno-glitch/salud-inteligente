#!/usr/bin/env bash
#
# Bootstrap a fresh Ubuntu 22.04/24.04 VPS into a host that can run the stack.
# Idempotent: safe to re-run after a failure or on an already-provisioned box.
#
#   scp deploy/provision-vps.sh root@<vps-ip>:/tmp/
#   ssh root@<vps-ip> 'bash /tmp/provision-vps.sh'
#
# It installs Docker, adds swap, locks the firewall down to SSH plus HTTP(S),
# and enables unattended security updates. It does NOT clone the repo or start
# the stack - see deploy/README.md for that, because it needs your secrets.

set -euo pipefail

SWAP_SIZE="${SWAP_SIZE:-2G}"
DEPLOY_USER="${DEPLOY_USER:-salud}"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

log "Updating base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq ca-certificates curl gnupg ufw unattended-upgrades

log "Installing Docker Engine and the compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
fi
docker --version
docker compose version

log "Adding ${SWAP_SIZE} of swap"
# 13 containers on 4 GB is comfortable at idle but has little room for a burst.
# Swap turns a spike into a slow minute instead of an OOM kill.
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
# Prefer reclaiming page cache over swapping a live service out.
sysctl -q -w vm.swappiness=10
grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
free -h

log "Capping container log growth"
# Without this the JSON logs of 13 services will eventually fill a 40 GB disk.
install -d /etc/docker
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
systemctl restart docker

log "Configuring the firewall"
# Caddy is the only thing that should be reachable. Postgres, RabbitMQ, MinIO
# and the microservices stay on the internal docker network.
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
ufw status verbose

log "Enabling unattended security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

log "Creating the ${DEPLOY_USER} deploy user"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
    install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" \
      /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
  fi
fi

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/salud-inteligente

cat <<EOF

Host is ready.

Next, as ${DEPLOY_USER}:
  git clone <repo-url> /opt/salud-inteligente
  cd /opt/salud-inteligente
  cp deploy/env.example .env
  \$EDITOR .env            # fill every secret
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

Point this DNS A record at this host before the first start, or Caddy cannot
issue certificates:
  api.<domain>
EOF
