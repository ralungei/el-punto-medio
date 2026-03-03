import type { Edition, ArticleWithMeta, ArticleDetail, Source, FeedData } from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "/data";
const SALT = "epm$7kQ2x";

async function makeToken(path: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000);
  const msg = `${ts}:${path}:${SALT}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${ts}.${hash.slice(0, 16)}`;
}

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const token = await makeToken(path);
    const res = await fetch(`${BASE}/${path}`, {
      headers: { "X-EPM-Token": token },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function loadEditions(): Promise<Edition[]> {
  return (await fetchJSON<Edition[]>("editions.json")) ?? [];
}

export async function loadLatestEdition(): Promise<{
  edition: Edition;
  articles: ArticleWithMeta[];
} | null> {
  const editions = await loadEditions();
  if (editions.length === 0) return null;

  const latest = editions[0];
  const data = await fetchJSON<{ edition: Edition; articles: ArticleWithMeta[] }>(
    `editions/${latest.id}`
  );
  return data;
}

export async function loadEdition(
  id: number
): Promise<{ edition: Edition; articles: ArticleWithMeta[] } | null> {
  return fetchJSON(`editions/${id}`);
}

export async function loadArticle(slug: string): Promise<ArticleDetail | null> {
  return fetchJSON(`articles/${slug}`);
}

export async function loadFeed(): Promise<FeedData | null> {
  return fetchJSON<FeedData>("feed.json");
}

export async function loadSources(): Promise<Source[]> {
  return (await fetchJSON<Source[]>("sources.json")) ?? [];
}
