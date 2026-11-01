/**
 * modelRouting.test.ts — hermetic tests (no network) for the free-model
 * routing core: task classification, fallback chain composition, model-id
 * routing, and settings→header mapping.
 */
import { describe, expect, it } from "vitest";
import { classifyTask, buildFallbackChain, type TaskType } from "@/lib/models/autoRouter";
import { routeModel, KEYLESS_GATEWAY } from "@/lib/ai/providerGateway";
import { headerMapFromSettings } from "@/lib/settingsStore";
import type { CatalogModel } from "@/lib/models/discovery";

const m = (id: string, o: Partial<CatalogModel> = {}): CatalogModel => ({
  id,
  name: id,
  provider: "unknown",
  contextLength: 100000,
  maxOutput: null,
  streaming: true,
  imageInput: false,
  toolCalling: false,
  reasoning: false,
  free: true,
  gateway: "openrouter",
  ...o,
});

describe("classifyTask", () => {
  const cases: Array<[string, TaskType]> = [
    ["write a python function to parse json", "coding"],
    ["debug this stack trace", "coding"],
    ["why does gravity slow time? solve logically", "reasoning"],
    ["analyze this screenshot", "vision"],
    ["what is the photo about", "vision"],
    ["hello, how are you today", "chat"],
  ];
  for (const [text, want] of cases) {
    it(`classifies "${text.slice(0, 26)}…" → ${want}`, () => {
      expect(classifyTask(text)).toBe(want);
    });
  }
});

describe("buildFallbackChain", () => {
  const keyless = m("pollinations/openai", { gateway: "pollinations", free: true, provider: "pollinations" });
  const freeCoder = m("vendor/free-coder:free", { name: "Free Coder", toolCalling: true });
  const freeVision = m("vendor/free-vision:free", { name: "Free Vision", imageInput: true });
  const paid = m("vendor/paid-x", { free: false });

  it("keyless-only catalog still yields a usable chain", () => {
    const chain = buildFallbackChain("chat", [keyless], { openRouterKey: false, pollinationsOk: true });
    expect(chain.length).toBeGreaterThan(0);
    expect(chain[0].model.id).toBe("pollinations/openai");
  });

  it("uses OpenRouter free models when a key exists (keyless kept as last resort)", () => {
    const chain = buildFallbackChain("chat", [keyless, freeCoder, paid], { openRouterKey: true, pollinationsOk: true });
    expect(chain.some((c) => c.model.id === "vendor/free-coder:free")).toBe(true);
    expect(chain.some((c) => c.model.id === "pollinations/openai")).toBe(true);
    expect(chain.some((c) => c.model.id === "vendor/paid-x")).toBe(false);
  });

  it("excludes openrouter entries when no key is configured", () => {
    const chain = buildFallbackChain("chat", [keyless, freeCoder], { openRouterKey: false, pollinationsOk: true });
    expect(chain.every((c) => c.model.gateway !== "openrouter")).toBe(true);
  });

  it("vision task prefers vision-capable models; text-only fallback still reachable", () => {
    const chain = buildFallbackChain("vision", [keyless, freeCoder, freeVision], { openRouterKey: true, pollinationsOk: true });
    expect(chain[0].model.id).toBe("vendor/free-vision:free");
    expect(chain.some((c) => c.model.id === "pollinations/openai")).toBe(true);
  });

  it("coding task boosts coder-ish models", () => {
    const chain = buildFallbackChain("coding", [keyless, freeCoder], { openRouterKey: true, pollinationsOk: true });
    expect(chain[0].model.id).toBe("vendor/free-coder:free");
  });
});

describe("routeModel", () => {
  it("explicit kilo prefix routes to kilo gateway", () => {
    expect(routeModel("kilo/recursive/flint-v1.0")).toEqual({
      provider: "kilo",
      upsertModel: "recursive/flint-v1.0",
    });
  });
  it("github prefix routes to GitHub Models", () => {
    expect(routeModel("github/openai/gpt-4.1-mini").provider).toBe("github");
  });
  it("pollinations prefix routes to the keyless gateway with default upstream", () => {
    const r = routeModel("pollinations/");
    expect(r.provider).toBe(KEYLESS_GATEWAY.id);
    expect(r.upsertModel).toBe("openai-fast");
  });
  it("kilo-auto/free maps to openrouter auto (and is NOT treated as free in catalog)", () => {
    expect(routeModel("kilo-auto/free").upsertModel).toBe("openrouter/auto");
  });
  it("default routes to openrouter", () => {
    expect(routeModel("moonshotai/kimi-k2:free")).toEqual({
      provider: "openrouter",
      upsertModel: "moonshotai/kimi-k2:free",
    });
  });
});

describe("settingsStore header mapping", () => {
  it("maps saved settings fields to provider headers, skipping empties", () => {
    const map = headerMapFromSettings({
      openrouterKey: "sk-or-live",
      kiloKey: "   ",
      geminiKey: "g-123",
    });
    expect(map).toEqual({ "x-openrouter-key": "sk-or-live", "x-gemini-key": "g-123" });
  });
  it("returns nothing for empty settings", () => {
    expect(headerMapFromSettings({})).toEqual({});
  });
});
