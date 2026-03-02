import { CATEGORY_COLORS } from "../../constants";

/** Get categories array from article (backwards-compatible) */
export function getCategories(article: { categories?: string[]; category?: string | null }): string[] {
  if (article.categories?.length) return article.categories;
  return article.category ? [article.category] : [];
}

export function CategoryTag({ category }: { category: string | null }) {
  if (!category) return null;
  const color = CATEGORY_COLORS[category] || "var(--text-muted)";
  return (
    <span className="cat-tag" style={{ color }}>
      {category}
    </span>
  );
}

/** Renders multiple category tags inline with a separator dot */
export function CategoryTags({
  article,
  className = "text-[10px]",
}: {
  article: { categories?: string[]; category?: string | null };
  className?: string;
}) {
  const cats = getCategories(article);
  if (cats.length === 0) return null;
  return (
    <>
      {cats.map((cat, i) => {
        const color = CATEGORY_COLORS[cat] || "var(--text-muted)";
        return (
          <span key={cat}>
            {i > 0 && <span className={className} style={{ color: "var(--border-dark)", margin: "0 3px" }}>/</span>}
            <span
              className={`${className} font-bold uppercase tracking-[0.8px]`}
              style={{ color }}
            >
              {cat}
            </span>
          </span>
        );
      })}
    </>
  );
}
