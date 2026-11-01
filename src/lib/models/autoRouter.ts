/**
 * autoRouter.ts — task-aware free-model selection with fallback chain.
 *
 * Priority (honest):
 *   1. pollinations/openai  — keyless, verified live (probe before trust)
 *   2. openrouter free models (only when an OpenRouter key exists)
 *   3. explicit error — never a fake response
 *
 * Task classification is keyword-based and intentionally transparent.
 */
import type { CatalogModel } from "./discovery";

export type TaskType = "coding" | "reasoning" | "research" | "vision" | "chat";

const TASK_KEYWORDS: Record<TaskType, RegExp[]> = {
  coding: [/\b(code|function|class|bug|debug|compile|regex|api|sql|snippet|typescript|javascript|python|java|kotlin|gradle|apk|build)\b/i],
  reasoning: [/\b(why|solve|prove|calculate|logic|strategy|plan|trade-?offs?|architect|compare|analyze|analyse|think)\b/i],
  research: [/\b(research|sources|compare products|market|trend|history|explain deeply|literature)\b/i],
  vision: [/\b(image|photo|screenshot|picture|diagram|chart|ocr|vision)\b/i],
  chat: [],
};

export function classifyTask(prompt: string): TaskType {
  const text = prompt.slice(0, 2000);
  for (const task of ["coding", "vision", "reasoning", "research"] as const) {
    if (TASK_KEYWORDS[task].some((rx) => rx.test(text))) return task;
  }
  return "chat";
}

function capabilityScore(m: CatalogModel, task: TaskType): number {
  let score = 0;
  if (task === "coding") {
    if (/coder|code|codestral|qwen2\.5-coder|devstral|deepseek/i.test(m.name + " " + m.id)) score += 4;
    if (m.toolCalling) score += 1;
  }
  if (task === "reasoning") {
    if (m.reasoning) score += 4;
    if (/kimi|deepseek|qwq|nemo|thinking/i.test(m.name + " " + m.id)) score += 2;
  }
  if (task === "research") {
    if ((m.contextLength ?? 0) >= 100000) score += 2;
    if (m.reasoning) score += 2;
  }
  if (task === "vision") {
    if (m.imageInput) score += 5;
    else return -10; // vision task on a text-only model is worthless
  }
  if ((m.contextLength ?? 0) >= 100000) score += 1;
  if (m.free && m.gateway === "pollinations") score += 2; // verified keyless first
  return score;
}

export type Candidate = { model: CatalogModel; score: number };

export function buildFallbackChain(
  task: TaskType,
  catalog: CatalogModel[],
  flags: { openRouterKey?: boolean; pollinationsOk?: boolean }
): Candidate[] {
  const free = catalog.filter(
    (m) =>
      m.free &&
      (flags.pollinationsOk !== false || m.gateway !== "pollinations")
  );
  const usable = free.filter((m) => m.gateway === "pollinations" || flags.openRouterKey);
  const scored = usable
    .map((m) => ({ model: m, score: capabilityScore(m, task) }))
    .filter((c) => c.score > -5);
  if (flags.pollinationsOk) {
    // Always keep the keyless channel in the chain (even lower scores) so the
    // app has a working last-resort before hard failure.
    const polli = free.filter((m) => m.gateway === "pollinations")
      .map((m) => ({ model: m, score: capabilityScore(m, task) - 1 }));
    for (const p of polli) {
      if (!scored.some((s) => s.model.id === p.model.id)) scored.push(p);
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 4);
}

export function pickModel(
  task: TaskType,
  catalog: CatalogModel[],
  flags: { openRouterKey?: boolean; pollinationsOk?: boolean }
): Candidate | null {
  const chain = buildFallbackChain(task, catalog, flags);
  return chain[0] ?? null;
}
