# Crucible

A Solidity audit costs $50k and takes six weeks. Crucible runs the same adversarial fight in under ten minutes.

Crucible is a smart-contract security war room powered by multi-agent AI coordinated through the Band protocol. When a developer submits a Solidity contract, Crucible spins up a Band room containing two opposing agent teams—Build (Architect and Engineer) versus Red (RedLead and runtime-recruited vulnerability specialists)—refereed by a Judge agent. The Red Lead dynamically analyzes the target contract and recruits the exact specialist needed (e.g., ReentrancySpec or AccessSpec) by executing runtime peer queries, while a human Security Lead holds the sole approval key to authorize and finalize the hardening verdict containing real transaction hashes executed on a live Anvil fork.

---

## Demo

![Crucible Live Siege Demo](/public/crucible-demo.gif)
*Crucible Live Siege: The multi-agent Build team defending against a runtime-recruited Red Team specialist on a live Anvil fork, producing real on-chain transaction receipts.*

---

## Quickstart

Run a complete local simulation (using `STREAM_MODE=playback` by default, which reproduces the identical visual results of the live Band run without requiring live API keys):

```bash
# 1. Clone the repository and install dependencies
git clone https://github.com/winsznx/Crucible.git
cd Crucible
npm install

# 2. Build and start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the interactive landing page and access the war room.

For live adversarial execution against a local Ethereum testnet, run the following command sequence:

```bash
# Start a local Anvil node (required for executing real exploit transactions)
anvil --port 8545

# Set up agent environment variables and launch the agent processes
cd agents
pip install band-sdk
cp .env.example .env  # Configure your API keys
python siege.py       # Starts agent listening loops

# Start the web client in live mode
cd ../
npm run dev
```

---

## Environment Variables

Configure the following environment variables in your `.env` (for agents) or `.env.local` (for the frontend app) files:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `STREAM_MODE` | Frontend | Controls the stream source. Set to `playback` to read from the recorded JSON transcript or `live` to connect directly to the Band WebSocket stream. |
| `ANTHROPIC_API_KEY` | Agents | API key for Anthropic. Used for routing `Crucible-RedLead` and `Crucible-Judge` models. |
| `AIML_API_KEY` | Agents | API key for the AI/ML API gateway. Used to route `Crucible-Architect` and `Crucible-ReentrancySpec` models. |
| `FEATHERLESS_API_KEY` | Agents | API key for the Featherless API. Used to route `Crucible-Engineer` and `Crucible-AccessSpec` models. |
| `BAND_ROOM_ID` | Both | The UUID of the active Band coordination room where agent conversations are exchanged. |
| `ARCHITECT_AGENT_ID` | Agents | Unique registration identifier for the Architect agent on the Band platform. |
| `ENGINEER_AGENT_ID` | Agents | Unique registration identifier for the Engineer agent on the Band platform. |
| `REDLEAD_AGENT_ID` | Agents | Unique registration identifier for the Red Lead agent on the Band platform. |
| `REENTRANCY_SPEC_AGENT_ID`| Agents | Unique registration identifier for the Reentrancy specialist agent on the Band platform. |
| `ACCESS_SPEC_AGENT_ID` | Agents | Unique registration identifier for the Access Control specialist agent on the Band platform. |
| `JUDGE_AGENT_ID` | Agents | Unique registration identifier for the Judge agent on the Band platform. |

---

## Agent Provider Routing

Crucible utilizes a heterogeneous LLM provider routing architecture to distribute specialized tasks to the most suitable models and qualify for key hackathon partner prizes. 

| Agent / Handle | Band Registered Name | Provider | Model | Logic Role |
| :--- | :--- | :--- | :--- | :--- |
| `@RedLead` | `Crucible-RedLead` | **Anthropic** | `claude-3-5-sonnet` | High-stakes reasoning, threat analysis, and runtime peer recruitment. |
| `@Judge` | `Crucible-Judge` | **Anthropic** | `claude-3-5-sonnet` | State machine referee, round validation, and verdict construction. |
| `@Architect` | `Crucible-Architect` | **AI/ML API** | `gpt-4o` | Initial static code analysis, control-flow parsing, and surface mapping. |
| `@ReentrancySpec` | `Crucible-ReentrancySpec`| **AI/ML API** | `gpt-4o` | Dynamic generation of malicious exploit contracts and reentrancy test cases. |
| `@Engineer` | `Crucible-Engineer` | **Featherless** | `deepseek-v3` | Patch synthesis, vulnerability repair, and code hardening. |
| `@AccessSpec` | `Crucible-AccessSpec` | **Featherless** | `llama-3.3-70b` | Target identification and unauthorized access execution. |

---

## Project Structure

```
Crucible/
├── agents/             # Python agent implementations using the Band SDK
│   ├── AGENTS.md       # Comprehensive list of system prompts and agent rules
│   ├── BAND_CONFIG.md  # Low-level Band API bindings and configuration reference
│   ├── band_config.py  # Central mapping of agent handles and tool definitions
│   ├── exploit_tools.py# Python callables running shell exploits against the Anvil node
│   ├── prompts.py      # Declarative system prompts for the 6 agent instances
│   ├── providers.py    # LLM adapter registry and partner prize provider routing
│   └── siege.py        # Main execution coordinator subscribing to Band room feeds
├── contracts/          # Smart contract source files and testing framework
│   ├── foundry.toml    # Foundry configuration specifying optimizer and test settings
│   ├── src/            # Target contracts: vulnerable, exploit, and reference hardened
│   │   ├── MaliciousVault.sol         # Reentrancy attacker exploit contract
│   │   ├── VaultStaking.hardened.sol   # Reference secure staking contract
│   │   └── VaultStaking.vulnerable.sol # Target vulnerable staking contract
│   ├── script/         # Solidity deployment and live exploit broadcast scripts
│   └── test/           # Local unit and integration tests executing exploit logic
├── data/               # Persistent data models, JSON playback logs, and schemas
│   ├── crucible-demo.json  # Saved complete siege trace from real on-chain runs
│   ├── provider_routing.md # partner prize eligibility checklist
│   └── verdict.schema.json # JSON schema defining the Judge's structured output
├── frontend/           # Web interface specifications
│   └── FRONTEND.md     # Panel layouts, component designs, and UI state rules
├── scripts/            # Build and packaging automation utilities
├── src/                # Next.js 14 Web Application
│   ├── app/            # App router pages (Landing and War Room UI)
│   ├── components/     # UI components (live ticker, terminal transcript, and panels)
│   └── lib/            # Event parsing, types, and WebSocket communication logic
└── package.json        # Node project configuration and package scripts
```

---

## Tech Stack

*   **Smart Contracts**: Solidity `^0.8.20`, Hardhat (compilation), Foundry/Anvil (local RPC node fork and script execution).
*   **Multi-Agent Coordination**: Band SDK (Python), PydanticAI (OpenAI-compatible adapters), Anthropic Messages API.
*   **Frontend Client**: Next.js 14 (React), Tailwind CSS (styling), GSAP ScrollTrigger (landing animations), WebSocket API.
*   **Deployment**: Vercel (web application hosting), Railway (persistent background agent workers).

---

## License

This project is licensed under the MIT License - see the [LICENSE](file:///Users/mac/Crucible/LICENSE) file for details.

---

## See Also

*   [ARCHITECTURE.md](file:///Users/mac/Crucible/ARCHITECTURE.md) - Internal agent flow, system diagrams, and Band API integration primitives.
*   [SECURITY.md](file:///Users/mac/Crucible/SECURITY.md) - Threat models, vulnerability details, and on-chain exploit proof verification.
*   [ADVERSARIAL_TESTING.md](file:///Users/mac/Crucible/ADVERSARIAL_TESTING.md) - Local test suites, runtime contract compilation, and the Judge's test assertions.
