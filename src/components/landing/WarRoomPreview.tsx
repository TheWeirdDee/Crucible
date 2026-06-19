/*
 * Hero visual — a framed, static preview of the actual war room (not an abstract
 * illustration). Real transcript beats, the recruitment line, and the vault ticker
 * at 100 ETH. Mirrors the live /war-room design system (flat fills, hairlines, mono).
 */

function Dot({ c }: { c: string }) {
  return <span className={`inline-block h-1.5 w-1.5 ${c}`} />;
}

export function WarRoomPreview() {
  return (
    <div className="border border-line bg-ink">
      {/* window/header bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
          crucible · the siege
        </span>
        <span className="inline-flex items-center gap-2 border border-red/50 px-2 py-0.5 font-mono text-[10px] tracking-wide text-red">
          <Dot c="bg-red" /> UNDER ATTACK
        </span>
      </div>

      <div className="grid grid-cols-[120px_1fr_104px]">
        {/* left rail — who's in the room */}
        <div className="space-y-3 border-r border-line p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim/70">
            In the room
          </div>
          {[
            ["@Architect", "bg-steel"],
            ["@Engineer", "bg-steel"],
            ["@RedLead", "bg-red"],
            ["@ReentrancySpec", "bg-red"],
            ["@Judge", "bg-cognac"],
            ["You", "bg-champagne"],
          ].map(([name, c]) => (
            <div key={name} className="flex items-center gap-2 font-mono text-[10px] text-champagne/90">
              <Dot c={c} />
              {name}
            </div>
          ))}
        </div>

        {/* center — transcript */}
        <div className="space-y-3 p-4">
          <div className="border-l-2 border-steel/40 pl-3">
            <span className="font-mono text-[10px] font-medium text-steel">@Architect</span>
            <p className="mt-1 text-[12px] leading-relaxed text-champagne/85">
              Surface mapped. withdraw() sends ETH before zeroing the balance — reentrancy.
              emergencyDrain() has no owner check. @Engineer
            </p>
          </div>

          {/* the recruitment beat */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-3 font-mono text-[10.5px]">
            <span className="text-dim">↳</span>
            <span className="text-red">@RedLead</span>
            <span className="text-dim">recruited</span>
            <span className="text-red">@ReentrancySpec</span>
            <span className="border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-dim">
              band_add_participant
            </span>
          </div>

          {/* exploit result */}
          <div className="border-l-2 border-red/60 bg-espresso/40 p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">Exploit</span>
              <span className="font-mono text-[10px] font-medium text-red">@ReentrancySpec</span>
              <span className="ml-auto border border-red/60 px-2 py-0.5 font-mono text-[9px] text-red">
                LANDED
              </span>
            </div>
            <div className="mt-2 space-y-0.5 font-mono text-[10px]">
              <div className="flex gap-2">
                <span className="text-dim">vault</span>
                <span className="text-champagne">100 ETH → 0 ETH</span>
              </div>
              <div className="flex gap-2 break-all">
                <span className="text-dim">tx</span>
                <span className="text-cognac">0xe76b2188c10bf95932…</span>
              </div>
            </div>
          </div>
        </div>

        {/* right — vault ticker */}
        <div className="flex flex-col items-center justify-center gap-2 border-l border-line p-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-dim">
            Vault
          </span>
          <span className="font-display text-4xl leading-none text-champagne">100</span>
          <span className="font-mono text-[10px] text-dim">ETH</span>
        </div>
      </div>
    </div>
  );
}
