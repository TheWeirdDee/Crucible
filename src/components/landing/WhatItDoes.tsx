"use client";

/*
 * "Six agents. Two sides. One verdict you sign." — centered, large, and revealed on
 * scroll with a weighty staggered fade-up (easeOutQuint, no bounce). Each agent's role
 * lands one after another as the section enters view.
 */

import { useEffect, useRef, useState } from "react";

const ROSTER: [string, string][] = [
  ["The Architect", "maps your contract's attack surface."],
  [
    "The Red Lead",
    "reads the code and recruits the exact specialist attackers it needs — a reentrancy expert, an access-control expert — pulling them into the room at runtime.",
  ],
  [
    "Each specialist",
    "runs a real exploit against your contract on a live blockchain fork, with a real transaction hash as proof.",
  ],
  ["The Engineer", "patches the code under fire."],
  ["The specialists", "re-attack the patch to confirm it holds."],
  [
    "The Judge",
    "scores every round and compiles a hardening verdict — which you, the human, approve.",
  ],
];

export function WhatItDoes() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => {
        setReduced(true);
        setShown(true);
      });
      return () => cancelAnimationFrame(id);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const reveal = (i: number): React.CSSProperties =>
    reduced
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "none" : "translateY(16px)",
          transition: `opacity 720ms cubic-bezier(0.22,1,0.36,1) ${i * 90}ms, transform 720ms cubic-bezier(0.22,1,0.36,1) ${i * 90}ms`,
        };

  return (
    <section className="border-t border-line px-6 py-28">
      <div ref={ref} className="mx-auto max-w-5xl">
        <h2
          className="font-display text-3xl leading-[1.1] text-champagne md:text-5xl"
          style={reveal(0)}
        >
          Six agents. Two sides.{" "}
          <span className="italic text-cognac">One verdict you sign.</span>
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dim" style={reveal(1)}>
          Crucible runs an adversarial security review as a live fight between AI agents in a
          shared Band room:
        </p>

        {/* the roster table — left-aligned, rows reveal in sequence */}
        <ul className="mt-12 max-w-2xl divide-y divide-line border-y border-line">
          {ROSTER.map(([role, desc], i) => (
            <li
              key={role}
              className="flex flex-col gap-1 py-5 sm:flex-row sm:gap-6"
              style={reveal(i + 2)}
            >
              <span className="w-44 shrink-0 font-mono text-sm text-cognac">{role}</span>
              <span className="leading-relaxed text-dim">{desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
