# Setup overview

sim-phone lets a Grok Bot or Cursor agent place **owner-only** calls through a spare phone and SIM. The computer acts as a Bluetooth **hands-free unit** (like a car kit); the phone is the cellular gateway. Pairing uses standard **Bluetooth HFP** on **Android and iPhone** — no developer mode, no USB debugging, and nothing in this plugin talks to `adb`.

## Choose your bridge host

| Path | When to use | Availability |
|------|-------------|--------------|
| **[Laptop bridge](setup-laptop-bridge.md)** (default) | Grok Bot **desktop** with **local computer access**; Bluetooth on the same machine that runs the MCP | Calls work only while the laptop is **awake**, Bluetooth is on, and the Grok app is **open** |
| **[Always-on bridge](setup-always-on.md)** (optional) | Small Linux box (Pi, old laptop) at home with the phone nearby; reach it over **Tailscale** | **24/7** when the box and phone stay paired |

The MCP server and HFP stack run on a **Linux** bridge today. See **[Platform support](platforms.md)** for macOS and Windows laptops.

## Setup flow (all paths)

1. **Install the HFP bridge** on the Linux host ([laptop](setup-laptop-bridge.md#linux) or [always-on](setup-always-on.md)).
2. **Pair the phone** like a car Bluetooth kit ([Android and iPhone notes](setup-android.md)).
3. **Configure the owner number** locally (`SIMPHONE_OWNER` or config file) — never commit real digits.
4. **Connect the plugin** in Grok Bot or Cursor (`npx -y git+https://github.com/nwcnwc/sim-phone-mcp.git` or local `bin/sim-phone-mcp.js`).
5. Run **`status`** before any call; follow the [first test call checklist](setup-android.md#first-test-call-checklist).

Telephony backends (PipeWire native vs oFono): **[hfp-backend.md](hfp-backend.md)**.

## Important warnings

- Pairing routes **call audio** to the bridge. If you pair your everyday phone, incoming calls may ring on the Linux host while connected.
- Keep phone **media volume** low; use the Bluetooth call path, not the handset speaker.
- Optional `adb` shortcuts for developers live **outside** this repo and are not required for users.
