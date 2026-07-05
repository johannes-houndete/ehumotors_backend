#!/usr/bin/env bash
set -euo pipefail

NODE_DIR="$(cd "$(dirname "$0")/.." && pwd)/node-v22.12.0-linux-x64"
export PATH="$NODE_DIR/bin:$PATH"

echo "Using Node.js $(node --version) at $(which node)"
exec npm run dev
