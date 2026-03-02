import type { Edition, ArticleWithMeta, ArticleDetail, Source } from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "/data";

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${path}`);
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

export async function loadSources(): Promise<Source[]> {
  return (await fetchJSON<Source[]>("sources.json")) ?? [];
}
