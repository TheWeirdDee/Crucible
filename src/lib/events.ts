/*
 * Crucible event stream — source-agnostic contract (PRD v2 §6.4, FRONTEND.md §3).
 *
 * The UI consumes ONE interface regardless of source. STREAM_MODE=playback reads
 * data/crucible-demo.json (served at /crucible-demo.json); STREAM_MODE=live will
 * map Band WebSocket messages onto this exact shape — the renderer never branches
 * on the source.
 */

export type CrucibleEventType =
  | "message"
  | "exploit_result"
  | "round_verdict"
  | "participant_join"
  | "human_approval";

export type Side = "build" | "red" | "judge" | "human";

export interface CrucibleEvent {
  type: CrucibleEventType;
  agent: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface CrucibleStreamFile {
  session_id: string;
  contract: string;
  events: CrucibleEvent[];
}

/** Team color per FRONTEND.md: build=steel, red=red, judge=cognac, human=champagne. */
export function sideColorClass(side?: string): string {
  switch (side) {
    case "build":
      return "text-steel";
    case "red":
      return "text-red";
    case "judge":
      return "text-cognac";
    case "human":
      return "text-champagne";
    default:
      return "text-dim";
  }
}

export function sideBorderClass(side?: string): string {
  switch (side) {
    case "build":
      return "border-steel/40";
    case "red":
      return "border-red/40";
    case "judge":
      return "border-cognac/40";
    case "human":
      return "border-champagne/30";
    default:
      return "border-line";
  }
}

/** "MM:SS.s" | "MM:SS" | "SS" -> seconds. Tolerant of the demo timeline format. */
export function parseTimestamp(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 2) {
    const [m, s] = parts;
    return parseInt(m, 10) * 60 + parseFloat(s);
  }
  return parseFloat(ts);
}

/** Parse a "<n> ETH" string to a number; tolerant of missing/odd values. */
export function parseEth(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = v.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Right-panel status pill label from a payload.status value. */
export function statusLabel(status?: string): "DEFENDING" | "UNDER ATTACK" | "HELD" {
  switch (status) {
    case "BREACHED":
      return "UNDER ATTACK";
    case "HELD":
      return "HELD";
    default:
      return "DEFENDING";
  }
}

export const STREAM_MODE =
  (process.env.NEXT_PUBLIC_STREAM_MODE as "playback" | "live" | undefined) ??
  "playback";
