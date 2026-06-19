"""
Dry-run trigger: create a fresh Band room, add the 4 standing agents, post the kickoff —
exactly what the /war-room "Run it live" button does, but from the CLI so we can validate
the live Groq-routed siege end-to-end. siege.py must already be running.
"""

import truststore

truststore.inject_into_ssl()

import yaml
from thenvoi_rest import (
    ChatMessageRequest,
    ChatMessageRequestMentionsItem,
    ChatRoomRequest,
    ParticipantRequest,
    RestClient,
)

cfg = yaml.safe_load(open("agent_config.yaml"))
ids = {k: cfg[k]["agent_id"] for k in cfg}
client = RestClient(base_url="https://app.band.ai", api_key=cfg["judge"]["api_key"])

CONTRACT = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract VaultStaking {
    address public owner;
    mapping(address => uint256) public balances;
    constructor() payable { owner = msg.sender; }
    function deposit() external payable { balances[msg.sender] += msg.value; }
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        (bool ok,) = msg.sender.call{value: bal}("");
        require(ok, "transfer failed");
        balances[msg.sender] = 0;
    }
    function emergencyDrain() external { payable(msg.sender).transfer(address(this).balance); }
}"""

room = client.agent_api_chats.create_agent_chat(chat=ChatRoomRequest())
room_id = getattr(room, "id", None) or getattr(getattr(room, "data", None), "id", None)
print("ROOM_ID", room_id)

for role in ("architect", "engineer", "redlead"):
    client.agent_api_participants.add_agent_chat_participant(
        chat_id=room_id,
        participant=ParticipantRequest(participant_id=ids[role], role="member"),
    )
    print("added", role)

content = (
    "@Crucible-Architect @Crucible-RedLead Audit this contract before deployment. "
    "Architect, map the surface. RedLead, recruit your specialists and attack it.\n\n" + CONTRACT
)
client.agent_api_messages.create_agent_chat_message(
    chat_id=room_id,
    message=ChatMessageRequest(
        content=content,
        mentions=[
            ChatMessageRequestMentionsItem(id=ids["architect"], name="Crucible-Architect"),
            ChatMessageRequestMentionsItem(id=ids["redlead"], name="Crucible-RedLead"),
        ],
    ),
)
print("KICKOFF_POSTED", room_id)
