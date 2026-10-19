# sim-phone MCP

You are the brain. This server never decides to place a call on its own.

## When to use phone tools

- Call **only** when the user explicitly asked you to call them or to dial a specific allowlisted number.
- Use `call_owner` for the configured owner. Use `dial` only for numbers on the allowlist (owner by default).
- Never dial a number that is not the owner or on the allowlist. If a dial is refused, do not retry other numbers.
- Use `answer` only when the user asked you to answer an incoming call.
- Use `hang_up` when the user asked to end the call.
- Use `speak` and `listen` only while a call is active and HFP call audio is up.
- Use `status` to check adapter power, pairing, call state, and backend before acting.

## Safety

- Nothing auto-dials on startup. There is no redial loop.
- The owner number is never returned in tool output; configure it via environment or config file.
