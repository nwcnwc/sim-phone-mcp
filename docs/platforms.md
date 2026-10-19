# Platform support

sim-phone-mcp implements telephony over **Linux**: BlueZ for pairing status, and **PipeWire** or **oFono** for HFP call control. Phones (**Android and iPhone**) only need normal Bluetooth pairing — no developer mode.

| Role | Linux | macOS | Windows |
|------|-------|-------|---------|
| **Phone (cellular)** | N/A (use Android or iPhone) | Same | Same |
| **HFP bridge + MCP** | **Supported** (BlueZ + PipeWire/oFono) | **Not supported** as bridge host | **Not supported** as bridge host |
| **Grok Bot desktop (agent)** | Local MCP on Linux laptop | Agent on Mac; bridge must be Linux elsewhere | Agent on PC; bridge must be Linux elsewhere |

## Phone platforms (Android and iPhone)

Both support pairing a computer as a **Hands-Free** / car-kit device over Bluetooth. Users pair from the phone’s Bluetooth settings; no `adb`, no Apple configurator, no jailbreak.

- **Android:** confirm in-call audio is routed to the paired headset, not “Phone”.
- **iPhone:** Settings → Bluetooth → paired device; during a call, audio should use the hands-free device. iOS may prefer the most recently used HFP accessory.

## Why Linux-only for the bridge

- **Linux** exposes the HF role through BlueZ and PipeWire/oFono D-Bus APIs this server already uses.
- **macOS** does not give third-party apps a supported path to full HFP **call audio** (SCO); call-control APIs exist but SCO is blocked or incomplete for typical app use (see community “car kit” projects that add hardware).
- **Windows** routes HFP audio through system drivers; call control is available via WinRT `PhoneLine*` APIs, but custom uplink/downlink capture for agent TTS/STT is not implemented in sim-phone-mcp and would require a separate backend.

## Practical combinations

1. **Linux laptop + Grok desktop (default):** everything on one machine — [setup-laptop-bridge.md](setup-laptop-bridge.md).
2. **Mac or Windows laptop + Grok desktop:** run the MCP on an **[always-on Linux bridge](setup-always-on.md)** (Tailscale recommended).
3. **Developers:** USB/`adb` helpers for lab automation are **optional** and **outside** the plugin; end users never need them.
