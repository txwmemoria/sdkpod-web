#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export SDKPODS_ROOT="$ROOT"
export SDKPODS_DOMAIN="${SDKPODS_DOMAIN:-sdkpods.com}"
export SDKPODS_HTTP_PORT="${SDKPODS_HTTP_PORT:-8080}"
export SDKPODS_HTTPS_PORT="${SDKPODS_HTTPS_PORT:-8443}"
export SDKPODS_AUTO_TLS="${SDKPODS_AUTO_TLS:-1}"
export SDKPODS_REDIRECT_HTTP="${SDKPODS_REDIRECT_HTTP:-1}"
export RUST_LOG="${RUST_LOG:-debug,sdkpods=debug,tower_http=info}"

bash "$ROOT/scripts/seed-downloads.sh"

echo "dev mode → https://127.0.0.1:${SDKPODS_HTTPS_PORT} (also ${SDKPODS_DOMAIN} if hosts mapped)"
exec cargo run
