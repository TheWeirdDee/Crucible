import { NextResponse } from "next/server";
import { anvilUp, liveConfigured, roomParticipants, ROOM_ID } from "@/lib/bandLive";

// Preflight for the live button — confirm the prerequisites are green before a judge clicks.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STANDING = ["Architect", "Engineer", "RedLead", "Judge"];

export async function GET() {
  const configured = liveConfigured();
  if (!configured) {
    return NextResponse.json({
      ready: false,
      configured: false,
      anvil: false,
      band: false,
      participants: [],
      note: "Set BAND_API_KEY + BAND_ROOM_ID in .env.local, then restart the app.",
    });
  }

  const [anvil, participants] = await Promise.all([anvilUp(), roomParticipants()]);
  const band = participants.length > 0;
  const standingPresent = STANDING.every((s) =>
    participants.some((p) => p.toLowerCase().includes(s.toLowerCase())),
  );

  return NextResponse.json({
    ready: configured && anvil && band && standingPresent,
    configured,
    anvil, // Anvil JSON-RPC reachable (real exploits can run)
    band, // Band room reachable with the key
    standingPresent, // the 4 standing agents are in the room
    room: ROOM_ID,
    participants,
  });
}
