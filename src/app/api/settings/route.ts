import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/* Key-value settings persisted to data/settings.json (server-writable). */
const FILE = path.join(process.cwd(), "data", "settings.json");

async function load(): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  const data = await load();
  return NextResponse.json({ status: "OK", updatedAt: data.updatedAt ?? null, settings: (data.settings ?? {}) as Record<string, unknown> });
}

export async function POST(req: NextRequest) {
  let body: { settings?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "ERROR", error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) {
    return NextResponse.json({ status: "ERROR", error: "settings object required" }, { status: 400 });
  }
  const current = await load();
  const merged = { ...((current.settings as object) ?? {}), ...(body.settings as object) };
  const payload = { updatedAt: new Date().toISOString(), settings: merged };
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(payload, null, 2));
    return NextResponse.json({ status: "OK", settings: merged });
  } catch (err) {
    return NextResponse.json(
      { status: "ERROR", error: `Write failed (${err instanceof Error ? err.message : err}). File server pe data/ folder writable hona chahiye.` },
      { status: 500 }
    );
  }
}
