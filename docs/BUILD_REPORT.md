# BUILD_REPORT.md — Nexora AI v1.3 (Android)

Date: 2026-11-01
Pipeline: git push → GitHub Actions `build-apk.yml` (ubuntu x64) → artifact → Release upload → GitHub Pages direct link (primary download).

## Inputs changed this cycle
- Web `src/**` (chat gateway, discovery, autoRouter, settings, health, mcp-servers, rea analyze, agents registry load)
- Pages: `(app)/models`, `(app)/settings`, `(app)/diagnostics`, `(app)/mcp`, `(app)/rea-lab`
- `agents-registry/` (762 md, 12MB, LICENSE, divisions.json)
- `tests/unit/modelRouting.test.ts`
- `docs/` (6 delivery documents)
- `android/app/build.gradle`: versionCode 4, versionName "1.3"

## Build & verification steps (ACTUAL EXECUTIONS)
1. Repo sync + commit: **0336cfb** "v1.3: free AI model integration…" pushed to `master` (790 file changes, agents-registry included).
2. CI "Build APK" run **41274557961**: **SUCCESS** (steps: npm install → mobile:build → cap sync → gradlew assembleDebug → artifact upload).
3. Artifact `Nexora-AI-APK` → `app-debug.apk` (4,294,117 bytes) downloaded via gh CLI.
4. APK content checks (all executed on the artifact):
   - `cat`: valid APK, 4 dex files.
   - MainActivity/package dex: `classes3.dex` contains `Lcom/nexora/ai/…` classes → package fix intact.
   - SPA bundle present at `assets/public/assets/js/bundle.js` (59,700 bytes), starts `"use strict";(()=>…` IIFE; **zero `?.` / modern-syntax tokens** (ES5-safe for old WebViews).
   - `capacitor.config.json` inside APK: `appId: com.nexora.ai`, `appName: Nexora AI`, `webDir: www`.
   - **Version verified inside manifest**: UTF-16 `1.3` present in `AndroidManifest.xml`; `1.2` absent version. SHA256 differs from v1.2 (`b32c3342…` vs `037ea740…`) → fresh build confirmed.
5. Release v1.3: https://github.com/ravi9689370-oss/nexora-ai/releases/tag/v1.3 — asset `nexora-ai-v1.3.apk` uploaded from the verified artifact.
6. GitHub Pages index (gh-pages commit **d228ead**): primary download → `nexora-ai-v1.3.apk`, release links → v1.3, meta → `versionCode 4 · v1.3 · 01-Nov-2026`; QR regenerated to new URL.
7. Direct URL verify: `https://ravi9689370-oss.github.io/nexora-ai/nexora-ai-v1.3.apk` → **HTTP 200 / application/vnd.android.package-archive / 4,294,117 bytes**.
8. Local server copy updated: `public/downloads/nexora-ai-v1.3.apk` (v1.2 removed); studio + repo both.

## Size notes
- Same byte size as v1.2 (4,294,117) but SHA256 differs — version-code/name strings kept identical length, so zipped layout coincided; content verified distinct.

## Local build constraints (documented)
- ARM64 sandbox cannot run x64 AGP; npm in `/root/nexora-ai-app` is cache-broken locally (esbuild borrowed from studio's `@esbuild/linux-arm64` for web builds).
- APK therefore built ONLY on GitHub Actions x64 — same proven path as green v1.1/v1.2.
