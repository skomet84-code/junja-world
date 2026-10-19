#!/usr/bin/env bash
# Run as root on an EXISTING, user-approved Google Compute Engine VM.
# This does not create cloud resources, set billing, or change DNS.
set -euo pipefail
if [[ "${EUID}" -ne 0 ]]; then echo "Run with sudo"; exit 1; fi
if [[ ! -f /etc/junja-village.env ]]; then
  echo "Create root-only /etc/junja-village.env with VILLAGE_DATABASE_URL first; no live DB values go into Git.";
  exit 1
fi
chmod 600 /etc/junja-village.env
if ! grep -Eq '^(VILLAGE_DATABASE_URL|DATABASE_URL)=' /etc/junja-village.env; then
  echo "Existing PostgreSQL connection must be configured first; stopping to protect user saves."; exit 1
fi
command -v git >/dev/null || { echo "Install git first";exit 1; }
command -v npm >/dev/null || { echo "Install Node.js 22 and npm first";exit 1; }
node_major=$(node -p "process.versions.node.split('.')[0]")
if [[ "$node_major" != 22 ]]; then echo "Node.js 22.x is required";exit 1;fi
if ! id junja >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/junja --shell /usr/sbin/nologin junja
fi
mkdir -p /opt/junja-village
if [[ ! -d /opt/junja-village/.git ]]; then
  if [[ -n "$(find /opt/junja-village -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    echo "Existing /opt/junja-village is not a git checkout. Refusing overwrite";exit 1
  fi
  git clone --branch feat/village-v50-economy-release --single-branch https://github.com/skomet84-code/junja-world.git /opt/junja-village
else
  git -C /opt/junja-village fetch origin feat/village-v50-economy-release
  git -C /opt/junja-village checkout feat/village-v50-economy-release
  git -C /opt/junja-village pull --ff-only
fi
cd /opt/junja-village/life
npm install --omit=dev --no-audit --no-fund
cp deploy/junja-village.service /etc/systemd/system/junja-village.service
chown -R root:root /opt/junja-village
chmod -R a+rX /opt/junja-village
systemctl daemon-reload
systemctl enable --now junja-village
systemctl --no-pager status junja-village || true
curl -fsS http://127.0.0.1:3000/health
echo
echo "VM local health only. DO NOT update public links before HTTPS, account-save and multi-user verification."
