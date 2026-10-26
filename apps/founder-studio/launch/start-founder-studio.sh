#!/usr/bin/env bash
# Linux: ./start-founder-studio.sh — starts the Empathia Founder Studio on this computer.
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then exec node server/serve.mjs "$@"; fi
echo "Node.js 22+ not found: opening the studio from disk (persona switching, inspector and saved states need Node)."
xdg-open index.html >/dev/null 2>&1 || echo "Open index.html in your browser."
