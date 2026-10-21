#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "Erro: xvfb-run não encontrado."
  echo "Instale no servidor:"
  echo "  sudo apt-get update && sudo apt-get install -y xvfb"
  exit 1
fi

exec xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js
