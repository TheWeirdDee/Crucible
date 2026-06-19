# Crucible — Frontend Build Spec (FRONTEND.md)

This is the build spec for the Crucible web app. An AI coding agent builds from this.
Two surfaces: (A) the landing page, (B) the war room app. Same design system for both.
Stack: **Next.js 14 (App Router) · React · Tailwind CSS · deployed on Vercel.**

The PRD (crucible_prd_v2.md) is the product source of truth. This file owns *look + build*.

---

## 0. The #1 content rule
Every surface answers **"who uses this and why"** before anything else. The use-case
(`$30k–$100k & 4–6 weeks → under ten minutes`) is visible in the first screen of the
landing page and stated in the first sentence of any description. A previous project lost
because a judge couldn't tell who it was for. Never make a judge work to get the point.

---

## 1. Design system (NON-NEGOTIABLE)

Aesthetic: **forge / tempered-metal.** Aged, premium, physical, restrained. Not a crypto
dashboard, not a generic AI SaaS page.

### Palette — exact hex, Amber is BANNED
```
--espresso   #241310   deep base background
--ink        #1a0d0b   darker panels / fills
--champagne  #ece0d4   primary text
--dim        #9a8579   secondary text
--cognac     #c3955b   THE single hot accent (fire, CTAs, emphasis) — use sparingly
--steel      #7d8b83   cold metal / build-team color
--red        #c96a4f   muted ember-red / red-team color (NOT pure red)
--emerald    #2f5d54   held / success state
--line       #3d2a24   hairline borders
```
Team colors in the transcript: build = `--steel`, red = `--red`, judge = `--cognac`,
human = `--champagne`.

### Fonts
- **Display / headlines:** **Fraunces** (serif). Weights 400–600. Use *italic* for emphasis
  words. This carries all the personality — editorial, confident.
- **Body / UI:** **Inter**. Weights 400–500.
- **Data / logs / labels / code / tx hashes:** **JetBrains Mono**.

Load via Google Fonts. Fraunces is the signature — do not substitute.

### HARD BANS (these were tried and rejected — do not reintroduce)
- ❌ No gradients anywhere. Flat fills only.
- ❌ No glows / blurred shadow halos.
- ❌ No emoji as icons. Use clean SVG line-art if an icon is needed.
- ❌ No generic rounded-rectangle "card with border" as the main hero visual.
- ❌ No feature-grid-pretending-to-be-a-story.
- ❌ Avoid the AI-default looks (cream+serif+terracotta; black+acid-green; broadsheet).

### Texture we DO want
Flat color, hairline rules doing structural work, type carrying the weight, generous space,
restraint everywhere except the one hero object.

---

## 2. Landing page

### Hero object (the signature)
One physical **SVG crucible vessel holding a metal ingot**, cold steel line-art on espresso.
It is the centerpiece and it acts out the story on a **pinned scroll** (GSAP ScrollTrigger:
pin the section, play the sequence on scroll, release — like the Hatch egg-crack). Three
states tied to the three story beats:

1. **BLIND** — vessel sealed, ingot cold/unknown steel, still.
2. **FIRE** — the strike: ingot heats to `--cognac`, small fire-strokes rise, and an SVG
   crack draws itself across the ingot via `stroke-dashoffset` (a fracture spreading).
3. **PROVEN** — fire out, crack *seals back* (reverse the stroke), metal cools to `--steel`,
   a small `HARDENED` stamp presses in (`--cognac`).

Do NOT animate a row of agent boxes sliding around. The meaning lives in one object
transforming. Reduced-motion: render the three states statically, stacked.

### Story spine (the page backbone — one sentence per beat, synced to the vessel)
1. **"You ship it blind."** — sub: $30k–$100k, 4–6 weeks to find out.
2. **"We put it to fire."** — a red team assembles itself, recruits the specialists your
   code exposes, and strikes; the vault drains.
3. **"What survives is proven."** — the build team patches under fire, the re-attack fails,
   the contract holds and is marked hardened — for you to sign.

### Page structure (top → bottom)
1. **Nav** — wordmark "Crucible" (Fraunces) + one link "Run a siege". Minimal.
2. **Hero** — kicker `SMART-CONTRACT SECURITY · BUILT ON BAND`, the vessel (sealed),
   headline **"What survives is proven."**, one-line sub on the two-team fight, the $-cost
   use-case line visible here, scroll hint.
3. **The Spine** — pinned scroll, vessel animates blind→fire→proven with the 3 beats.
4. **The Proof** — the rounds as a clean JetBrains Mono log (NOT cards): R1 reentrancy
   breaches 100→0, patch, R2 held, R2 access-control held, verdict approved.
5. **Who's in the room** — flat hairline-bordered roster (no floating cards): Architect,
   Engineer (build) · Red Lead, recruited Specialists (red) · Judge (referee) · You (human).
6. **Why Band** — headline "Take Band out, and the fight can't happen." Four flat cells:
   Runtime recruitment / @mention routing / Cross-provider / Human-governed.
7. **Final CTA** — "Find the bug before the attacker does." + "Run a siege".
8. **Footer** — `CRUCIBLE · BUILT ON BAND · 2026` / `AGENTS DON'T WORK ALONE`.

### Copy voice
Declarative, physical verbs (fire, strike, hold, forge, drain, seal). Sentence case. No
"revolutionary/seamless/cutting-edge". Short — the serif and the object carry the drama.

---

## 3. War room app (the live product + demo centerpiece)

### Layout — three panels + bottom bar
- **Left rail — Participants.** Live list grouped Build / Red / Referee / You. Each row:
  handle (JetBrains Mono), role label, join timestamp. **Recruited specialists appear one at
  a time** with a join animation + a line `thenvoi_add_participant → @ReentrancySpec joined`.
  This rail is the visible proof of runtime recruitment — make the appearance unmistakable.
- **Center — Transcript.** The @mention chat. Messages color-coded by `side`. Distinguish
  three render types: `message` (chat), `exploit_result`/patch (monospace code/data block),
  `round_verdict` (a LANDED/BLOCKED badge line). Auto-scroll, but readable.
- **Right — Contract state.** Current Solidity source with per-patch diff highlighting; a
  **vault balance ticker** (Fraunces numerals) that animates 100→0 on breach and back on
  patch; a status pill `DEFENDING / UNDER ATTACK / HELD`; round badges.
- **Bottom bar — Human control.** An **Approve** button, disabled until the Judge posts the
  verdict, requires a confirmation modal before firing. On approve, the verdict's
  `human_approved` flips true and the bar shows the finalized state. This is the Track-3
  governance moment — make it prominent, not a tucked-away button.

### The one beat the UI must nail
Specialist recruited (left rail animates in) → posts exploit (center) → vault ticker drains
(right) → build patches → re-attack fails → ticker returns, status HELD. That sequence is
the demo. Time it so it's legible on video.

### Data layer — source-agnostic (PRD §6.4)
The UI consumes ONE event-stream interface; never branch UI logic on the source:
```typescript
interface CrucibleEvent {
  type: 'message' | 'exploit_result' | 'round_verdict' | 'participant_join' | 'human_approval';
  agent: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
```
Toggle by env var:
- `STREAM_MODE=playback` → read `data/crucible-demo.json`, emit events on their timestamps.
  **Build this FIRST.** The whole UI must be demoable from playback before Band exists.
- `STREAM_MODE=live` → subscribe to the Band WebSocket; map each incoming Band message/event
  onto the same `CrucibleEvent` shape. The renderer does not change.

Map `payload.side` → color, `payload.vault`/`payload.status` → right panel, `type` → render
style. Real `tx_hash` values render as monospace, ideally linking to the local explorer.

### Quality floor
Responsive; the three-panel collapses to stacked on mobile. Pinned landing animation
degrades with `prefers-reduced-motion`. Visible keyboard focus. Must look intentional on a
phone — judges may view on one.

---

## 4. Build order
1. Design system (Tailwind config: colors, the 3 fonts).
2. Landing page static, then add the pinned vessel animation.
3. War room shell (3 panels + bottom bar) wired to `STREAM_MODE=playback`.
4. Verify the full demo plays from `crucible-demo.json` end-to-end — if it does, the video
   is recordable. (PRD Day 4 gate.)
5. Hand back for `STREAM_MODE=live` Band wiring (PRD Day 5).
