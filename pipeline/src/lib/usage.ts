import Anthropic from "@anthropic-ai/sdk";

const _anthropic = new Anthropic();

interface UsageRecord {
  stage: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
}

const records: UsageRecord[] = [];
let currentStage = "unknown";

export function setStage(stage: string) {
  currentStage = stage;
}

const LLM_TIMEOUT_MS = 120_000;

/** Drop-in replacement for anthropic.messages.create() with auto-tracking */
export async function llm(
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  let response: Anthropic.Message;
  try {
    response = await _anthropic.messages.create(params, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  const usage = response.usage as unknown as Record<string, number>;
  records.push({
    stage: currentStage,
    model: response.model,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    cacheRead: usage.cache_read_input_tokens || 0,
  });
  return response;
}

/** Print usage summary grouped by stage and model */
export function printUsageSummary() {
  if (records.length === 0) return;

  console.log(`\n── API Usage ─────────────────────────`);

  // Group by stage
  const byStage = new Map<string, UsageRecord[]>();
  for (const r of records) {
    const key = r.stage;
    if (!byStage.has(key)) byStage.set(key, []);
    byStage.get(key)!.push(r);
  }

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCalls = 0;

  for (const [stage, recs] of byStage) {
    const calls = recs.length;
    const input = recs.reduce((s, r) => s + r.inputTokens, 0);
    const output = recs.reduce((s, r) => s + r.outputTokens, 0);
    const cache = recs.reduce((s, r) => s + r.cacheRead, 0);
    const models = [...new Set(recs.map((r) => r.model))].join(", ");

    console.log(
      `  ${stage}: ${calls} calls | ${fmt(input)} in + ${fmt(output)} out${cache ? ` (${fmt(cache)} cached)` : ""} | ${models}`
    );

    totalInput += input;
    totalOutput += output;
    totalCacheRead += cache;
    totalCalls += calls;
  }

  console.log(`  ────────────────────────────────────`);
  console.log(
    `  TOTAL: ${totalCalls} calls | ${fmt(totalInput)} in + ${fmt(totalOutput)} out${totalCacheRead ? ` (${fmt(totalCacheRead)} cached)` : ""}`
  );

  // Estimate cost (Haiku: $0.80/$4 per MTok, Sonnet: $3/$15 per MTok)
  let cost = 0;
  for (const r of records) {
    if (r.model.includes("haiku")) {
      cost += (r.inputTokens * 0.8 + r.outputTokens * 4) / 1_000_000;
      cost += (r.cacheRead * 0.08) / 1_000_000; // cache read 90% discount
    } else {
      cost += (r.inputTokens * 3 + r.outputTokens * 15) / 1_000_000;
      cost += (r.cacheRead * 0.3) / 1_000_000;
    }
  }
  console.log(`  Est. cost: $${cost.toFixed(4)}`);
  console.log();
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}
