import { Link } from "react-router-dom";
import type { ArticleWithMeta } from "../../types";
import { CategoryTag } from "../shared/CategoryTag";

export function MostReadItem({
  article,
  rank,
}: {
  article: ArticleWithMeta;
  rank: number;
}) {
  return (
    <Link
      to={`/articulo/${article.slug}`}
      className="group flex gap-3.5 py-3.5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span
        className="text-[26px] font-extrabold leading-none min-w-[26px]"
        style={{ color: "var(--blue)", opacity: 0.15 }}
      >
        {String(rank).padStart(2, "0")}
      </span>
      <div className="pt-0.5">
        <CategoryTag category={article.category} />
        <h4
          className="text-[13px] font-medium leading-snug mt-0.5 group-hover:text-[var(--blue)] transition-colors"
          style={{
            color: "var(--text-secondary)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {article.headline}
        </h4>
      </div>
    </Link>
  );
}
