"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CrucibleEvent,
  CrucibleStreamFile,
  parseEth,
  parseTimestamp,
  Side,
} from "./events";

export interface Participant {
  agent: string;
  side: Side;
  label: string;
  recruited: boolean;
  by?: string;
  joinedAt: string;
}

export interface RoundState {
  round: number;
  result: "LANDED" | "BLOCKED";
}

export interface VerdictReport {
  severity_rating?: string;
  rounds?: number;
  remediation_checklist?: string[];
}

export interface CrucibleStream {
  loading: boolean;
  error: string | null;
  contract: string;
  /** Events emitted so far, in order. */
  emitted: CrucibleEvent[];
  participants: Participant[];
  /** Center transcript: message / exploit_result / round_verdict events. */
  transcript: CrucibleEvent[];
  vaultEth: number | null;
  status: string;
  rounds: RoundState[];
  patches: { reentrancy: boolean; accessControl: boolean };
  verdict: VerdictReport | null;
  verdictReady: boolean;
  approved: boolean;
  approve: () => void;
  // transport controls
  playing: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  togglePlay: () => void;
  restart: () => void;
  progress: number; // 0..1 over the auto-playable timeline
  atEnd: boolean;
  // live mode
  mode: "playback" | "live";
  liveStatus: string;
  startLive: () => void;
  backToReplay: () => void;
}

const SOURCE_URL = "/crucible-demo.json";

function isFinalApproval(e: CrucibleEvent): boolean {
  return e.type === "human_approval" && e.payload?.human_approved === true;
}

export function useCrucibleStream(): CrucibleStream {
  const [events, setEvents] = useState<CrucibleEvent[]>([]);
  const [contract, setContract] = useState("VaultStaking.sol");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clock, setClock] = useState(0); // demo-seconds elapsed
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [approved, setApproved] = useState(false);

  // Live mode (TASK 4): events arrive over SSE from /api/siege/stream instead of the clock.
  const [mode, setMode] = useState<"playback" | "live">("playback");
  const [liveEvents, setLiveEvents] = useState<CrucibleEvent[]>([]);
  const [liveStatus, setLiveStatus] = useState<string>("idle");
  const esRef = useRef<EventSource | null>(null);

  const elapsedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  // Load the timeline (playback). Live mode would swap this for a WS subscription
  // that pushes onto the same CrucibleEvent shape.
  useEffect(() => {
    let cancelled = false;
    fetch(SOURCE_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CrucibleStreamFile>;
      })
      .then((data) => {
        if (cancelled) return;
        setEvents(data.events ?? []);
        setContract(data.contract ?? "VaultStaking.sol");
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Number of events that auto-play (everything except the trailing human approval,
  // which waits for the operator to click Approve — the Track-3 governance gate).
  const autoPlayableCount = useMemo(() => {
    if (!events.length) return 0;
    return isFinalApproval(events[events.length - 1])
      ? events.length - 1
      : events.length;
  }, [events]);

  const autoEndTime = useMemo(() => {
    if (!autoPlayableCount) return 0;
    return parseTimestamp(events[autoPlayableCount - 1].timestamp);
  }, [events, autoPlayableCount]);

  // Playback clock.
  useEffect(() => {
    if (loading || !events.length) return;
    const id = window.setInterval(() => {
      const now = performance.now();
      if (playing && lastTickRef.current != null) {
        const dt = ((now - lastTickRef.current) / 1000) * speed;
        elapsedRef.current = Math.min(elapsedRef.current + dt, autoEndTime + 0.5);
        setClock(elapsedRef.current);
      }
      lastTickRef.current = now;
    }, 100);
    return () => window.clearInterval(id);
  }, [loading, events.length, playing, speed, autoEndTime]);

  const timeCount = useMemo(() => {
    let n = 0;
    for (let i = 0; i < autoPlayableCount; i++) {
      if (parseTimestamp(events[i].timestamp) <= clock + 1e-6) n++;
      else break;
    }
    return n;
  }, [events, autoPlayableCount, clock]);

  const emitted = useMemo(() => {
    if (mode === "live") return liveEvents;
    const n = approved ? events.length : Math.min(timeCount, autoPlayableCount);
    return events.slice(0, n);
  }, [mode, liveEvents, events, timeCount, autoPlayableCount, approved]);

  // ---- Derived war-room state from emitted events ----

  const participants = useMemo<Participant[]>(() => {
    const out: Participant[] = [];
    for (const e of emitted) {
      if (e.type === "participant_join") {
        out.push({
          agent: e.agent,
          side: (e.payload.side as Side) ?? "build",
          label: (e.payload.label as string) ?? "",
          recruited: e.payload.recruited === true,
          by: e.payload.by as string | undefined,
          joinedAt: e.timestamp,
        });
      } else if (e.type === "human_approval" && e.payload.joined === true) {
        if (!out.some((p) => p.agent === e.agent)) {
          out.push({
            agent: e.agent,
            side: "human",
            label: "Final approval",
            recruited: false,
            joinedAt: e.timestamp,
          });
        }
      }
    }
    return out;
  }, [emitted]);

  const transcript = useMemo(
    () =>
      emitted.filter(
        (e) =>
          e.type === "message" ||
          e.type === "exploit_result" ||
          e.type === "round_verdict" ||
          (e.type === "participant_join" && e.payload.recruited === true) ||
          (e.type === "human_approval" && e.payload.human_approved === true)
      ),
    [emitted]
  );

  const vaultEth = useMemo(() => {
    let v: number | null = 100;
    for (const e of emitted) {
      const parsed = parseEth(e.payload.vault);
      if (parsed != null) v = parsed;
    }
    return v;
  }, [emitted]);

  const status = useMemo(() => {
    let s = "submitted";
    for (const e of emitted) {
      if (typeof e.payload.status === "string") s = e.payload.status;
    }
    return s;
  }, [emitted]);

  const rounds = useMemo<RoundState[]>(() => {
    const map = new Map<number, "LANDED" | "BLOCKED">();
    for (const e of emitted) {
      if (e.type === "round_verdict" && typeof e.payload.round === "number") {
        map.set(e.payload.round as number, e.payload.result as "LANDED" | "BLOCKED");
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, result]) => ({ round, result }));
  }, [emitted]);

  const patches = useMemo(() => {
    let reentrancy = false;
    let accessControl = false;
    for (const e of emitted) {
      const patch = e.payload.patch;
      if (typeof patch === "string") {
        if (patch.includes("withdraw")) reentrancy = true;
        if (patch.includes("emergencyDrain")) accessControl = true;
      }
    }
    return { reentrancy, accessControl };
  }, [emitted]);

  const verdictEvent = useMemo(
    () =>
      emitted.find((e) => e.type === "round_verdict" && e.payload.verdict === true),
    [emitted]
  );

  const verdict = useMemo<VerdictReport | null>(
    () => (verdictEvent?.payload.report as VerdictReport) ?? null,
    [verdictEvent]
  );

  const verdictReady = !!verdictEvent;

  const approve = useCallback(() => setApproved(true), []);
  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      lastTickRef.current = performance.now();
      return !p;
    });
  }, []);
  const restart = useCallback(() => {
    elapsedRef.current = 0;
    lastTickRef.current = performance.now();
    setClock(0);
    setApproved(false);
    setPlaying(true);
  }, []);

  // Trigger a REAL siege. We only switch the UI into live mode AFTER the kickoff
  // succeeds — so a failed/misconfigured start never strands the user on an empty view.
  const startLive = useCallback(async () => {
    setLiveStatus("starting…");
    try {
      const r = await fetch("/api/siege/start", { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setLiveStatus(`error: ${j.error ?? `HTTP ${r.status}`}`);
        return; // stay in replay
      }
    } catch (e) {
      setLiveStatus(`error: ${String(e)}`);
      return; // stay in replay
    }
    // Success — now switch to live and open the stream.
    esRef.current?.close();
    setLiveEvents([]);
    setApproved(false);
    setMode("live");
    const es = new EventSource("/api/siege/stream");
    esRef.current = es;
    es.onopen = () => setLiveStatus("live");
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as CrucibleEvent;
        setLiveEvents((prev) => [...prev, ev]);
      } catch {
        /* ignore keep-alive / malformed */
      }
    };
    es.onerror = () => setLiveStatus("reconnecting…");
  }, []);

  // Return to the safe default (recorded replay) from a live run.
  const backToReplay = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setMode("playback");
    setLiveStatus("idle");
    elapsedRef.current = 0;
    lastTickRef.current = performance.now();
    setClock(0);
    setApproved(false);
    setPlaying(true);
  }, []);

  useEffect(() => () => esRef.current?.close(), []);

  const progress = autoEndTime > 0 ? Math.min(clock / autoEndTime, 1) : 0;
  const atEnd = timeCount >= autoPlayableCount && autoPlayableCount > 0;

  return {
    loading,
    error,
    contract,
    emitted,
    participants,
    transcript,
    vaultEth,
    status,
    rounds,
    patches,
    verdict,
    verdictReady,
    approved,
    approve,
    playing,
    speed,
    setSpeed,
    togglePlay,
    restart,
    progress,
    atEnd,
    // live mode
    mode,
    liveStatus,
    startLive,
    backToReplay,
  };
}
