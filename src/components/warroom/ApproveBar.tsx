"use client";

import { useEffect, useState } from "react";
import { VerdictReport } from "@/lib/useCrucibleStream";

/**
 * Bottom bar — the human veto (FRONTEND.md §3, PRD §5 Step 9). Disabled until the
 * Judge posts the verdict. Approving requires a confirmation modal. This is the
 * Track-3 governance moment — nothing finalizes on the AI's say-so.
 */
export function ApproveBar({
  verdictReady,
  approved,
  verdict,
  onApprove,
}: {
  verdictReady: boolean;
  approved: boolean;
  verdict: VerdictReport | null;
  onApprove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-t border-line bg-ink px-5 py-3">
        <div className="min-w-0">
          {approved ? (
            <span className="font-mono text-sm text-emerald">
              ✓ Verdict finalized — human_approved = true
            </span>
          ) : verdictReady ? (
            <span className="font-mono text-sm text-cognac">
              Judge posted the hardening verdict. Your approval finalizes it.
            </span>
          ) : (
            <span className="font-mono text-sm text-dim">
              Approval unlocks once the Judge posts the verdict.
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!verdictReady || approved}
          onClick={() => setConfirming(true)}
          className={`shrink-0 border px-6 py-2 font-mono text-sm tracking-wide transition-colors ${
            approved
              ? "cursor-default border-emerald/60 text-emerald"
              : verdictReady
                ? "border-cognac bg-cognac text-ink hover:bg-cognac/85"
                : "cursor-not-allowed border-line text-dim"
          }`}
        >
          {approved ? "Approved" : "Approve verdict"}
        </button>
      </div>

      {confirming && !approved && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm verdict approval"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md border border-line bg-ink p-6"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="font-display text-2xl text-champagne">
              Finalize the verdict?
            </h2>
            <p className="mt-2 text-sm text-dim">
              You are signing off on the hardening verdict for VaultStaking.sol.
              Both exploits were reproduced on-chain and both patches held on
              re-attack. Nothing ships on the AI&apos;s say-so — this is your call.
            </p>
            {verdict?.severity_rating && (
              <p className="mt-3 font-mono text-xs text-cognac">
                {verdict.severity_rating}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="border border-line px-4 py-2 font-mono text-sm text-dim hover:text-champagne"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onApprove();
                  setConfirming(false);
                }}
                className="border border-cognac bg-cognac px-4 py-2 font-mono text-sm text-ink hover:bg-cognac/85"
              >
                Approve &amp; finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
