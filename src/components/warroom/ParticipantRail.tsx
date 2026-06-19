"use client";

import { Participant } from "@/lib/useCrucibleStream";

const GROUPS: { side: Participant["side"]; title: string }[] = [
  { side: "build", title: "Build" },
  { side: "red", title: "Red" },
  { side: "judge", title: "Referee" },
  { side: "human", title: "You" },
];

const DOT: Record<string, string> = {
  build: "bg-steel",
  red: "bg-red",
  judge: "bg-cognac",
  human: "bg-champagne",
};

function Row({ p }: { p: Participant }) {
  return (
    <div className="crucible-mark-in border-l-2 border-line pl-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-sm text-champagne">
          <span className={`h-1.5 w-1.5 ${DOT[p.side]}`} />
          {p.agent}
        </span>
        <span className="font-mono text-[11px] text-dim">{p.joinedAt}</span>
      </div>
      <div className="pl-3.5 font-mono text-[11px] text-dim">{p.label}</div>
      {p.recruited && (
        <div className="mt-1 pl-3.5 font-mono text-[11px] text-red">
          band_add_participant → {p.agent} joined
        </div>
      )}
    </div>
  );
}

export function ParticipantRail({ participants }: { participants: Participant[] }) {
  return (
    <div className="crucible-scroll flex h-full flex-col gap-5 overflow-auto p-4">
      <div>
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-champagne">
          Who&apos;s in the Room
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-dim">
          participants &amp; recruits
        </div>
      </div>
      {GROUPS.map((g) => {
        const rows = participants.filter((p) => p.side === g.side);
        if (!rows.length) return null;
        return (
          <div key={g.side} className="space-y-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim/70">
              {g.title}
            </div>
            {rows.map((p) => (
              <Row key={p.agent} p={p} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
