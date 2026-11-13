#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/downloads"
mkdir -p "$DIR"
# 仅当 content/apps.toml 里配置了 download_path 时，把真实安装包放进此目录。
# sync-work 走 GitHub / cargo install，无需占位文件。
echo "downloads ready: $DIR"
