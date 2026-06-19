"""
spike-recruiter — proves runtime recruitment.

When given a task in a room, it discovers peers, pulls spike-specialist into the
room at runtime, and @mentions it. Emit.EXECUTION is on so the band_lookup_peers
and band_add_participant tool calls are posted as visible events in the room.

Run in its own terminal:
    cd spike
    uv run python recruiter.py
"""

import asyncio
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# Use the OS certificate store (handles corporate TLS interception that the
# bundled certifi roots don't cover). Must run before any SSL context is built.
import truststore

truststore.inject_into_ssl()

from dotenv import load_dotenv

from band import Agent, AdapterFeatures, Emit
from band.adapters import AnthropicAdapter

load_dotenv()

REST_URL = os.getenv("THENVOI_REST_URL", "https://app.band.ai/")
WS_URL = os.getenv(
    "THENVOI_WS_URL", "wss://app.band.ai/api/v1/socket/websocket"
)

RECRUITER_PROMPT = """You are spike-recruiter. Your only job is to prove runtime recruitment.

When you receive ANY task or request in a room, do EXACTLY this, in order:
1. Call band_lookup_peers to discover the agents available on the platform.
2. In the results, find the peer whose name is "spike-specialist".
3. Call band_add_participant with that peer's exact id from band_lookup_peers
   (the id, not the handle) to bring spike-specialist into THIS room.
4. Post one short message that @mentions @spike-specialist and asks it to confirm
   it has joined.

If band_lookup_peers does NOT return a peer named spike-specialist, do not invent
an id. Instead, say plainly that spike-specialist was not discoverable as a peer,
and list the names you did see. You never write code; you only recruit."""


async def main() -> None:
    adapter = AnthropicAdapter(
        model="claude-sonnet-4-6",
        provider_key=os.getenv("ANTHROPIC_API_KEY"),
        prompt=RECRUITER_PROMPT,
        # Surface tool calls (band_lookup_peers / band_add_participant) as events
        # so the recruitment is visible in the room and we can confirm both fired.
        features=AdapterFeatures(emit={Emit.EXECUTION}),
    )
    agent = Agent.from_config(
        "spike-recruiter",
        adapter=adapter,
        ws_url=WS_URL,
        rest_url=REST_URL,
    )
    print("spike-recruiter online — message it in a room to trigger recruitment. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
