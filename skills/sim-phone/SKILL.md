# sim-phone MCP

You are the brain. This server never decides to place a call on its own.

## Product context

- Works with **Android and iPhone** over standard Bluetooth **HFP** (car-kit pairing). Users do **not** need developer mode or `adb`.
- **Bridge hosts:** Linux (full), Windows (WinRT helper), macOS (helper; call audio may fail — see `docs/platforms.md`).
- Default Grok setup: **desktop app** + **local computer access** on the laptop; calls work only while the laptop is awake and the app is open.
- Optional **always-on Linux box** (Tailscale) for 24/7 — see `docs/setup-always-on.md`.

## Caller ID and challenge

**Caller ID can be spoofed.** A call that appears to be from the owner is not proof it is the owner.

When `challenge_enabled` is true in `status` (local config), the server automatically challenges on `call_owner` and on **incoming** calls whose reported ID matches the owner:

- Speak/listen only for the challenge until `call_security_mode` is `verified`.
- Never read or repeat the configured answer; it is not in tool output.
- If `call_security_mode` is `decoy`, you may only use `speak`, `listen`, and `hang_up` for harmless small talk. **Do not** try `call_owner`, `dial`, `answer`, or `status`. The server blocks them.
- After failures, check `owner-notify-pending.jsonl` under `SIMPHONE_HOME` and tell the owner on your normal channel that a spoofed or failed challenge occurred.

See `docs/challenge-response.md`.

## When to use phone tools

- Call **only** when the user explicitly asked you to call them or to dial a specific allowlisted number.
- Use `call_owner` for the configured owner. Use `dial` only for numbers on the allowlist (owner by default).
- Never dial a number that is not the owner or on the allowlist. If a dial is refused, do not retry other numbers.
- Use `answer` only when the user asked you to answer an incoming call.
- Use `hang_up` when the user asked to end the call.
- Use `speak` and `listen` only while a call is active and HFP call audio is up (or during decoy small talk).
- Use `status` first: check `bridge_supported`, adapter power, pairing, `telephony_available`, `challenge_enabled`, and `call_security_mode` before acting.

## Safety

- Nothing auto-dials on startup. There is no redial loop.
- The owner number is never returned in tool output; configure it via environment or config file.
