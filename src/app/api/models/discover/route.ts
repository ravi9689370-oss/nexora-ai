import { NextRequest, NextResponse } from "next/server";
import { discoverModels, probePollinations } from "@/lib/models/discovery";
import { resolveKey } from "@/lib/ai/providerGateway";

/** LIVE / cached model catalog with real provider health. */
export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";
  const withProbe = req.nextUrl.searchParams.get("probe") === "1";
  try {
    const result = await discoverModels({ force, probe: withProbe || force });
    const openRouterKey = resolveKey("openrouter", req.headers) ? true : false;
    return NextResponse.json({
      ...result,
      routing: {
        openRouterKeyPresent: openRouterKey,
        keylessChannel: "pollinations/openai (verified keyless free source)",
        freeUsableNow: (() => {
          const polli = result.models.filter((m) => m.gateway === "pollinations" && m.free);
          return polli.length + (openRouterKey ? result.models.filter((m) => m.free && m.gateway === "openrouter").length : 0);
        })(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { status: "ERROR", error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** Explicit live probe of the keyless channel (used by Model Explorer tests). */
export async function POST() {
  const t0 = Date.now();
  const probe = await probePollinations();
  return NextResponse.json({
    endpoint: "https://text.pollinations.ai/openai",
    probedAt: new Date().toISOString(),
    latencyMs: probe.latencyMs ?? Date.now() - t0,
    ...probe,
  });
}
