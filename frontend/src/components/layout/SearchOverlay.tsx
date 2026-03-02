import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ArticleWithMeta } from "../../types";
import { loadLatestEdition } from "../../lib/data";
import { ImageCarousel } from "../shared/ImageCarousel";
import { CategoryTags, getCategories } from "../shared/CategoryTag";

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<ArticleWithMeta[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    loadLatestEdition().then((data) => {
      if (data) setArticles(data.articles);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return articles.filter(
      (a) =>
        a.headline.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        getCategories(a).some((c) => c.toLowerCase().includes(q))
    );
  }, [query, articles]);

  const goTo = (slug: string) => {
    onClose();
    navigate(`/articulo/${slug}`);
  };

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto max-w-[700px]">
          {/* Search input */}
          <div className="flex items-center gap-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-light)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar noticias..."
              className="search-input"
            />
            <button
              onClick={onClose}
              className="flex-shrink-0 text-[12px] font-semibold px-3 py-1.5"
              style={{
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              ESC
            </button>
          </div>

          {/* Results */}
          {query.length >= 2 && (
            <div className="mt-4 max-h-[50vh] overflow-y-auto">
              {results.length === 0 ? (
                <p className="py-8 text-center text-[14px]" style={{ color: "var(--text-muted)" }}>
                  Sin resultados para "{query}"
                </p>
              ) : (
                <>
                  <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                    {results.length} resultado{results.length !== 1 && "s"}
                  </p>
                  {results.map((a) => (
                      <div
                        key={a.id}
                        className="search-result"
                        onClick={() => goTo(a.slug)}
                      >
                        {(a.imageUrl || a.images?.length) && (
                          <ImageCarousel
                            images={a.images}
                            compact
                            className="w-[80px] h-[56px] flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <CategoryTags article={a} />
                          <h4 className="text-[14px] font-semibold leading-snug mt-0.5 truncate">
                            {a.headline}
                          </h4>
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {a.sourcesCount} medios
                          </span>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          )}

          {/* Hint */}
          {query.length < 2 && (
            <p className="mt-4 text-[13px]" style={{ color: "var(--text-light)" }}>
              Escribe al menos 2 caracteres para buscar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
