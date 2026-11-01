# BUILD_REPORT.md — Nexora AI v1.3 (Android)

Date: 2026-11-01
Pipeline: git push → GitHub Actions `build-apk.yml` (ubuntu x64) → artifact → Release upload → GitHub Pages direct link (primary download).

## Inputs changed this cycle
- Web `src/**` (chat gateway, discovery, autoRouter, settings, health, mcp-servers, rea analyze, agents registry load)
- Pages: `(app)/models`, `(app)/settings`, `(app)/diagnostics`, `(app)/mcp`, `(app)/rea-lab`
- `data` seeds + `agents-registry/` (762 md, 12MB, LICENSE, divisions.json)
- `tests/unit/modelRouting.test.ts` + CI test step (vitest run)
- `android/app/build.gradle`: versionCode 4, versionName "1.3"

## Build & verification steps (ACTUAL EXECUTIONS)
1. Repo sync from studio (rsync-style copy of changed files + registry + docs + tests). __REPO_RESULT__
2. Commit + push (`main:master --force` pattern). __REPO_RESULT__
3. CI run for v1.3: __CI_RESULT__
4. Artifact → APK: __APK_RESULT__
5. APK content checks:
   - bundle.js present & ES5-safe: __CHECK__
   - MainActivity dex present at `com/nexora/ai/`: __CHECK__
   - versionCode=4/versionName=1.3: __CHECK__
6. Release v1.3 upload: __REL_RESULT__
7. Pages index → v1.3 APK link: __PAGES_RESULT__
8. Direct URL HTTP/MIME/size verify: __VERIFY__

> This report is finalized with REAL values before the final user reply. If CI fails, the failed step stays FAILED here and is fixed before release — no assumptions logged.

## Size notes
- v1.2 APK was 4,294,117 bytes (HTTP 200, application/vnd.android.package-archive; Pages CDN verified).
- v1.3 expects slightly larger bundle (more web code), registry is NOT packaged inside the APK (server-side asset).

## Local build constraints (documented)
- This ARM64 sandbox cannot run x64 AGP tooling locally; npm in `/root/nexora-ai-app` is cache-broken (esbuild borrowed from studio's node_modules `@esbuild/linux-arm64`).
- Hence the APK is built ONLY on GitHub Actions (x64) — the same proven path that produced green v1.1/v1.2.
