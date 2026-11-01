# RELEASE_NOTES.md — Nexora AI v1.3

Date: 2026-11-01

## Headline
Universal FREE AI model integration — real, dynamic, and honest. GLM‑5.3‑Flash/Auto‑Free/Flint/Nemotron‑VL/DeepSeek/Beam/Big‑Pickle type free models now appear in the app through LIVE catalog discovery (no hardcoding), an automatic free-model router selects per task, and chat actually talks to working providers — with keyless free generation available out of the box.

## What's new
1. **Model Explorer** (`/models`) — live catalog: **453 models / 18 free** (OpenRouter public + Pollinations), free/paid/vision/tools/reasoning filters, LIVE per-model Test buttons. Truth-first: entries never claim "working" without a real API call.
2. **Auto Free Router** — task-aware selection (coding/reasoning/research/vision/chat) + fallback chain. Keyless Pollinations channel leads (verified live), configured-key models unlock the OpenRouter/Kilo free tier (Flint Free, Nemotron 3.5 Super VL Free [vision], DeepSeek V4.1 Flash Free, Beam Free, Big Pickle, etc. — exactly the OpenCode free set).
3. **Multi-Model Mode** — sequential panel (rate-limit friendly), honest per-model errors, synthesized answer only when ≥2 models succeed.
4. **API Keys made real** — `/settings` page: Test (live probe) & Save per provider (OpenRouter, Kilo Gateway, OpenAI, Gemini, GitHub Models); keys persist server-side (`data/settings.json`) and auto-flow into chat.
5. **Real System Diagnostics** — fake "All features operational" replaced by probe-based statuses (DB, keyless AI, catalog, agents, MCP, GitHub); fixes publicized with honest CONFIGURATION_REQUIRED wherecredentials are pending.
6. **Agents 2.0** — 762-file registry bundled (12MB); API serves **683 profiles across 22 divisions** recursively, 100-cap removed.
7. **MCP Manager real** — add/test/remove servers via live HTTP probes; unreachable never saved as "connected"; REA Lab shows the documented workflow until an MCP URL is configured.
8. **Rate-limit handling** — anonymous-tier 402 FREE_LIMIT observed live and handled by stagger+fallback (no unlimited-usage claims anywhere).

## Chat modes
Auto • Best free available • Manual model • Multi-model panel • Streaming (SSE pass-through) — session model choice persists.

## Honest pending (needs user credentials)
- Paid/unkeyed provider generation (OpenRouter/Kilo/OpenAI/Gemini/GitHub) — add ONE key in Settings; Model Explorer tests then pass for those models.
- Kilo Gateway live verification (key required).
- REA MCP live reverse-engineering (run `npx rea mcp` and add URL in MCP Manager).

## Downloads
- PRIMARY (GitHub Pages direct): https://ravi9689370-oss.github.io/nexora-ai/ → nexora-ai-v1.3.apk
- GitHub Release: https://github.com/ravi9689370-oss/nexora-ai/releases/tag/v1.3
- Local server: http://localhost:3000/downloads/nexora-ai-v1.3.apk

## Integrity
- Full vitest suite: 12 files / 62 tests green (incl. 18 new routing tests).
- APK content verified: bundle.js ES5-safe, MainActivity dex, versionCode 4 / versionName 1.3. (Final values logged in BUILD_REPORT.md)
