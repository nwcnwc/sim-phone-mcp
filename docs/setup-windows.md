# Windows laptop bridge

Run sim-phone-mcp on **Windows 10 (1903)+** or **Windows 11** with the built-in Bluetooth stack. Pair the spare phone as a **Hands-Free** device (same as a car kit).

## Prerequisites

- Grok Bot **desktop** with **local computer access** (or Cursor MCP on the same PC).
- Node.js 20+.
- Phone paired: Settings → Bluetooth → your PC; confirm a **Hands-Free** / telephony link (not stereo-only).
- Close **Phone Link** / other apps that own the phone line while testing.

## Install

```powershell
git clone https://github.com/nwcnwc/sim-phone-mcp.git
cd sim-phone-mcp
npm install
powershell -ExecutionPolicy Bypass -File scripts/install-bridge-windows.ps1
```

Copy `config.example.json` and set `owner` locally (never commit a real number).

## Bridge helper

The MCP talks to `helpers/win/bridge-daemon.ps1` over JSON lines (override with `SIMPHONE_BRIDGE_CMD`).

| Variable | Meaning |
|----------|---------|
| `SIMPHONE_HFP` | `auto` (default) or `winrt` on Windows |
| `SIMPHONE_BRIDGE` | `off` to disable the helper |
| `SIMPHONE_BRIDGE_CMD` | Custom command to start the helper |

Telephony uses [PhoneLineTransportDevice](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.calls.phonelinetransportdevice) when the host process is allowed to access it. Packaged apps must declare `phoneLineTransportManagement` / `phoneCall` capabilities ([RequestAccessAsync](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.calls.phonelinetransportdevice.requestaccessasync)).

## Call audio (`speak` / `listen`)

Windows exposes HFP capture/playback as **Hands-Free** audio endpoints when a call is active ([Bluetooth Classic Audio](https://learn.microsoft.com/en-us/windows-hardware/drivers/bluetooth/bluetooth-classic-audio)). The helper plays TTS to the default communications path and can record via **ffmpeg**:

```powershell
winget install Gyan.FFmpeg
```

Select the phone’s **Hands-Free** microphone in **Settings → Sound** before `listen`.

## Run

```powershell
$env:SIMPHONE_OWNER = "+10000000000"
$env:SIMPHONE_HFP = "auto"
node bin/sim-phone-mcp.js
```

Use MCP `status` — expect `bridge_platform` `win32`, `telephony_backend` `winrt`, `bridge_supported` true.

## WSL2

WSL2 does **not** expose a reliable Bluetooth HFP bridge. Run the MCP on native Windows or use a [Linux always-on bridge](setup-always-on.md).
