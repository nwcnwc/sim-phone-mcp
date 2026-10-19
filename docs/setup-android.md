# Android + SIM setup

Use any spare Android phone with a SIM. The PC is the Bluetooth headset (HFP hands-free); the phone carries the cellular call.

## 1. Bluetooth on the Linux host

- Install BlueZ and ensure your adapter is **powered** (`bluetoothctl power on`).
- Pair the phone from the host (`bluetoothctl pair`, `trust`, `connect`) or from the phone’s Bluetooth settings.
- Note the adapter name or object path if you have more than one radio; set `SIMPHONE_BT_ADAPTER` if needed.

## 2. Phone audio behavior

- Keep **media volume** low on the phone so music does not blast on connect.
- During a call, route audio to the **Bluetooth headset** / hands-free path, not the phone earpiece.
- On Android, confirm call audio shows as the paired PC (car kit / headset), not “Phone”.

## 3. WirePlumber: hands-free role `hfp_hf`

The host must register as **HF** (hands-free unit), not AG (audio gateway).

- **PipeWire 1.3.82+ / 1.4**: native HFP — see `docs/examples/wireplumber-05-bluetooth.conf` (set `bluez5.hfphsp-backend = "native"`, role `hfp_hf`).
- **PipeWire 1.2.x**: oFono backend — see `docs/examples/wireplumber-04-bluetooth.lua` (`bluez5.hfphsp-backend = "ofono"`).

Copy the example into your WirePlumber config directory and adjust placeholders. Restart WirePlumber / PipeWire after changes.

## 4. oFono (PipeWire 1.2 only)

When using the oFono fallback:

- Install and start `ofono` on the system bus.
- Enable the **hfp_hf** plugin; disable the audio-gateway plugin so the PC does not act as the phone-side gateway.
- See `docs/hfp-backend.md` for D-Bus details.

## 5. MCP configuration

Copy `config.example.json` to a path you control and set:

- `owner`: your E.164 number (or use `SIMPHONE_OWNER`).
- `allow`: optional extra E.164 numbers, comma-separated.
- `voice`: Kokoro voice (default `af_heart`).

Environment variables override the file. Never commit real numbers to the repo.

Point Cursor or Grok at the MCP server (`npx -y git+https://github.com/nwcnwc/sim-phone-mcp.git` or local `bin/sim-phone-mcp.js`).

## 6. First test call checklist

1. `status`: adapter powered, paired phone alias, `telephony_available: true`, correct `telephony_backend`.
2. Ask the agent to **call owner** only after you explicitly request it.
3. Confirm the phone rings and audio is on the Bluetooth call path.
4. Try `speak` with a short phrase; confirm the remote party hears it.
5. Try `listen` with STT configured (`SIMPHONE_STT_URL` or `SIMPHONE_STT_CMD`) if you want transcripts.
6. `hang_up` when finished.

Call log is local JSONL under `SIMPHONE_HOME` (default `~/.local/share/sim-phone/call-log.jsonl`); it is never uploaded.
