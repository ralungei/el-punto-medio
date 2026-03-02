import { Link } from "react-router-dom";
import type { ArticleWithMeta } from "../../types";
import { ImageCarousel } from "../shared/ImageCarousel";
import { CategoryTags } from "../shared/CategoryTag";

export function ListItem({ article }: { article: ArticleWithMeta }) {
  return (
    <Link
      to={`/articulo/${article.slug}`}
      className="group flex gap-5 py-5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {(article.imageUrl || article.images?.length) && (
        <div className="overflow-hidden flex-shrink-0">
          <ImageCarousel
            images={article.images}
            compact
            className="w-[150px] h-[100px]"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <CategoryTags article={article} />
          <span className="text-[10px]" style={{ color: "var(--border-dark)" }}>&middot;</span>
          <span className="text-[10px] font-medium" style={{ color: "var(--text-light)" }}>
            {article.sourcesCount} medios
          </span>
        </div>
        <h3
          className="text-[17px] font-bold leading-[1.3] group-hover:text-[var(--blue)] transition-colors"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {article.headline}
        </h3>
        {article.summary && (
          <p
            className="mt-1.5 text-[13px] leading-relaxed"
            style={{
              color: "var(--text-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {article.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
