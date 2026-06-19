"use client";

import { useEffect, useRef } from "react";
import { CrucibleEvent, sideBorderClass, sideColorClass } from "@/lib/events";
import { SolidityCode } from "./SolidityCode";

const DOT: Record<string, string> = {
  build: "bg-steel",
  red: "bg-red",
  judge: "bg-cognac",
  human: "bg-champagne",
};

function AgentTag({ agent, side }: { agent: string; side?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-1.5 w-1.5 ${DOT[side ?? ""] ?? "bg-dim"}`} />
      <span className={`font-mono text-xs font-medium ${sideColorClass(side)}`}>
        {agent}
      </span>
    </span>
  );
}

/* A Solidity patch — a clearly-separate CODE panel, not a chat bubble. */
function CodeBlock({ code }: { code: string }) {
  return (
    <div className="code-panel crucible-scroll mt-3 overflow-auto">
      <div className="border-b border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
        solidity patch
      </div>
      <pre className="px-3 py-3 font-mono text-[11.5px] leading-relaxed text-champagne">
        <SolidityCode code={code} />
      </pre>
    </div>
  );
}

/* 1 — a normal agent chat message. Color-coded left rule, no panel fill. */
function MessageRow({ e }: { e: CrucibleEvent }) {
  const side = e.payload.side as string | undefined;
  const text = e.payload.text as string | undefined;
  const patch = e.payload.patch as string | undefined;
  return (
    <div className={`border-l-2 pl-4 ${sideBorderClass(side)}`}>
      <AgentTag agent={e.agent} side={side} />
      {text && (
        <p className="mt-1.5 text-sm leading-relaxed text-champagne/90">{text}</p>
      )}
      {patch && <CodeBlock code={patch} />}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-dim">{k}</span>
      <span className="break-all text-champagne">{v}</span>
    </div>
  );
}

/* 2 — an exploit result: a bordered card with the on-chain numbers + tx hash. */
function ExploitRow({ e }: { e: CrucibleEvent }) {
  const p = e.payload;
  const blocked = p.result === "BLOCKED";
  const txHash = p.tx_hash as string | undefined;
  return (
    <div
      className={`border-l-2 bg-ink/40 p-4 ${blocked ? "border-emerald/60" : "border-red/60"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
          Exploit
        </span>
        <AgentTag agent={e.agent} side="red" />
        <span
          className={`ml-auto border px-2 py-0.5 font-mono text-[11px] tracking-wide ${
            blocked ? "border-emerald/60 text-emerald" : "border-red/60 text-red"
          }`}
        >
          {p.result as string}
          {p.attack_class ? ` · ${p.attack_class}` : ""}
        </span>
      </div>
      {p.text ? (
        <p className="mt-2 text-sm leading-relaxed text-champagne/90">
          {p.text as string}
        </p>
      ) : null}
      <div className="mt-3 space-y-1 border border-line bg-ink/70 p-3 font-mono text-[11px]">
        {p.target ? <Line k="target" v={p.target as string} /> : null}
        {p.vault_before ? (
          <Line k="vault_before" v={p.vault_before as string} />
        ) : null}
        {p.vault_after ? (
          <Line k="vault_after" v={p.vault_after as string} />
        ) : null}
        {p.attacker ? <Line k="attacker" v={p.attacker as string} /> : null}
        {txHash ? (
          <div className="flex gap-2 break-all">
            <span className="text-dim">tx_hash</span>
            <span className="text-cognac">{txHash}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* 3 — a round verdict: the referee's ruling, fronted by a big LANDED/BLOCKED badge. */
function RoundVerdictRow({ e }: { e: CrucibleEvent }) {
  const p = e.payload;
  const landed = p.result === "LANDED";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <AgentTag agent={e.agent} side="judge" />
      <span
        className={`crucible-mark-in border-2 px-3 py-1 font-mono text-xs font-semibold tracking-[0.15em] ${
          landed ? "border-red text-red" : "border-emerald text-emerald"
        }`}
      >
        {landed ? "● LANDED" : "✓ BLOCKED"}
      </span>
      <span className="font-mono text-[11px] text-dim">{p.text as string}</span>
    </div>
  );
}

/* 4 — a recruitment event: a distinct, indented ledger line (not a chat bubble). */
function RecruitmentRow({ e }: { e: CrucibleEvent }) {
  const p = e.payload;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 font-mono text-[11px]">
      <span className="text-dim">↳</span>
      <span className="text-red">{(p.by as string) ?? "@RedLead"}</span>
      <span className="text-dim">recruited</span>
      <span className="text-red">{e.agent}</span>
      {p.label ? <span className="text-dim">· {p.label as string}</span> : null}
      <span className="ml-1 border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-dim">
        band_add_participant
      </span>
    </div>
  );
}

/* 5 — the final verdict block: the climax. Heavy cognac frame + checklist. */
function FinalVerdictRow({ e }: { e: CrucibleEvent }) {
  const p = e.payload;
  const report = (p.report ?? {}) as {
    severity_rating?: string;
    remediation_checklist?: string[];
  };
  return (
    <div className="border-2 border-cognac/60 bg-ink p-4">
      <div className="flex items-center gap-2">
        <AgentTag agent={e.agent} side="judge" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.25em] text-cognac">
          Final verdict
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-champagne/90">
        {p.text as string}
      </p>
      <div className="mt-3 border border-cognac/30 bg-espresso/50 p-3 font-mono text-[11.5px]">
        <div className="mb-2 font-medium text-cognac">
          {report.severity_rating ?? "VERDICT"}
        </div>
        <ul className="space-y-1.5 text-champagne/90">
          {(report.remediation_checklist ?? []).map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-dim">{i + 1}.</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* 6 — the human sign-off. */
function ApprovalRow({ e }: { e: CrucibleEvent }) {
  return (
    <div className="border-l-2 border-champagne/40 bg-ink/30 p-4">
      <div className="flex items-center gap-2">
        <AgentTag agent={e.agent} side="human" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.25em] text-emerald">
          ✓ Approved
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-champagne">
        {e.payload.text as string}
      </p>
    </div>
  );
}

// ---- Round grouping ---------------------------------------------------------

const BRIEFING = 0;
const FINAL = 99;
const ROUND_NAMES: Record<number, string> = {
  1: "REENTRANCY",
  2: "ACCESS CONTROL",
};

function attackClassRound(c: unknown): number | null {
  if (c === "reentrancy") return 1;
  if (c === "access_control") return 2;
  return null;
}

/** Assign each transcript event to a section: briefing, round N, or final. */
function assignRounds(transcript: CrucibleEvent[]): number[] {
  const anchor: (number | null)[] = transcript.map(() => null);
  let recruited = 0;
  transcript.forEach((e, i) => {
    if (e.type === "participant_join" && e.payload.recruited === true) {
      recruited += 1;
      anchor[i] = recruited;
    } else if (e.type === "exploit_result") {
      anchor[i] = attackClassRound(e.payload.attack_class);
    } else if (e.type === "round_verdict") {
      if (e.payload.verdict === true) anchor[i] = FINAL;
      else if (typeof e.payload.round === "number")
        anchor[i] = e.payload.round as number;
    } else if (e.type === "human_approval") {
      anchor[i] = FINAL;
    }
  });

  // Fill unanchored chat messages from the surrounding rounds.
  const out = anchor.slice();
  for (let i = 0; i < out.length; i++) {
    if (out[i] != null) continue;
    let prev: number | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (anchor[j] != null && anchor[j] !== FINAL) {
        prev = anchor[j];
        break;
      }
    }
    let next: number | null = null;
    for (let j = i + 1; j < out.length; j++) {
      if (anchor[j] != null && anchor[j] !== FINAL) {
        next = anchor[j];
        break;
      }
    }
    if (prev == null) out[i] = BRIEFING;
    else if (next != null && next !== prev) out[i] = next;
    else out[i] = prev;
  }
  return out.map((r) => (r == null ? FINAL : r));
}

function sectionLabel(round: number): string {
  if (round === BRIEFING) return "BRIEFING";
  if (round === FINAL) return "VERDICT";
  return `ROUND ${round} — ${ROUND_NAMES[round] ?? ""}`.trim();
}

function Divider({ round }: { round: number }) {
  const accent = round === BRIEFING ? "text-dim" : "text-cognac";
  return (
    <div className="flex items-center gap-3">
      <span
        className={`font-mono text-[10px] font-medium uppercase tracking-[0.3em] ${accent}`}
      >
        {sectionLabel(round)}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function renderRow(e: CrucibleEvent, key: number) {
  switch (e.type) {
    case "message":
      return <MessageRow key={key} e={e} />;
    case "exploit_result":
      return <ExploitRow key={key} e={e} />;
    case "participant_join":
      return <RecruitmentRow key={key} e={e} />;
    case "round_verdict":
      return e.payload.verdict === true ? (
        <FinalVerdictRow key={key} e={e} />
      ) : (
        <RoundVerdictRow key={key} e={e} />
      );
    case "human_approval":
      return <ApprovalRow key={key} e={e} />;
    default:
      return null;
  }
}

export function Transcript({ transcript }: { transcript: CrucibleEvent[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript.length]);

  const rounds = assignRounds(transcript);

  // Group contiguous events that share a section into one block.
  const sections: { round: number; items: { e: CrucibleEvent; i: number }[] }[] =
    [];
  transcript.forEach((e, i) => {
    const r = rounds[i];
    const last = sections[sections.length - 1];
    if (!last || last.round !== r) {
      sections.push({ round: r, items: [{ e, i }] });
    } else {
      last.items.push({ e, i });
    }
  });

  return (
    <div className="crucible-scroll flex h-full flex-col overflow-auto p-6">
      <div>
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-champagne">
          The Siege
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-dim">
          the live fight
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-9">
        {sections.map((s, si) => (
          <section key={si} className="flex flex-col gap-5">
            <Divider round={s.round} />
            {s.items.map(({ e, i }) => renderRow(e, i))}
          </section>
        ))}
      </div>

      <div ref={endRef} />
    </div>
  );
}
