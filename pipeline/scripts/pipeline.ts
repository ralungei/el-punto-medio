import "dotenv/config";
import { db, schema, initDb } from "../src/lib/db.js";
import { ingest } from "../src/lib/ingest.js";
import { filterEdition } from "../src/lib/filter.js";
import { scrapeEdition } from "../src/lib/scrape.js";
import { clusterEdition } from "../src/lib/clustering.js";
import { analyzeEdition } from "../src/lib/analyze.js";
import { synthesizeEdition } from "../src/lib/synthesize.js";
import { exportEditionIndex } from "../src/lib/export.js";
import { setStage, printUsageSummary } from "../src/lib/usage.js";
import { eq } from "drizzle-orm";

const isCI = !!process.env.CF_D1_TOKEN;

type Stage = "ingest" | "filter" | "scrape" | "cluster" | "analyze" | "synthesize" | "all";

function getEditionType(): "morning" | "midday" | "night" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "midday";
  return "night";
}

function parseArgs(): { stage: Stage; editionId?: number } {
  const args = process.argv.slice(2);
  let stage: Stage = "all";
  let editionId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--stage" && args[i + 1]) {
      stage = args[i + 1] as Stage;
      i++;
    }
    if (args[i] === "--edition" && args[i + 1]) {
      editionId = parseInt(args[i + 1]);
      i++;
    }
  }

  return { stage, editionId };
}

function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

async function run() {
  await initDb();

  const { stage, editionId: existingEditionId } = parseArgs();
  const start = Date.now();

  console.log(`\n══════════════════════════════════════`);
  console.log(`  EL PUNTO MEDIO — Pipeline`);
  console.log(`  Stage: ${stage}`);
  console.log(`  Mode: ${isCI ? "production (D1)" : "local (SQLite)"}`);
  console.log(`  Time: ${new Date().toLocaleString("es-ES")}`);
  console.log(`══════════════════════════════════════\n`);

  // Create or reuse edition
  let editionId: number;
  if (existingEditionId) {
    editionId = existingEditionId;
    console.log(`Usando edición existente #${editionId}\n`);
  } else {
    const edition = await db
      .insert(schema.editions)
      .values({ type: getEditionType(), status: "draft" })
      .returning()
      .get();
    editionId = edition.id;
    console.log(`Edición #${editionId} (${getEditionType()})\n`);
  }

  // ── Stage 1: Ingest ──
  if (stage === "all" || stage === "ingest") {
    const t = Date.now();
    console.log(`── STAGE 1: Ingesta ──────────────────`);
    await ingest(editionId);

    const rows = await db
      .select({ id: schema.rawArticles.id })
      .from(schema.rawArticles)
      .where(eq(schema.rawArticles.editionId, editionId))
      .all();

    if (rows.length === 0) {
      console.log(`\n✗ No se ingirió ningún artículo. Abortando.`);
      process.exit(1);
    }
    console.log(`  [${elapsed(t)}]\n`);
  }

  // ── Stage 2: Filter ──
  if (stage === "all" || stage === "filter") {
    const t = Date.now();
    setStage("filter");
    console.log(`── STAGE 2: Filtro de calidad ────────`);
    const { kept } = await filterEdition(editionId);

    if (kept === 0) {
      console.log(`\n✗ Filtro descartó todos los artículos. Abortando.`);
      process.exit(1);
    }
    console.log(`  [${elapsed(t)}]\n`);
  }

  // ── Stage 2.5: Scrape ──
  if (stage === "all" || stage === "scrape") {
    const t = Date.now();
    console.log(`── STAGE 2.5: Scrape ─────────────────`);
    await scrapeEdition(editionId);
    console.log(`  [${elapsed(t)}]\n`);
  }

  // ── Stage 3: Cluster ──
  let enrichedClusterIds: number[] = [];
  if (stage === "all" || stage === "cluster") {
    const t = Date.now();
    setStage("cluster");
    console.log(`── STAGE 3: Clustering ───────────────`);
    const result = await clusterEdition(editionId);
    enrichedClusterIds = result.enrichedClusterIds;

    if (result.clusterCount === 0) {
      console.log(`\n✗ No se creó ningún cluster. Abortando.`);
      process.exit(1);
    }
    console.log(`  [${elapsed(t)}]\n`);
  }

  // ── Stage 4: Analyze ──
  if (stage === "all" || stage === "analyze") {
    const t = Date.now();
    setStage("analyze");
    console.log(`── STAGE 4: Análisis ─────────────────`);
    const analyzed = await analyzeEdition(editionId, enrichedClusterIds);
    console.log(`  [${elapsed(t)}]\n`);

    if (analyzed === 0) {
      console.log(`  ⚠ Ningún cluster multi-fuente para analizar`);
    }
  }

  // ── Stage 5: Synthesize ──
  if (stage === "all" || stage === "synthesize") {
    const t = Date.now();
    setStage("synthesize");
    console.log(`── STAGE 5: Síntesis ─────────────────`);
    const created = await synthesizeEdition(editionId, enrichedClusterIds);
    console.log(`  [${elapsed(t)}]\n`);

    if (created === 0) {
      console.log(`  ⚠ No se generó ningún artículo`);
    }

    // Export edition index (local dev only — in production, Worker serves from D1)
    if (!isCI) {
      const te = Date.now();
      console.log(`── EXPORT: Generando JSONs ───────────`);
      await exportEditionIndex(editionId);
      console.log(`  [${elapsed(te)}]\n`);
    }
  }

  printUsageSummary();

  console.log(`══════════════════════════════════════`);
  console.log(`  ✓ Completado en ${elapsed(start)}`);
  console.log(`══════════════════════════════════════\n`);
}

run().catch((e) => {
  console.error(`\n✗ Pipeline falló: ${e.message || e}`);
  process.exit(1);
});
