# SYSTEM_AUDIT.md — Nexora AI (v1.3 cycle)

Date: 2026-11-01 · Auditor: build agent (live sandbox runs, no fabricated results)

## Scope
Full-system audit of Nexora AI web (Next.js 14.2.35, `/root/one-person-ai-creator-studio`) and the Android wrapper repo `/root/nexora-ai-app` (Capacitor, appId `com.nexora.ai`).

## What was audited and what was found

### A. AI model layer
| Item | Before | After |
|---|---|---|
| Model catalog | Hardcoded static list in API/UI | **DYNAMIC**: live OpenRouter public catalog (452 models) + Pollinations catalog (1 keyless model) merged → **453 total, 18 free** (live-verified 2026-11-01); 10-min TTL cache `data/models-catalog.json` |
| Chat backend | `/api/chat` returned hardcoded fake sample answers (BUG) | Real multi-provider gateway: OpenRouter / Kilo Gateway / GitHub Models / OpenAI / Gemini / **Pollinations (keyless, verified live)**. No fake text path exists — bina keys ke explicit `CONFIGURATION_REQUIRED` |
| Free router | None | Task classifier (coding/reasoning/research/vision/chat) + fallback chain, keyless-first policy |
| Multi-model | Fake "AI panel" UI claims | Real sequential panel (up to 3 models), per-model honest errors, synthesis only when ≥2 succeed |
| Provider keys | Not resolvable | env (`OPENROUTER_API_KEY`, `KILO_API_KEY`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`) + browser headers (`x-openrouter-key`, `x-kilo-key`, …) + saved Settings (`data/settings.json`) |

### B. Honest status service (Bug #4 fix)
- `/api/health` = **real probes only**: Prisma `SELECT 1` (live 86–311ms PASS), Pollinations live probe (PASS 7–1105ms), catalog reachability, agents registry filesystem count, MCP config presence, GitHub token env probe.
- The old "✅ All features operational" fake banner is **removed**. Current honest overall = **DEGRADED** (works: frontend/backend/DB/keyless-AI/agents; pending: provider keys, REA MCP URL, GitHub token).
- `/mcp` page former hardcoded `status:'connected', tools:207` (fake) → **real registry**: add/test/remove with live `/healthz → /status → /mcp → /` probes; unreachable server is refused, never saved as "connected".
- REA Lab "207 tools available" (fake) → honest CONFIGURATION_REQUIRED + documented workflow + local-rizin fallback.

### C. Agents (762 → 683 profiles)
- `agents-registry/` bundled into the app repo (762 md files, 12MB, LICENSE + divisions.json included).
- `/api/agents/registry/load`: recursive directory walk, dot-dirs filtered, **no 100-agent cap** (previous bug). Live-verified: **683 agents, 22 divisions, source=bundled**. The sandbox-only `/root/agency-agents` path remains as fallback only.

### D. Routes (web)
- 17 sidebar pages + NEW `/models` page. Fresh compile 200s verified for `/models`, `/settings`, `/diagnostics`, `/mcp`, `/rea-lab`.
- Previous real-404 pages `/models` and `/settings` now exist. `/` → 307 → `/dashboard` (correct, not a 404).

### E. Known honest limitations (NOT hidden)
1. **No provider API keys exist in this sandbox** → OpenRouter/Kilo/OpenAI/Gemini/GitHub marked `CONFIGURATION_REQUIRED`/`UNVERIFIED`; per-model live generation was verified ONLY on the keyless Pollinations channel.
2. Kilo Gateway (`api.kilo.ai`) adapter is implemented (env-driven base URL + `KILO_API_KEY`/`x-kilo-key`) but **UNVERIFIED** — no key available to run a live call. Kilo model IDs surface in the catalog via discovery when keys are configured.
3. Pollinations anonymous tier is rate-limited: live burst test produced `402 FREE_LIMIT` — handled by sequential stagger + chain fallback (never retried in a hot loop; no "unlimited usage" claim anywhere).
4. OpenRouter invalid-key 401 message is misleading ("Missing Authentication header") — documented in E2E report; key delivery path itself verified correct.
5. Multi-model synthesis needs ≥2 working providers; with 1 it returns the single answer + explicit note (no fabricated "panel consensus").

## Verdict
System is honest-and-live on keyless paths; every configured-but-unkeyed integration is explicitly labeled. No feature claims "working" without a real executed test.
