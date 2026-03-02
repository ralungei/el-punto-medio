import { Link } from "react-router-dom";
import type { ArticleWithMeta } from "../../types";
import { ImageCarousel } from "../shared/ImageCarousel";


export function GridCard({
  article,
  index = 0,
}: {
  article: ArticleWithMeta;
  index?: number;
}) {
  return (
    <Link
      to={`/articulo/${article.slug}`}
      className={`group block anim-fade anim-fade-${(index % 8) + 1}`}
    >
      {/* Image */}
      <div className="overflow-hidden mb-3">
        <ImageCarousel
          images={article.images}
          compact
          className="w-full h-[170px]"
          imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
          fallbackElement={
            <div
              className="w-full h-[170px]"
              style={{ background: "linear-gradient(135deg, var(--bg-secondary), var(--border))" }}
            />
          }
        />
      </div>

      {/* Sources */}
      <div className="mb-2">
        <span className="text-[10px] font-medium" style={{ color: "var(--text-light)" }}>
          {article.sourcesCount} medios
        </span>
      </div>

      {/* Headline */}
      <h3
        className="text-[16px] font-bold leading-[1.3] group-hover:text-[var(--blue)] transition-colors"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {article.headline}
      </h3>

      {/* Summary */}
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
    </Link>
  );
}
