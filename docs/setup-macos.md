# macOS laptop bridge

Run sim-phone-mcp on **macOS 13+** with Xcode command-line tools (for `swift`). Pair the spare phone as **Hands-Free** in System Settings → Bluetooth.

Read **[platforms.md](platforms.md)** first: on many macOS versions the **HF SCO audio path is unreliable** for third-party apps. Use this path when `status` shows call audio during a test call; otherwise use a [Linux bridge](setup-always-on.md).

## Install

```bash
git clone https://github.com/nwcnwc/sim-phone-mcp.git
cd sim-phone-mcp
npm install
bash scripts/install-bridge-macos.sh
```

## Bridge helper

Default: `swift helpers/darwin/bridge-daemon.swift` (override with `SIMPHONE_BRIDGE_CMD`).

| Variable | Meaning |
|----------|---------|
| `SIMPHONE_HFP` | `auto` or `macos` |
| `SIMPHONE_BRIDGE` | `off` to disable |

APIs: [IOBluetoothHandsFreeDevice](https://developer.apple.com/documentation/iobluetooth/iobluetoothhandsfreedevice). Community reference for SCO limits: [Handsfree (ESP32 fallback)](https://github.com/jensb1/handsfree).

## Run

```bash
export SIMPHONE_OWNER="+10000000000"
export SIMPHONE_HFP=auto
node bin/sim-phone-mcp.js
```

Check `status`: `bridge_platform` `darwin`, `telephony_backend` `macos`.

## Fallbacks

1. **Linux laptop or Pi** as bridge — [setup-always-on.md](setup-always-on.md).
2. **ESP32 Classic Bluetooth** USB kit talking HFP to the phone, serial to the Mac (see Handsfree project above).
