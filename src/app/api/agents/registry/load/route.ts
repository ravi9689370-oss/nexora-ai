import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Dynamic agency-agents registry.
 * Resolution order:
 *   1. ./agents-registry (bundled in the repo — works on ANY host)
 *   2. /root/agency-agents (dev sandbox copy, fallback)
 * Divisions are discovered dynamically — no hardcoded 15-item list, and
 * NO arbitrary 100-agent cap (previous bug returned only first 100).
 */
export async function GET(req: NextRequest) {
  const search = String(req.nextUrl.searchParams.get("q") ?? "").toLowerCase().slice(0, 80);
  try {
    const bundled = path.join(process.cwd(), "agents-registry");
    const sandbox = "/root/agency-agents";
    const base = fs.existsSync(bundled) ? bundled : sandbox;

    if (!fs.existsSync(base)) {
      return NextResponse.json(
        {
          total: 0,
          agents: [],
          loaded: false,
          note: `No agent registry found at ${base}. Add the agency-agents repo contents to ./agents-registry.`,
        },
        { status: 200 }
      );
    }

    const divisions = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name);

    const agents: Array<{ name: string; division: string; file: string; summary?: string }> = [];
    const walk = (dirAbs: string, rel: string, division: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dirAbs, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          walk(path.join(dirAbs, entry.name), path.join(rel, entry.name), division);
        } else if (entry.name.endsWith(".md")) {
          if (search && !(division.toLowerCase().includes(search) || entry.name.toLowerCase().includes(search))) continue;
          agents.push({
            name: entry.name.replace(/\.md$/, ""),
            division,
            file: path.join(rel, entry.name),
          });
        }
      }
    };
    for (const division of divisions) {
      walk(path.join(base, division), division, division);
    }

    const total = agents.length;
    return NextResponse.json({
      total,
      base,
      divisions,
      agents,
      loaded: total > 0,
      source: bundled === base ? "bundled" : "sandbox",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load agents", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
