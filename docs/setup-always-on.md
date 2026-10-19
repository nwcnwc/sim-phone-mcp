# Always-on bridge (optional)

Use a small **always-on Linux** machine (Raspberry Pi, NUC, old laptop) near the spare phone. The phone stays paired to that box; you reach the MCP from Grok Bot or Cursor over **Tailscale** (or another VPN) when your daily laptop is elsewhere.

**Why:** the default [laptop bridge](setup-laptop-bridge.md) only works while the laptop is awake and the Grok app is open. An always-on host gives **24/7** reachability for incoming `answer` and scheduled `call_owner` flows.

## Hardware

- Linux host with a working **Bluetooth adapter** (built-in or USB).
- Spare **Android or iPhone** with its own SIM, charged and in range.
- Stable power and network for the bridge host.

## Install

1. On the box, clone or install **sim-phone-mcp** and run `scripts/install-bridge-linux.sh` (or your distro’s BlueZ + PipeWire + WirePlumber packages).
2. Apply WirePlumber **hfp_hf** settings from [setup-android.md](setup-android.md) and [hfp-backend.md](hfp-backend.md).
3. Pair the phone to **this** host only (one bridge per phone).
4. Create `~/.config/sim-phone/config.json` (mode `600`) with `owner` and optional `allow` / `hfp`.
5. Join the host to **Tailscale** (or your VPN). Do not publish MCP ports to the public internet without authentication.

## Running the MCP remotely

Run `node bin/sim-phone-mcp.js` on the bridge host with `SIMPHONE_CONFIG` set. From your laptop:

- **SSH:** `ssh bridge-host 'cd sim-phone-mcp && SIMPHONE_CONFIG=... node bin/sim-phone-mcp.js'` as the stdio command in Cursor/Grok MCP config (use your SSH config host alias, not a hardcoded name in the repo).
- **Alternative:** a small wrapper service on the box that keeps stdio MCP available only on the tailnet.

Document your own host alias in private notes; the public repo uses placeholders only.

## Security

- Owner allowlist and call logs stay **on the bridge host**.
- Restrict Tailscale ACLs so only your devices can reach the bridge.
- Treat the bridge like a home telephony appliance: physical access to the paired phone implies call capability.
