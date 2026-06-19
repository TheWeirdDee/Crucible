"use client";

import { CONTRACT_SEGMENTS } from "@/lib/contractSource";
import { statusLabel } from "@/lib/events";
import { RoundState } from "@/lib/useCrucibleStream";
import { VaultTicker } from "./VaultTicker";
import { SolidityCode } from "./SolidityCode";

const ROUND_LABELS: Record<number, string> = {
  1: "Reentrancy",
  2: "Access control",
};

function StatusPill({ status }: { status: string }) {
  const label = statusLabel(status);
  const color =
    label === "UNDER ATTACK"
      ? "text-red border-red/50"
      : label === "HELD"
        ? "text-emerald border-emerald/60"
        : "text-steel border-steel/50";
  return (
    <span
      className={`crucible-mark-in inline-flex items-center gap-2 border px-3 py-1 font-mono text-xs tracking-wide ${color}`}
    >
      <span
        className={`h-1.5 w-1.5 ${
          label === "UNDER ATTACK"
            ? "bg-red"
            : label === "HELD"
              ? "bg-emerald"
              : "bg-steel"
        }`}
      />
      {label}
    </span>
  );
}

function RoundBadge({ r }: { r: RoundState }) {
  const landed = r.result === "LANDED";
  return (
    <div
      className={`crucible-mark-in flex items-center justify-between border px-3 py-2 ${
        landed ? "border-red/50" : "border-emerald/60"
      }`}
    >
      <span className="font-mono text-xs text-dim">
        R{r.round} · {ROUND_LABELS[r.round] ?? ""}
      </span>
      <span
        className={`font-mono text-xs font-medium ${
          landed ? "text-red" : "text-emerald"
        }`}
      >
        {r.result}
      </span>
    </div>
  );
}

export function ContractState({
  vaultEth,
  status,
  rounds,
  patches,
}: {
  vaultEth: number | null;
  status: string;
  rounds: RoundState[];
  patches: { reentrancy: boolean; accessControl: boolean };
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Panel label */}
      <div className="border-b border-line px-5 py-3">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-champagne">
          Contract Under Attack
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-dim">
          status &amp; balance
        </div>
      </div>

      {/* Ticker + status */}
      <div className="border-b border-line px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
            Vault balance
          </span>
          <StatusPill status={status} />
        </div>
        <VaultTicker target={vaultEth} />
      </div>

      {/* Round badges */}
      {rounds.length > 0 && (
        <div className="space-y-2 border-b border-line px-5 py-4">
          {rounds.map((r) => (
            <RoundBadge key={r.round} r={r} />
          ))}
        </div>
      )}

      {/* Source with per-patch highlighting */}
      <div className="crucible-scroll min-h-0 flex-1 overflow-auto px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
            VaultStaking.sol
          </span>
          <span className="font-mono text-[11px] text-dim">
            {patches.reentrancy && patches.accessControl
              ? "hardened"
              : patches.reentrancy || patches.accessControl
                ? "patching…"
                : "as submitted"}
          </span>
        </div>
        <pre className="code-panel crucible-scroll overflow-auto px-3 py-3 font-mono text-[11.5px] leading-relaxed">
          {CONTRACT_SEGMENTS.map((seg, i) => {
            const isPatched =
              (seg.kind === "withdraw" && patches.reentrancy) ||
              (seg.kind === "drain" && patches.accessControl);
            const code =
              isPatched && seg.patched ? seg.patched : seg.vulnerable;
            const cls =
              seg.kind === "static"
                ? "block opacity-60"
                : isPatched
                  ? "block bg-emerald/10"
                  : "block bg-red/10";
            return (
              <code key={i} className={cls}>
                <SolidityCode code={code} />
              </code>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
