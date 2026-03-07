import { llm } from "./usage";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { analysisPrompt, categorizationPrompt, SYSTEM_PROMPT } from "./prompts";
import { runConcurrent, batchSelect } from "./concurrent";
import { inputHash } from "./hash";

const ANALYSIS_SCHEMA = {
  type: "object" as const,
  properties: {
    analyses: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          sourceId: { type: "integer" as const },
          sourceName: { type: "string" as const },
          tone: { type: "string" as const },
          framing: { type: "string" as const },
          emphasis: { type: "string" as const },
          omissions: { type: "string" as const },
        },
        required: ["sourceName", "tone", "framing", "emphasis", "omissions"] as const,
        additionalProperties: false as const,
      },
    },
    topicSummary: { type: "string" as const },
  },
  required: ["analyses", "topicSummary"] as const,
  additionalProperties: false as const,
};

interface ClusterWithArticles {
  clusterId: number;
  topicSummary: string;
  articles: {
    id: number;
    sourceId: number;
    sourceName: string;
    politicalLean: string;
    title: string;
    description: string;
    content?: string | null;
  }[];
}

// ── Verify each article in a cluster actually covers the same topic ──

const COHERENCE_SCHEMA = {
  type: "object" as const,
  properties: {
    relevant: {
      type: "array" as const,
      items: { type: "boolean" as const },
    },
  },
  required: ["relevant"] as const,
  additionalProperties: false as const,
};

async function verifyClusterCoherence(
  topicSummary: string,
  articles: ClusterWithArticles["articles"]
): Promise<ClusterWithArticles["articles"]> {
  if (articles.length <= 1) return articles;

  const list = articles
    .map((a, i) => {
      const desc = a.description ? ` — ${a.description.slice(0, 150)}` : "";
      return `[${i}] (${a.sourceName}) ${a.title}${desc}`;
    })
    .join("\n");

  const response = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    output_config: {
      format: {
        type: "json_schema",
        schema: COHERENCE_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: `¿Cada artículo cubre el MISMO acontecimiento específico que este tema?

Tema del cluster: "${topicSummary}"

${list}

Para cada artículo, responde true si cubre este mismo evento concreto, false si trata de otro tema distinto.
Un artículo sobre un tema diferente (aunque comparta palabras clave, región o temática genérica) debe ser false.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const result: { relevant: boolean[] } = JSON.parse(text);
    const verified = articles.filter((_, i) => i < result.relevant.length && result.relevant[i]);
    const removed = articles.length - verified.length;
    if (removed > 0) {
      const removedNames = articles
        .filter((_, i) => i >= result.relevant.length || !result.relevant[i])
        .map((a) => a.sourceName);
      console.log(`    ⚠ Removed ${removed} irrelevant source(s) from cluster: ${removedNames.join(", ")}`);
    }
    return verified;
  } catch {
    return articles; // on parse error, keep all
  }
}

export async function analyzeCluster(cluster: ClusterWithArticles): Promise<void> {
  // Skip single-source clusters (no comparison to make)
  const uniqueSources = new Set(cluster.articles.map((a) => a.sourceId));
  if (uniqueSources.size < 2) return;

  // Cache check FIRST: skip before any API calls
  const { forceRegenerate } = await import("../../scripts/pipeline.js");
  const hashInput = JSON.stringify(
    cluster.articles.map((a) => ({
      sourceId: a.sourceId,
      title: a.title,
      content: a.content?.slice(0, 3000),
    }))
  );
  const hash = inputHash(hashInput);

  if (!forceRegenerate) {
    const existing = await db
      .select({ analysisHash: schema.clusters.analysisHash })
      .from(schema.clusters)
      .where(eq(schema.clusters.id, cluster.clusterId))
      .get();

    if (existing?.analysisHash === hash) {
      console.log(
        `  ⊘ Cached, skipping: "${cluster.topicSummary.slice(0, 60)}..."`
      );
      return;
    }
  }

  // Verify cluster coherence — remove articles that don't match the topic
  const verifiedArticles = await verifyClusterCoherence(cluster.topicSummary, cluster.articles);
  const verifiedSources = new Set(verifiedArticles.map((a) => a.sourceId));
  if (verifiedSources.size < 2) {
    console.log(`    ⊘ Cluster "${cluster.topicSummary.slice(0, 60)}..." has <2 verified sources, skipping`);
    return;
  }

  console.log(
    `  Analyzing: "${cluster.topicSummary.slice(0, 60)}..." (${verifiedArticles.length} articles, ${verifiedSources.size} sources)`
  );

  // Step 1: Categorize
  const catResponse = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: categorizationPrompt(verifiedArticles),
      },
    ],
  });

  const VALID_CATEGORIES = new Set([
    "política", "economía", "sociedad", "internacional",
    "cultura", "deportes", "tecnología", "salud", "ciencia",
  ]);

  const catText =
    catResponse.content[0].type === "text"
      ? catResponse.content[0].text.trim().toLowerCase()
      : "sociedad";

  const categories = catText
    .split(",")
    .map((c) => c.trim())
    .filter((c) => VALID_CATEGORIES.has(c))
    .slice(0, 3);

  if (categories.length === 0) categories.push("sociedad");

  // Update cluster categories
  await db.update(schema.clusters)
    .set({
      category: categories[0],
      categories: JSON.stringify(categories),
    })
    .where(eq(schema.clusters.id, cluster.clusterId))
    .run();

  // Step 2: Analyze each source's coverage
  const response = await llm({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: {
        type: "json_schema",
        schema: ANALYSIS_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: analysisPrompt(cluster.topicSummary, verifiedArticles),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);

    // Update topic summary if Claude provided a better one
    if (parsed.topicSummary) {
      await db.update(schema.clusters)
        .set({ topicSummary: parsed.topicSummary })
        .where(eq(schema.clusters.id, cluster.clusterId))
        .run();
    }

    // Store per-source analyses
    for (const analysis of parsed.analyses || []) {
      // Match by sourceId first, fall back to sourceName
      const article =
        (analysis.sourceId && verifiedArticles.find((a) => a.sourceId === analysis.sourceId)) ||
        verifiedArticles.find((a) => a.sourceName === analysis.sourceName);
      if (!article) continue;

      await db.insert(schema.sourceAnalyses)
        .values({
          clusterId: cluster.clusterId,
          sourceId: article.sourceId,
          tone: analysis.tone,
          framing: analysis.framing,
          emphasis: analysis.emphasis,
          omissions: analysis.omissions,
          rawJson: JSON.stringify(analysis),
        })
        .onConflictDoUpdate({
          target: [schema.sourceAnalyses.clusterId, schema.sourceAnalyses.sourceId],
          set: {
            tone: analysis.tone,
            framing: analysis.framing,
            emphasis: analysis.emphasis,
            omissions: analysis.omissions,
            rawJson: JSON.stringify(analysis),
          },
        })
        .run();
    }

    // Store input hash for cache
    await db.update(schema.clusters)
      .set({ analysisHash: hash })
      .where(eq(schema.clusters.id, cluster.clusterId))
      .run();

    console.log(
      `    ✓ ${parsed.analyses?.length || 0} source analyses stored [${categories.join(",")}]`
    );
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.log(`    ✗ Failed to parse analysis: ${e}`);
      console.log(`    Raw: ${text.slice(0, 200)}`);
    } else {
      throw e; // DB errors — rethrow to stop the pipeline
    }
  }
}

export async function analyzeEdition(
  editionId: number,
  enrichedClusterIds: number[] = []
): Promise<number> {
  // Get all clusters for this edition that have 2+ sources
  const editionClusters = await db
    .select()
    .from(schema.clusters)
    .where(eq(schema.clusters.editionId, editionId))
    .all();

  // Also include enriched clusters from previous editions
  const enrichedClusters = enrichedClusterIds.length > 0
    ? await batchSelect(
        (cond) => db.select().from(schema.clusters).where(cond).all(),
        schema.clusters.id,
        enrichedClusterIds
      )
    : [];

  // Deduplicate (enriched clusters might already be in this edition)
  const seenIds = new Set<number>();
  const allClusters = [...editionClusters, ...enrichedClusters].filter((c: { id: number }) => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  // Enrich with articles + source info
  const sources = await db.select().from(schema.sources).all();
  const sourceMap = new Map(sources.map((s: { id: number }) => [s.id, s]));

  // Prepare all clusters for analysis
  const toAnalyze: ClusterWithArticles[] = [];

  for (const cluster of allClusters) {
    const clusterArticleLinks = await db
      .select()
      .from(schema.clusterArticles)
      .where(eq(schema.clusterArticles.clusterId, cluster.id))
      .all();

    const rawArticleIds = clusterArticleLinks.map((ca: { rawArticleId: number }) => ca.rawArticleId);
    if (rawArticleIds.length === 0) continue;

    const rawArticles = await batchSelect(
      (cond) => db.select().from(schema.rawArticles).where(cond).all(),
      schema.rawArticles.id,
      rawArticleIds
    );

    const uniqueSources = new Set(rawArticles.map((a: { sourceId: number }) => a.sourceId));
    if (uniqueSources.size < 2) continue;

    // For enriched clusters, check which sources are already analyzed
    const isEnriched = enrichedClusterIds.includes(cluster.id);
    let articlesToAnalyze = rawArticles;

    if (isEnriched) {
      const existingAnalyses = await db
        .select({ sourceId: schema.sourceAnalyses.sourceId })
        .from(schema.sourceAnalyses)
        .where(eq(schema.sourceAnalyses.clusterId, cluster.id))
        .all();

      const analyzedSourceIds = new Set(existingAnalyses.map((a: { sourceId: number }) => a.sourceId));
      articlesToAnalyze = rawArticles.filter((a: { sourceId: number }) => !analyzedSourceIds.has(a.sourceId));

      if (articlesToAnalyze.length === 0) {
        console.log(`  ⊘ Cluster #${cluster.id}: no new sources to analyze`);
        continue;
      }

      console.log(
        `  ↻ Enriched cluster #${cluster.id}: ${articlesToAnalyze.length} new sources (${analyzedSourceIds.size} already analyzed)`
      );
    }

    const enrichedArticles = articlesToAnalyze.map((a: Record<string, unknown>) => {
      const source = sourceMap.get(a.sourceId as number) as Record<string, unknown>;
      return {
        id: a.id as number,
        sourceId: a.sourceId as number,
        sourceName: source.name as string,
        politicalLean: source.politicalLean as string,
        title: a.title as string,
        description: (a.description as string) || "",
        content: a.content as string | null,
      };
    });

    // Pick the best article per source (most content) to avoid ambiguous sourceName matches
    const bestPerSource = new Map<number, typeof enrichedArticles[0]>();
    for (const a of enrichedArticles) {
      const existing = bestPerSource.get(a.sourceId);
      if (!existing || (a.content?.length || 0) > (existing.content?.length || 0)) {
        bestPerSource.set(a.sourceId, a);
      }
    }
    const dedupedArticles = Array.from(bestPerSource.values());

    toAnalyze.push({
      clusterId: cluster.id,
      topicSummary: cluster.topicSummary || dedupedArticles[0].title,
      articles: dedupedArticles,
    });
  }

  // Run analysis in parallel (concurrency=15)
  const total = toAnalyze.length;
  console.log(`  Analyzing ${total} clusters (concurrency=15)...`);
  let done = 0;
  const tasks = toAnalyze.map((cluster) => async () => {
    await analyzeCluster(cluster);
    done++;
    console.log(`  [${done}/${total}] analysis done`);
  });
  await runConcurrent(tasks, 15);

  console.log(`  ✓ Analyzed ${total} multi-source clusters`);
  return total;
}
