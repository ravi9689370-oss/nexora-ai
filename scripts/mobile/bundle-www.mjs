/**
 * bundle-www.mjs — transpiles + bundles the mobile SPA into ONE classic
 * (non-module) script for maximum Android WebView compatibility.
 *
 * Why: older Android System WebViews refuse modern ES syntax (`?.`, `??`)
 * and don't support ES-module scripts. esbuild (target chrome58, IIFE)
 * lowers all of it; index.html adds ES5-only DOM polyfills.
 *
 * esbuild resolution order:
 *   1. this repo's node_modules (CI: npm install installs it normally)
 *   2. a sibling library checkout (local dev fallback)
 *
 * Run (after build-www.mjs): node scripts/mobile/bundle-www.mjs
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

function loadEsbuild() {
  const candidates = [
    createRequire(path.join(root, "package.json")), // repo node_modules (CI)
    createRequire("/root/one-person-ai-creator-studio/package.json"), // local fallback
  ];
  for (const req of candidates) {
    try {
      return req("esbuild");
    } catch {
      /* try next */
    }
  }
  throw new Error("esbuild not found — run `npm install` in the repo first.");
}

const esbuild = loadEsbuild();
const jsDir = path.join(root, "www", "assets", "js");

await esbuild.build({
  entryPoints: [path.join(root, "mobile-app", "assets", "js", "main.js")],
  bundle: true,
  format: "iife",
  target: ["chrome58"],
  minify: true,
  legalComments: "none",
  outfile: path.join(jsDir, "bundle.js"),
  logLevel: "info",
});

/* remove the now-unbundled ES-module files, keep ONLY bundle.js */
for (const f of readdirSync(jsDir)) {
  if (f !== "bundle.js") rmSync(path.join(jsDir, f), { recursive: true, force: true });
}
/* drop any views directory leftover beyond bundle */
if (existsSync(path.join(jsDir, "views"))) rmSync(path.join(jsDir, "views"), { recursive: true, force: true });

console.log("[bundle] www/assets/js/bundle.js written (chrome58 target, classic IIFE).");
