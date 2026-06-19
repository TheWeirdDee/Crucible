# Architecture

## Overview

Crucible is built around a dynamic, message-driven multi-agent coordination architecture. Instead of hardcoding agent interactions or relying on a centralized script to execute sequential steps, Crucible uses the **Band protocol** to run an asynchronous, event-driven security war room. 

Band is load-bearing in this architecture rather than cosmetic: it provides the discovery registry, access-control boundaries, dynamic participant recruitment, and message routing required to coordinate multiple heterogeneous agents (running on different model providers) in a single shared session. Crucially, the Red Team is not a static list of agents; the Red Lead agent dynamically inspects the contract and recruits specialized attackers at runtime using the Band API. Without Band, the system would collapse into a rigid, pre-scripted workflow incapable of dynamic team assembly.

---

## System Diagram

```mermaid
graph TD
    %% Client & Setup
    Dev[Developer] -->|Uploads Contract| Client[Next.js Client]
    Client -->|API: Create Room| BandSrv[Band Platform Server]

    %% Room Stream Mode Fork
    subgraph Stream Mode Dispatcher
        Client -->|STREAM_MODE = live| WS[Live WebSocket Connection]
        Client -->|STREAM_MODE = playback| Playback[Local JSON Event Player]
    end

    %% Build Team
    subgraph Build Team
        Arch[@Crucible-Architect]
        Eng[@Crucible-Engineer]
    end

    %% Red Team
    subgraph Red Team
        Lead[@Crucible-RedLead]
        Reent[@Crucible-ReentrancySpec]
        Access[@Crucible-AccessSpec]
    end

    %% Environment & Verification
    Anvil[Live Anvil Local Fork]

    %% Flow Steps
    BandSrv -->|1. Room Created| Arch
    Arch -->|2. Surface Map & Threat Model| Eng
    Lead -->|3. Read Contract| Lead
    Lead -->|4. band_lookup_peers| BandSrv
    BandSrv -->|Returns Specialist IDs| Lead
    Lead -->|5. band_add_participant| Reent
    Lead -->|6. band_add_participant| Access
    
    Reent -->|7a. Run Exploit| Anvil
    Access -->|7b. Run Exploit| Anvil
    
    Anvil -->|8. Exploit Tx Receipt| Judge[@Crucible-Judge]
    
    Judge -->|9. Round Landed / Patch Needed| Eng
    Eng -->|10. Patch Posted| Judge
    
    Judge -->|11. Re-attack| Reent
    Judge -->|11. Re-attack| Access
    
    Judge -->|12. compile_verdict| Human[Human Security Lead]
    Human -->|13. Approve Button| Client
    Client -->|14. Verdict Finalized| BandSrv
```

---

## Band Primitives Reference

The integration relies on seven core primitives provided by the Band API and SDK to drive the adversarial loop:

| API Call / Primitive | Flow Stage | Architectural Purpose | Why the Product Breaks Without It |
| :--- | :--- | :--- | :--- |
| `thenvoi_lookup_peers` | Round Start (RedLead) | Allows the Red Lead to query active agent nodes across the Band network filtering by metadata capability (e.g., `capability:reentrancy`). | Without it, the Red Lead cannot discover which specialist agents are online, breaking the dynamic, open-ended recruitment model. |
| `thenvoi_add_participant` | Round Start (RedLead) | Commands the Band platform to inject the discovered specialist agent's node into the active room. | Without it, recruited specialists cannot receive room messages or participate, leaving the Red Team without attackers. |
| `thenvoi_send_event` | Exploit & Patch | Publishes structured JSON payloads representing domain events (e.g., code patches or on-chain tx hashes) to the room. | Without it, agents would have to parse raw chat blocks, leading to regex extraction failures and schema misalignment. |
| `thenvoi_get_participants` | Verdict (Judge) | Queries the active session metadata to verify that a human participant (Security Lead) is registered in the channel. | Without it, the Judge could publish verdicts to empty rooms, failing the human-in-the-loop validation requirement. |
| `@mention` routing | Continuous | Filters incoming room events so an agent's runtime process is only invoked when its handle is explicitly tagged. | Without it, agents would respond to every chat message, leading to infinite token-burning loops and chaotic race conditions. |
| WebSocket subscription | Client / Agent | Keeps a persistent TCP connection open to stream incoming room transactions in real time. | Without it, clients and agents would have to poll HTTP endpoints, introducing latency and destroying the "live war room" UX. |
| Room creation | Setup | Allocates a cryptographically isolated namespace and message history for a single Solidity audit. | Without it, multiple concurrent developer audits would bleed into one another, leaking code and corrupting state machines. |

---

## Agent Identities

Crucible's war room is composed of six distinct agent roles coordinating within the Band room, each mapped to a specific LLM and constrained by a strict "prompt contract":

| Registered Name | System Role | LLM Provider | Prompt Contract (One-Sentence Summary) |
| :--- | :--- | :--- | :--- |
| `Crucible-Architect` | Static surface mapping | AI/ML API | Parses the contract code to output a structural markdown map and a three-item threat model, then tags the Engineer. |
| `Crucible-Engineer` | Defensive patch generator | Featherless | Acts only on Judge exploit reports to write minimal Solidity patches fixing target functions, then tags the Judge. |
| `Crucible-RedLead` | Red team coordinator | Anthropic | Independently reads the contract, queries the peer registry, recruits specialists, and tags them with target functions. |
| `Crucible-ReentrancySpec` | Reentrancy attacker | AI/ML API | Writes `MaliciousVault.sol` and the Foundry test, runs the attack on Anvil, and reports the resulting tx receipt. |
| `Crucible-AccessSpec` | Access control attacker | Featherless | Formulates unauthorized calls against unprotected functions, runs them on Anvil, and reports the tx details. |
| `Crucible-Judge` | Referee and state engine | Anthropic | Tracks rounds, validates landed vs. blocked states, formats the final verdict JSON, and mentions the human Security Lead. |

---

## Source-Agnostic Event Stream

To decouple the client UI from the backend networking details, the Next.js frontend consumes a unified event schema defined by the `CrucibleEvent` interface. This design allows Crucible to support two distinct execution modes governed by the `STREAM_MODE` environment variable:

```typescript
interface CrucibleEvent {
  id: string;
  type: 'message' | 'exploit_result' | 'round_verdict' | 'participant_join' | 'human_approval';
  agent: string;
  timestamp: string; // MM:SS relative time offset
  payload: {
    side: 'build' | 'red' | 'judge' | 'human';
    text?: string;
    code_block?: string;
    tx_hash?: string;
    vault_before?: string;
    vault_after?: string;
    verdict?: boolean;
    report?: HardeningVerdict;
  };
}
```

### Stream Modes:
1.  **Live Mode (`STREAM_MODE=live`)**: The frontend subscribes to the Next.js SSE endpoint `/api/siege/stream`, which reads from the live Band room WebSocket. Incoming events are parsed and immediately rendered.
2.  **Playback Mode (`STREAM_MODE=playback`)**: The frontend reads directly from `data/crucible-demo.json`. The event engine simulates a live run by emitting each event sequentially matching the relative `timestamp` intervals.

Because both modes map their data onto the `CrucibleEvent` interface, the UI layout and state transitions are identical. This ensures playback mode is a faithful representation of real on-chain actions.

---

## Contract Layer

The smart contract workspace is structured to support runtime code replacement and validation. It consists of three primary Solidity contracts:

1.  **[VaultStaking.vulnerable.sol](file:///Users/mac/Crucible/contracts/src/VaultStaking.vulnerable.sol)**: The target contract submitted by the developer. It contains two planted bugs:
    *   **Reentrancy in `withdraw()`**: The balance mapping is zeroed out *after* the low-level external call is completed (`balances[msg.sender] = 0` runs after `msg.sender.call`), violating the checks-effects-interactions pattern.
    *   **Missing Access Control on `emergencyDrain()`**: The function lacks an `onlyOwner` modifier, allowing any external caller to drain the contract's entire balance.
2.  **[MaliciousVault.sol](file:///Users/mac/Crucible/contracts/src/MaliciousVault.sol)**: A contract generated dynamically by the `@ReentrancySpec` agent at runtime. It implements a reentrant `receive()` fallback that intercept-calls the vault's `withdraw()` function recursively until the target is empty.
3.  **[VaultStaking.hardened.sol](file:///Users/mac/Crucible/contracts/src/VaultStaking.hardened.sol)**: The target reference secure contract that the `@Engineer` converges toward during patching. It fixes the reentrancy bug by executing checks-effects-interactions (zeroing balance before the transfer) and implementing a custom `nonReentrant` mutex. It fixes the access control bug by enforcing an `onlyOwner` modifier on `emergencyDrain()`.

---

## Hardening Verdict Schema

When both attack rounds are confirmed blocked, the `@Judge` agent compiles the findings into the following rigid JSON structure:

```json
{
  "contract": "VaultStaking.sol",
  "session_id": "crucible-<uuid>",
  "timestamp": "<ISO-8601-UTC-DATETIME>",
  "rounds": [
    {
      "round": 1,
      "attack_class": "reentrancy",
      "specialist": "@Crucible-ReentrancySpec",
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
      "specialist": "@Crucible-AccessSpec",
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
    "Add onlyOwner to emergencyDrain()"
  ],
  "human_approved": false,
  "approver": null
}
```

---

## Frontend Layout

The war room UI (`/war-room`) features a three-panel responsive terminal grid:

1.  **Participant Rail (Left)**: Displays active agent cards. Shows statuses (`Idle`, `Thinking`, `Recruiting`, or `Acting`) and model providers. It updates dynamically as `add_participant` events are broadcast.
2.  **Live Transcript Terminal (Center)**: Renders the chronological message stream. Custom cards highlight code blocks, execution traces, and round verdict states (`LANDED` in red, `BLOCKED` in green).
3.  **State Panel (Right)**: Contains the live **Vault Balance Ticker** (pulling active RPC state from Anvil) and **Round Badges**. When an exploit executes, the ticker counts down from `100 ETH` to `0 ETH`.
4.  **Approve Bottom Bar**: A locked user interface bar. When the Judge publishes the verdict JSON, the bar unlocks, enabling the **Approve** button. Clicking this triggers a confirmation modal that signs the verdict, setting `human_approved` to `true` and recording the user's signature.

---

## Deployment Architecture

*   **Frontend Client**: Hosted on Vercel. Standard Next.js serverless functions process the start triggers and stream playback files.
*   **Agent processes**: Deployed on Railway. Because the Band SDK requires maintaining persistent WebSocket client loops to receive `@mention` events, these agents must run on persistent virtual containers (not serverless functions) to prevent connection timeouts.

---

## See Also

*   [README.md](file:///Users/mac/Crucible/README.md) - Project overview, quickstart guides, and LLM routes.
*   [SECURITY.md](file:///Users/mac/Crucible/SECURITY.md) - Deep dive on the vulnerability details, patches, and threat models.
*   [ADVERSARIAL_TESTING.md](file:///Users/mac/Crucible/ADVERSARIAL_TESTING.md) - Exploit test specifications, execution commands, and validation logs.
