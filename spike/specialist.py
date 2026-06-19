"""
spike-specialist — a trivial agent that replies only when @mentioned.

Run in its own terminal:
    cd spike
    uv run python specialist.py
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

from band import Agent
from band.adapters import AnthropicAdapter

load_dotenv()

REST_URL = os.getenv("THENVOI_REST_URL", "https://app.band.ai/")
WS_URL = os.getenv(
    "THENVOI_WS_URL", "wss://app.band.ai/api/v1/socket/websocket"
)

SPECIALIST_PROMPT = """You are spike-specialist, a reentrancy specialist.

You act ONLY when @mentioned. When mentioned, reply with ONE short sentence
confirming you have joined the room and are ready to work. Do nothing else —
do not call tools, do not recruit anyone."""


async def main() -> None:
    adapter = AnthropicAdapter(
        model="claude-sonnet-4-6",
        provider_key=os.getenv("ANTHROPIC_API_KEY"),
        prompt=SPECIALIST_PROMPT,
    )
    agent = Agent.from_config(
        "spike-specialist",
        adapter=adapter,
        ws_url=WS_URL,
        rest_url=REST_URL,
    )
    print("spike-specialist online — waiting to be @mentioned. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
