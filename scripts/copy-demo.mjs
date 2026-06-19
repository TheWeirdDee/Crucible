// Copies the canonical playback timeline into /public so the app can fetch it
// at /crucible-demo.json. data/crucible-demo.json stays the single source of
// truth (regenerated from the real Band transcript on Day 3); public/ is a
// generated artifact (gitignored). Runs via predev / prebuild.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "data", "crucible-demo.json");
const dest = resolve(root, "public", "crucible-demo.json");

if (!existsSync(src)) {
  console.error(`[copy-demo] missing source: ${src}`);
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-demo] ${src} -> ${dest}`);
