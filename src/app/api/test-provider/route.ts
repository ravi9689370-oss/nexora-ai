import { NextRequest, NextResponse } from "next/server";
import { probeProvider, type ProviderKey } from "@/lib/ai/providerGateway";
import { mergedHeaderRecord } from "@/lib/settingsStore";

const VALID = new Set<ProviderKey>(["openrouter", "github", "openai", "gemini", "kilo"]);

/** Live provider probe — 1 tiny completion; returns honest latency or error. */
export async function POST(req: NextRequest) {
  let body: { provider?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const provider = (body.provider || req.nextUrl.searchParams.get("provider") || "") as ProviderKey;
  if (!VALID.has(provider)) {
    return NextResponse.json({ status: "ERROR", error: `unknown provider: ${provider}` }, { status: 400 });
  }
  // Key priority: explicit body key → browser header → saved Settings → env.
  const headers = await mergedHeaderRecord(req.headers);
  const headerKey = headers[`x-${provider}-key`];
  const key = body.key || headerKey || "";
  if (!key) {
    return NextResponse.json({ status: "CONFIGURATION_REQUIRED", error: `No key for ${provider} (body/header/settings/env).` }, { status: 200 });
  }
  try {
    const { latencyMs } = await probeProvider(provider, key);
    return NextResponse.json({ status: "CONNECTED", provider, latencyMs });
  } catch (err) {
    return NextResponse.json({
      status: "ERROR",
      provider,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
