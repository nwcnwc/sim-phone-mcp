#!/usr/bin/env bash
set -euo pipefail
echo "sim-phone macOS bridge:"
echo "  - Install Xcode Command Line Tools if swift is missing: xcode-select --install"
echo "  - Pair phone as Hands-Free in System Settings → Bluetooth."
echo "  - Read docs/platforms.md for SCO limitations; use a Linux bridge if audio fails."
if ! command -v swift >/dev/null 2>&1; then
  echo "WARNING: swift not found."
fi
