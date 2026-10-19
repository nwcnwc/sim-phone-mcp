# sim-phone-mcp

Let your AI agent call you on a real Android phone and SIM over Bluetooth **HFP hands-free**. The Linux PC is the headset; the phone is the cellular audio gateway. MCP tools dial, answer, hang up, speak (Kokoro TTS on the call uplink), and listen (downlink recording + optional STT).

**Safety:** owner-centric allowlist only. `call_owner` dials the configured owner with no redirect argument. `dial` refuses any number not on the allowlist. Nothing auto-dials on startup.

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

## Quick start

```bash
npm install
export SIMPHONE_OWNER="+10000000000"   # your number — do not commit
node bin/sim-phone-mcp.js
```

Optional JSON config: copy `config.example.json` (empty placeholders). Env vars override the file.

See **[docs/setup-android.md](docs/setup-android.md)** for pairing, WirePlumber `hfp_hf`, and first-call checks. Telephony backends: **[docs/hfp-backend.md](docs/hfp-backend.md)**.

## Environment

| Variable | Meaning |
|----------|---------|
| `SIMPHONE_HOME` | Data dir (default `~/.local/share/sim-phone`) |
| `SIMPHONE_OWNER` | Owner E.164 |
| `SIMPHONE_ALLOW` | Extra allowlisted numbers, comma-separated |
| `SIMPHONE_CONFIG` | JSON config file path |
| `SIMPHONE_HFP` | `auto`, `pipewire`, or `ofono` |
| `SIMPHONE_BT_ADAPTER` | BlueZ adapter path or name |
| `SIMPHONE_VOICE` | Kokoro voice (default `af_heart`) |
| `SIMPHONE_STT_URL` | POST WAV, JSON `{ "text": "..." }` |
| `SIMPHONE_STT_CMD` | Command; WAV path as sole argument |

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
