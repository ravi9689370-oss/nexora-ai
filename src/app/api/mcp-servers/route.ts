import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Real MCP server registry: add/test/remove servers with LIVE healthz probes.
 * File: data/mcp-servers.json — { name, url, tags }[] — no fabricated states.
 */
const FILE = path.join(process.cwd(), "data", "mcp-servers.json");
type MCPServer = { name: string; url: string; tags?: string[]; addedAt?: string };

async function loadServers(): Promise<MCPServer[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf-8")) as MCPServer[];
  } catch {
    return [];
  }
}

export async function GET() {
  const servers = await loadServers();
  return NextResponse.json({ status: "OK", servers });
}

export async function POST(req: NextRequest) {
  let body: MCPServer & { action?: "test" | "add" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "ERROR", error: "Invalid JSON" }, { status: 400 });
  }
  const url = (body.url || "").trim();
  if (!/^https?:\/\/[\w.:-]+/.test(url)) {
    return NextResponse.json({ status: "ERROR", error: "valid http(s) url required" }, { status: 400 });
  }

  const base = url.replace(/\/$/, "");
  /* Probe common MCP discovery endpoints. */
  const t0 = Date.now();
  const candidates = ["/healthz", "/status", "/mcp", "/"];
  let ok = false;
  let lastError = "";
  let endpoint = "";
  for (const c of candidates) {
    try {
      const res = await fetch(base + c, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
      if (res.ok) {
        ok = true;
        endpoint = base + c;
        break;
      }
      lastError = `HTTP ${res.status} for ${c}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  const latencyMs = Date.now() - t0;

  if (body.action === "test") {
    return NextResponse.json({ status: ok ? "CONNECTED" : "ERROR", url, endpoint, latencyMs, error: ok ? undefined : lastError });
  }

  if (!ok) {
    return NextResponse.json({ status: "ERROR", url, latencyMs, error: lastError || "unreachable", note: "Server add nahi hua — koi endpoint 200 nahi de raha." }, { status: 502 });
  }

  const servers = await loadServers();
  const name = (body.name || new URL(url).host).slice(0, 40);
  const entry: MCPServer = { name, url: base, tags: body.tags ?? [], addedAt: new Date().toISOString() };
  const filtered = servers.filter((s) => s.url !== base);
  filtered.push(entry);
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(filtered, null, 2));
    return NextResponse.json({ status: "CONNECTED", server: entry, endpoint, latencyMs, servers: filtered });
  } catch (err) {
    return NextResponse.json({ status: "ERROR", error: `write failed: ${err instanceof Error ? err.message : err}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ status: "ERROR", error: "url param required" }, { status: 400 });
  const base = url.replace(/\/$/, "");
  const before = await loadServers();
  const after = before.filter((s) => s.url !== base && s.name !== url);
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(after, null, 2));
  return NextResponse.json({ status: "OK", removed: before.length - after.length, servers: after });
}
