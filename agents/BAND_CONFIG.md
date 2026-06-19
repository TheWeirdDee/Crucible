# Band SDK — Names to Confirm on Day 1 (Spike A)

⚠️ EVERYTHING depends on these. The PRD and these files use the names below, but they
are UNVERIFIED until you connect at kickoff. Confirm each against the real SDK on June 12,
then correct in ONE place (this file + agents/band_config.py) and it propagates.

| Used in our code | What to confirm | Fallback if wrong |
|---|---|---|
| package `band-sdk[anthropic]` | exact pip name | check Band SDK Setup doc |
| `thenvoi_lookup_peers` | peer-discovery tool name | docs showed `list_available_participants_service` |
| `thenvoi_add_participant` | add-participant tool name | docs showed `add_participant_service` |
| `thenvoi_send_event` | typed-event post tool | may be `send_direct_message_service` for plain msgs |
| `thenvoi_get_participants` | list-participants tool | `list_participants` variant |
| WebSocket subscribe | live feed connection | per "Connect Any Agent" doc |

## Spike A pass criteria (PRD §11 Day 1)
RedLead calls lookup → add_participant → @ReentrancySpec appears as a room participant
with the correct handle. If it works, Crucible is buildable. If restricted on free tier,
activate BANDHACK26 Pro. If still broken, Band Discord — this is not recoverable in isolation.

## band_config.py (the one place names live)
```python
# Correct these 4 strings on Day 1, nothing else changes downstream.
BAND_PKG          = "band-sdk"
TOOL_LOOKUP_PEERS = "thenvoi_lookup_peers"
TOOL_ADD_PART     = "thenvoi_add_participant"
TOOL_SEND_EVENT   = "thenvoi_send_event"
TOOL_GET_PARTS    = "thenvoi_get_participants"
```
