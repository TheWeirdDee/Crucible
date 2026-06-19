"""
Provider routing (PRD §6.1 / data/provider_routing.md) + adapter factory.

LIVE routing (free + fast, no paid-credit burn):
    architect, engineer, redlead, reentrancyspec, judge -> Groq (llama-3.3-70b-versatile)
    accessspec                                           -> Featherless (Llama-3.3-70B)  ← partner-prize proof

Groq is free (14,400 req/day) and fast, so it's the workhorse and removes the
Featherless concurrency 429s and the AI/ML credit burn. Featherless still runs ONE
agent (AccessSpec) with logged calls so partner-prize eligibility is intact. AI/ML
API (Anthropic-compatible) and Anthropic remain available in code and are documented
as proven from the recorded siege, but are not used live.

All providers here are OpenAI-compatible -> the band-sdk PydanticAIAdapter. Every LLM
interaction is logged `provider=<p> model=<m>` (httpx logs also show the host).

Anti-loop: each agent's per-message tool loop is capped (UsageLimits.request_limit),
so no agent (esp. Llama) can loop indefinitely.
"""

from __future__ import annotations

import logging
import os

from anthropic import AsyncAnthropic
from band import AdapterFeatures, Emit
from band.adapters import AnthropicAdapter
from band.adapters.pydantic_ai import PydanticAIAdapter
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from exploit_tools import ACCESS_TOOLS, PYDANTIC_ACCESS_TOOLS, REENTRANCY_TOOLS
from prompts import render

logger = logging.getLogger("crucible.providers")

REQUEST_LIMIT = 10  # max model requests per message (caps the tool loop — anti-runaway)


# --- Adapter subclasses that tag every LLM interaction with provider= ---

class CrucibleAnthropicAdapter(AnthropicAdapter):
    """AnthropicAdapter with explicit per-agent base_url + provider logging (AI/ML path)."""

    def __init__(self, *, base_url: str, provider_key: str, provider_label: str, **kw):
        super().__init__(provider_key=provider_key, **kw)
        self.client = AsyncAnthropic(api_key=provider_key, base_url=base_url)
        self._provider_label = provider_label

    async def on_message(self, *args, **kw):
        logger.info("LLM provider=%s model=%s agent=%s", self._provider_label, self.model, self.agent_name)
        return await super().on_message(*args, **kw)


class CruciblePydanticAIAdapter(PydanticAIAdapter):
    """PydanticAIAdapter (OpenAI-compatible: Groq / Featherless) + provider logging +
    a hard cap on per-message tool-loop iterations so no agent can loop forever."""

    def __init__(self, *, provider_label: str, model_label: str, request_limit: int = REQUEST_LIMIT, **kw):
        super().__init__(**kw)
        self._provider_label = provider_label
        self._model_label = model_label
        self._request_limit = request_limit

    async def on_started(self, agent_name: str, agent_description: str) -> None:
        await super().on_started(agent_name, agent_description)  # creates self._agent
        agent = self._agent
        if agent is not None:
            orig = agent.run_stream_events
            limit = self._request_limit

            def wrapped(*a, **k):  # inject a usage cap into every run
                k.setdefault("usage_limits", UsageLimits(request_limit=limit))
                return orig(*a, **k)

            agent.run_stream_events = wrapped  # type: ignore[method-assign]

    async def on_message(self, *args, **kw):
        logger.info("LLM provider=%s model=%s agent=%s", self._provider_label, self._model_label, self.agent_name)
        return await super().on_message(*args, **kw)


# --- provider name -> (base_url, api_key) ---
def _provider(name: str) -> tuple[str, str]:
    if name == "groq":
        return os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"), os.environ["GROQ_API_KEY"]
    if name == "featherless":
        return os.environ.get("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1"), os.environ["FEATHERLESS_API_KEY"]
    if name == "aiml":
        return os.environ["AIML_BASE_URL"], os.environ["AIML_API_KEY"]
    if name == "anthropic":
        return "https://api.anthropic.com", os.environ["ANTHROPIC_API_KEY"]
    raise ValueError(f"unknown provider {name}")


GROQ_MODEL = "llama-3.3-70b-versatile"
FEATHERLESS_MODEL = "unsloth/Llama-3.3-70B-Instruct"
AIML_MODEL = "claude-sonnet-4-6"

# role -> (provider, model).
# LIVE default = AI/ML (Claude) — the only routing that reliably completes the full
# siege (recruit -> real exploit -> verdict). A dry run on free Groq showed its 12k
# tokens/min cap (38/57 calls 429'd) and Llama tool-call failures broke recruitment,
# so Groq is kept WIRED + documented as a free option but is not the live default.
# AccessSpec stays on Featherless for the partner-prize proof (loop cap protects it).
ACTIVE: dict[str, tuple[str, str]] = {
    "architect": ("aiml", AIML_MODEL),
    "engineer": ("aiml", AIML_MODEL),
    "redlead": ("aiml", AIML_MODEL),
    "reentrancyspec": ("aiml", AIML_MODEL),
    "judge": ("aiml", AIML_MODEL),
    "accessspec": ("featherless", FEATHERLESS_MODEL),  # partner-prize proof
}

# Free, best-effort alternative (flip ACTIVE entries to these to run at $0 — note the
# Groq free tier rate-limits and Llama tool-calling are unreliable for the live flow):
GROQ_ROUTING = {role: ("groq", GROQ_MODEL) for role in ACTIVE}

_PYDANTIC = {"groq", "featherless"}
_PY_TOOLS = {"accessspec": PYDANTIC_ACCESS_TOOLS}  # reentrancy tools below for the anthropic path
_ANTH_TOOLS = {"reentrancyspec": REENTRANCY_TOOLS, "accessspec": ACCESS_TOOLS}


def build_adapter(role: str):
    provider, model = ACTIVE[role]
    base_url, key = _provider(provider)

    if provider in _PYDANTIC:
        fmodel = OpenAIChatModel(model, provider=OpenAIProvider(base_url=base_url, api_key=key))
        # Reentrancy exploit tools must also be available when ReentrancySpec runs on a
        # pydantic provider — expose them as plain callables (PYDANTIC_REENTRANCY_TOOLS).
        tools = _PY_TOOLS.get(role)
        if role == "reentrancyspec":
            from exploit_tools import PYDANTIC_REENTRANCY_TOOLS
            tools = PYDANTIC_REENTRANCY_TOOLS
        return CruciblePydanticAIAdapter(
            model=fmodel,
            custom_section=render(role),
            features=AdapterFeatures(emit={Emit.EXECUTION}),
            additional_tools=tools,
            provider_label=provider,
            model_label=model,
        )

    # AI/ML / Anthropic path (Anthropic-Messages-compatible) — kept for fallback/docs.
    return CrucibleAnthropicAdapter(
        base_url=base_url,
        provider_key=key,
        provider_label=provider,
        model=model,
        prompt=render(role),
        features=AdapterFeatures(emit={Emit.EXECUTION}),
        additional_tools=_ANTH_TOOLS.get(role),
    )
