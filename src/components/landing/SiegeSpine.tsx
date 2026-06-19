"use client";

/*
 * The signature moment — a pinned, scroll-SCRUBBED reveal of the real product.
 * As the judge scrolls, the page pins and a live war-room preview plays the siege:
 *   blind (vault 100) → a specialist is recruited → the exploit lands and the vault
 *   drains 100 → 0 → the patch lands → re-attack reverts → vault recovers → HARDENED.
 * Motion is tied to scroll (scrub) so it feels weighty and deliberate — metal worked,
 * not bounced. Everything animates off a single progress value 0..1.
 */

import { useEffect, useRef, useState } from "react";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const band = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Vault balance as a function of scroll: hold 100 → drain → hold 0 → recover → 100.
function vaultEth(p: number): number {
  if (p < 0.3) return 100;
  if (p < 0.5) return lerp(100, 0, band(p, 0.3, 0.5));
  if (p < 0.72) return 0;
  if (p < 0.9) return lerp(0, 100, band(p, 0.72, 0.9));
  return 100;
}

function statusOf(p: number): { label: string; cls: string; dot: string } {
  if (p >= 0.9) return { label: "HARDENED", cls: "border-emerald/60 text-emerald", dot: "bg-emerald" };
  if (p >= 0.72) return { label: "HOLDING", cls: "border-emerald/60 text-emerald", dot: "bg-emerald" };
  if (p >= 0.58) return { label: "PATCHING", cls: "border-cognac/60 text-cognac", dot: "bg-cognac" };
  if (p >= 0.3) return { label: "UNDER ATTACK", cls: "border-red/60 text-red", dot: "bg-red" };
  return { label: "DEFENDING", cls: "border-steel/50 text-steel", dot: "bg-steel" };
}

const BEATS = [
  { c: 0.12, k: "01 · submitted", t: "You ship it blind.", s: "A contract that will hold real money, shipped on hope — the bug is already in the code." },
  { c: 0.46, k: "02 · under fire", t: "We put it to the fire.", s: "The red team recruits the attacker your code invites and drains it. 100 → 0 ETH, with a real transaction hash." },
  { c: 0.86, k: "03 · proven", t: "What survives is hardened.", s: "Patched under fire, re-attacked, and it holds at 100 ETH. Then you — the human — sign off." },
];

function Dot({ c }: { c: string }) {
  return <span className={`inline-block h-1.5 w-1.5 ${c}`} />;
}

/** The live war-room preview, every value driven by scroll progress p. */
function Stage({ p }: { p: number }) {
  const v = vaultEth(p);
  const st = statusOf(p);
  const recruited = band(p, 0.18, 0.26); // specialist slides into the rail
  const landed = band(p, 0.34, 0.44); // exploit result appears
  const patched = band(p, 0.58, 0.66); // engineer patch appears
  const blocked = band(p, 0.74, 0.82); // re-attack reverts
  const stamp = band(p, 0.88, 0.98); // HARDENED stamp presses in
  const empty = v <= 0.5;

  return (
    <div className="border border-line bg-ink">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
          crucible · the siege
        </span>
        <span className={`inline-flex items-center gap-2 border px-2 py-0.5 font-mono text-[10px] tracking-wide ${st.cls}`}>
          <Dot c={st.dot} /> {st.label}
        </span>
      </div>

      <div className="grid grid-cols-[110px_1fr_104px]">
        {/* rail — recruit slides in */}
        <div className="space-y-2.5 border-r border-line p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim/70">In the room</div>
          {[["@Architect", "bg-steel"], ["@Engineer", "bg-steel"], ["@RedLead", "bg-red"], ["@Judge", "bg-cognac"]].map(([n, c]) => (
            <div key={n} className="flex items-center gap-2 font-mono text-[10px] text-champagne/90">
              <Dot c={c} /> {n}
            </div>
          ))}
          <div
            className="flex items-center gap-2 overflow-hidden font-mono text-[10px] text-red"
            style={{ opacity: recruited, maxHeight: `${recruited * 20}px`, transform: `translateX(${(1 - recruited) * -10}px)` }}
          >
            <Dot c="bg-red" /> @ReentrancySpec
          </div>
          <div
            className="pl-3.5 font-mono text-[8.5px] uppercase tracking-wider text-dim"
            style={{ opacity: recruited }}
          >
            band_add_participant
          </div>
        </div>

        {/* transcript — beats appear with scroll */}
        <div className="space-y-2.5 p-3.5">
          <div className="border-l-2 border-steel/40 pl-3">
            <span className="font-mono text-[10px] font-medium text-steel">@Architect</span>
            <p className="mt-1 text-[11px] leading-relaxed text-champagne/80">
              withdraw() sends ETH before zeroing the balance — reentrancy.
            </p>
          </div>

          {/* exploit landed */}
          <div
            className="border-l-2 border-red/60 bg-espresso/40 p-2.5"
            style={{ opacity: landed, transform: `translateY(${(1 - landed) * 8}px)` }}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">exploit</span>
              <span className="font-mono text-[10px] font-medium text-red">@ReentrancySpec</span>
              <span className="ml-auto border border-red/60 px-1.5 py-0.5 font-mono text-[9px] text-red">LANDED</span>
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] text-cognac break-all">tx 0xe76b2188c10bf959…</div>
          </div>

          {/* engineer patch */}
          <div
            className="code-panel overflow-hidden px-2.5 py-2 font-mono text-[9.5px] leading-relaxed text-champagne/90"
            style={{ opacity: patched, maxHeight: `${patched * 56}px` }}
          >
            <span className="text-cognac">function</span> withdraw() <span className="text-cognac">nonReentrant</span> {"{"}<br />
            &nbsp;&nbsp;balances[msg.sender] = 0; <span className="text-emerald">{"// effect first"}</span><br />
            {"}"}
          </div>

          {/* re-attack blocked */}
          <div
            className="flex items-center gap-2 border-l-2 border-emerald/60 pl-3"
            style={{ opacity: blocked }}
          >
            <span className="font-mono text-[10px] font-medium text-cognac">@Judge</span>
            <span className="border border-emerald/60 px-1.5 py-0.5 font-mono text-[9px] text-emerald">BLOCKED · vault holds</span>
          </div>
        </div>

        {/* vault ticker — scrubs 100 → 0 → 100, then HARDENED stamp */}
        <div className="relative flex flex-col items-center justify-center gap-1.5 border-l border-line p-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-dim">vault</span>
          <span className={`font-display text-4xl leading-none tabular-nums transition-colors duration-300 ${empty ? "text-red" : stamp > 0.3 ? "text-emerald" : "text-champagne"}`}>
            {v.toFixed(0)}
          </span>
          <span className="font-mono text-[10px] text-dim">ETH</span>
          <span
            className="mt-2 border border-emerald/60 px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.2em] text-emerald"
            style={{ opacity: stamp, transform: `scale(${0.9 + 0.1 * stamp})` }}
          >
            Hardened
          </span>
        </div>
      </div>
    </div>
  );
}

export function SiegeSpine() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      const id = requestAnimationFrame(() => setReduced(true));
      return () => cancelAnimationFrame(id);
    }
    let kill: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      const gsap = gsapMod.default;
      gsap.registerPlugin(stMod.ScrollTrigger);
      const st = stMod.ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=2600", // scroll distance the story plays over
        pin: pinRef.current,
        scrub: 0.6, // weighty catch-up, never snappy
        onUpdate: (self) => setP(self.progress),
      });
      kill = () => st.kill();
    })();
    return () => {
      cancelled = true;
      kill?.();
    };
  }, []);

  if (reduced) {
    // No pin/scroll-jacking for reduced motion — show the resolved (hardened) state.
    return (
      <section className="border-t border-line px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cognac">the siege</p>
          <h2 className="mt-4 font-display text-4xl text-champagne">Blind → attacked → hardened.</h2>
          <p className="mt-4 max-w-xl text-dim">{BEATS[1].s}</p>
          <div className="mt-8 max-w-2xl">
            <Stage p={0.95} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="border-t border-line">
      <div ref={pinRef} className="flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
          {/* narrative — three beats cross-fade with scroll */}
          <div className="relative order-2 h-52 md:order-1 md:h-64">
            {BEATS.map((b, i) => (
              <div
                key={i}
                className="absolute inset-0 flex flex-col justify-center"
                style={{ opacity: clamp01(1 - Math.abs(p - b.c) / 0.2) }}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-cognac">{b.k}</span>
                <h2 className="mt-3 font-display text-4xl leading-[1.05] text-champagne md:text-5xl">{b.t}</h2>
                <p className="mt-4 max-w-md text-dim">{b.s}</p>
              </div>
            ))}
          </div>

          {/* the live product, scrubbed */}
          <div className="order-1 md:order-2">
            <Stage p={p} />
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
              scroll · the vault drains, then holds
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
