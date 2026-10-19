#!/usr/bin/env bash
# Install Bluetooth HFP bridge packages on common Linux distros (no secrets, no hostnames).
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "sim-phone HFP bridge install is for Linux only. See docs/platforms.md for macOS/Windows."
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y bluez pipewire wireplumber pipewire-pulse ofono
  echo "Debian/Ubuntu: copy docs/examples/wireplumber-* into WirePlumber config, then restart pipewire/wireplumber."
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y bluez pipewire wireplumber pipewire-pulseaudio ofono
  echo "Fedora: enable hfp_hf in WirePlumber bluetooth config (see docs/setup-android.md)."
elif command -v pacman >/dev/null 2>&1; then
  sudo pacman -S --needed bluez pipewire wireplumber ofono
  echo "Arch: configure WirePlumber bluetooth.lua for hfp_hf (see docs/setup-android.md)."
else
  echo "Unknown package manager. Install: bluez, pipewire, wireplumber, ofono (if PipeWire < 1.3.82 telephony)."
  exit 1
fi

echo "Next: pair phone (docs/setup-android.md), set SIMPHONE_OWNER, run node bin/sim-phone-mcp.js"
