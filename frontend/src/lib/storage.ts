const KEY = "epm:readSlugs";
const MAX = 500;

export function markRead(slug: string): void {
  const slugs = getReadArray();
  if (slugs.includes(slug)) return;
  slugs.push(slug);
  if (slugs.length > MAX) slugs.splice(0, slugs.length - MAX);
  localStorage.setItem(KEY, JSON.stringify(slugs));
}

export function isRead(slug: string): boolean {
  return getReadSlugs().has(slug);
}

export function getReadSlugs(): Set<string> {
  return new Set(getReadArray());
}

function getReadArray(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ── Hidden categories ── */

const HIDDEN_CATS_KEY = "epm:hiddenCats";

export function getHiddenCats(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_CATS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function setHiddenCats(cats: Set<string>): void {
  localStorage.setItem(HIDDEN_CATS_KEY, JSON.stringify([...cats]));
}
