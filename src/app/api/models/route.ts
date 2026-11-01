import { NextResponse } from "next/server";
import { discoverModels } from "@/lib/models/discovery";

/** Legacy /api/models — now serves LIVE discovery (cache TTL 10min). */
export async function GET() {
  try {
    const result = await discoverModels({});
    return NextResponse.json({
      models: result.models,
      total: result.total,
      freeCount: result.freeCount,
      source: result.source,
      fetchedAt: result.fetchedAt,
      catalogHealth: result.catalogHealth,
    });
  } catch {
    // Discovery is defensive with fallback seeds, so this should rarely happen.
    return NextResponse.json({ models: [], total: 0, source: "fallback" });
  }
}
