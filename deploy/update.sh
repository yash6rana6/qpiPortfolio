#!/usr/bin/env bash
# Naya code deploy karne ke liye: bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
npm ci
npm run build
pm2 reload qpie --update-env