"""
Crucible siege runner — launches all 6 agents concurrently in one process.

The 4 standing agents (Architect, Engineer, RedLead, Judge) and the 2 recruitable
specialists (ReentrancySpec, AccessSpec) all connect and listen. The human kicks
off the siege from the Band UI: create a room with the 4 standing agents, paste
contracts/src/VaultStaking.vulnerable.sol, and @mention @Crucible-Architect. The
12-step flow then self-orchestrates via @mention routing; RedLead recruits the
specialists at runtime (band_add_participant), and the specialists run the REAL
Anvil exploits via their tools.

Run:
    cd agents
    uv run python siege.py
(Anvil must be running for the exploit tools: `anvil` in another terminal.)
"""

import asyncio
import logging
import os

import truststore

truststore.inject_into_ssl()  # OS cert store (corporate TLS) — before any SSL ctx

from dotenv import load_dotenv

load_dotenv()

from band import Agent

from band_config import AGENTS
from providers import ACTIVE, build_adapter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("crucible.siege")

REST_URL = os.getenv("THENVOI_REST_URL", "https://app.band.ai/")
WS_URL = os.getenv("THENVOI_WS_URL", "wss://app.band.ai/api/v1/socket/websocket")


async def main() -> None:
    agents = []
    for role, name in AGENTS.items():
        agent = Agent.from_config(
            role,
            adapter=build_adapter(role),
            ws_url=WS_URL,
            rest_url=REST_URL,
        )
        provider, model = ACTIVE[role]
        log.info("prepared %s (%s) -> provider=%s model=%s", name, role, provider, model)
        agents.append(agent)

    log.info("starting all %d Crucible agents…", len(agents))
    await asyncio.gather(*(a.run() for a in agents))


if __name__ == "__main__":
    asyncio.run(main())
