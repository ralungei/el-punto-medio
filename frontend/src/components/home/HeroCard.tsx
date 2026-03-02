import { Link } from "react-router-dom";
import type { ArticleWithMeta } from "../../types";
import { ImageCarousel } from "../shared/ImageCarousel";

export function HeroCard({ article }: { article: ArticleWithMeta }) {
  return (
    <Link
      to={`/articulo/${article.slug}`}
      className="group block relative overflow-hidden anim-scale h-full min-h-[340px] lg:min-h-[480px]"
    >
      <ImageCarousel
        images={article.images}
        className="absolute inset-0 w-full h-full"
        imageClassName="transition-transform duration-500 group-hover:scale-[1.02]"
        fallbackElement={
          <div
            className="absolute inset-0 w-full h-full"
            style={{ background: "linear-gradient(135deg, var(--blue), var(--blue-deep))" }}
          />
        }
      />

      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 45%, transparent 70%)" }}
      />

      <div className="absolute inset-x-0 bottom-0 p-7 lg:p-9">
        {article.category && (
          <span
            className="inline-block text-[11px] font-bold uppercase tracking-wide px-3 py-1 mb-3 text-white"
            style={{ background: "var(--blue)" }}
          >
            {article.category}
          </span>
        )}
        <h1 className="text-2xl lg:text-[34px] font-extrabold leading-[1.15] text-white mb-2">
          {article.headline}
        </h1>
        {article.summary && (
          <p
            className="text-[15px] leading-relaxed max-w-2xl"
            style={{
              color: "rgba(255,255,255,0.7)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {article.summary}
          </p>
        )}
        <div className="mt-3 text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
          {article.sourcesCount} medios cubrieron esta noticia
        </div>
      </div>
    </Link>
  );
}
