# Platform support

sim-phone-mcp lets a **computer act as the Bluetooth Hands-Free (HF) unit** (the “car kit” / headset side). The **phone** is the cellular **audio gateway (AG)**. You need **call control** (dial, answer, hang up) and **two-way call audio** over HFP **SCO/eSCO** for `speak` / `listen`.

Phones (**Android and iPhone**) only need normal Bluetooth pairing — no developer mode.

| Role | Linux | Windows | macOS |
|------|-------|---------|-------|
| **Phone (cellular)** | Use Android or iPhone | Same | Same |
| **HFP bridge + MCP** | **Supported** (BlueZ + PipeWire/oFono) | **Supported** (WinRT + bridge helper) | **Partial** (bridge helper; SCO often blocked) |
| **Grok Bot desktop** | Local MCP on laptop (default) | Local MCP on laptop | Local MCP on laptop |

Setup: [setup-laptop-bridge.md](setup-laptop-bridge.md) · Windows: [setup-windows.md](setup-windows.md) · macOS: [setup-macos.md](setup-macos.md)

---

## What HFP requires

The [Bluetooth Hands-Free Profile (HFP)](https://www.bluetooth.com/specifications/specs/hands-free-profile-1-8/) defines signaling between an AG (the phone) and an HF unit (the bridge). **Call audio** uses the **SCO/eSCO** channel (narrowband 8 kHz CVSD or wideband 16 kHz mSBC). The MCP must both **control calls** and **read/write that audio path** for TTS/STT — not merely play media on a stereo (A2DP) link.

---

## Linux — **verdict: supported (recommended)**

| Capability | How |
|------------|-----|
| HF role | BlueZ + PipeWire `hfp_hf` ([WirePlumber Bluetooth roles](https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/bluetooth.html), [pipewire-props `bluez5.roles`](https://pipewire.pages.freedesktop.org/pipewire/page_man_pipewire-props_7.html)) |
| Call control | PipeWire `org.pipewire.Telephony` (1.3.82+) **or** oFono `org.ofono.VoiceCallManager` on PipeWire 1.2.x ([docs/hfp-backend.md](hfp-backend.md)) |
| Call audio | PipeWire `bluez_input.*` / `bluez_output.*` nodes during an active call (`pw-dump`, `pw-cat`, `pw-record`) |
| Practical notes | [ArchWiki Bluetooth headset / PipeWire HFP](https://wiki.archlinux.org/title/Bluetooth_headset) |

**Honest limits:** PipeWire native telephony needs a new enough PipeWire build; older distros use oFono + WirePlumber `bluez5.hfphsp-backend = "ofono"`. Real hardware pairing and SCO during a live call were not exercised in CI (no phone in automated tests).

---

## Windows — **verdict: supported with bridge helper**

| Capability | How |
|------------|-----|
| HF role / pairing | OS Bluetooth stack; phone pairs as for a headset/car kit |
| Call control | [PhoneLineTransportDevice](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.calls.phonelinetransportdevice) + [PhoneLine.Dial](https://github.com/MicrosoftDocs/winrt-api/blob/docs/windows.applicationmodel.calls/phoneline_dial_1636965279.md) (Win 10 1903+, `phoneLineTransportManagement` / related capabilities for packaged apps) |
| Call audio routing | HFP endpoints and profile switching: [Bluetooth Classic Audio (HFP)](https://learn.microsoft.com/en-us/windows-hardware/drivers/bluetooth/bluetooth-classic-audio); communications streams: [Using the communication device (WASAPI)](https://learn.microsoft.com/en-us/windows/win32/coreaudio/using-the-communication-device) |
| Phone Link | Microsoft’s **Phone Link** app already uses HFP for call audio on the PC; it competes for the same phone line — close Phone Link or unregister other HFP apps when testing sim-phone |
| sim-phone integration | `helpers/win/bridge-daemon.ps1` (JSON RPC) + Node MCP; optional **ffmpeg** on PATH for reliable downlink capture |

**Honest limits:** WinRT phone APIs expect a **foreground** host with declared capabilities; the PowerShell helper is a dev-oriented entry point — production installs may wrap the same APIs in a small signed app. `answer` / incoming-call watchers need [PhoneCall](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.calls.phonecall) APIs not fully wired in the script helper yet. Automated tests mock the bridge (no Bluetooth on CI).

**Fallback if WinRT is blocked:** run the MCP on a **Linux bridge** ([setup-always-on.md](setup-always-on.md)) or a **USB Bluetooth dongle + Linux** (BlueZ) or **Raspberry Pi** near the phone — same as other platforms.

---

## macOS — **verdict: partial — call control often yes, third-party SCO often no**

| Capability | How |
|------------|-----|
| Public APIs | [IOBluetoothHandsFree](https://developer.apple.com/documentation/iobluetooth/iobluetoothhandsfree) / [IOBluetoothHandsFreeDevice](https://developer.apple.com/documentation/iobluetooth/iobluetoothhandsfreedevice); SCO registration [IOBluetoothAddSCOAudioDevice](https://developer.apple.com/documentation/iobluetooth/iobluetoothaddscoaudiodevice) |
| Core Audio | When SCO is up, Bluetooth appears as input/output devices; macOS may switch A2DP ↔ HFP when the mic opens ([community “static” / InputDeviceGuard docs](https://github.com/maxonary/static)) |
| **Correcting the earlier claim** | macOS does **not** fully “block” all third-party HFP audio: some projects use Apple’s **HFP Audio Gateway** APIs as an **AG** (e.g. [DJI Mic 2 Bridge](https://github.com/fky1990/DJI-Mic-2-Bridge), macOS 13+) to expose SCO as Core Audio. For the **HF role** (phone → Mac as car kit), [Handsfree](https://github.com/jensb1/handsfree) reports **call control** works via `IOBluetoothHandsFreeDevice` on macOS 15+, but **SCO open fails with `kIOReturnUnsupported` on macOS 26** — so **two-way phone call audio over Bluetooth HF is not reliable** on current releases without extra hardware. |
| sim-phone integration | `helpers/darwin/bridge-daemon.swift` + Node MCP; `speak`/`listen` only work when Core Audio shows an active HFP route |

**Recommended fallbacks (cleanest first):**

1. **Linux laptop or Pi** as the bridge (same pairing flow as production Linux).
2. **ESP32 Classic BT HFP client** USB-serial to the Mac ([Handsfree kit design](https://github.com/jensb1/handsfree)) — ESP32 implements HF + SCO; Mac handles UI/recording.
3. **USB dongle on a small Linux host** (BlueZ + PipeWire/oFono) — avoid macOS kernel/USB issues reported with raw user-space BT stacks on recent macOS.

**Honest limits:** Apple does not document a supported path for arbitrary third-party apps to be the **HF unit with full SCO** on all macOS versions. Do not assume Mac-only pairing works for agent TTS/STT until `status` shows `has_call_audio` during a test call.

---

## Phone platforms (Android and iPhone)

Both support pairing a computer as Hands-Free / car kit. Pair from the phone’s Bluetooth settings.

- **Android:** In-call audio should route to the paired HF device, not “Phone”.
- **iPhone:** Settings → Bluetooth; during a call, audio should use the hands-free device.

---

## Practical combinations

1. **Linux / Windows / macOS laptop + Grok desktop (default):** MCP on the laptop with local computer access — [setup-laptop-bridge.md](setup-laptop-bridge.md).
2. **macOS with unreliable SCO:** Grok on the Mac, MCP on an **[always-on Linux bridge](setup-always-on.md)** (Tailscale).
3. **24/7:** Pi or old laptop on Tailscale — [setup-always-on.md](setup-always-on.md).

Developers may use USB/`adb` for lab automation; end users never need it.
