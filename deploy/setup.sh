#!/usr/bin/env bash
# One-shot VM setup (Ubuntu 22.04/24.04). Repo ke root se chalao:
#   bash deploy/setup.sh qpie.company.com        # domain ke saath
#   bash deploy/setup.sh                         # bina domain (IP par http)
# Optional env: CERT_EMAIL=you@company.com (auto HTTPS), SEED=1 (admin + sample events), SETUP_UFW=1
set -euo pipefail

DOMAIN="${1:-_}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
COMPOSE="sudo docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.secrets"

echo "==> [1/8] System packages"
sudo apt-get update -y
sudo apt-get install -y curl git nginx ca-certificates openssl

echo "==> [2/8] Node 20 + PM2"
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v pm2 >/dev/null || sudo npm i -g pm2

echo "==> [3/8] Docker"
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sudo sh

echo "==> [4/8] Secrets + .env.local"
if [ ! -f deploy/.secrets ]; then
  cat > deploy/.secrets <<SEC
REDIS_PASSWORD=$(openssl rand -hex 16)
MONGO_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 48)
SEC
  chmod 600 deploy/.secrets
fi
# shellcheck disable=SC1091
source deploy/.secrets

if [ ! -f .env.local ]; then
  cat > .env.local <<ENV
MONGODB_URI=mongodb://root:${MONGO_PASSWORD}@127.0.0.1:27017/qpie?authSource=admin
REDIS_URL=redis://:${REDIS_PASSWORD}@127.0.0.1:6379
JWT_SECRET=${JWT_SECRET}
TRUST_PROXY_HOPS=1

RAZORPAY_KEY_ID=CHANGE_ME
RAZORPAY_KEY_SECRET=CHANGE_ME
RAZORPAY_WEBHOOK_SECRET=$(openssl rand -hex 24)

SMTP_USER=CHANGE_ME
SMTP_PASS=CHANGE_ME
GOOGLE_CLIENT_ID=CHANGE_ME
NEXT_PUBLIC_GOOGLE_CLIENT_ID=CHANGE_ME

SEED_ADMIN_NAME=Admin
SEED_ADMIN_EMAIL=CHANGE_ME
SEED_ADMIN_PASSWORD=CHANGE_ME
ENV
  chmod 600 .env.local
fi

# Purani .env.local copy ki ho to Redis/Mongo/proxy values VM ke hisaab se set karo (baaki keys jaisi hain waisi rahengi).
# Mongo Atlas hi rakhna ho to: KEEP_ATLAS=1 bash deploy/setup.sh ...
set_env() { if grep -q "^$1=" .env.local; then sed -i "s|^$1=.*|$1=$2|" .env.local; else echo "$1=$2" >> .env.local; fi; }
set_env REDIS_URL "redis://:${REDIS_PASSWORD}@127.0.0.1:6379"
set_env TRUST_PROXY_HOPS 1
[ "${KEEP_ATLAS:-0}" = "1" ] || set_env MONGODB_URI "mongodb://root:${MONGO_PASSWORD}@127.0.0.1:27017/qpie?authSource=admin"

if grep -q "CHANGE_ME" .env.local; then
  echo
  echo "!! .env.local mein CHANGE_ME values bharo (Razorpay, SMTP, Google, admin), phir ye script dobara chalao."
  echo "   nano $APP_DIR/.env.local"
  exit 0
fi

echo "==> [5/8] Redis + MongoDB (docker)"
$COMPOSE up -d
sleep 8

echo "==> [6/8] Build"
npm ci
npm run build
if [ "${SEED:-0}" = "1" ]; then npm run seed; fi

echo "==> [7/8] PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo "==> [8/8] Nginx"
sed "s/__DOMAIN__/${DOMAIN}/" deploy/nginx.conf.template | sudo tee /etc/nginx/sites-available/qpie >/dev/null
sudo ln -sf /etc/nginx/sites-available/qpie /etc/nginx/sites-enabled/qpie
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

if [ "${SETUP_UFW:-0}" = "1" ]; then
  sudo apt-get install -y ufw
  sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable
fi

if [ "$DOMAIN" != "_" ] && [ -n "${CERT_EMAIL:-}" ]; then
  sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d "$DOMAIN" -m "$CERT_EMAIL" --agree-tos --non-interactive --redirect
fi

echo
echo "Razorpay webhook URL   : https://${DOMAIN}/api/v1/webhooks/razorpay  (event: payment.captured)"
echo "Razorpay webhook secret : $(grep '^RAZORPAY_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)"
echo
echo "Done. Check: pm2 status | curl -I http://127.0.0.1:3000 | sudo docker ps"