import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import { db, schema } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import { runConcurrent } from "./concurrent";

const CONCURRENCY = 10;
const DOMAIN_DELAY_MS = 500;
const FETCH_TIMEOUT_MS = 15000;

// Suppress JSDOM CSS parsing warnings
const virtualConsole = new VirtualConsole();

// Per-domain promise chain for race-free rate limiting
const domainChain = new Map<string, Promise<void>>();

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function waitForDomain(domain: string): Promise<void> {
  const prev = domainChain.get(domain) ?? Promise.resolve();
  const next = prev.then(
    () => new Promise<void>((r) => setTimeout(r, DOMAIN_DELAY_MS))
  );
  domainChain.set(domain, next);
  await prev;
}

interface ScrapeResult {
  title: string | null;
  content: string;
  ogImage: string | null;
  publishedAt: string | null;
}

/**
 * Extract article publication date from HTML using a fallback chain:
 * 1. <meta property="article:published_time">
 * 2. JSON-LD datePublished
 * 3. <meta name="date|DC.date|publish_date"> / <meta itemprop="datePublished">
 * 4. <time datetime>
 */
function extractPublishedDate(html: string): string | null {
  // 1. OG article:published_time (most common)
  const ogMatch =
    html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i);
  if (ogMatch?.[1]) return normalizeDate(ogMatch[1]);

  // 2. JSON-LD datePublished
  const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const date = findJsonLdDate(data);
      if (date) return normalizeDate(date);
    } catch { /* skip malformed JSON-LD */ }
  }

  // 3. Other meta tags: name="date", name="DC.date", name="publish_date", itemprop="datePublished"
  const metaPatterns = [
    /<meta[^>]+(?:name=["'](?:date|DC\.date|publish_date|publishdate|publication_date)["'][^>]+content=["']([^"']+)["']|content=["']([^"']+)["'][^>]+name=["'](?:date|DC\.date|publish_date|publishdate|publication_date)["'])/i,
    /<meta[^>]+(?:itemprop=["']datePublished["'][^>]+content=["']([^"']+)["']|content=["']([^"']+)["'][^>]+itemprop=["']datePublished["'])/i,
  ];
  for (const pattern of metaPatterns) {
    const m = html.match(pattern);
    const val = m?.[1] || m?.[2];
    if (val) return normalizeDate(val);
  }

  // 4. <time datetime>
  const timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (timeMatch?.[1]) return normalizeDate(timeMatch[1]);

  return null;
}

function findJsonLdDate(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findJsonLdDate(item);
      if (found) return found;
    }
    return null;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.datePublished === "string") return obj.datePublished;
  // Check @graph array
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      const found = findJsonLdDate(item);
      if (found) return found;
    }
  }
  return null;
}

function normalizeDate(raw: string): string | null {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match?.[1] || null;
}

async function scrapeArticle(url: string): Promise<ScrapeResult | null> {
  const domain = getDomain(url);
  await waitForDomain(domain);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.5",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return null;

  const html = await response.text();
  const ogImage = extractOgImage(html);
  const publishedAt = extractPublishedDate(html);

  const dom = new JSDOM(html, { url, virtualConsole });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent || article.textContent.trim().length < 100) {
    return null;
  }

  return {
    title: article.title?.trim() || null,
    content: article.textContent.trim(),
    ogImage,
    publishedAt,
  };
}

export async function scrapeEdition(
  editionId: number
): Promise<{ scraped: number; failed: number; skipped: number }> {
  // Select articles from this edition that haven't been scraped yet
  const articles = await db
    .select({
      id: schema.rawArticles.id,
      url: schema.rawArticles.url,
      title: schema.rawArticles.title,
    })
    .from(schema.rawArticles)
    .where(
      and(
        eq(schema.rawArticles.editionId, editionId),
        isNull(schema.rawArticles.content)
      )
    )
    .all();

  if (articles.length === 0) {
    console.log("  No articles to scrape");
    return { scraped: 0, failed: 0, skipped: 0 };
  }

  console.log(`  Scraping ${articles.length} articles (concurrency=${CONCURRENCY})...`);

  let scraped = 0;
  let failed = 0;
  let done = 0;

  const tasks = articles.map((article: { id: number; url: string; title: string }) => async () => {
    try {
      const result = await scrapeArticle(article.url);

      if (result) {
        const update: Record<string, unknown> = {
          content: result.content,
          contentImages: null, // no longer used — og:image replaces content images
          publishedAt: result.publishedAt,
        };
        if (result.ogImage) {
          update.imageUrl = result.ogImage; // OG image > homepage thumbnail
        }
        // Update title from Readability if it's better (web-scraped sources have slug-based placeholders)
        if (result.title && result.title.length > article.title.length) {
          update.title = result.title;
        }
        await db.update(schema.rawArticles)
          .set(update)
          .where(eq(schema.rawArticles.id, article.id))
          .run();
        scraped++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    done++;
    if (done % 20 === 0 || done === articles.length) {
      console.log(`  [${done}/${articles.length}] ${scraped} scraped, ${failed} failed`);
    }
  });

  await runConcurrent(tasks, CONCURRENCY);

  console.log(`  ✓ ${scraped} scraped, ${failed} failed (${articles.length} total)`);
  return { scraped, failed, skipped: 0 };
}
