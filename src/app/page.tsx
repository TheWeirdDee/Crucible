import Link from "next/link";
import { WarRoomPreview } from "@/components/landing/WarRoomPreview";

// Real Spike/siege tx hashes (data/crucible-demo.json) — proof, not placeholders.
const R1_TX = "0xe76b2188c10bf959327e8c1e78b8bf45906e4af2fc7b6c2357ffa83847806bdf";
const R2_TX = "0x84d0f4a1e400bcec2b9745836590e9fcd4cfc19973ccae795875d23a65ef9f6f";

export default function Home() {
  return (
    <div className="bg-espresso">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-line px-6 py-4">
        <span className="font-display text-2xl text-champagne">Crucible</span>
        <Link
          href="/war-room"
          className="font-mono text-xs uppercase tracking-[0.2em] text-cognac hover:text-champagne"
        >
          Watch a siege →
        </Link>
      </nav>

      {/* HERO */}
      <header className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-dim">
            Smart-contract security · built on Band
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] text-champagne md:text-6xl">
            Audit your contract by <span className="italic text-cognac">attacking</span> it.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-dim">
            Crucible is a team of AI agents that breaks into your smart contract before real
            attackers do. One team defends your code. Another recruits specialist hackers to
            exploit it — live, in a shared war room — until every hole is found and patched.
          </p>
          <p className="mt-6 max-w-xl border-l-2 border-cognac pl-4 font-mono text-sm leading-relaxed text-champagne">
            A professional Solidity audit costs $30k–$100k and takes 4–6 weeks. Crucible runs
            the same adversarial fight in <span className="text-cognac">under ten minutes</span>.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/war-room"
              className="border border-cognac bg-cognac px-6 py-3 font-mono text-sm text-ink transition-colors hover:bg-cognac/85"
            >
              Watch a real siege
            </Link>
            <a
              href="#how"
              className="border border-line px-6 py-3 font-mono text-sm text-dim transition-colors hover:text-champagne"
            >
              How it works
            </a>
          </div>
        </div>

        {/* The hero visual is a framed preview of the actual product. */}
        <div>
          <WarRoomPreview />
          <p className="mt-3 text-center font-mono text-[11px] text-dim">
            a live siege — real agents, real exploit, real tx hash
          </p>
        </div>
      </header>

      {/* THE PROBLEM */}
      <Section>
        <h2 className="font-display text-3xl text-champagne md:text-4xl">
          One missed bug drains the whole contract.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dim">
          Smart contracts are public, immutable, and hold real money. A single overlooked
          vulnerability — like the reentrancy bug that drained $60M from The DAO — can empty a
          contract in one transaction. Today, teams either pay tens of thousands for a human
          audit and wait weeks, or they ship blind and hope. There&apos;s no fast, cheap way to
          find the obvious-in-hindsight bugs before launch.
        </p>
      </Section>

      {/* WHAT IT DOES */}
      <Section>
        <h2 className="font-display text-3xl text-champagne md:text-4xl">
          Six agents. Two sides. One verdict you sign.
        </h2>
        <p className="mt-5 max-w-2xl text-dim">
          Crucible runs an adversarial security review as a live fight between AI agents in a
          shared Band room:
        </p>
        <ul className="mt-6 max-w-2xl divide-y divide-line border-y border-line">
          {[
            ["The Architect", "maps your contract's attack surface."],
            ["The Red Lead", "reads the code and recruits the exact specialist attackers it needs — a reentrancy expert, an access-control expert — pulling them into the room at runtime."],
            ["Each specialist", "runs a real exploit against your contract on a live blockchain fork, with a real transaction hash as proof."],
            ["The Engineer", "patches the code under fire."],
            ["The specialists", "re-attack the patch to confirm it holds."],
            ["The Judge", "scores every round and compiles a hardening verdict — which you, the human, approve."],
          ].map(([who, what]) => (
            <li key={who} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-4">
              <span className="w-40 shrink-0 font-mono text-sm text-cognac">{who}</span>
              <span className="text-dim">{what}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how">
        <h2 className="font-display text-3xl text-champagne md:text-4xl">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-5">
          {[
            ["01", "Submit", "Drop your Solidity contract into the war room. The Build team takes the defending side."],
            ["02", "Recruit", "The Red Lead inspects the code and recruits the specialist attackers the contract's weaknesses call for — live, not pre-scripted."],
            ["03", "Attack", "Specialists run real exploits on a blockchain fork. The vault drains from 100 ETH to 0. Real transaction, real proof."],
            ["04", "Patch & re-attack", "The Engineer hardens the code. The same exploit is re-run and fails. The vault holds."],
            ["05", "Verdict", "The Judge compiles the findings into a hardening report. Nothing finalizes until you approve it."],
          ].map(([n, title, body]) => (
            <div key={n} className="bg-espresso p-5">
              <div className="font-mono text-xs text-cognac">{n}</div>
              <div className="mt-3 font-display text-xl text-champagne">{title}</div>
              <p className="mt-2 text-sm leading-relaxed text-dim">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* PROOF */}
      <Section>
        <h2 className="font-display text-3xl text-champagne md:text-4xl">
          Real exploits. Real transactions. Not a mockup.
        </h2>
        <p className="mt-5 max-w-2xl text-dim">
          Crucible&apos;s attacks run on a live Anvil blockchain fork and produce verifiable
          transaction hashes. In a recent siege:
        </p>
        <div className="mt-6 max-w-2xl border border-line bg-ink p-5 font-mono text-[12.5px] leading-relaxed">
          <div className="text-red">
            Reentrancy exploit landed — vault drained 100 → 0 ETH
          </div>
          <div className="break-all text-cognac">tx {R1_TX}</div>
          <div className="mt-3 text-red">
            Access-control exploit landed — vault drained 100 → 0 ETH
          </div>
          <div className="break-all text-cognac">tx {R2_TX}</div>
          <div className="mt-3 text-emerald">
            Both re-attacks blocked after patching — vault held at 100 ETH.
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/war-room"
            className="border border-cognac bg-cognac px-6 py-3 font-mono text-sm text-ink transition-colors hover:bg-cognac/85"
          >
            Watch the full siege
          </Link>
        </div>
      </Section>

      {/* WHY BAND */}
      <Section>
        <h2 className="font-display text-3xl text-champagne md:text-4xl">
          Take Band out, and the fight can&apos;t happen.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-dim">
          Crucible isn&apos;t six agents calling an API in sequence. The Red Lead discovers and
          recruits specialists mid-siege through Band&apos;s runtime participant tools — the
          attacking team assembles itself based on what your code exposes. Two opposing teams
          and a referee coordinate in one shared room through @mention routing, across
          different AI providers, with a human holding final approval.{" "}
          <span className="text-champagne">The collaboration is the product.</span>
        </p>
      </Section>

      {/* FINAL CTA */}
      <section className="border-t border-line px-6 py-24 text-center">
        <h2 className="font-display text-4xl text-champagne md:text-5xl">
          Find the bug before the <span className="italic text-cognac">attacker</span> does.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-dim">
          Stop shipping to audit blind. Put your contract in the crucible first.
        </p>
        <div className="mt-8">
          <Link
            href="/war-room"
            className="border border-cognac bg-cognac px-8 py-3 font-mono text-sm text-ink transition-colors hover:bg-cognac/85"
          >
            Watch a real siege
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
        Crucible · built on Band · 2026 · Agents don&apos;t work alone
      </footer>
    </div>
  );
}

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}
