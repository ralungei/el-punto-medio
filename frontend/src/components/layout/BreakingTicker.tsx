import { Link } from "react-router-dom";
import type { ArticleWithMeta } from "../../types";

export function BreakingTicker({ articles }: { articles: ArticleWithMeta[] }) {
  if (articles.length === 0) return null;

  const text = articles.map((a) => a.headline).join("   ·   ");

  return (
    <div className="ticker-bar">
      <span className="ticker-label">MAYOR COBERTURA</span>
      <div className="ticker-track">
        <span className="ticker-text">
          {articles.map((a, i) => (
            <span key={a.id}>
              <Link
                to={`/articulo/${a.slug}`}
                className="hover:underline"
              >
                {a.headline}
              </Link>
              {i < articles.length - 1 && (
                <span style={{ opacity: 0.5, margin: "0 16px" }}>·</span>
              )}
            </span>
          ))}
          <span style={{ opacity: 0.5, margin: "0 16px" }}>·</span>
          {/* Duplicate for seamless loop */}
          {articles.map((a, i) => (
            <span key={`dup-${a.id}`}>
              <Link
                to={`/articulo/${a.slug}`}
                className="hover:underline"
              >
                {a.headline}
              </Link>
              {i < articles.length - 1 && (
                <span style={{ opacity: 0.5, margin: "0 16px" }}>·</span>
              )}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
