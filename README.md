# Crucible

**A Solidity audit costs $30k–$100k and takes 4–6 weeks. Crucible runs the same
adversarial fight — two AI teams, a live exploit, a human veto — in under ten minutes.**

A developer submits a Solidity contract. Crucible opens a [Band](https://band.xyz)
room with two opposing AI agent teams — a Build team that defends and a Red team that
attacks — refereed by a Judge, with a human holding final approval. The Red Lead reads
the contract and **recruits attack specialists at runtime via Band's `add_participant`**.
Output: a hardening verdict with **real Anvil exploit tx hashes**, in under ten minutes.

Built for the Band of Agents Hackathon. Track 3 (Regulated & High-Stakes) primary,
Track 2 (Multi-Agent Software Dev) secondary.

---

## Repo layout

```
contracts/        Foundry project — vulnerable target, hardened reference, exploit, tests, broadcast scripts
data/             crucible-demo.json (playback stream, real tx hashes) · verdict.schema.json · provider_routing.md
agents/           AGENTS.md (6 system prompts + 12-step flow) · BAND_CONFIG.md (Band tool names, isolated)
frontend/         FRONTEND.md (design system + war-room spec)
src/              Next.js 14 app — landing page + war room (this is the web app)
scripts/          copy-demo.mjs (data/crucible-demo.json -> public/, run on predev/prebuild)
crucible_prd_v2.md  Product source of truth
```

---

## Smart contracts — Spike B (the credibility core)

Real exploits only. The vault drain and tx hashes come from a live Anvil node, never hardcoded.

```bash
# one-time: install Foundry (https://getfoundry.sh)
cd contracts
forge test -vv          # 4 tests: reentrancy drains 100->0, access-control drains, both hardened versions revert

# capture REAL on-chain tx hashes against a live node
anvil &                                                   # local node on :8545
export ANVIL=http://127.0.0.1:8545
forge script script/ReentrancyExploit.s.sol   --rpc-url $ANVIL --broadcast   # Round 1 attack() tx
forge script script/AccessControlExploit.s.sol --rpc-url $ANVIL --broadcast  # Round 2 emergencyDrain() tx
```

The exploit tx hashes printed in `contracts/broadcast/**/run-latest.json` are the ones
embedded in `data/crucible-demo.json` (replacing the old `0xFAKE_*` placeholders).

**Note on the planted reentrancy bug:** the canonical drainable form is used — `withdraw()`
sends the caller's full balance and zeroes it *after* the call (`balances[msg.sender] = 0`).
A post-call `-= amount` would underflow-revert under Solidity 0.8 and never actually drain.
The attacker also stakes a large amount so the drain completes in 2 reentrant levels rather
than ~100, which keeps it within the EVM 63/64 gas-forwarding limit on a live node.

---

## Web app

```bash
npm install
npm run dev      # http://localhost:3000  (predev copies data/crucible-demo.json -> public/)
npm run build && npm start
```

- **Landing page** (`/`) — the forge/tempered-metal design system, with a pinned
  crucible-vessel animation (blind → fire → proven) driven by GSAP ScrollTrigger.
- **War room** (`/war-room`) — three panels (participant rail · transcript · contract
  state with vault ticker) + a human **Approve** bottom bar gated behind the verdict.

### Stream mode (PRD §6.4)

The UI consumes one source-agnostic `CrucibleEvent` interface (`src/lib/events.ts`):

- `STREAM_MODE=playback` (default) — reads `data/crucible-demo.json` and emits events on
  their timestamps. **The entire demo plays end-to-end from playback without Band.**
- `STREAM_MODE=live` — (TASK 4) subscribe to the Band WebSocket and map each incoming
  message/event onto the same `CrucibleEvent` shape. The renderer does not change.

Set via `NEXT_PUBLIC_STREAM_MODE`.

---

## Provider routing (partner prizes)

Multiple providers are demonstrated across the six agents. Every LLM call is logged with a
`provider=` tag (`agents/providers.py` → `crucible.providers`); the host also shows in the
httpx logs (`api.groq.com` / `api.featherless.ai` / `api.aimlapi.com`).

**Live routing** (the default — reliable: completes recruit → real exploit → verdict):

| Agent(s) | Provider | Model | Notes |
|---|---|---|---|
| @Architect · @Engineer · @RedLead · @ReentrancySpec · @Judge | **AI/ML API** | `claude-sonnet-4-6` | Anthropic-compatible; the routing that reliably drives the full live siege and that `data/crucible-demo.json` was recorded from (`agents/siege-evidence.txt`) |
| @AccessSpec | **Featherless AI** | `unsloth/Llama-3.3-70B-Instruct` | partner-prize proof — runs alone in Round 2; logged `provider=featherless` calls + real exploit tx `0xa7c05e43…` (`agents/featherless-evidence.txt`) |

**Also wired (free option, best-effort):**
- **Groq** (`llama-3.3-70b-versatile`, free) — wired and tool-calling verified, but a dry run
  showed its 12k tokens/min free cap and Llama tool-call failures break the live recruitment
  flow, so it is not the live default. Flip `ACTIVE` → `GROQ_ROUTING` in `providers.py` to run at $0.
- **Anthropic** — documented target for RedLead/Judge once that key is funded.

Notes:
- Groq + Featherless are OpenAI-compatible → the `PydanticAIAdapter`. AI/ML is
  Anthropic-Messages-compatible → the `AnthropicAdapter`. One config map (`ACTIVE` in
  `providers.py`) routes each agent; swapping a provider is a one-line change.
- **Anti-loop:** each agent's per-message tool loop is capped (`UsageLimits.request_limit`,
  default 10) and every prompt ends with a firm "one message, then stop" — so no agent
  (Llama included) can loop indefinitely.

See `data/provider_routing.md` for the original target table.

---

## Run it yourself

Verify it's real — clone, add keys, run the agents, trigger a siege.

```bash
# 1. Contracts (real exploits run here)
cd contracts && forge test -vv        # 4/4 pass; needs Foundry (https://getfoundry.sh)
anvil &                               # local fork on :8545, kept running

# 2. Agents — register 6 Remote/External agents in the Band dashboard
#    (Crucible-Architect, -Engineer, -RedLead, -ReentrancySpec, -AccessSpec, -Judge),
#    then fill credentials:
cd ../agents
cp agent_config.yaml.example agent_config.yaml   # paste each agent's UUID + API key
cp .env .env                                     # set AIML_API_KEY (+ FEATHERLESS_API_KEY)
uv run python siege.py                # all 6 connect to Band and listen

# 3. Web app
cd ..
npm install
cp .env.local.example .env.local      # set BAND_API_KEY + BAND_ROOM_ID for the live button
npm run dev                           # http://localhost:3000
```

**Trigger a siege:** open `/war-room` and click **● Run it live**. It posts the contract
to the Band room, the agents fight for real (runtime recruitment + real Anvil exploits),
and the room streams into the war room over SSE. The page defaults to **replay** (the
recorded real run) so there's always a safe fallback.

## Run a live siege during judging — what must be running

The **● Run it live** button needs all of these up:

1. **Anvil** — `anvil` on `:8545` (the real exploits broadcast here).
2. **The 6 agents** — `cd agents && uv run python siege.py` (connected to Band, idle/listening).
3. **A pre-created Band room** containing the **4 standing agents** (Architect, Engineer,
   RedLead, Judge) — the 2 specialists are recruited at runtime, do not pre-add them.
   Put its id in `.env.local` as `BAND_ROOM_ID`, and a participant agent key as `BAND_API_KEY`.
4. **The web app** — `npm run dev` (or `npm start` after `npm run build`).
5. Funded provider credit (AI/ML API key in `agents/.env`).

If anything hiccups mid-siege, the war room's default **replay** plays the recorded real
run (with the real tx hashes) — identical visual result. Do a dry run before judging; a full
live siege takes a few minutes (real LLM turns + real `forge` broadcasts).

---

## Build status

- ✅ **TASK 1** — Foundry contracts + Spike B. 4/4 tests pass; real Anvil tx hashes captured and wired into `data/crucible-demo.json`.
- ✅ **TASK 2** — Frontend on playback. Landing + war room build clean, lint clean, full demo plays from `crucible-demo.json`. *Vercel deploy pending account auth.*
- ✅ **TASK 3** — 6 agents on Band. Full 12-step siege ran end-to-end live (2 runtime recruitments, 2 real exploits, verdict, human approval); `data/crucible-demo.json` regenerated from that real transcript.
- ✅ **TASK 4** — Live mode. `/war-room` **● Run it live** triggers a real Band siege via `/api/siege/start` and streams it over SSE (`/api/siege/stream`) onto the same `CrucibleEvent` renderer. Replay is the default fallback.

MIT License.
