import { llm } from "./usage";
import { db, schema } from "./db";
import { eq, gte, count } from "drizzle-orm";
import { clusteringPrompt, deduplicationPrompt, mergePrompt, rescuePrompt } from "./prompts";
import { runConcurrent, batchSelect } from "./concurrent";

interface RawArticle {
  id: number;
  sourceId: number;
  title: string;
  description: string | null;
}

export interface ClusterEditionResult {
  clusterCount: number;
  enrichedClusterIds: number[];
}

// ── JSON schemas for structured output ──────────────────────

const DEDUP_SCHEMA = {
  type: "object" as const,
  properties: {
    groups: {
      type: "array" as const,
      items: {
        type: "array" as const,
        items: { type: "integer" as const },
      },
    },
  },
  required: ["groups"] as const,
  additionalProperties: false as const,
};

const CLUSTER_SCHEMA = {
  type: "object" as const,
  properties: {
    clusters: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          story_id: { type: "string" as const },
          indices: {
            type: "array" as const,
            items: { type: "integer" as const },
          },
        },
        required: ["story_id", "indices"] as const,
        additionalProperties: false as const,
      },
    },
  },
  required: ["clusters"] as const,
  additionalProperties: false as const,
};

const MERGE_SCHEMA = {
  type: "object" as const,
  properties: {
    merges: {
      type: "array" as const,
      items: {
        type: "array" as const,
        items: { type: "integer" as const },
      },
    },
  },
  required: ["merges"] as const,
  additionalProperties: false as const,
};

interface DeduplicationResult {
  representatives: RawArticle[];
  siblingsMap: Map<number, RawArticle[]>;
}

// ── Phase 1: Deduplicate per source ─────────────────────────

async function deduplicateSource(
  sourceName: string,
  articles: RawArticle[]
): Promise<{ repIds: number[]; groups: RawArticle[][] }> {
  if (articles.length <= 1) {
    return {
      repIds: articles.map((a) => a.id),
      groups: articles.map((a) => [a]),
    };
  }

  const promptArticles = articles.map((a, i) => ({
    index: i,
    title: a.title,
    description: a.description,
  }));

  const prompt = deduplicationPrompt(sourceName, promptArticles);

  const response = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    output_config: {
      format: {
        type: "json_schema",
        schema: DEDUP_SCHEMA,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const result: { groups: number[][] } = JSON.parse(text);

  // Build groups, picking first article in each group as representative
  const groups: RawArticle[][] = [];
  const repIds: number[] = [];
  const assigned = new Set<number>();

  for (const group of result.groups) {
    const validIndices = group.filter(
      (i) => typeof i === "number" && i >= 0 && i < articles.length && !assigned.has(i)
    );
    if (validIndices.length === 0) continue;

    const groupArticles = validIndices.map((i) => articles[i]);
    for (const i of validIndices) assigned.add(i);

    // Pick the article with longest title as representative (proxy for most detail)
    const rep = groupArticles.reduce((best, a) =>
      a.title.length > best.title.length ? a : best
    );
    repIds.push(rep.id);
    groups.push(groupArticles);
  }

  // Any unassigned articles become their own group
  for (let i = 0; i < articles.length; i++) {
    if (!assigned.has(i)) {
      repIds.push(articles[i].id);
      groups.push([articles[i]]);
    }
  }

  return { repIds, groups };
}

async function deduplicatePerSource(
  articles: RawArticle[],
  sourceMap: Map<number, string>
): Promise<DeduplicationResult> {
  // Group articles by sourceId
  const bySource = new Map<number, RawArticle[]>();
  for (const a of articles) {
    const list = bySource.get(a.sourceId) || [];
    list.push(a);
    bySource.set(a.sourceId, list);
  }

  const sourceEntries = Array.from(bySource.entries());
  console.log(`  Phase 1: Deduplicating across ${sourceEntries.length} sources...`);

  let done = 0;
  const tasks = sourceEntries.map(([sourceId, sourceArticles]) => async () => {
    const sourceName = sourceMap.get(sourceId) || `source-${sourceId}`;
    const result = await deduplicateSource(sourceName, sourceArticles);
    done++;
    console.log(
      `  [${done}/${sourceEntries.length}] ${sourceName}: ${sourceArticles.length} → ${result.repIds.length} representatives`
    );
    return { sourceId, result };
  });

  const results = await runConcurrent(tasks, 7);

  // Build siblingsMap and representatives list
  const siblingsMap = new Map<number, RawArticle[]>();
  const representatives: RawArticle[] = [];
  const articleById = new Map(articles.map((a) => [a.id, a]));

  for (const { result } of results) {
    for (let i = 0; i < result.repIds.length; i++) {
      const repId = result.repIds[i];
      const group = result.groups[i];
      siblingsMap.set(repId, group);
      representatives.push(articleById.get(repId)!);
    }
  }

  console.log(
    `  Phase 1 done: ${articles.length} articles → ${representatives.length} representatives`
  );

  return { representatives, siblingsMap };
}

// ── Phase 2: Global clustering ──────────────────────────────

const MAX_REPS_PER_CALL = 200;

async function clusterGlobal(
  representatives: RawArticle[],
  sourceMap: Map<number, string>,
  existingStories: { storyId: string; titles: string[] }[]
): Promise<Map<string, RawArticle[]>> {
  console.log(`  Phase 2: Global clustering of ${representatives.length} representatives...`);

  if (representatives.length <= MAX_REPS_PER_CALL) {
    return clusterSingleCall(representatives, sourceMap, existingStories);
  }

  // Split round-robin by source so each call sees all media outlets
  const numChunks = Math.ceil(representatives.length / MAX_REPS_PER_CALL);
  const chunks: RawArticle[][] = Array.from({ length: numChunks }, () => []);

  // Group by source, then distribute each source's articles evenly across chunks
  const bySource = new Map<number, RawArticle[]>();
  for (const r of representatives) {
    const list = bySource.get(r.sourceId) || [];
    list.push(r);
    bySource.set(r.sourceId, list);
  }

  for (const [, sourceArts] of bySource) {
    for (let i = 0; i < sourceArts.length; i++) {
      chunks[i % numChunks].push(sourceArts[i]);
    }
  }

  console.log(`  Splitting into ${numChunks} calls round-robin (${chunks.map((c) => c.length).join("+")} reps)...`);

  const chunkResults = await Promise.all(
    chunks.map((chunk) => clusterSingleCall(chunk, sourceMap, existingStories))
  );

  // Merge by story_id
  const merged = new Map<string, RawArticle[]>();
  for (const chunkMap of chunkResults) {
    for (const [storyId, arts] of chunkMap) {
      const existing = merged.get(storyId) || [];
      existing.push(...arts);
      merged.set(storyId, existing);
    }
  }
  return merged;
}

async function clusterSingleCall(
  articles: RawArticle[],
  sourceMap: Map<number, string>,
  existingStories: { storyId: string; titles: string[] }[]
): Promise<Map<string, RawArticle[]>> {
  const promptArticles = articles.map((a, i) => ({
    index: i,
    sourceName: sourceMap.get(a.sourceId) || `source-${a.sourceId}`,
    title: a.title,
  }));

  const prompt = clusteringPrompt(promptArticles, existingStories);

  const response = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    output_config: {
      format: {
        type: "json_schema",
        schema: CLUSTER_SCHEMA,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });

  // Check for truncation
  if (response.stop_reason !== "end_turn") {
    console.log(`  ⚠ Clustering call truncated (stop_reason: ${response.stop_reason}) — some articles may be unassigned`);
  }

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const result: { clusters: { story_id: string; indices: number[] }[] } = JSON.parse(text);

  const mapped = new Map<string, RawArticle[]>();
  let assignedCount = 0;
  for (const cluster of result.clusters) {
    const arts = cluster.indices
      .filter((i) => typeof i === "number" && i >= 0 && i < articles.length)
      .map((i) => articles[i]);
    if (arts.length > 0) {
      mapped.set(cluster.story_id, arts);
      assignedCount += arts.length;
    }
  }

  console.log(`  Phase 2 call: ${mapped.size} story_ids, ${assignedCount}/${articles.length} assigned`);
  return mapped;
}

// ── Phase 3: Expand clusters with siblings ──────────────────

function expandClusters(
  clusters: Map<string, RawArticle[]>,
  siblingsMap: Map<number, RawArticle[]>
): Map<string, RawArticle[]> {
  const expanded = new Map<string, RawArticle[]>();

  for (const [storyId, reps] of clusters) {
    const allArticles: RawArticle[] = [];
    const seen = new Set<number>();

    for (const rep of reps) {
      const siblings = siblingsMap.get(rep.id) || [rep];
      for (const article of siblings) {
        if (!seen.has(article.id)) {
          seen.add(article.id);
          allArticles.push(article);
        }
      }
    }

    expanded.set(storyId, allArticles);
  }

  return expanded;
}

// ── Phase 3b: Merge duplicate clusters ──────────────────────

async function mergeDuplicateClusters(
  clusters: Map<string, RawArticle[]>
): Promise<Map<string, RawArticle[]>> {
  const allEntries = Array.from(clusters.entries());
  const multiClusters = allEntries.filter(([, arts]) => arts.length >= 2);

  const multiKeywords = new Set<string>();
  for (const [storyId] of multiClusters) {
    for (const w of storyId.split("-")) {
      if (w.length >= 3) multiKeywords.add(w);
    }
  }
  const singletons = allEntries.filter(([storyId, arts]) => {
    if (arts.length >= 2) return false;
    const words = storyId.split("-").filter((w) => w.length >= 3);
    const shared = words.filter((w) => multiKeywords.has(w)).length;
    return shared >= 2;
  });

  const candidateClusters = [...multiClusters, ...singletons];
  if (candidateClusters.length <= 1) return clusters;

  console.log(`  Phase 3b: Checking ${candidateClusters.length} clusters for duplicates (${multiClusters.length} multi-article + ${singletons.length} related singletons)...`);

  const promptClusters = candidateClusters.map(([storyId, arts], i) => ({
    index: i,
    storyId,
    titles: arts.map((a) => a.title),
  }));

  const prompt = mergePrompt(promptClusters);

  const response = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    output_config: {
      format: {
        type: "json_schema",
        schema: MERGE_SCHEMA,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const result: { merges: number[][] } = JSON.parse(text);

  if (result.merges.length === 0) {
    console.log(`  Phase 3b done: no merges needed`);
    return clusters;
  }

  // Consolidate overlapping merge groups using union-find
  const parent = new Map<number, number>();
  function find(x: number): number {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  }

  const allMentioned = new Set<number>();
  for (const group of result.merges) {
    for (const i of group) {
      if (typeof i === "number" && i >= 0 && i < candidateClusters.length) {
        allMentioned.add(i);
        if (!parent.has(i)) parent.set(i, i);
      }
    }
  }

  for (const group of result.merges) {
    const valid = group.filter(
      (i) => typeof i === "number" && i >= 0 && i < candidateClusters.length
    );
    for (let k = 1; k < valid.length; k++) {
      union(valid[0], valid[k]);
    }
  }

  const consolidatedGroups = new Map<number, number[]>();
  for (const idx of allMentioned) {
    const root = find(idx);
    const g = consolidatedGroups.get(root) || [];
    g.push(idx);
    consolidatedGroups.set(root, g);
  }

  const merged = new Map(clusters);
  let mergeCount = 0;

  for (const [, groupIndices] of consolidatedGroups) {
    if (groupIndices.length <= 1) continue;
    groupIndices.sort((a, b) => a - b);

    const targetStoryId = candidateClusters[groupIndices[0]][0];
    const targetArticles: RawArticle[] = [];
    const seen = new Set<number>();

    const mergedNames: string[] = [];
    for (const idx of groupIndices) {
      const [storyId, arts] = candidateClusters[idx];
      mergedNames.push(storyId);
      for (const a of arts) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          targetArticles.push(a);
        }
      }
      merged.delete(storyId);
    }

    merged.set(targetStoryId, targetArticles);
    mergeCount++;
    console.log(`  ⊕ Merged: ${mergedNames.join(" + ")} → "${targetStoryId}" (${targetArticles.length} articles)`);
  }

  console.log(`  Phase 3b done: ${mergeCount} merges applied, ${merged.size} clusters remaining`);
  return merged;
}


// ── Phase 4: Rescue single-source clusters into multi-source ones ──

const RESCUE_SCHEMA = {
  type: "object" as const,
  properties: {
    assignments: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          index: { type: "integer" as const },
          target_story_id: { type: "string" as const },
        },
        required: ["index", "target_story_id"] as const,
        additionalProperties: false as const,
      },
    },
  },
  required: ["assignments"] as const,
  additionalProperties: false as const,
};

async function rescueSingleSourceClusters(
  clusters: Map<string, RawArticle[]>
): Promise<Map<string, RawArticle[]>> {
  const multiSourceIds = new Set<string>();

  for (const [storyId, arts] of clusters) {
    const uniqueSources = new Set(arts.map((a) => a.sourceId)).size;
    if (uniqueSources >= 2) multiSourceIds.add(storyId);
  }

  const orphans = Array.from(clusters.entries())
    .filter(([storyId, arts]) => !multiSourceIds.has(storyId) && arts.length >= 2)
    .map(([storyId, arts]) => ({ storyId, arts }));

  if (orphans.length === 0 || multiSourceIds.size === 0) {
    console.log(`  Phase 4: no orphans to rescue`);
    return clusters;
  }

  console.log(`  Phase 4: Attempting to rescue ${orphans.length} single-source clusters into ${multiSourceIds.size} multi-source targets...`);

  const promptOrphans = orphans.map((o, i) => ({
    index: i,
    storyId: o.storyId,
    title: o.arts[0].title,
  }));

  const targets = Array.from(multiSourceIds).map((storyId) => ({
    storyId,
    titles: clusters.get(storyId)!.map((a) => a.title),
  }));

  const prompt = rescuePrompt(promptOrphans, targets);

  const response = await llm({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    output_config: {
      format: {
        type: "json_schema",
        schema: RESCUE_SCHEMA,
      },
    },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const result: { assignments: { index: number; target_story_id: string }[] } = JSON.parse(text);

  if (result.assignments.length === 0) {
    console.log(`  Phase 4 done: no rescues`);
    return clusters;
  }

  const rescued = new Map(clusters);
  let rescueCount = 0;

  for (const { index, target_story_id } of result.assignments) {
    if (index < 0 || index >= orphans.length) continue;
    if (!rescued.has(target_story_id)) continue;

    const orphan = orphans[index];
    const targetArts = rescued.get(target_story_id)!;
    const seen = new Set(targetArts.map((a) => a.id));

    for (const a of orphan.arts) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        targetArts.push(a);
      }
    }

    rescued.delete(orphan.storyId);
    rescueCount++;
    console.log(`  ↑ Rescued "${orphan.storyId}" → "${target_story_id}" (+${orphan.arts.length} articles)`);
  }

  console.log(`  Phase 4 done: ${rescueCount} rescues, ${rescued.size} clusters remaining`);
  return rescued;
}

// ── Main entry point ─────────────────────────────────────────

export async function clusterEdition(editionId: number): Promise<ClusterEditionResult> {
  // 1. Load articles + source names
  const articles = await db
    .select({
      id: schema.rawArticles.id,
      sourceId: schema.rawArticles.sourceId,
      title: schema.rawArticles.title,
      description: schema.rawArticles.description,
    })
    .from(schema.rawArticles)
    .where(eq(schema.rawArticles.editionId, editionId))
    .all();

  const sources = await db.select().from(schema.sources).all();
  const sourceMap = new Map(sources.map((s: { id: number; name: string }) => [s.id, s.name]));

  console.log(`Clustering ${articles.length} articles...`);

  // 2. Get existing story_ids from last 48h
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const recentClusters = await db
    .select({
      storyId: schema.clusters.storyId,
      title: schema.rawArticles.title,
    })
    .from(schema.clusters)
    .innerJoin(
      schema.clusterArticles,
      eq(schema.clusters.id, schema.clusterArticles.clusterId)
    )
    .innerJoin(
      schema.rawArticles,
      eq(schema.clusterArticles.rawArticleId, schema.rawArticles.id)
    )
    .where(gte(schema.rawArticles.fetchedAt, cutoff))
    .all();

  const storyTitlesMap = new Map<string, string[]>();
  for (const row of recentClusters) {
    if (!row.storyId) continue;
    if (!storyTitlesMap.has(row.storyId)) storyTitlesMap.set(row.storyId, []);
    storyTitlesMap.get(row.storyId)!.push(row.title);
  }

  const existingStories = Array.from(storyTitlesMap.entries()).map(([storyId, titles]) => ({
    storyId,
    titles,
  }));

  console.log(`  ${existingStories.length} existing stories from last 48h`);

  // 3. Phase 1 — Deduplicate per source
  const { representatives, siblingsMap } = await deduplicatePerSource(articles, sourceMap);

  // 4. Phase 2 — Global clustering (single call)
  const repClusters = await clusterGlobal(representatives, sourceMap, existingStories);

  // 5. Phase 3a — Expand with siblings
  const expanded = expandClusters(repClusters, siblingsMap);

  // 6. Phase 3b — Merge duplicate clusters (LLM)
  const deduped = await mergeDuplicateClusters(expanded);

  // 7. Phase 4 — Rescue single-source clusters into multi-source ones
  const merged = await rescueSingleSourceClusters(deduped);

  console.log(`  ${merged.size} story_ids after all merge phases`);

  // 8. Sanity check — collect unassigned articles
  const assignedIds = new Set<number>();
  for (const arts of merged.values()) {
    for (const a of arts) assignedIds.add(a.id);
  }

  const unassigned = articles.filter((a: { id: number }) => !assignedIds.has(a.id));
  if (unassigned.length > 0) {
    console.log(`  ${unassigned.length} unassigned articles → individual clusters`);
    for (const article of unassigned) {
      merged.set(`orphan-${article.id}`, [article]);
    }
  }

  // 9. Map story_ids to existing clusters (enrichment) or create new ones
  const existingStoryClusterMap = new Map<string, number>();
  if (existingStories.length > 0) {
    const existingClusterRows = await batchSelect(
      (cond) => db.select({ id: schema.clusters.id, storyId: schema.clusters.storyId }).from(schema.clusters).where(cond).all(),
      schema.clusters.storyId,
      existingStories.map((s) => s.storyId)
    );

    for (const row of existingClusterRows) {
      if (row.storyId) existingStoryClusterMap.set(row.storyId, row.id);
    }
  }

  const enrichedClusterIdSet = new Set<number>();
  let storedNew = 0;
  let enriched = 0;

  for (const [storyId, clusterArticles] of merged) {
    if (clusterArticles.length === 0) continue;

    const existingClusterId = existingStoryClusterMap.get(storyId);

    if (existingClusterId) {
      // ── Enrich existing cluster ──
      for (const article of clusterArticles) {
        await db.insert(schema.clusterArticles)
          .values({ clusterId: existingClusterId, rawArticleId: article.id })
          .onConflictDoNothing()
          .run();
      }

      // Update article count
      const [{ total }] = await db
        .select({ total: count() })
        .from(schema.clusterArticles)
        .where(eq(schema.clusterArticles.clusterId, existingClusterId))
        .all();

      await db.update(schema.clusters)
        .set({ articleCount: total })
        .where(eq(schema.clusters.id, existingClusterId))
        .run();

      enrichedClusterIdSet.add(existingClusterId);

      enriched++;
      console.log(
        `  ↻ Enriching existing story "${storyId}" → cluster #${existingClusterId} (+${clusterArticles.length} articles)`
      );
    } else {
      // ── Create new cluster ──
      const topicSummary = clusterArticles[0].title;

      const row = await db
        .insert(schema.clusters)
        .values({
          editionId,
          storyId,
          topicSummary,
          articleCount: clusterArticles.length,
          avgSimilarity: 0,
        })
        .returning()
        .get();

      for (const article of clusterArticles) {
        await db.insert(schema.clusterArticles)
          .values({ clusterId: row.id, rawArticleId: article.id })
          .run();
      }

      storedNew++;

      const uniqueSources = new Set(clusterArticles.map((a) => a.sourceId)).size;
      if (uniqueSources >= 2) {
        console.log(`  → [${uniqueSources} sources] "${storyId}": ${topicSummary.slice(0, 80)}`);
      }
    }
  }

  console.log(
    `  ${storedNew} new clusters, ${enriched} enriched from existing stories`
  );

  return { clusterCount: storedNew + enriched, enrichedClusterIds: [...enrichedClusterIdSet] };
}
