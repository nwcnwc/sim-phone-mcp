# Challenge / response (caller verification)

Cellular **caller ID can be spoofed**. A call that *looks* like your owner number might not be your owner. Before the agent uses phone tools for sensitive work, sim-phone runs a **challenge phrase** you configure locally.

## What happens

On every **outbound** `call_owner` and every **inbound** call whose reported caller ID matches your configured owner number:

1. The bridge speaks a short introduction and your **challenge phrase** (never the answer).
2. It listens for a spoken reply (via your STT setup, if configured).
3. **Correct answer** (forgiving match: case, punctuation, small STT errors): the call is **verified**; normal tools apply.
4. **Wrong answer or silence**: the server enters **decoy mode** — only casual `speak` / `listen` and `hang_up` work. No new calls, no `status`, no dial actions. After a configurable time it says goodbye and hangs up.
5. Failures are logged locally (`challenge-failures.jsonl` under `SIMPHONE_HOME`) and a line is appended to `owner-notify-pending.jsonl` for your bot to mention on its normal channel.

Optional **lockout**: after repeated failures from the same caller key, further challenges go straight to decoy for a cooldown period.

## Local configuration only

Put the phrase and answer in a **private** config file (mode `600`), never in the git repo:

```json
{
  "owner": "+10000000000",
  "challenge": {
    "phrase": "Who goes there?",
    "answer": "your secret reply",
    "decoy_max_seconds": 120
  }
}
```

Environment overrides (also local only):

| Variable | Meaning |
|----------|---------|
| `SIMPHONE_CHALLENGE_PHRASE` | Spoken challenge |
| `SIMPHONE_CHALLENGE_ANSWER` | Expected reply (never logged or spoken) |
| `SIMPHONE_CHALLENGE_INTRO` | Optional intro line before the phrase |
| `SIMPHONE_CHALLENGE_LISTEN_SECONDS` | Listen window (default 8) |
| `SIMPHONE_DECOY_MAX_SECONDS` | Decoy small-talk cap before hang-up |

For storage without a plaintext answer, use `answer_hash` and `answer_salt` (scrypt of the normalized answer). Generate hashes with a one-off script on your machine; do not commit real values.

## STT requirement

Challenge verification needs a transcript. Configure `stt_url` or `stt_cmd` in the same private config, or tests/dev inject listen handlers. Without STT, listen returns no transcript → treated as **silence** → decoy.

## Why this exists

Spoofed caller ID is cheap. Allowlisting numbers stops the agent from *dialing* strangers, but it does not prove who is on an incoming call. The challenge is a practical second factor for voice: something you know, spoken once per owner-looking call.

## Decoy mode enforcement

Decoy is enforced **in the MCP server**, not only in the agent skill. Tools that place calls, answer, or expose bridge status are rejected with a clear error while decoy is active.
