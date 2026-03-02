import { llm } from "./usage";
import { db, schema } from "./db";
import { eq, inArray } from "drizzle-orm";
import { analysisPrompt, categorizationPrompt, SYSTEM_PROMPT } from "./prompts";
import { runConcurrent } from "./concurrent";

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

export async function analyzeCluster(cluster: ClusterWithArticles): Promise<void> {
  // Skip single-source clusters (no comparison to make)
  const uniqueSources = new Set(cluster.articles.map((a) => a.sourceId));
  if (uniqueSources.size < 2) return;

  console.log(
    `  Analyzing: "${cluster.topicSummary.slice(0, 60)}..." (${cluster.articles.length} articles, ${uniqueSources.size} sources)`
  );

  // Step 1: Categorize
  const catResponse = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: categorizationPrompt(cluster.articles),
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
    messages: [
      {
        role: "user",
        content: analysisPrompt(cluster.topicSummary, cluster.articles),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "");
    const parsed = JSON.parse(cleaned);

    // Update topic summary if Claude provided a better one
    if (parsed.topicSummary) {
      await db.update(schema.clusters)
        .set({ topicSummary: parsed.topicSummary })
        .where(eq(schema.clusters.id, cluster.clusterId))
        .run();
    }

    // Store per-source analyses
    for (const analysis of parsed.analyses || []) {
      const article = cluster.articles.find(
        (a) => a.sourceName === analysis.sourceName
      );
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
        .run();
    }

    console.log(
      `    ✓ ${parsed.analyses?.length || 0} source analyses stored [${categories.join(",")}]`
    );
  } catch (e) {
    console.log(`    ✗ Failed to parse analysis: ${e}`);
    console.log(`    Raw: ${text.slice(0, 200)}`);
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
    ? await db
        .select()
        .from(schema.clusters)
        .where(inArray(schema.clusters.id, enrichedClusterIds))
        .all()
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

    const rawArticles = await db
      .select()
      .from(schema.rawArticles)
      .where(inArray(schema.rawArticles.id, rawArticleIds))
      .all();

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

  // Run analysis in parallel (concurrency=3)
  const total = toAnalyze.length;
  console.log(`  Analyzing ${total} clusters (concurrency=3)...`);
  let done = 0;
  const tasks = toAnalyze.map((cluster) => async () => {
    await analyzeCluster(cluster);
    done++;
    console.log(`  [${done}/${total}] analysis done`);
  });
  await runConcurrent(tasks, 3);

  console.log(`  ✓ Analyzed ${total} multi-source clusters`);
  return total;
}
