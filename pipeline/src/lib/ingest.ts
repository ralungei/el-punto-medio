import { chromium, type Page } from "playwright";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { SOURCES } from "./sources";
import { runConcurrent } from "./concurrent";

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "ref", "source", "fbclid", "gclid", "msclkid", "dclid",
]);

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key) || key.startsWith("utm_")) {
        u.searchParams.delete(key);
      }
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

interface IngestResult {
  sourceId: number;
  sourceName: string;
  fetched: number;
  inserted: number;
  errors: string[];
}

interface ScrapedArticle {
  url: string;
  title: string;
  imageUrl: string | null;
}

function extractDomain(url: string): string {
  return new URL(url).hostname.replace("www.", "");
}

async function scrapePage(
  page: Page,
  url: string,
  domain: string
): Promise<ScrapedArticle[]> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);

  return page.evaluate((domain: string) => {
    const anchors = document.querySelectorAll("a[href]");
    const seen = new Set<string>();
    const results: { url: string; title: string; imageUrl: string | null }[] = [];

    anchors.forEach((a) => {
      const el = a as HTMLAnchorElement;
      const href = el.href.split("?")[0].split("#")[0];

      if (!href.includes(domain)) return;
      if (href.match(/\.(css|js|png|jpg|jpeg|svg|ico|gif|woff|ttf|pdf)(\?|#|$)/)) return;

      try {
        const path = new URL(href).pathname;
        if (path.split("/").filter(Boolean).length < 2) return;
      } catch {
        return;
      }

      if (seen.has(href)) return;
      seen.add(href);

      let title = el.textContent?.trim().replace(/\s+/g, " ").slice(0, 300) || "";
      if (title.length < 20) return;
      if (title.match(/^\d{1,2}[\s\/]\d{1,2}[\s\/]\d{2,4}$/)) return;

      const img = el.querySelector("img");
      const imageUrl = img?.src || img?.getAttribute("data-src") || null;

      results.push({ url: href, title, imageUrl });
    });

    return results;
  }, domain);
}

async function fetchSource(
  source: { id: number; name: string },
  page: Page,
  editionId: number
): Promise<IngestResult> {
  const result: IngestResult = {
    sourceId: source.id,
    sourceName: source.name,
    fetched: 0,
    inserted: 0,
    errors: [],
  };

  const sourceConfig = SOURCES.find((s) => s.name === source.name);
  if (!sourceConfig) {
    result.errors.push("Source config not found");
    return result;
  }

  const pageUrl = sourceConfig.scrapeUrl || sourceConfig.url;
  const domain = extractDomain(sourceConfig.url);

  try {
    const articles = await scrapePage(page, pageUrl, domain);
    result.fetched = articles.length;

    for (const article of articles) {
      const normalizedUrl = normalizeUrl(article.url);

      try {
        await db.insert(schema.rawArticles)
          .values({
            sourceId: source.id,
            editionId,
            title: article.title.slice(0, 500),
            description: null,
            url: normalizedUrl,
            author: null,
            publishedAt: null,
            category: null,
            imageUrl: article.imageUrl,
            videoUrl: null,
          })
          .run();
        result.inserted++;
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes("UNIQUE")) continue;
        result.errors.push(`Insert error for "${article.title.slice(0, 50)}": ${e}`);
      }
    }
  } catch (e) {
    result.errors.push(`Scrape error: ${e}`);
  }

  return result;
}

const SCRAPE_CONCURRENCY = 4;

export async function ingest(editionId: number): Promise<IngestResult[]> {
  const activeSources = await db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.active, true))
    .all();

  console.log(`Launching browser for ${activeSources.length} sources (concurrency=${SCRAPE_CONCURRENCY})...`);

  const browser = await chromium.launch({ headless: true });
  let ingestResults: IngestResult[];
  try {
    const context = await browser.newContext({
      extraHTTPHeaders: { "Accept-Language": "es-ES,es;q=0.9" },
    });

    const tasks = activeSources.map((source: { id: number; name: string }) => async () => {
      const page = await context.newPage();
      try {
        return await fetchSource(source, page, editionId);
      } finally {
        await page.close();
      }
    });

    ingestResults = await runConcurrent(tasks, SCRAPE_CONCURRENCY);

    for (const r of ingestResults) {
      const icon = r.errors.length > 0 ? "⚠" : "✓";
      console.log(`  ${icon} ${r.sourceName}: ${r.inserted}/${r.fetched} articles`);
      for (const err of r.errors) {
        console.log(`    → ${err}`);
      }
    }
  } finally {
    await browser.close();
  }

  const totalInserted = ingestResults.reduce((s, r) => s + r.inserted, 0);
  console.log(`Total: ${totalInserted} new articles ingested`);

  return ingestResults;
}
