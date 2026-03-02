import { Link } from "react-router-dom";
import type { ArticleWithMeta } from "../../types";
import { ImageCarousel } from "../shared/ImageCarousel";
import { CategoryTags } from "../shared/CategoryTag";

export function SidebarItem({
  article,
  index,
}: {
  article: ArticleWithMeta;
  index: number;
}) {
  return (
    <Link
      to={`/articulo/${article.slug}`}
      className={`group flex gap-3.5 px-5 py-4 transition-colors duration-150 anim-fade anim-fade-${index + 2}`}
      style={{ borderBottom: "1px solid var(--border)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {(article.imageUrl || article.images?.length) && (
        <ImageCarousel
          images={article.images}
          compact
          className="w-[88px] h-[62px] flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <CategoryTags article={article} />
          <span className="text-[10px]" style={{ color: "var(--border-dark)" }}>&middot;</span>
          <span className="text-[10px] font-medium" style={{ color: "var(--text-light)" }}>
            {article.sourcesCount} medios
          </span>
        </div>
        <h3
          className="text-[14px] font-bold leading-snug group-hover:text-[var(--blue)] transition-colors"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {article.headline}
        </h3>
      </div>
    </Link>
  );
}
