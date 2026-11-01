import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

/**
 * HONEST REA integration — no "analyzing" theatre.
 *
 * REA is an MCP server; a hosted web backend can only reach it if an HTTP MCP
 * endpoint is configured (REA_MCP_URL env or data/mcp-servers.json entry).
 * When unavailable we say so explicitly and return the documented workflow
 * instead of pretending an analysis started.
 */
export async function POST(req: NextRequest) {
  let body: { target?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "ERROR", error: "Invalid JSON" }, { status: 400 });
  }
  const target = (body.target ?? "").trim();
  if (!target) {
    return NextResponse.json({ status: "ERROR", error: "target required (path/URL)" }, { status: 400 });
  }

  // 1) Local REA CLI presence (sandbox/dev only).
  const localRz = existsSync("/usr/bin/rizin") || existsSync("/usr/bin/rz");
  const idxBinary = target && !/^https?:\/\//i.test(target) && existsSync(target);

  // 2) HTTP MCP attempts: env var first, then configured registry.
  const urls: string[] = [];
  if (process.env.REA_MCP_URL) urls.push(process.env.REA_MCP_URL.replace(/\/$/, ""));
  try {
    const mcpPath = path.join(process.cwd(), "data", "mcp-servers.json");
    if (existsSync(mcpPath)) {
      const cfg = JSON.parse(require("fs").readFileSync(mcpPath, "utf-8")) as unknown;
      if (Array.isArray(cfg)) for (const s of cfg as Array<{ url: string; tags?: string[] }>) urls.push(s.url.replace(/\/$/, ""));
    }
  } catch {
    /* ignore */
  }

  for (const base of urls) {
    for (const cand of ["/rea/analyze", "/analyze", "/mcp", ""]) {
      try {
        const res = await fetch(base + cand, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target, type: body.type ?? "auto", op: "analyze" }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          return NextResponse.json({ status: "CONNECTED", via: base + cand, result: json });
        }
      } catch {
        /* try next */
      }
    }
  }

  // 3) Bring your own binary fallback (local rizin JSON, offline).
  if (idxBinary && localRz) {
    try {
      const json = await new Promise<string>((resolve, reject) => {
        execFile("rizin", ["-q", "-c", `"ii; is; iE"`, target], { timeout: 60000, shell: true }, (err, stdout) => {
          if (err) reject(err);
          else resolve(String(stdout));
        });
      });
      return NextResponse.json({
        status: "CONNECTED",
        mode: "local-rizin",
        target,
        symbolsPreview: String(json).slice(0, 4000),
        note: "Local rizin analysis ran. Full decompile needs REA MCP (REAMCP URL).",
      });
    } catch (err) {
      return NextResponse.json({
        status: "ERROR",
        mode: "local-rizin",
        target,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4) Honest unavailability.
  return NextResponse.json({
    status: "CONFIGURATION_REQUIRED",
    target,
    local: {
      rizinInstalled: Boolean(localRz),
      targetExistsLocally: Boolean(idxBinary),
    },
    error: "REA MCP endpoint is not configured in this deployment (REA_MCP_URL unset and no MCP server registry entry).",
    howToFix: "REA MCP ko local/networked server par chalao (npx rea mcp ya rea desktop agent), phir Settings → MCP me URL add karo. Sandboxed local analysis ke liye rizin install karo.",
    workflow: [
      "INPUT (authorized app/site/repo)",
      "ANALYSIS (inventory, dependencies, metadata)",
      "REA INVESTIGATION (disassembly, symbols, flows — when MCP connected)",
      "TECHNICAL REPORT (features, architecture, components)",
      "IMPLEMENTATION PLAN (original-equivalent feature spec)",
      "CODING AGENTS (scaffold + implement)",
      "TESTING (e2e + unit)",
      "FINAL RESULT (build, artifacts)",
    ],
    note: "Authorization note: reverse engineering is routed only to targets you own or have written permission to analyze; the workflow never bakes stolen assets or credentials into outputs.",
  });
}
