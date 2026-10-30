#!/bin/bash
# macOS: double-click to start the Empathia Founder Studio on this computer.
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  node server/serve.mjs
else
  echo "Node.js 22 or later is not installed, so the studio opens straight from disk instead."
  echo "Everything works except automatic persona switching, the data inspector and saved states."
  echo "To get those, install Node.js from https://nodejs.org and double-click this file again."
  open "index.html"
fi
