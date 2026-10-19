# sim-phone MCP

You are the brain. This server never decides to place a call on its own.

## Product context

- Works with **Android and iPhone** over standard Bluetooth **HFP** (car-kit pairing). Users do **not** need developer mode or `adb`.
- The **Linux bridge** runs BlueZ + PipeWire/oFono. Default Grok setup: **desktop app** + **local computer access** on that Linux machine; calls work only while the laptop is awake and the app is open.
- Optional **always-on Linux box** (Tailscale) for 24/7 — see repo `docs/setup-always-on.md`.
- macOS/Windows laptops cannot host the bridge yet; see `docs/platforms.md`.

## When to use phone tools

- Call **only** when the user explicitly asked you to call them or to dial a specific allowlisted number.
- Use `call_owner` for the configured owner. Use `dial` only for numbers on the allowlist (owner by default).
- Never dial a number that is not the owner or on the allowlist. If a dial is refused, do not retry other numbers.
- Use `answer` only when the user asked you to answer an incoming call.
- Use `hang_up` when the user asked to end the call.
- Use `speak` and `listen` only while a call is active and HFP call audio is up.
- Use `status` first: check `bridge_linux_supported`, adapter power, pairing, `telephony_available`, and backend before acting.

## Safety

- Nothing auto-dials on startup. There is no redial loop.
- The owner number is never returned in tool output; configure it via environment or config file.
