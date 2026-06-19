"""
The ONE place Band names + tool names live (per BAND_CONFIG.md's intent).

Day-1 / Spike-A VERIFIED corrections (the old thenvoi_* guesses were wrong):
  - package imports as `band` (pip `band-sdk`)
  - recruitment tools are band_lookup_peers / band_add_participant (base tools,
    exposed by default — no capability flag). Confirmed firing in spike/.
  - same-owner agents are auto-discoverable as peers (no contact step).

If any of these change, fix them HERE and it propagates.
"""

# Verified platform tool names (the LLM sees these; SDK exposes base tools by default).
TOOL_LOOKUP_PEERS = "band_lookup_peers"
TOOL_ADD_PARTICIPANT = "band_add_participant"
TOOL_SEND_MESSAGE = "band_send_message"

# Roles -> (config key, registered Band name). The @mention handle is the
# registered name; Band resolves @<name> to the participant (verified in Spike A).
AGENTS = {
    "architect": "Crucible-Architect",
    "engineer": "Crucible-Engineer",
    "redlead": "Crucible-RedLead",
    "reentrancyspec": "Crucible-ReentrancySpec",
    "accessspec": "Crucible-AccessSpec",
    "judge": "Crucible-Judge",
}

# @mention handle per role (defaults to the registered name). If the live agents
# turn out to expose a different handle, override here — prompts read from this.
HANDLES = {role: name for role, name in AGENTS.items()}
HANDLES["security_lead"] = "divinenation1"  # the human approver's Band handle

# The 4 standing agents added to the room at submission; the 2 specialists are
# recruited at runtime by RedLead (they run + listen but are not pre-added).
STANDING = ["architect", "engineer", "redlead", "judge"]
RECRUITED = ["reentrancyspec", "accessspec"]
