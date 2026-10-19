# HFP telephony backends

The Linux host acts as the Bluetooth **hands-free unit** (`hfp_hf`). The Android phone is the audio gateway. Dialing and call control go through one of two D-Bus stacks; the MCP server picks at runtime.

## Preferred: PipeWire native telephony

When PipeWire is new enough (1.4, or 1.3.82+), the **session** bus exposes `org.pipewire.Telephony`.

- WirePlumber should use `bluez5.hfphsp-backend = "native"` and the headset role **`hfp_hf`** (not `hfp_ag`).
- Modems are listed with the same `GetModems` pattern as oFono (`org.ofono.Manager` on the PipeWire telephony tree).
- Dialing may use `org.pipewire.Telephony.AudioGateway1` when present, otherwise `org.ofono.VoiceCallManager.Dial` on the modem object.
- Active calls use `org.ofono.VoiceCall` for **Answer** and **Hangup**.
- oFono is **not** required on this stack.

## Fallback: oFono `hfp_hf`

On PipeWire 1.2.x there is no `org.pipewire.Telephony`. oFono’s **hfp_hf** plugin owns the Hands-Free UUID on the **system** bus:

- `org.ofono.VoiceCallManager`: `Dial(number, hide_callerid)`, `HangupAll`, `GetCalls`
- `org.ofono.VoiceCall`: `Answer`, `Hangup`
- WirePlumber must use `bluez5.hfphsp-backend = "ofono"` so PipeWire does not register the same UUID.
- Disable oFono’s audio-gateway plugin so the PC is only the hands-free unit, not a phone-side gateway.
- **hsphfpd** is not used (not packaged on Debian bookworm).

## Runtime selection

1. If `SIMPHONE_HFP=pipewire`, use PipeWire telephony only.
2. If `SIMPHONE_HFP=ofono`, use oFono only.
3. If `SIMPHONE_HFP=auto` (default): use PipeWire when `org.pipewire.Telephony` is on the **user** bus; else oFono when `org.ofono` is on the **system** bus.
4. If neither is available, `status` reports that and dial/answer/hang_up return a clear error.

The server does **not** shell out to unrestricted AT modems or place calls any other way.

## Call audio (PipeWire)

Speech and listening use PipeWire nodes from `pw-dump` (typically `bluez_input.*` for uplink to the phone and `bluez_output.*` for downlink). Audio is never played on the default system speakers when the uplink node is missing.
