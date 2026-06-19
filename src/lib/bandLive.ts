/*
 * Server-only Band REST relay (TASK 4 — live mode).
 *
 * The browser cannot talk to Band directly (the API key must stay server-side, and
 * the SDK is Python). So these helpers run inside Next API routes: one posts the
 * kickoff message to a pre-created Band room (starting a REAL siege against the
 * already-running 6 agents), the other polls the room transcript and maps each Band
 * message onto the SAME CrucibleEvent shape the playback renderer already consumes.
 *
 * Requires (server env, e.g. .env.local):
 *   BAND_API_KEY   a Band agent API key that is a participant of the room (e.g. the Judge's)
 *   BAND_ROOM_ID   id of a pre-created room containing the 4 standing agents
 *   BAND_REST_URL  optional, default https://app.band.ai
 */

import { CrucibleEvent, Side } from "./events";

const REST = (process.env.BAND_REST_URL ?? "https://app.band.ai").replace(/\/$/, "");
const KEY = process.env.BAND_API_KEY ?? "";
export const ROOM_ID = process.env.BAND_ROOM_ID ?? "";
const ANVIL_RPC = process.env.ANVIL_RPC ?? "http://127.0.0.1:8545";

// Registered agent UUIDs -> handle + team side. These are identities, not secrets.
// Override via BAND_AGENTS_JSON if you register your own agents.
const DEFAULT_AGENTS: Record<string, { handle: string; side: Side }> = {
  "85126713-4ca2-48d1-8922-37dc7740dddd": { handle: "@Architect", side: "build" },
  "f6f3d8c3-58cf-4fb7-84e1-88fedcce841a": { handle: "@Engineer", side: "build" },
  "88bef659-c689-449c-8fd4-3dc58237ff73": { handle: "@RedLead", side: "red" },
  "c0d49bc7-b49a-4f0d-bb27-03094647cbdd": { handle: "@ReentrancySpec", side: "red" },
  "0edf3b3a-4946-4714-b0ae-235b3f21695b": { handle: "@AccessSpec", side: "red" },
  "997d0753-9ea1-439e-83a8-3e0a45dbf834": { handle: "@Judge", side: "judge" },
};

function agents(): Record<string, { handle: string; side: Side }> {
  if (process.env.BAND_AGENTS_JSON) {
    try {
      return JSON.parse(process.env.BAND_AGENTS_JSON);
    } catch {
      /* fall through to defaults */
    }
  }
  return DEFAULT_AGENTS;
}

const ARCHITECT_ID = "85126713-4ca2-48d1-8922-37dc7740dddd";
const REDLEAD_ID = "88bef659-c689-449c-8fd4-3dc58237ff73";

const VULNERABLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultStaking {
    address public owner;
    mapping(address => uint256) public balances;
    constructor() payable { owner = msg.sender; }
    function deposit() external payable { balances[msg.sender] += msg.value; }
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "transfer failed");
        balances[msg.sender] = 0;
    }
    function emergencyDrain() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}`;

export function liveConfigured(): boolean {
  return Boolean(KEY && ROOM_ID);
}

/** Synthetic opening events so the rail + ticker populate the instant the stream opens
 *  (the 4 standing agents + the human, vault at 100 ETH), before live messages flow. */
export function openingEvents(): CrucibleEvent[] {
  const now = new Date().toISOString();
  const j = (agent: string, side: Side, label: string): CrucibleEvent => ({
    type: "participant_join",
    agent,
    timestamp: now,
    payload: { side, label },
  });
  return [
    j("@Architect", "build", "Surface mapping"),
    j("@Engineer", "build", "Defense"),
    j("@RedLead", "red", "Attack strategy"),
    j("@Judge", "judge", "Referee"),
    {
      type: "human_approval",
      agent: "SecurityLead",
      timestamp: now,
      payload: { joined: true, side: "human", status: "submitted", vault: "100 ETH", text: "VaultStaking.sol submitted — live siege starting." },
    },
  ];
}

function headers() {
  return { "X-API-Key": KEY, "Content-Type": "application/json" };
}

/** Post the kickoff: contract + @mention both team leads → starts the real siege. */
export async function postKickoff(): Promise<{ ok: boolean; detail?: string }> {
  const content =
    "@Crucible-Architect @Crucible-RedLead Audit this contract before deployment. " +
    "Architect, map the surface. RedLead, recruit your specialists and attack it.\n\n" +
    VULNERABLE_CONTRACT;
  const res = await fetch(`${REST}/api/v1/agent/chats/${ROOM_ID}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      content,
      mentions: [
        { id: ARCHITECT_ID, name: "Crucible-Architect" },
        { id: REDLEAD_ID, name: "Crucible-RedLead" },
      ],
    }),
  });
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${await res.text()}` };
  return { ok: true };
}

interface BandMsg {
  id: string;
  sender_id?: string;
  content?: string;
  message_type?: string;
  inserted_at?: string;
}

/** Preflight: is the local Anvil node answering JSON-RPC? */
export async function anvilUp(): Promise<boolean> {
  try {
    const r = await fetch(ANVIL_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", id: 1 }),
      cache: "no-store",
    });
    if (!r.ok) return false;
    const j = await r.json();
    return typeof j?.result === "string";
  } catch {
    return false;
  }
}

/** Preflight: which agents are currently in the room (confirms key + room + agents). */
export async function roomParticipants(): Promise<string[]> {
  try {
    const r = await fetch(`${REST}/api/v1/agent/chats/${ROOM_ID}/participants`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!r.ok) return [];
    const j = await r.json();
    const data = (j?.data ?? j ?? []) as { name?: string; handle?: string; id?: string }[];
    return data.map((p) => p.name ?? p.handle ?? p.id ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

/** Fetch the room transcript (chronological). */
export async function fetchContext(): Promise<BandMsg[]> {
  const res = await fetch(
    `${REST}/api/v1/agent/chats/${ROOM_ID}/context?limit=100`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) return [];
  const j = await res.json();
  return (j?.data ?? []) as BandMsg[];
}

const TX_RE = /0x[0-9a-fA-F]{64}/;
const ROUND_RE = /ROUND\s*(\d)\s*:\s*(LANDED|BLOCKED)/i;

/**
 * Map a Band message onto a CrucibleEvent. Best-effort: most messages render as
 * `message`; the Judge's ROUND rulings become `round_verdict`; specialist results
 * with a tx hash become `exploit_result`; a first message from a recruited
 * specialist becomes a `participant_join`. Returns [] for nothing to render.
 */
export function mapMessage(
  m: BandMsg,
  seenSenders: Set<string>,
): CrucibleEvent[] {
  if (m.message_type && m.message_type !== "text") return [];
  const who = m.sender_id ? agents()[m.sender_id] : undefined;
  const agent = who?.handle ?? "SecurityLead";
  const side: Side = who?.side ?? "human";
  const text = (m.content ?? "").trim();
  if (!text) return [];
  const ts = m.inserted_at ?? new Date().toISOString();
  const out: CrucibleEvent[] = [];

  // Recruited specialist's first appearance -> a join beat in the rail.
  const recruited = agent === "@ReentrancySpec" || agent === "@AccessSpec";
  if (recruited && m.sender_id && !seenSenders.has(m.sender_id)) {
    out.push({
      type: "participant_join",
      agent,
      timestamp: ts,
      payload: { side, recruited: true, by: "@RedLead", label: "Recruited specialist" },
    });
  }
  if (m.sender_id) seenSenders.add(m.sender_id);

  const round = text.match(ROUND_RE);
  const tx = text.match(TX_RE);

  if (agent === "@Judge" && round) {
    out.push({
      type: "round_verdict",
      agent,
      timestamp: ts,
      payload: { side: "judge", round: Number(round[1]), result: round[2].toUpperCase(), text },
    });
    return out;
  }
  if (agent === "@Judge" && /approve to finalize/i.test(text)) {
    out.push({ type: "round_verdict", agent, timestamp: ts, payload: { side: "judge", verdict: true, text } });
    return out;
  }
  if (recruited && (tx || /\b(LANDED|BLOCKED)\b/i.test(text))) {
    const blocked = /BLOCKED|reverted|holds|not owner|reentrant/i.test(text) && !/LANDED/i.test(text);
    out.push({
      type: "exploit_result",
      agent,
      timestamp: ts,
      payload: {
        side: "red",
        result: blocked ? "BLOCKED" : "LANDED",
        tx_hash: tx ? tx[0] : undefined,
        vault: blocked ? "100 ETH" : "0 ETH",
        status: blocked ? "HELD" : "BREACHED",
        text,
      },
    });
    return out;
  }

  // Engineer patch (fenced solidity) or any other chat line.
  const patch = /```/.test(text) ? text.replace(/^[\s\S]*?```(?:solidity)?\n?/, "").replace(/```[\s\S]*$/, "") : undefined;
  out.push({
    type: "message",
    agent,
    timestamp: ts,
    payload: { side, text: patch ? text.split("```")[0].trim() : text, ...(patch ? { patch } : {}) },
  });
  return out;
}
