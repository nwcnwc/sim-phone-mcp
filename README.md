# sim-phone-mcp

Let your AI agent call you on a real **Android or iPhone** and SIM over Bluetooth **HFP hands-free** (pair like a car kit). The **bridge host** is the headset; the phone is the cellular audio gateway. MCP tools dial, answer, hang up, speak (Kokoro TTS on the call uplink), and listen (downlink recording + optional STT).

**No developer mode.** The plugin does not use `adb`.

**Safety:** owner-centric allowlist only. `call_owner` dials the configured owner with no redirect argument. `dial` refuses any number not on the allowlist. Nothing auto-dials on startup.

**Caller ID can be spoofed.** Owner-looking calls run a local **challenge/response** before sensitive tools; wrong or silent answers enter **decoy mode** (no calls, no status, time-limited small talk). See **[docs/challenge-response.md](docs/challenge-response.md)**.

## Default setup (Grok Bot desktop)

1. Run **Grok Bot desktop** with **local computer access** on a **Linux, Windows, or macOS** laptop ([platform limits](docs/platforms.md)).
2. Pair the spare phone to that machine’s Bluetooth ([phone guide](docs/setup-android.md)).
3. Install this MCP plugin and set `SIMPHONE_OWNER` (or a private config file).

Calls work only while the laptop is **awake** and the Grok app is **open**. For 24/7, use a Pi or old laptop on [Tailscale](docs/setup-always-on.md).

Full flow: **[docs/setup.md](docs/setup.md)** · Laptop bridge: **[docs/setup-laptop-bridge.md](docs/setup-laptop-bridge.md)** · Windows: **[docs/setup-windows.md](docs/setup-windows.md)** · macOS: **[docs/setup-macos.md](docs/setup-macos.md)**

## Tools

| Tool | Purpose |
|------|---------|
| `call_owner` | Dial configured owner (`SIMPHONE_OWNER`) |
| `dial` | Dial allowlisted E.164 only |
| `answer` | Answer incoming HFP call |
| `hang_up` | End current call |
| `status` | Adapter, pairing, call state, backend (no owner digits) |
| `speak` | Kokoro TTS to HFP uplink |
| `listen` | Record downlink; transcript if STT configured |

After `call_owner` or an owner-looking inbound call, the server may run your configured challenge before the call is **verified**. Tool output includes `call_security_mode` (`idle`, `verified`, `decoy`).

## Quick start (Linux bridge)

```bash
npm install
bash scripts/install-bridge-linux.sh   # optional: distro packages
export SIMPHONE_OWNER="+10000000000"   # placeholder — do not commit a real number
node bin/sim-phone-mcp.js
```

On Windows or macOS, run the matching `scripts/install-bridge-*.ps1` / `install-bridge-macos.sh` and see the setup guides above.

Copy `config.example.json` for persistent settings. Env vars override the file.

Telephony backends: **[docs/hfp-backend.md](docs/hfp-backend.md)** · Platforms: **[docs/platforms.md](docs/platforms.md)**

## Environment

| Variable | Meaning |
|----------|---------|
| `SIMPHONE_HOME` | Data dir (default `~/.local/share/sim-phone`) |
| `SIMPHONE_OWNER` | Owner E.164 |
| `SIMPHONE_ALLOW` | Extra allowlisted numbers, comma-separated |
| `SIMPHONE_CONFIG` | JSON config file path |
| `SIMPHONE_HFP` | `auto`, `pipewire`, `ofono` (Linux), `winrt`, `macos` |
| `SIMPHONE_BRIDGE_CMD` | Override platform bridge helper command |
| `SIMPHONE_BRIDGE` | `off` to disable the bridge helper |
| `SIMPHONE_BT_ADAPTER` | BlueZ adapter path or name (Linux) |
| `SIMPHONE_VOICE` | Kokoro voice (default `af_heart`) |
| `SIMPHONE_STT_URL` | POST WAV, JSON `{ "text": "..." }` |
| `SIMPHONE_STT_CMD` | Command; WAV path as sole argument |
| `SIMPHONE_CHALLENGE_PHRASE` | Spoken challenge (local config only) |
| `SIMPHONE_CHALLENGE_ANSWER` | Expected spoken reply (never logged) |

## Plugins

- **Cursor:** `.cursor-plugin/plugin.json`
- **Grok:** `.grok-plugin/plugin.json`
- **Remote MCP:** `.mcp.json` (`npx -y git+https://github.com/nwcnwc/sim-phone-mcp.git`)

Agent skill: `skills/sim-phone/SKILL.md`.

## Tests

```bash
npm test
```

Unit tests use fakes only (no Bluetooth, D-Bus, network, or Kokoro download).

## License

Copyright (c) 2026 Nathan Cheng. All rights reserved. See [LICENSE](LICENSE). Package license: UNLICENSED.
