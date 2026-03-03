import { useMemo } from "react";
import { useLoaderData, Link } from "react-router-dom";
import type { Edition } from "../types";
import { EDITION_LABELS } from "../constants";
import { formatDate, formatTime } from "../lib/format";
import { getReadSlugs } from "../lib/storage";


export default function ArchivePage() {
  const editions = useLoaderData() as Edition[];
  const readSlugs = useMemo(() => getReadSlugs(), []);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-10">
        <h1 className="text-[32px] font-extrabold tracking-[-0.5px]">Archivo</h1>
        <p className="mt-1 text-[16px]" style={{ color: "var(--text-muted)" }}>
          Todas las ediciones publicadas
        </p>
        <div className="mt-4 h-[3px] w-12 rounded-full" style={{ backgroundColor: "var(--blue)" }} />
      </div>

      {editions.length === 0 && (
        <p className="italic" style={{ color: "var(--text-muted)" }}>No hay ediciones publicadas.</p>
      )}

      <div>
        {editions.map((edition) => {
          const date = formatDate(edition.publishedAt);
          const time = formatTime(edition.publishedAt);
          const articles = edition.articles ?? [];

          return (
            <div key={edition.id} className="py-6" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-bold" style={{ color: "var(--blue)" }}>
                      {EDITION_LABELS[edition.type] || edition.type}
                    </span>
                    <span style={{ color: "var(--border-dark)" }}>&middot;</span>
                    <span className="text-[13px] capitalize" style={{ color: "var(--text-muted)" }}>
                      {date}, {time}
                    </span>
                  </div>

                  {articles.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {articles.slice(0, 4).map((article) => (
                        <Link
                          key={article.id}
                          to={`/articulo/${article.slug}`}
                          className="group flex items-center gap-3"
                        >
                          <div className="min-w-0">
                            <p
                            className="text-[13px] font-semibold truncate group-hover:text-[var(--blue)] transition-colors"
                            style={readSlugs.has(article.slug) ? { opacity: 0.55, color: "var(--text-muted)" } : undefined}
                          >
                              {article.headline}
                            </p>
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {article.sourcesCount} medios
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-3xl font-extrabold" style={{ color: "var(--border)" }}>
                    {edition.articleCount}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider -mt-0.5" style={{ color: "var(--text-muted)" }}>
                    artículos
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
