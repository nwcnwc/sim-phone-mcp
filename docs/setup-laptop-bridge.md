# Laptop bridge (default)

This is the recommended path for Grok Bot **desktop** users: enable **local computer access** so the bot can run the sim-phone MCP on your machine. Your laptop’s Bluetooth pairs to the spare phone; no Raspberry Pi or Tailscale required.

**Limitation:** calls only work while the laptop is **awake**, Bluetooth is powered, the phone stays paired, and the Grok desktop app is **running**. Closing the app or sleeping the laptop stops the bridge.

## Linux (fully supported)

The MCP server, BlueZ, PipeWire, and oFono (when needed) all run on the same Linux laptop.

1. Install bridge packages (Debian/Ubuntu example):

   ```bash
   bash scripts/install-bridge-linux.sh
   ```

   Or install manually: BlueZ, PipeWire, WirePlumber, and on PipeWire 1.2.x also **oFono**. See [setup-android.md](setup-android.md) for WirePlumber `hfp_hf` examples.

2. Pair the phone from Bluetooth settings on the phone or `bluetoothctl` on the laptop.

3. Set owner config and start the MCP (see [README](../README.md)).

4. In Grok Bot desktop, install the sim-phone plugin and allow local MCP when prompted.

## macOS

Apple exposes some Hands-Free APIs to apps, but **third-party apps cannot rely on full HFP call audio (SCO)** on current macOS releases the way Linux does with BlueZ. Community projects that act as a “car kit” on Mac often use **extra hardware** (for example a small Bluetooth module) because the OS blocks SCO in user space.

**For sim-phone-mcp today:** use a **Linux laptop**, or use the **[always-on Linux bridge](setup-always-on.md)** and run the MCP there while Grok desktop talks to it over the network (SSH stdio or remote MCP, per your Grok/Cursor setup). Do not expect native macOS-only pairing with this plugin until a supported Mac telephony backend exists.

## Windows

Windows supports HFP **call control** for store-style apps via `PhoneLineTransportDevice` / `PhoneLine` (same family as Phone Link). **Raw HFP audio injection** for custom TTS on the call uplink is driver-level; this MCP does not implement a Windows telephony backend yet.

**For sim-phone-mcp today:** use a **Linux laptop** for the bridge, or an **[always-on Linux box](setup-always-on.md)** on your LAN/Tailscale. WSL2 is not a supported Bluetooth bridge (USB/BT passthrough is unreliable for HFP).

## Cursor on a Linux laptop

Use `.cursor-plugin/plugin.json` or `.mcp.json`. Point `SIMPHONE_CONFIG` at your local JSON file in the MCP server environment if needed.
