# BUG_REPORT.md — Nexora AI (v1.2 audit → v1.3 fixes)

Date: 2026-11-01 · Each entry: symptom → root cause → fix → verification

## BUG-1 · Splash hang on cold boot (APK)
- Symptom: APK v1.0/v1.1 WebView appeared frozen after launch.
- Root cause: `maya.js` did not export functions used by the boot hooks (`hooks`, `outline`, `caption`, `scriptDraft`) and the bundled SPA contained modern `?.`/`??` syntax rejected by the system WebView's old JS engine.
- Fix (shipped v1.2): explicit maya exports, ES5-only bundle (chrome58 IIFE, zero `?.`/`??` bytes), ES5 polyfills + boot watchdog in `index.html`.
- Verification: headless Chromium CDP probes on all 6 mobile routes; watchdog never fired; APK v1.2 released.

## BUG-2 · `/api/chat` returned hardcoded fake answers
- Symptom: every question returned one of a few canned strings; UI made it look like a real model.
- Root cause: route had no provider calls at all; a static array of sample replies.
- Fix: rewritten to real gateway (`providerGateway.chatCompletion`) with auto-routing, explicit-model routing, stream pass-through, and honest `CONFIGURATION_REQUIRED`.
- Verification (live): auto mode returned REAL completions — `"const sum = arr => arr.reduce((a,b)=>a+b,0);"` for a coding prompt (attempt log `pollinations/openai`, 14086ms); `"FALLBACK-OK"` verbatim test 8171ms; paid model without key → `CONFIGURATION_REQUIRED` (never fake text).

## BUG-3 · Model list hardcoded + fake "ALL FEATURES OPERATIONAL" status page
- Symptom: model names baked into source; diagnostics claimed everything green.
- Root cause: static UI constants; status page had no probing.
- Fix: dynamic discovery (`/api/models/discover`, live OpenRouter + Pollinations, TTL cache), real `/api/health` (per-subsystem live probes), Diagnostics page consuming it with color-coded honest statuses.

## BUG-3b · MCP page hardcoded `status:'connected', tools:207`
- Fix: real MCP registry API (`/api/mcp-servers`, GET/POST/DELETE) with live endpoint probes; unreachable servers are refused with the real failure reason (live test: bogus `http://127.0.0.1:9999` → `ERROR / fetch failed / Server add nahi hua`).

## BUG-3c · REA Lab fake "207 tools available"
- Fix: honest status rendering; `/api/rea/analyze` returns `CONFIGURATION_REQUIRED` + setup steps + authorized-target workflow until an REA MCP URL is configured; local rizin path only when the binary + target actually exist.

## BUG-4 · Agents capped at 100 and registry was sandbox-only
- Symptom: `/api/agents/registry/load` returned first 100 only; worked only on this machine (`/root/agency-agents`).
- Fix: `agents-registry/` bundled into the repo (762 md, 12MB); recursive loader with dot-dir filtering, **no cap**. Verified live: `total: 683, divisions: 22, source: bundled`.

## BUG-5 · `/models` and `/settings` were real 404s (sidebar links dead)
- Fix: new `(app)/models` Explorer page (dynamic catalog + per-model REAL test buttons) and `(app)/settings` API-keys page (Test & Save against `/api/test-provider` + `/api/settings`). Both compile 200 and function live.

## BUG-6 · Parallel multi-model burst tripped Pollinations `402 FREE_LIMIT`
- Symptom: 3 concurrent panel calls → free tier rejected.
- Fix: sequential staggered panel (700ms between failing attempts), early-stop at 2 good answers. Rate limits are respected and shown honestly.

## BUG-7 (env-specific, documented) · OpenRouter invalid-key message misleading
- `Authorization: Bearer <invalid>` returns 401 "Missing Authentication header"; a request with NO header returns "No cookie auth credentials found". Verified by direct curl A/B/C; our gateway does send the header. Documented so support staff don't misdiagnose.

## BUG-8 · `kilo-auto/free` advertised as free
- Fix: catalog seed now states auto-router bills at the selected model's rate (not guaranteed free); honest rename in UI fallback seed.
