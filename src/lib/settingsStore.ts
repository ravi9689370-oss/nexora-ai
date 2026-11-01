/**
 * settingsStore.ts — server-side persistence for provider keys and service URLs.
 * File: data/settings.json (git-ignored). Keys saved by the user in Settings
 * are merged into the request headers by the API routes so the AI gateway
 * resolves them exactly as if they were browser headers or env vars.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "settings.json");

export type AppSettings = Record<string, unknown>;

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(FILE, "utf-8");
    const json = JSON.parse(raw) as { settings?: AppSettings };
    return json.settings ?? {};
  } catch {
    return {};
  }
}

const SETTING_TO_HEADER: Record<string, string> = {
  openrouterKey: "x-openrouter-key",
  kiloKey: "x-kilo-key",
  openaiKey: "x-openai-key",
  geminiKey: "x-gemini-key",
  githubKey: "x-github-key",
};

export function headerMapFromSettings(settings: AppSettings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, header] of Object.entries(SETTING_TO_HEADER)) {
    const v = settings[field];
    if (typeof v === "string" && v.trim()) out[header] = v.trim();
  }
  return out;
}

/**
 * Merged header record: request headers first, saved settings second
 * (settings only fill missing values — request overrides persist).
 */
export async function mergedHeaderRecord(
  headers: Headers | null
): Promise<Record<string, string | undefined>> {
  const base: Record<string, string | undefined> = {};
  if (headers) headers.forEach((v, k) => { base[k] = v; });
  try {
    const settings = await readSettings();
    Object.assign(base, headerMapFromSettings(settings));
  } catch {
    /* unreadable settings — headers/env still apply */
  }
  return base;
}
