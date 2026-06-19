"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCrucibleStream } from "@/lib/useCrucibleStream";
import { ParticipantRail } from "@/components/warroom/ParticipantRail";
import { Transcript } from "@/components/warroom/Transcript";
import { ContractState } from "@/components/warroom/ContractState";
import { ApproveBar } from "@/components/warroom/ApproveBar";

const SPEEDS = [1, 2, 4];

export default function WarRoomPage() {
  const s = useCrucibleStream();
  const [configured, setConfigured] = useState(false);

  // Is live mode set up (BAND_API_KEY + BAND_ROOM_ID)? Gates the live button cleanly.
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const r = await fetch("/api/siege/health", { cache: "no-store" });
        const j = await r.json();
        setConfigured(!!j.configured);
      } catch {
        /* leave disabled */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-espresso">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex items-baseline gap-4">
          <Link
            href="/"
            className="font-display text-xl text-champagne hover:text-cognac"
          >
            Crucible
          </Link>
          <span className="hidden font-mono text-[11px] text-dim sm:inline">
            $30k–$100k &amp; 4–6 weeks → under ten minutes
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-dim">
            {s.contract} · {s.mode === "live" ? "live siege" : "replay"}
          </span>

          {s.mode === "live" ? (
            /* Live: status + a way BACK to the safe replay (both directions). */
            <>
              <span className="inline-flex items-center gap-2 border border-red/50 px-2 py-1 font-mono text-[11px] text-red">
                <span className="crucible-mark-in h-1.5 w-1.5 bg-red" /> LIVE · {s.liveStatus}
              </span>
              <button
                type="button"
                onClick={s.backToReplay}
                className="border border-cognac px-3 py-1 font-mono text-[11px] text-cognac transition-colors hover:bg-cognac hover:text-ink"
              >
                ← Back to replay
              </button>
            </>
          ) : (
            /* Replay (default): transport controls + preflight + the live action. */
            <>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={s.togglePlay}
                  className="border border-line px-2 py-1 font-mono text-[11px] text-dim hover:text-champagne"
                >
                  {s.playing ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={s.restart}
                  className="border border-line px-2 py-1 font-mono text-[11px] text-dim hover:text-champagne"
                >
                  Restart
                </button>
                {SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => s.setSpeed(sp)}
                    className={`border px-2 py-1 font-mono text-[11px] ${
                      s.speed === sp
                        ? "border-cognac text-cognac"
                        : "border-line text-dim hover:text-champagne"
                    }`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>

              {configured && <Preflight />}

              {configured ? (
                <button
                  type="button"
                  onClick={s.startLive}
                  className="border border-cognac bg-cognac px-3 py-1 font-mono text-[11px] text-ink transition-colors hover:bg-cognac/85"
                >
                  ● Run it live
                </button>
              ) : (
                <span
                  title="Set BAND_API_KEY + BAND_ROOM_ID in .env.local, then restart, to enable live."
                  className="cursor-default border border-line px-3 py-1 font-mono text-[11px] text-dim"
                >
                  Live mode — configure to enable
                </span>
              )}

              {s.liveStatus.startsWith("error") && (
                <span className="font-mono text-[11px] text-red">{s.liveStatus}</span>
              )}
            </>
          )}
        </div>
      </header>

      {/* Progress hairline */}
      <div className="h-px w-full bg-line">
        <div
          className="h-px bg-cognac transition-[width] duration-150"
          style={{ width: `${Math.round(s.progress * 100)}%` }}
        />
      </div>

      {/* Three panels */}
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_1fr_360px]">
        <section className="min-h-0 border-line lg:border-r">
          {s.loading ? (
            <Skeleton label="participants" />
          ) : (
            <ParticipantRail participants={s.participants} />
          )}
        </section>

        <section className="min-h-0 border-t border-line lg:border-t-0">
          {s.error ? (
            <div className="p-5 font-mono text-sm text-red">
              Failed to load playback stream: {s.error}
            </div>
          ) : s.loading ? (
            <Skeleton label="transcript" />
          ) : (
            <Transcript transcript={s.transcript} />
          )}
        </section>

        <section className="min-h-0 border-t border-line lg:border-l lg:border-t-0">
          {s.loading ? (
            <Skeleton label="contract state" />
          ) : (
            <ContractState
              vaultEth={s.vaultEth}
              status={s.status}
              rounds={s.rounds}
              patches={s.patches}
            />
          )}
        </section>
      </main>

      {/* Human veto */}
      <ApproveBar
        verdictReady={s.verdictReady}
        approved={s.approved}
        verdict={s.verdict}
        onApprove={s.approve}
      />
    </div>
  );
}

interface Health {
  ready: boolean;
  configured: boolean;
  anvil: boolean;
  band: boolean;
  standingPresent?: boolean;
}

/** Preflight chip — checks the live prerequisites (Anvil + Band room + standing agents). */
function Preflight() {
  const [h, setH] = useState<Health | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch("/api/siege/health", { cache: "no-store" });
      setH(await r.json());
    } catch {
      setH({ ready: false, configured: false, anvil: false, band: false });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Defer out of the synchronous effect body (check() sets state immediately).
    const id = setTimeout(check, 0);
    return () => clearTimeout(id);
  }, [check]);

  const dot = (ok: boolean) => (ok ? "bg-emerald" : "bg-red");
  return (
    <button
      type="button"
      onClick={check}
      title="Preflight: Anvil · Band room · standing agents. Click to re-check."
      className="hidden items-center gap-2 border border-line px-2 py-1 font-mono text-[11px] text-dim hover:text-champagne md:inline-flex"
    >
      <span className="uppercase tracking-wider">{checking ? "checking…" : "preflight"}</span>
      {h && (
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 ${dot(h.anvil)}`} title="Anvil" />
          <span className={`h-1.5 w-1.5 ${dot(h.band)}`} title="Band room" />
          <span className={`h-1.5 w-1.5 ${dot(!!h.standingPresent)}`} title="standing agents" />
        </span>
      )}
    </button>
  );
}

function Skeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center p-5">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
        loading {label}…
      </span>
    </div>
  );
}
