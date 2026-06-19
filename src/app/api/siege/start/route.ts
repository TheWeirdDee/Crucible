import { NextResponse } from "next/server";
import { liveConfigured, postKickoff } from "@/lib/bandLive";

// Triggers a REAL siege: posts the contract + @mentions to the pre-created Band room,
// which starts the already-running 6 agents. The browser then opens /api/siege/stream.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!liveConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Live mode not configured. Set BAND_API_KEY and BAND_ROOM_ID." },
      { status: 503 },
    );
  }
  const r = await postKickoff();
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
