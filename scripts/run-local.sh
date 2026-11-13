#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HTTP_PORT="${SDKPODS_HTTP_PORT:-80}"
HTTPS_PORT="${SDKPODS_HTTPS_PORT:-443}"

export SDKPODS_ROOT="$ROOT"
export SDKPODS_DOMAIN="${SDKPODS_DOMAIN:-sdkpods.com}"
export SDKPODS_HTTP_PORT="$HTTP_PORT"
export SDKPODS_HTTPS_PORT="$HTTPS_PORT"
export SDKPODS_AUTO_TLS="${SDKPODS_AUTO_TLS:-1}"
export SDKPODS_REDIRECT_HTTP="${SDKPODS_REDIRECT_HTTP:-1}"
export RUST_LOG="${RUST_LOG:-info,sdkpods=info,tower_http=info}"

bash "$ROOT/scripts/seed-downloads.sh"

need_priv=0
if [[ "$HTTP_PORT" -lt 1024 || "$HTTPS_PORT" -lt 1024 ]]; then
  need_priv=1
fi

BIN="$ROOT/target/release/sdkpods"
if [[ ! -x "$BIN" ]]; then
  echo "building release binary..."
  cargo build --release
fi

echo "SDK Pods → https://${SDKPODS_DOMAIN}:${HTTPS_PORT} (http ${HTTP_PORT} redirects)"
if [[ "$need_priv" -eq 1 && "$(id -u)" -ne 0 ]]; then
  echo "ports <1024 require elevated privileges; re-running with sudo..."
  exec sudo -E "$BIN"
fi

exec "$BIN"
