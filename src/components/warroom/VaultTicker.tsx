"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vault balance ticker (FRONTEND.md §3) — Fraunces numerals that animate toward
 * the current balance: drains on breach, climbs back on patch. The drama lives
 * here, so it tweens rather than snapping.
 */
export function VaultTicker({ target }: { target: number | null }) {
  const [display, setDisplay] = useState(target ?? 100);
  const targetRef = useRef(target ?? 100); // last target we animated to
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) return;
    const from = targetRef.current;
    const to = target;
    if (from === to) return;
    targetRef.current = to;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = requestAnimationFrame(() => setDisplay(to));
      return () => cancelAnimationFrame(id);
    }

    const duration = 900;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  const empty = (target ?? 0) <= 0.0001;
  // Derived from state+prop only: mid-drain the display still sits above target.
  const draining = target != null && display > target + 0.01;

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`font-display text-6xl leading-none tabular-nums transition-colors duration-300 ${
          empty ? "text-red" : "text-champagne"
        }`}
      >
        {display.toFixed(display % 1 === 0 ? 0 : 2)}
      </span>
      <span className="font-mono text-sm text-dim">ETH</span>
      {draining && !empty && (
        <span className="font-mono text-xs text-red">draining…</span>
      )}
    </div>
  );
}
