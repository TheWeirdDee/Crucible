# Spike A — Band runtime recruitment

Proves the make-or-break mechanic: can one agent recruit another into a room at runtime?

## Result — ✅ GREEN (2026-06-14)

`spike-recruiter` read a task, called `band_lookup_peers`, found `spike-specialist`, called
`band_add_participant` to pull it into the live room, and @mentioned it — the specialist
joined and replied. **Same-owner agents are auto-discoverable as peers; no contact step
needed.** Raw log evidence in [`spike-a-evidence.txt`](spike-a-evidence.txt). LLM routed
through AI/ML API (`ANTHROPIC_BASE_URL=https://api.aimlapi.com`, model `claude-sonnet-4-6`).
Real tool names are `band_lookup_peers` / `band_add_participant` (not `thenvoi_*`).

## Setup
1. Create two **Remote/External** agents in the Band dashboard: `spike-recruiter`, `spike-specialist`.
   Copy each one's **API key (shown once)** and **Agent UUID**.
2. Fill `agent_config.yaml` (the 4 Band values) and `.env` (`ANTHROPIC_API_KEY`). Both are gitignored.

## Run (two terminals)
```bash
cd spike
uv run python specialist.py   # terminal 1
uv run python recruiter.py    # terminal 2
```
If `uv run` errors on TLS while syncing, prefix with `UV_SYSTEM_CERTS=1`.

## Test
In the Band UI, create a room containing **only** spike-recruiter and send:

> A reentrancy bug needs a specialist. Find spike-specialist and bring them into this room.

Watch the recruiter call `band_lookup_peers` -> `band_add_participant`, then @mention the
specialist, which should appear in the room and reply.

## Notes
- Real recruitment tools are `band_lookup_peers` / `band_add_participant` (base tools, on by default).
- `band_lookup_peers` is server-filtered — if same-owner agents aren't auto-discoverable as
  peers, recruitment needs a contact step first (`band_add_contact`). The spike tells us which.
