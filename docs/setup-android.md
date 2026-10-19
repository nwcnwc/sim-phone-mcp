# Phone pairing (Android and iPhone)

Use any spare phone with a SIM — **Android or iPhone**. Pair it to your **Linux bridge host** the same way you would pair a car Bluetooth kit. No developer mode, USB debugging, or `adb`. The sim-phone plugin does not use `adb`; optional developer shortcuts are outside this project.

Start with **[setup.md](setup.md)** for laptop vs always-on paths.

## 1. Bluetooth on the Linux bridge

- Install packages ([scripts/install-bridge-linux.sh](../scripts/install-bridge-linux.sh) or your distro).
- Ensure the adapter is **powered** (`bluetoothctl power on`).
- Pair from the phone’s Bluetooth settings or from the host (`bluetoothctl pair`, `trust`, `connect`).
- If you have multiple radios, set `SIMPHONE_BT_ADAPTER` to the adapter path or name.

**Warning:** pairing your daily driver phone sends **call audio** to the bridge while connected. Prefer a dedicated spare SIM phone.

## 2. Android

- Keep **media volume** low so music does not blast on connect.
- During a call, route audio to the **Bluetooth headset** / hands-free path, not the phone earpiece.
- In the in-call UI, confirm audio shows as the paired PC (car kit / headset), not “Phone”.

## 3. iPhone

- Settings → Bluetooth → pair the Linux host (it may appear as the computer name).
- On incoming or outgoing calls, confirm the audio source is the paired hands-free device.
- iOS treats HFP like a car kit; no extra profiles are required beyond standard pairing.
- If call audio stays on the iPhone speaker, disconnect other HFP accessories and reconnect the bridge.

## 4. WirePlumber: hands-free role `hfp_hf`

The host must register as **HF** (hands-free unit), not AG (audio gateway).

- **PipeWire 1.3.82+ / 1.4:** native HFP — `docs/examples/wireplumber-05-bluetooth.conf` (`bluez5.hfphsp-backend = "native"`, role `hfp_hf`).
- **PipeWire 1.2.x:** oFono backend — `docs/examples/wireplumber-04-bluetooth.lua` (`bluez5.hfphsp-backend = "ofono"`).

Copy the example into your WirePlumber config directory and restart PipeWire / WirePlumber.

## 5. oFono (PipeWire 1.2 only)

When using the oFono fallback:

- Install and start `ofono` on the system bus.
- Enable **hfp_hf**; disable the audio-gateway plugin so the PC does not act as the phone-side gateway.
- See [hfp-backend.md](hfp-backend.md).

## 6. MCP configuration

Copy `config.example.json` to a private path and set:

- `owner`: your E.164 number (or `SIMPHONE_OWNER`).
- `allow`: optional extra E.164 numbers.
- `voice`: Kokoro voice (default `af_heart`).

Environment variables override the file. Never commit real numbers.

Point Grok Bot or Cursor at the MCP (`npx -y git+https://github.com/nwcnwc/sim-phone-mcp.git` or local `bin/sim-phone-mcp.js`). On the **default laptop path**, use Grok desktop **local computer access** so the MCP runs on the Linux bridge host.

## 7. First test call checklist

1. `status`: `bridge_linux_supported: true`, adapter powered, paired phone alias, `telephony_available: true`, correct `telephony_backend`.
2. Ask the agent to **call owner** only after you explicitly request it.
3. Confirm the phone rings and audio is on the Bluetooth call path.
4. `speak` with a short phrase; confirm the remote party hears it.
5. `listen` with `SIMPHONE_STT_URL` or `SIMPHONE_STT_CMD` if you want transcripts.
6. `hang_up` when finished.

Call log is local JSONL under `SIMPHONE_HOME`; it is never uploaded.
