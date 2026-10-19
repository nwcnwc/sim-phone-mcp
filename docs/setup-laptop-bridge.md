# Laptop bridge (default)

Grok Bot **desktop** with **local computer access**: the bot runs sim-phone-mcp on your **laptop**. Pair the spare phone over Bluetooth HFP — no Pi or Tailscale required.

**Limitation:** calls work while the laptop is **awake**, Bluetooth is on, the phone stays paired, and the Grok app is **running**.

## Linux (fully supported)

BlueZ + PipeWire/oFono on the same machine. See [setup-android.md](setup-android.md) and `scripts/install-bridge-linux.sh`.

## Windows

Native bridge via WinRT + `helpers/win/bridge-daemon.ps1`. See **[setup-windows.md](setup-windows.md)**.

## macOS

Bridge helper via Swift; **SCO/call audio may be unavailable** on recent macOS — read **[platforms.md](platforms.md)** and **[setup-macos.md](setup-macos.md)**. If `speak`/`listen` fail during a test call, use an **[always-on Linux bridge](setup-always-on.md)**.

## Cursor on any supported laptop

Use `.cursor-plugin/plugin.json` or `.mcp.json`. Set `SIMPHONE_CONFIG` in the MCP server environment.
