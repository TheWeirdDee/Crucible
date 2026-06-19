import { fetchContext, liveConfigured, mapMessage, openingEvents } from "@/lib/bandLive";

// SSE relay: polls the Band room transcript and streams each NEW message to the
// browser, mapped onto the CrucibleEvent shape. Pre-existing messages (old sieges in
// the reused room) are baselined out; only events from this run flow through.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!liveConfigured()) {
    return new Response("Live mode not configured (BAND_API_KEY + BAND_ROOM_ID).", {
      status: 503,
    });
  }

  const enc = new TextEncoder();
  const seenMsgs = new Set<string>();
  const seenSenders = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let stopped = false;
      const stop = () => {
        stopped = true;
      };
      req.signal.addEventListener("abort", stop);

      const send = (obj: unknown) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          stop();
        }
      };

      // 1) Opening events so the UI populates immediately.
      for (const ev of openingEvents()) send(ev);

      // 2) Baseline: mark everything already in the room as seen (don't replay history).
      try {
        for (const m of await fetchContext()) {
          seenMsgs.add(m.id);
          if (m.sender_id) seenSenders.add(m.sender_id);
        }
      } catch {
        /* ignore first-poll failure */
      }

      // 3) Stream new messages as they arrive.
      while (!stopped) {
        try {
          const msgs = await fetchContext();
          msgs.sort((a, b) => (a.inserted_at ?? "").localeCompare(b.inserted_at ?? ""));
          for (const m of msgs) {
            if (seenMsgs.has(m.id)) continue;
            seenMsgs.add(m.id);
            for (const ev of mapMessage(m, seenSenders)) send(ev);
          }
        } catch {
          /* transient Band/network blip — keep polling */
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      req.signal.removeEventListener("abort", stop);
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
