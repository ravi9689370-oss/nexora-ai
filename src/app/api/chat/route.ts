import { NextRequest, NextResponse } from "next/server";
import {
  chatCompletion,
  ConfigurationRequiredError,
  resolveKey,
  KEYLESS_GATEWAY,
  type ChatMessage,
} from "@/lib/ai/providerGateway";
import { discoverModels, probePollinations } from "@/lib/models/discovery";
import { buildFallbackChain, classifyTask, type TaskType } from "@/lib/models/autoRouter";
import { mergedHeaderRecord } from "@/lib/settingsStore";

type Body = {
  messages?: ChatMessage[];
  model?: string;
  task?: TaskType | "auto";
  mode?: "single" | "multi";
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
};

async function runAttempt(modelId: string, body: Body, headers: Headers, userSignal?: AbortSignal) {
  const result = await chatCompletion(
    {
      model: modelId,
      messages: body.messages!,
      stream: body.stream ?? false,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      signal: userSignal,
    },
    headers
  );
  if (body.stream && result.raw instanceof ReadableStream) {
    return { streamed: true as const, result };
  }
  return { streamed: false as const, result };
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "ERROR", error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && typeof m.content === "string" && ["system", "user", "assistant"].includes(m.role))
    .slice(-40);
  if (!messages.length) {
    return NextResponse.json({ status: "ERROR", error: "messages[] is required" }, { status: 400 });
  }
  const headers = await mergedHeaderRecord(req.headers);
  try {
    /* ---------- MULTI-MODEL MODE ---------- */
    if (body.mode === "multi") {
      const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? messages[messages.length - 1].content;
      const task = classifyTask(String(lastUser));
      const [catalog, polliProbe] = await Promise.all([
        discoverModels({ probe: false }),
        probePollinations(),
      ]);
      const chain = buildFallbackChain(task, catalog.models, {
        openRouterKey: Boolean(resolveKey("openrouter", headers)),
        pollinationsOk: polliProbe.ok,
      });
      // Take up to 3 distinct models for the panel.
      const picks: string[] = [];
      for (const c of chain) {
        if (!picks.includes(c.model.id)) picks.push(c.model.id);
        if (picks.length >= 3) break;
      }
      // Sequential, small-stagger panel — parallel bursts trip anonymous-tier
      // rate limits (observed live: Pollinations 402 FREE_LIMIT). 2 good
      // answers are enough as the synthesis basis; stop early.
      const panel: Array<{ ok: boolean; model: string; provider?: string; upstream?: string; content?: string; error?: string }> = [];
      const good: Array<{ ok: true; model: string; provider: string; upstream: string; content: string }> = [];
      for (const id of picks) {
        if (good.length >= 2) break;
        try {
          const r = await chatCompletion({ model: id, messages, temperature: body.temperature ?? 0.4, maxTokens: Math.min(body.maxTokens ?? 900, 1024) }, headers);
          const okEntry = { ok: true as const, model: id, provider: r.provider as string, upstream: r.model as string, content: r.content as string };
          panel.push(okEntry);
          good.push(okEntry);
        } catch (e) {
          panel.push({ ok: false, model: id, error: e instanceof Error ? e.message : String(e) });
          await new Promise((r2) => setTimeout(r2, 700)); // rate-limit breathing room
        }
      }
      if (!good.length) {
        return NextResponse.json({ status: "ERROR", mode: "multi", task, panel, error: "kisi bhi model se jawab nahi mila (per-panel errors har entry me hain)." }, { status: 502 });
      }
      if (good.length === 1) {
        return NextResponse.json({
          status: "OK", mode: "multi", task,
          panel,
          content: good[0].content,
          provider: good[0].provider, model: good[0].upstream,
          synthesis: null,
          note: "Multi-panel ke liye sirf 1 provider configured tha; doosri keys Settings me add karke panel aur strong banta hai.",
        });
      }
      // Independent cross-review + synthesis (labelled, no fabricated claims).
      const synthSource = good[0];
      const synthesis = await chatCompletion(
        {
          model: body.model && body.model !== "multi" ? body.model : synthSource.model,
          messages: [
            {
              role: "system",
              content: `You are the reviewer in a multi-model panel. You are given answers from different AI models to the same question. Compare them, identify disagreements and errors, cover valid points of every answer, and produce ONE improved final answer. Keep it factual; do not invent information absent from all inputs. Mention explicitly which model(s) you agreed with when relevant. Answers are labelled.`,
            },
            ...messages.slice(-6),
            { role: "user", content: `MODELS' ANSWERS:\n\n${good.map((g, i) => `[Model ${i + 1}: ${g.provider} ${g.upstream}]\n${g.content}`).join("\n\n---\n\n")}\n\nQUESTION (last user turn): ${String(lastUser)}` },
          ],
          temperature: 0.3,
          maxTokens: Math.min(body.maxTokens ?? 1024, 1200),
        },
        headers
      ).then((r) => ({ ok: true as const, content: r.content, provider: r.provider }))
        .catch((e) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));

      return NextResponse.json({
        status: "OK",
        mode: "multi",
        task,
        panel,
        content: synthesis.ok ? synthesis.content : good[0].content,
        synthesis: synthesis.ok ? { provider: synthesis.provider, basis: good.map((g) => `${g.provider}/${g.upstream}`) } : { error: synthesis.error, fallbackUsed: good[0].upstream },
      });
    }

    /* ---------- AUTO MODE (task-aware free routing + fallback) ---------- */
    if (!body.model || body.model === "auto") {
      const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? messages[messages.length - 1].content;
      const task = classifyTask(String(lastUser));
      const catalog = await discoverModels({});
      const chain = buildFallbackChain(task, catalog.models, {
        openRouterKey: Boolean(resolveKey("openrouter", headers)),
        pollinationsOk: true, // cheap; hard-verified lazily by the first attempt failing
      });
      if (!chain.length) {
        return NextResponse.json({ status: "CONFIGURATION_REQUIRED", error: "koi free/available model nahi mila. API key add karo.", howToFix: "Settings → API Keys" }, { status: 200 });
      }
      const attempts: Array<{ model: string; provider?: string; error?: string; latencyMs?: number }> = [];
      for (const cand of chain.slice(0, 3)) {
        const t0 = Date.now();
        try {
          const r = await runAttempt(cand.model.id, body, headers);
          if (r.streamed && r.result.raw instanceof ReadableStream) {
            return new Response(r.result.raw, {
              status: 200,
              headers: {
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache, no-transform",
                "x-nexora-provider": String(r.result.provider),
                "x-nexora-model": String(r.result.model),
                "x-nexora-auto-task": task,
              },
            });
          }
          attempts.push({ model: cand.model.id, provider: r.result.provider, latencyMs: Date.now() - t0 });
          return NextResponse.json({
            status: "OK",
            provider: r.result.provider,
            model: r.result.model,
            requested: `auto:${task}`,
            task,
            attempts,
            content: r.result.content,
            usage: r.result.usage,
          });
        } catch (err) {
          attempts.push({ model: cand.model.id, error: err instanceof Error ? err.message : String(err) });
          continue; // fallback to the next candidate
        }
      }
      return NextResponse.json({
        status: "ERROR",
        error: "sare fallback attempts fail hue (neeche per-attempt reasons).",
        attempts,
        task,
      }, { status: 502 });
    }

    /* ---------- EXPLICIT MODEL ---------- */
    const r = await runAttempt(body.model, body, headers);
    if (r.streamed && r.result.raw instanceof ReadableStream) {
      return new Response(r.result.raw, {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          "x-nexora-provider": String(r.result.provider),
          "x-nexora-model": String(r.result.model),
        },
      });
    }
    return NextResponse.json({
      status: "OK",
      provider: r.result.provider,
      model: r.result.model,
      content: r.result.content,
      usage: r.result.usage,
    });
  } catch (err) {
    if (err instanceof ConfigurationRequiredError) {
      return NextResponse.json(
        {
          status: "CONFIGURATION_REQUIRED",
          provider: err.provider ?? null,
          error: err.detail,
          howToFix:
            "Settings → API Keys me OpenRouter/OpenAI/Gemini/GitHub key add karo (page per-storage hota hai) ya server env set karo. Auto mode ke liye lockless Pollinations channel default hai.",
        },
        { status: 200 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    const aborted = /abort|timeout/i.test(message);
    return NextResponse.json(
      {
        status: aborted ? "TIMEOUT" : "ERROR",
        error: aborted ? "Provider ne 120s me jawab nahi diya." : message,
      },
      { status: aborted ? 504 : 502 }
    );
  }
}
