# REPAIR_PLAN.md — Nexora AI v1.3

Execution plan from the v1.2 audit (status: DONE except items explicitly marked below).

## Phase 1 — Truth injection (status service)
1. Rewrite `/api/health` → real per-subsystem probes. DONE. Current live result: overall DEGRADED; CONNECTED: frontend, backend, database(86–311ms), free-channel AI(7–1105ms), agentEngine(683 profiles); CONFIGURATION_REQUIRED: openrouter/kilo/openai/gemini/github keys, reaMcp URL, github token, image; UNVERIFIED: plugins, research.
2. Replace fake diagnostics UI → live consumer with refresh. DONE.
3. Replace fake MCP page → registry + live probes. DONE.
4. Honest REA Lab. DONE.

## Phase 2 — Real AI model layer
1. `lib/ai/providerGateway` multi-provider client (OpenRouter/GitHub/OpenAI/Gemini OpenAI-compatible + Gemini generateContent + **keyless Pollinations**). DONE + live "PONG" and "FALLBACK-OK".
2. Kilo Gateway adapter (env `KILO_GATEWAY_URL` default `https://api.kilo.ai/api/gateway/v1`, `KILO_API_KEY` / `x-kilo-key`, JSON `/models` probe). DONE code — **UNVERIFIED live (no key in sandbox)**.
3. Dynamic discovery (`lib/models/discovery.ts` + `/api/models/discover`): live fetch, TTL 10-min cache, free classification (pricing both `0` or `:free`), probe mode. DONE — live 453/18 free.
4. Auto free router (`lib/models/autoRouter.ts`): task classification, capability scoring, fallback chain, keyless-first. DONE + 18 hermetic tests.
5. `/api/chat` rewrite: auto/explicit/multi modes, stream pass-through, attempt log, honest errors. DONE.
6. Per-model live testing → Model Explorer "Test" buttons hit `/api/chat` for real. DONE (works for keyless; CONFIGURATION_REQUIRED for unkeyed providers by design).

## Phase 3 — Keys & settings
- `/api/settings` (GET/POST merge) persisting `data/settings.json`. DONE + roundtrip test.
- Settings page: per-provider password fields, Test button (live probe), Save. DONE.
- Keys resolve priority: request headers → saved Settings → env. Wired into chat, test-provider, health. DONE.

## Phase 4 — Agents engine
- Bundle `agents-registry/` (762 md, 12MB, LICENSE, divisions.json). DONE.
- `/api/agents/registry/load` recursive uncapped loader + dot-dir filter. DONE — live 683 profiles / 22 divisions.

## Phase 5 — Quality gates
- Hermetic unit tests for routing core (`tests/unit/modelRouting.test.ts`, 18 tests). DONE green.
- Full existing vitest suite kept green. DONE: **12 files / 62 tests PASS**.

## Phase 6 — Release pipeline (checklist for this cycle)
- [x] Web VM verified live (pages 200 + APIs above)
- [x] 6 docs written (AUDIT / BUG / PLAN / E2E / BUILD / RELEASE_NOTES)
- [ ] versionCode 4 / versionName 1.3 in repo `android/app/build.gradle`
- [ ] sync web sources + registry + docs + tests into `/root/nexora-ai-app`, commit, push
- [ ] CI green → artifact APK verified (bundle.js, MainActivity dex, icons, version)
- [ ] Release v1.3 + APK upload; GitHub Pages index → v1.3 APK; local `public/downloads/` updated

## Deferred (needs user credentials — cannot be honestly tested here)
- Any OpenRouter/Kilo/OpenAI/Gemini/GitHub live generation (needs ONE key; add in Settings → API Keys, then re-run Model Explorer tests)
- REA MCP connectivity (needs `npx rea mcp` endpoint reachable from the web host)
- Streaming UX polish beyond pass-through (SSE verified at transport level only)
