# Crucible — Product Requirements Document

**Version:** 2.0  
**Owner:** winsznx (Tim) + Divine  
**Event:** Band of Agents Hackathon — lablab.ai (June 12–19, 2026)  
**Primary Track:** Track 3 — Regulated & High-Stakes Workflows  
**Secondary Track:** Track 2 — Multi-Agent Software Development  
**Status:** Pre-build. Build window opens June 12.

---

## 0. The North Star

> **A Solidity audit costs $30k–$100k and takes 4–6 weeks. Crucible runs the same adversarial fight in under ten minutes — before you ever pay a human auditor.**

That sentence is the product. Every build decision, scope trade-off, and demo beat traces back to it. If it stops being true, the product is wrong.

---

## 1. The Problem — In Full

Smart contracts are public, immutable, and hold real money. Once deployed, a bug is a permanent open door. The DAO lost $60M to a reentrancy bug in 2016. Ronin lost $625M to an access control failure in 2022. Euler lost $197M to a flash loan logic flaw in 2023. These are not edge cases — the $10B+ in documented on-chain losses follows the same pattern: the bug was visible in the code before deployment, but nobody ran the right adversarial test.

The current audit market is a bottleneck by design:

- **Human auditors** (Trail of Bits, OpenZeppelin, Halborn) charge $30k–$100k per engagement and book 4–6 weeks out. The wait is structural — senior auditors are scarce, demand is high, and the work is manual.
- **Static analysis tools** (Slither, Mythril) catch deterministic patterns but miss economic logic bugs, composability exploits, and anything requiring multi-step reasoning across the attack surface.
- **Internal review** by the team that wrote the code is high-confidence-low-accuracy by definition — the team has the same mental model as the vulnerability.

The result: teams either wait and pay, or ship blind. There is no fast, cheap, adversarial dry-run that fits inside a development sprint.

**The unmet job-to-be-done:** A Solidity developer finishing v1 of a staking contract on a Thursday afternoon needs to know, before Monday's audit submission, whether a competent attacker can drain it. They don't need a $70k report. They need an honest fight.

---

## 2. What Crucible Is

Crucible is a smart-contract security war room powered by multi-agent AI, coordinated entirely through Band.

A developer submits a Solidity contract. Crucible spins up a Band room containing two opposing teams of AI agents — a **Build team** that defends the code and a **Red team** that attacks it — refereed by a **Judge agent**. The Red team is not pre-built: its lead reads the contract and **recruits the specialist attackers it needs at runtime** through Band's participant API. A human security lead is in the room and holds the only key that finalizes the verdict.

The output is not a report. The output is a **hardening verdict**: a structured document containing every attack that landed, every patch that held, the on-chain exploit transaction hash proving the drain was real, and a severity-weighted remediation checklist — produced in under ten minutes, before the human hits approve.

**What Crucible is not:**
- A replacement for a full human audit before mainnet deployment of high-value contracts
- A general-purpose static analysis tool
- A multi-chain scanner
- A SaaS product with billing, accounts, or persistent history
- A chatbot that gives security advice

---

## 3. Who Uses It

### Primary user — the Solidity developer (pre-audit)

Age 24–34. Building on EVM. Has a contract that will hold real funds. Has either booked or is about to book a human audit. Wants to know if there are obvious holes before the auditor bills the first hour. Has used Slither. Knows what reentrancy is. Does not have $70k or six weeks.

**The moment of use:** Thursday afternoon. Contract is feature-complete. They upload VaultStaking.sol to Crucible and watch a fight happen in a Band room. They see the vault drain. They patch the bug. They resubmit. They go into the audit Monday with higher confidence and a hardening verdict to show the auditor.

### Secondary user — the hackathon judge

Technical. Has seen 30 submissions in the last two days. Skeptical of "multi-agent" anything because most entries are three LLM calls with a chat UI over them. Has read the Band hacker guide. Knows what `add_participant` does. Will immediately recognize whether Band is load-bearing or cosmetic. Needs to understand the use case within 20 seconds of opening the submission.

### Future user — the protocol team (YC framing)

Same developer, but at a protocol with a $5M treasury. They run Crucible before every contract upgrade. The hardening verdict becomes part of their security posture documentation. The audit firm charges less because Crucible pre-filtered the obvious bugs. Runs in CI on every PR that touches contract logic.

---

## 4. The Core Differentiator — Protect Above Everything

**Runtime recruitment.** The Red Lead agent calls `add_participant` mid-conversation to pull a specialist into the live Band room based on what it found in the contract. This decision is made by the LLM, not pre-scripted. The specialist that appears depends on the vulnerability class the Red Lead identified.

This single feature does four things simultaneously:

1. It makes Band structurally load-bearing — remove Band and the fight cannot happen
2. It produces the demo's central dramatic beat — a new agent materializes in the participant rail, live, because the AI decided it needed one
3. It is genuinely hard to fake with a linear pipeline — no amount of prompt engineering produces runtime agent recruitment without a coordination layer
4. It maps directly to the hackathon's thesis — agents discovering and recruiting each other is exactly what Band is built for

**If a scope cut is ever required, cut anything before cutting runtime recruitment.**

---

## 5. End-to-End Product Flow

This is the complete user journey from contract submission to hardening verdict. Every step is a real system event, not a UI state.

### Step 0 — Submission

The developer uploads a Solidity file via the Crucible web UI. The UI creates a Band room, registers all standing agents as participants, and posts the contract source to the room with an `@Architect` mention.

**System state:** Band room created. Architect, Engineer, Red Lead, and Judge are participants. Contract source is the first message in the room transcript.

---

### Step 1 — Build team reads the code

`@Architect` receives the contract. It produces:
- A structured surface map: external functions, state variables, access modifiers, ETH-handling paths
- An initial threat model: which functions touch funds, which modifiers gate them, which paths have no guard

`@Architect` posts the surface map and @mentions `@Engineer` with the threat model.

**Band primitive:** `@mention` routing — Architect posts, Engineer receives. Red Lead does not act on this message (not mentioned).

---

### Step 2 — Engineer prepares the defense

`@Engineer` receives the threat model. It reviews each flagged path and writes a natural-language defense brief. Engineer posts the brief and @mentions `@Judge` with a copy for the record. Engineer enters listening state — it will be @mentioned again when a patch is needed.

---

### Step 3 — Red Lead reads and recruits (the central beat)

`@RedLead` has been in the room since Step 0 but has not been mentioned. It receives the original contract source (visible to all room participants) and performs its own independent analysis.

Red Lead decides which specialist to recruit based on what it found:

- Finds reentrancy pattern → recruits `@ReentrancySpecialist`
- Finds missing access control → recruits `@AccessControlSpecialist`
- Finds both → recruits both, one at a time

Red Lead calls `thenvoi_lookup_peers` to find the registered specialist handles. Red Lead calls `thenvoi_add_participant` to pull the specialist into the live room.

**This is the demo beat.** The participant rail in the UI shows a new agent appearing live. The judge watching the video sees an AI decide what kind of attacker it needs and go get one. This is not pre-scripted. The recruitment decision is made by the LLM based on the contract it read.

---

### Step 4 — The first attack (reentrancy)

`@ReentrancySpecialist` is now in the room and receives a mention from Red Lead with the contract source and the specific target function.

It produces:
- A complete, runnable MaliciousVault.sol exploit contract
- The exact Foundry test that executes the exploit
- A plain-English description of the attack

The exploit is executed against a local Anvil fork. The Anvil transaction receipt — with block number, tx hash, and the vault balance dropping from 100 ETH to 0 ETH — is posted to the Band room by the specialist agent as a `thenvoi_send_event` event.

**Non-negotiable:** The tx hash must be real. The balance drop must be real. A hardcoded number in the UI is a disqualification from demo credibility.

---

### Step 5 — The scramble (Build team patches)

`@Judge` sees the exploit event and marks the round: `ROUND 1: LANDED. Vault balance: 0 ETH.`

Judge @mentions `@Engineer` with the exploit details and demands a patch.

`@Engineer` identifies the root cause and produces a hardened version of the vulnerable function — adding `nonReentrant`, moving the balance update before the external call (checks-effects-interactions). Engineer posts the patched function and @mentions `@Judge`.

---

### Step 6 — The hold (re-attack fails)

`@ReentrancySpecialist` receives the patched contract from Judge and re-runs the exploit on Anvil. The Foundry test reverts. The vault holds.

Specialist posts the revert trace and @mentions `@Judge`: "Exploit reverted. Vault holds at 100 ETH."

Judge marks the round: `ROUND 1: BLOCKED. Patch confirmed.`

---

### Step 7 — The second front (access control)

Red Lead recruits `@AccessControlSpecialist`. Same arc as Steps 4–6, targeting the unpermissioned privileged function. The second exploit lands. The build team patches. The second re-attack fails.

**Why two attack classes matter:** One attack arc is a proof of concept. Two attack arcs with a self-assembling red team is a product. The second front demonstrates that runtime recruitment is a repeatable mechanism, not a one-time trick.

---

### Step 8 — The verdict

`@Judge` compiles the hardening verdict. The schema is fixed and non-negotiable:

```json
{
  "contract": "VaultStaking.sol",
  "session_id": "crucible-<uuid>",
  "timestamp": "<ISO-8601>",
  "rounds": [
    {
      "round": 1,
      "attack_class": "reentrancy",
      "specialist": "@ReentrancySpecialist",
      "exploit_tx_hash": "0x...",
      "vault_balance_before": "100 ETH",
      "vault_balance_after": "0 ETH",
      "result": "LANDED",
      "patch_applied": true,
      "re_attack_result": "BLOCKED"
    },
    {
      "round": 2,
      "attack_class": "access_control",
      "specialist": "@AccessControlSpecialist",
      "exploit_tx_hash": "0x...",
      "result": "LANDED",
      "patch_applied": true,
      "re_attack_result": "BLOCKED"
    }
  ],
  "severity_rating": "CRITICAL → RESOLVED",
  "remediation_checklist": [
    "Apply nonReentrant to all external functions handling ETH transfers",
    "Follow checks-effects-interactions on all withdraw paths",
    "Add onlyOwner to pause(), emergencyWithdraw(), setFee()"
  ],
  "human_approved": false,
  "approver": null
}
```

Judge posts the verdict and @mentions the human Security Lead.

---

### Step 9 — Human veto

The human Security Lead reads the verdict in the war room UI, reviews the exploit tx hashes, and clicks Approve. The verdict is finalized. `human_approved` flips to `true`. Nothing ships on the AI's say-so.

**Why this matters for Track 3:** Regulated workflows require human-in-the-loop by design. The human veto is not a UX feature — it is the correct architecture for a tool that informs deployment decisions for contracts holding real funds.

---

## 6. System Architecture

### 6.1 Band room agent roster

| Agent handle | Band registered name | Role | LLM provider |
|---|---|---|---|
| `@Architect` | Crucible-Architect | Surface mapping, threat model | AI/ML API — GPT-4.1 |
| `@Engineer` | Crucible-Engineer | Defense, patches under fire | Featherless AI — DeepSeek-V3 |
| `@RedLead` | Crucible-RedLead | Attack strategy, runtime recruitment | Anthropic — Claude Sonnet 4.6 |
| `@ReentrancySpec` | Crucible-ReentrancySpec | Reentrancy exploit + re-attack | AI/ML API — GPT-4.1 |
| `@AccessSpec` | Crucible-AccessSpec | Access control exploit + re-attack | Featherless AI — Llama-3.3-70B |
| `@Judge` | Crucible-Judge | Referee, state tracker, verdict author | Anthropic — Claude Sonnet 4.6 |
| Security Lead | Human participant | Final approval authority | — |

**Provider diversity is intentional.** Three providers (Anthropic, AI/ML API, Featherless) across 6 agents qualifies for both partner prizes. High-stakes reasoning roles (Red Lead, Judge) run on Anthropic. Code generation roles (Architect, Reentrancy) run on AI/ML API. Fast inference roles (Engineer, Access Control) run on Featherless.

### 6.2 Band primitives used

| Primitive | Where used | Why load-bearing |
|---|---|---|
| `@mention` routing | Every agent handoff | Agents only act when mentioned — keeps context windows clean across 6 agents in one room |
| `thenvoi_lookup_peers` | Step 3 — Red Lead recruits | Discovers registered specialist handles by name, not UUID |
| `thenvoi_add_participant` | Step 3 — Red Lead recruits | Pulls specialist into live room at runtime — this is the entire product differentiator |
| `thenvoi_send_event` | Steps 4, 6 — exploit results | Posts structured exploit data as a typed event, not a chat message |
| `thenvoi_get_participants` | Step 8 — Judge | Verifies human is present before finalizing verdict |
| WebSocket subscription | UI — live transcript | Renders every message and event in real time |

### 6.3 Smart contract layer

**VaultStaking.vulnerable.sol** — the deliberately vulnerable target:

```
Contract: VaultStaking
ETH balance at test start: 100 ETH (funded via Anvil)
Bug 1: reentrancy in withdraw() — balance updated after external call, no nonReentrant guard
Bug 2: missing access control on emergencyDrain() — no onlyOwner modifier, callable by anyone
Solidity: ^0.8.20
Test environment: Hardhat + Foundry + Anvil local fork
```

**MaliciousVault.sol** — the attacker contract, written by ReentrancySpecialist at runtime. Not pre-written. The agent generates it, posts it to the Band room, and it is executed via Foundry.

**VaultStaking.hardened.sol** — the patched contract, written by Engineer at runtime under fire. Not pre-written.

### 6.4 Data layer — source-agnostic event stream

The war room UI consumes a single event stream interface:

```typescript
interface CrucibleEvent {
  type: 'message' | 'exploit_result' | 'round_verdict' | 'participant_join' | 'human_approval';
  agent: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
```

This interface is satisfied by two sources, toggled via one environment variable:

- **`STREAM_MODE=live`** — Band WebSocket feed via `band-sdk`
- **`STREAM_MODE=playback`** — Pre-recorded JSON timeline (`crucible-demo.json`)

**Playback mode is a first-class build requirement, not a fallback.** The demo video is recorded against the JSON timeline before live Band integration is complete. On demo day, if Band WebSocket is flaky, the judge sees playback mode. The visual result is identical.

### 6.5 Frontend

- **Framework:** Next.js 14, React, Tailwind CSS
- **Deployment:** Vercel
- **Three-panel war room layout:**
  - Left rail: participant list — agents appear with timestamps as they join or are recruited
  - Center: live transcript — color-coded by team (blue = Build, red = Red, amber = Judge, white = human)
  - Right panel: contract state — current Solidity source with diff highlighting per patch, vault balance ticker, round result badges (LANDED / BLOCKED)
- **Human Approve button:** Prominently placed, disabled until Judge posts the verdict, requires a confirmation modal before firing

---

## 7. Agent System Prompt Contracts

Each agent has a registered Band identity and a locked system prompt under 500 tokens. Every prompt ends with an explicit next action and a specific @mention target. No agent has discretion about what to do when its turn is done.

### @Architect — Crucible-Architect

**Registered description:** Reads Solidity contracts and produces structured threat surface maps.

**System prompt:** You receive a Solidity contract source. You output exactly two things: (1) a structured surface map in markdown — list every external function, state variable, ETH-handling path, and access modifier; (2) an initial threat model — rank the three highest-risk paths by severity with one sentence each. You do not write code. You do not suggest fixes. You do not speculate. When done, @mention @Engineer with the threat model.

---

### @Engineer — Crucible-Engineer

**Registered description:** Defends Solidity contracts under adversarial attack. Produces patches on demand.

**System prompt:** You receive two message types. Type 1: an initial threat model from @Architect. Acknowledge it in one sentence and enter listening state. Type 2: an exploit result from @Judge. Read the exploit, identify the root cause in one sentence, write the minimal hardening fix for the vulnerable function only (not the whole contract), post it as a fenced Solidity code block, then @mention @Judge that the patch is ready. You never attack. You never speculate. You never produce fixes without seeing an exploit first.

---

### @RedLead — Crucible-RedLead

**Registered description:** Leads adversarial smart-contract security review. Identifies attack surface, recruits specialist attackers at runtime.

**System prompt:** You receive a Solidity contract. Analyze it independently. Identify the two most exploitable vulnerability classes. For the first class: call thenvoi_lookup_peers to find the specialist handle, call thenvoi_add_participant to recruit them, @mention the specialist with the contract source and the specific function to target. Then wait. When Round 1 is complete (Judge posts BLOCKED), recruit the second specialist the same way. You recruit one specialist at a time. You never write exploits yourself. You never @mention the Build team.

---

### @ReentrancySpec — Crucible-ReentrancySpec

**Registered description:** Writes and executes reentrancy exploits against Solidity contracts on demand.

**System prompt:** You receive a contract and a target function. Produce: (1) a complete MaliciousVault.sol exploit contract as a fenced Solidity block; (2) the Foundry test that executes it as a fenced Solidity block; (3) a one-paragraph plain-English description of the attack vector. Execute the test against the Anvil fork. Post the tx hash and the vault balance before and after. @mention @Judge with the result. If you receive a patched contract: re-run the exploit, post the revert trace, and report LANDED or BLOCKED. Nothing else.

---

### @AccessSpec — Crucible-AccessSpec

**Registered description:** Finds and exploits access control vulnerabilities in Solidity contracts.

**System prompt:** You receive a contract and a target function. Identify the missing modifier. Write a Foundry test that calls the privileged function from an unauthorized address. Execute it. Post the vulnerable function name, the missing guard, the exploit tx hash, and the attacker address used. @mention @Judge. If you receive a patched contract: re-run the test, post the revert trace, report LANDED or BLOCKED.

---

### @Judge — Crucible-Judge

**Registered description:** Referees adversarial smart-contract security reviews. Tracks state, rules rounds, compiles hardening verdicts.

**System prompt:** You are the referee. You track round state. When an exploit result arrives: post "ROUND N: LANDED. Vault balance: X ETH." and @mention @Engineer for a patch. When a re-attack result arrives: if BLOCKED post "ROUND N: BLOCKED. Patch confirmed." When all rounds are complete: compile the hardening verdict in the exact JSON schema from the PRD §5 Step 8 and post it, then @mention the Security Lead with "Approve to finalize?" You never attack. You never write code. You never finalize without human approval.

---

## 8. Demo Narrative — 2m30s Beat Sheet

| Timestamp | Beat | System event |
|---|---|---|
| 0:00–0:10 | Hook spoken and on screen: "A Solidity audit costs $50k and takes six weeks. Watch this take five minutes." | Static title card |
| 0:10–0:25 | Developer uploads VaultStaking.sol. War room opens. Four agents appear in the participant rail. | Band room created. Architect, Engineer, RedLead, Judge join. |
| 0:25–0:50 | Architect maps the surface. Engineer reads the threat model. Messages appear in the transcript, color-coded. | Steps 1–2 |
| 0:50–1:10 | **THE BEAT:** Red Lead posts "Analyzing attack surface... recruiting specialist." Participant rail shows @ReentrancySpec materializing live. | Step 3 — `add_participant` fires |
| 1:10–1:30 | Reentrancy specialist posts the exploit. Vault balance ticker drops: 100 ETH → 0 ETH. Anvil tx hash appears. | Step 4 |
| 1:30–1:45 | Judge rules: ROUND 1: LANDED. Engineer patches. Judge confirms: ROUND 1: BLOCKED. | Steps 5–6 |
| 1:45–2:05 | Red Lead recruits @AccessSpec. Second exploit lands. Build team patches. Second re-attack blocked. | Step 7 |
| 2:05–2:20 | Judge posts hardening verdict JSON. Human clicks Approve. Verdict finalizes. | Steps 8–9 |
| 2:20–2:30 | Closing card: "Crucible. Know before you pay." GitHub + live demo URL. | — |

---

## 9. Judging Criterion Map

| Criterion | How Crucible scores | The exact moment |
|---|---|---|
| **Application of Technology** | Band is structurally load-bearing. Remove `add_participant` and the Red team cannot recruit. Remove `@mention` routing and all 6 agents respond to everything — context explodes. Remove the WebSocket and the war room goes dark. Band is not a notification channel. Band is the fight. | The participant rail. A judge who knows Band sees `add_participant` fire and knows it is real. |
| **Presentation** | The demo arc is a story with a physical, visible outcome: vault balance drops from 100 ETH to 0 ETH. Every beat is legible without explanation. The use case is in sentence one of the submission. | The vault ticker hitting 0 ETH. |
| **Business Value** | Smart-contract audits are a $500M+ annual market with a clear, expensive, time-bound pain point. No explanation required for a technical audience. The business model is obvious: faster, cheaper, adversarial-by-default pre-screening for a mandatory market process. | The one-liner. "$30k–$100k, 4–6 weeks → ten minutes." |
| **Originality** | No other submission will have a self-assembling red team. No other submission will show one AI agent recruiting a different AI agent live, mid-fight, based on what it found in the code. Adversarial two-team structure does not appear in any of the example projects in the hackathon brief. | Red Lead recruiting at 0:50. |

---

## 10. Track Positioning

### Primary — Track 3: Regulated & High-Stakes Workflows

Security audits are the definition of regulated, high-stakes work. A missed vulnerability costs real money, permanently. Human-in-the-loop veto is not a UX feature — it is the correct architecture for a tool that informs deployment decisions for contracts holding real funds.

Track 3 is the least crowded bracket. The example use cases (healthcare, legal, financial services) are high-friction to demo at a hackathon. A vault being drained of 100 ETH on-screen is immediately legible to any technical judge without a domain explainer.

### Secondary — Track 2: Multi-Agent Software Development

Crucible generates Solidity code (exploits, patches) through agent collaboration. But the primary framing must be "security war room" not "coding assistant" — Codeband is Band's own reference implementation for Track 2 and judges will benchmark against it. Tag Track 2 in the submission metadata. Do not lead with it in any copy.

---

## 11. Build Plan — 6-Day Sprint

### Day 1 (June 12) — Two spikes. Nothing else ships today.

**Spike A — Band runtime recruitment:**
Register all 6 agents in Band. Write a minimal Python script: Architect and Red Lead join a room. Red Lead calls `thenvoi_lookup_peers` and `thenvoi_add_participant` to recruit Reentrancy Specialist. Confirm specialist appears as a room participant with the correct handle.

If this works: Crucible is buildable. Move to Day 2.
If restricted on free tier: activate BANDHACK26 for Pro immediately. Retry.
If still broken: post in Band Discord. This is not a recoverable failure in isolation — it is the entire product.

**Spike B — Vault exploit:**
Write VaultStaking.vulnerable.sol with the reentrancy bug and missing access control. Deploy to Anvil. Manually run a reentrancy exploit against it. Confirm vault drains 100 ETH → 0 ETH. Get the real tx hash.

**Day 1 gate:** Both spikes confirmed green before any other work starts.

---

### Day 2 (June 13) — Agent layer

- Write all 6 system prompts per §7. Lock them — no edits after this day
- Register all agents in Band with correct names, descriptions, and API keys
- Build the 12-step message routing flow in Python using `band-sdk`
- Test Steps 1–4 end-to-end: submission → Architect surface map → Red Lead recruits → Specialist posts exploit with real tx hash
- Do not touch frontend today

---

### Day 3 (June 14) — Full siege loop

- Complete Steps 5–9: Engineer patches → Judge rules → Second front opens → Verdict compiles → Human approval fires
- Fix all agent rambling, off-script behavior, and turn-order violations
- Record the complete Band room transcript to `crucible-demo.json`
- This file is the demo day insurance policy — it exists before a line of frontend is written

---

### Day 4 (June 15) — War room UI

*Note: TryAnneal deadline also falls on June 15. Front-load all Crucible UI work to morning.*

- Build three-panel layout in Next.js
- Wire to `crucible-demo.json` playback stream first
- Implement participant rail with agent avatars, join timestamps, and real-time appearance animation
- Implement vault balance ticker
- Implement round result badges (LANDED / BLOCKED)
- Implement Approve button with confirmation modal
- Deploy to Vercel with `STREAM_MODE=playback`
- Test the full demo video against the playback mode — if this works, the video is recordable

---

### Day 5 (June 16) — Live integration + partner prizes

- Switch UI to `STREAM_MODE=live` and wire to Band WebSocket
- Verify full flow runs live in the Band room with the UI rendering correctly
- Confirm AI/ML API is routing Architect and ReentrancySpec calls (AI/ML API partner prize eligibility)
- Confirm Featherless AI is routing Engineer and AccessSpec calls (Featherless partner prize eligibility)
- Record the demo video — live system preferred, JSON playback acceptable
- Both modes produce identical visual output

---

### Day 6 (June 17–18) — Submission

- Write lablab.ai submission fields: title, short description (use-case in sentence one), long description
- Final demo video edit (2m30s, tight)
- 6-slide deck: problem / product / the fight / Band's role / business case / team
- Public GitHub repo (MIT license, clean README with one-command local setup, provider routing table documented)
- Submit June 17 or 18 — one full day of buffer before the June 19 deadline

---

## 12. Risk Register

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| `add_participant` restricted on Band free tier | Medium | Critical | Day 1 Spike A. Activate BANDHACK26 Pro immediately if blocked. Contact Band Discord if Pro also fails. No other work starts until resolved. |
| Band WebSocket flaky on demo day | Medium | High | `STREAM_MODE=playback` with `crucible-demo.json` recorded Day 3. UI is visually identical. |
| Agents ramble or break turn order | High | High | System prompts capped at 500 tokens. Every prompt ends with exactly one action and one @mention target. No agent has discretion about what happens next. |
| Exploit looks staged or fake | Medium | High | Real Anvil tx hash posted to Band room by the agent as a `thenvoi_send_event`. Vault balance in UI pulls from real Anvil state via RPC. Not a hardcoded number. |
| Recruited specialist ignores the room | Medium | Medium | Specialist system prompt starts: "You are in a Band war room. You act only when @mentioned." Red Lead explicitly @mentions the specialist immediately after `add_participant` fires. |
| TryAnneal deadline conflicts (June 15) | High | Medium | Crucible UI is Day 4's morning block. TryAnneal is the afternoon block. Both deliverables are independent. |
| Codeband comparison by Track 2 judges | Low | Medium | Lead all copy and the demo video with Track 3 framing ("security war room"). Submission tags Track 2 as secondary. The adversarial two-team structure is not Codeband. |
| Partner prize disqualification | Low | Low | Provider routing table in §6.1 is the source of truth. Documented in GitHub README. Every API call tagged with provider in logs. |

---

## 13. Non-Goals (Firm)

Not in scope. Not addable during the build window regardless of time available.

- Multi-chain support (EVM only)
- More than two vulnerability classes in the demo
- Mainnet contract deployment
- Persistent user accounts, history, or billing
- Automated CI integration or CLI tool
- Flash loan, oracle manipulation, MEV, integer overflow attack classes
- Human auditor marketplace
- Token or on-chain governance of any kind

---

## 14. Post-Hackathon Roadmap (YC Framing)

**Month 1–3:** CLI tool. `crucible audit <contract.sol>` runs the war room headlessly and outputs the hardening verdict JSON. Hardhat plugin. Free for open-source contracts.

**Month 4–6:** Expand attack corpus to 8 vulnerability classes. Verdict accepted by audit firms as pre-screening evidence. Audit firm charges less — the obvious bugs are already found.

**Month 7–12:** Protocol team subscription at $2k/month. Runs on every PR touching contract logic via GitHub Actions. Net cost negative vs. audit overhead reduction.

**Month 13–18:** Audit firm partnership. Trail of Bits, OpenZeppelin, Halborn use Crucible as first-pass triage. Crucible becomes the standard pre-audit check the way Slither became the standard static analysis step.

**Market:** Smart-contract audit market ~$500M annually. Adjacent security tooling category (Tenderly, Forta, OpenZeppelin Defender) is $2B+. Crucible enters through the audit preparation wedge — faster, cheaper, adversarial by default.

---

## 15. Deliverables Checklist

**lablab.ai submission:**

- [ ] Title: Crucible
- [ ] Short description: "Crucible runs an adversarial AI war room against your Solidity contract — two teams, a live exploit, a human veto — in under ten minutes."
- [ ] Long description: problem → product → Band's role → the fight → business case
- [ ] Cover image: war room UI screenshot showing participant rail + vault balance ticker mid-fight
- [ ] Demo video: 2m30s per §8 beat sheet
- [ ] Slide deck: 6 slides — problem / product / the fight / Band's role / business case / team
- [ ] Public GitHub repo (MIT license, one-command local setup)
- [ ] Live demo URL (Vercel)
- [ ] Tech tags: Band, Solidity, Hardhat, Foundry, Anthropic, AI/ML API, Featherless AI, Next.js

**Partner prize requirements:**

- [ ] AI/ML API: Architect and ReentrancySpec route through AI/ML API. Documented in README.
- [ ] Featherless AI: Engineer and AccessSpec route through Featherless AI. Documented in README.

---

## 16. Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity ^0.8.20, Hardhat, Foundry, Anvil (local fork) |
| Agent coordination | Band SDK Python — `band-sdk[anthropic]` |
| Agent models | Anthropic Claude Sonnet 4.6 (RedLead, Judge) · AI/ML API GPT-4.1 (Architect, ReentrancySpec) · Featherless DeepSeek-V3 (Engineer) · Featherless Llama-3.3-70B (AccessSpec) |
| Frontend | Next.js 14, React, Tailwind CSS |
| Deployment | Vercel (frontend) · Railway (agent processes, persistent) |
| Event stream | Band WebSocket live feed (`STREAM_MODE=live`) or pre-recorded JSON (`STREAM_MODE=playback`) |
| Version control | GitHub (public, MIT license) |

---

*Crucible PRD v2.0 — Band of Agents Hackathon — June 12–19, 2026*  
*Track 3 primary · Track 2 secondary · Owner: winsznx (Tim) + Divine*
