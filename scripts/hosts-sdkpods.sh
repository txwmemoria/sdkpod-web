#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${SDKPODS_DOMAIN:-sdkpods.com}"
LINE="127.0.0.1 ${DOMAIN} www.${DOMAIN}"

if grep -Eq "^[[:space:]]*127\\.0\\.0\\.1[[:space:]]+.*\\b${DOMAIN}\\b" /etc/hosts; then
  echo "hosts already contains ${DOMAIN}"
  exit 0
fi

echo "Adding local DNS mapping (requires sudo):"
echo "  ${LINE}"
echo "$LINE" | sudo tee -a /etc/hosts >/dev/null
echo "done"
