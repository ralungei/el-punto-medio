import { useState, useMemo, useEffect } from "react";
import { useLoaderData, Link } from "react-router-dom";
import type { ArticleDetail, ClusterSource } from "../types";
import { LEAN_COLORS, getFavicon } from "../constants";
import { CategoryTags, getCategories } from "../components/shared/CategoryTag";
import { formatDateTime, formatDateTimeShort } from "../lib/format";
import { ArticleSections } from "../components/article/ArticleSections";
import { SpectrumBar } from "../components/article/SpectrumBar";
import { RichParagraphs } from "../lib/richtext";
import { ImageCarousel } from "../components/shared/ImageCarousel";
import { markRead } from "../lib/storage";

/* ── Tab definitions ── */
const TABS = [
  { id: "medios", label: "Cómo lo cuentan", icon: "book" },
  { id: "oculto", label: "Lo que falta", icon: "search" },
  { id: "fuentes", label: "Fuentes originales", icon: "link" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* Domain lookup for favicons */

/* ── Source article link with date ── */
function SourceLink({ source: s }: { source: ClusterSource }) {
  const dateStr = formatDateTimeShort(s.publishedAt);
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 py-1.5 group"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-light)"
        strokeWidth="2"
        className="flex-shrink-0"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      <span
        className="text-[13px] truncate group-hover:text-[var(--blue)] transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        {s.title}
      </span>
      {dateStr && (
        <span
          className="text-[11px] flex-shrink-0 whitespace-nowrap"
          style={{ color: "var(--text-light)" }}
        >
          {dateStr}
        </span>
      )}
    </a>
  );
}

/* ── Grouped sources by media ── */
function GroupedSources({ sources }: { sources: ClusterSource[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, { source: ClusterSource["source"]; articles: ClusterSource[] }>();
    for (const s of sources) {
      const name = s.source?.name || "Desconocido";
      if (!map.has(name)) map.set(name, { source: s.source, articles: [] });
      map.get(name)!.articles.push(s);
    }
    // Sort articles within each group by date (oldest first = published earlier)
    for (const [, group] of map) {
      group.articles.sort((a, b) => {
        if (!a.publishedAt && !b.publishedAt) return 0;
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].articles.length - a[1].articles.length);
  }, [sources]);

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-[13px] mb-4" style={{ color: "var(--text-muted)" }}>
        {sources.length} artículos originales de {grouped.length} medios
      </p>
      {grouped.map(([name, { source, articles }]) => {
        const isOpen = expanded.has(name);
        const color = LEAN_COLORS[source?.politicalLean || "center"] || "#868E96";
        const preview = articles.slice(0, 2);
        const rest = articles.slice(2);

        return (
          <div
            key={name}
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
          >
            {/* Header — always visible */}
            <button
              onClick={() => toggle(name)}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors"
              style={{ borderRadius: "var(--radius-md)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div
                className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg)" }}
              >
                {getFavicon(name) ? (
                  <img src={getFavicon(name)!} alt={name} width={20} height={20} loading="lazy" />
                ) : (
                  <span className="text-[11px] font-bold" style={{ color }}>{name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-bold">{name}</span>
                <span className="text-[12px] ml-2" style={{ color: "var(--text-muted)" }}>
                  {articles.length} {articles.length === 1 ? "artículo" : "artículos"}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-light)"
                strokeWidth="2"
                className="flex-shrink-0 transition-transform"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Preview — always show first 2 */}
            <div className="px-4 pb-3" style={{ marginTop: "-4px" }}>
              {preview.map((s) => (
                <SourceLink key={s.id} source={s} />
              ))}

              {/* Expanded articles */}
              {isOpen && rest.map((s) => (
                <SourceLink key={s.id} source={s} />
              ))}

              {/* Show more button */}
              {rest.length > 0 && !isOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(name);
                  }}
                  className="text-[12px] font-semibold mt-1 transition-colors"
                  style={{ color: "var(--blue)" }}
                >
                  + {rest.length} más
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab icon ── */
function TabIcon({ name, size = 15 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "book":
      return (
        <svg {...props}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "alert":
      return (
        <svg {...props}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "link":
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Main page ── */
export default function ArticlePage() {
  const article = useLoaderData() as ArticleDetail | null;
  const [activeTab, setActiveTab] = useState<TabId>("medios");
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    if (article?.slug) markRead(article.slug);
  }, [article?.slug]);

  if (!article) {
    return (
      <div className="py-32 text-center">
        <h2 className="text-2xl font-bold">Artículo no encontrado</h2>
        <p className="mt-2" style={{ color: "var(--text-muted)" }}>
          El artículo que buscas no existe o ha sido eliminado.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block px-6 py-3 text-[14px] font-semibold text-white transition-colors"
          style={{ backgroundColor: "var(--blue)", borderRadius: "var(--radius-sm)" }}
        >
          Volver a portada
        </Link>
      </div>
    );
  }

  const coveredIds = new Set(article.clusterSources.map((s) => s.sourceId));

  return (
    <article className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] mt-4 mb-8" style={{ color: "var(--text-muted)" }}>
        <Link to="/" className="transition-colors hover:text-[var(--blue)]">
          Portada
        </Link>
        {getCategories(article).length > 0 && (
          <>
            <span style={{ color: "var(--border-dark)" }}>/</span>
            <CategoryTags article={article} className="text-[11px]" />
          </>
        )}
      </nav>

      {/* Hero image */}
      {(article.imageUrl || article.images?.length) && (
        <div className="mb-8 aspect-[2/1] overflow-hidden">
          <ImageCarousel
            images={article.images}
            alt={article.headline}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Headline */}
      <h1 className="text-3xl md:text-[42px] font-extrabold leading-[1.12] tracking-[-0.5px]">
        {article.headline}
      </h1>

      {/* Summary */}
      {article.summary && (
        <p className="mt-5 text-lg md:text-xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {article.summary}
        </p>
      )}

      {/* Meta */}
      <div className="mt-6 flex items-center gap-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--blue)" }} />
          <span className="font-medium">{article.sourcesCount} medios analizados</span>
        </div>
        <span style={{ color: "var(--border-dark)" }}>&middot;</span>
        <time>{formatDateTime(article.createdAt)}</time>
        {article.updatedAt && (
          <>
            <span style={{ color: "var(--border-dark)" }}>&middot;</span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full"
              style={{ backgroundColor: "var(--blue)", color: "white" }}
            >
              Actualizado
            </span>
          </>
        )}
      </div>

      {/* Spectrum */}
      <SpectrumBar allSources={article.allSources} coveredIds={coveredIds} />

      {/* ━━━ Full article body ━━━ */}
      <div className="mt-10 space-y-6">
        {/* Facts — the objective AI-generated article */}
        <div className="space-y-5">
          <RichParagraphs
            text={article.sections.facts}
            className="text-[16px] leading-[1.85]"
            style={{ color: "var(--text-secondary)" }}
          />
        </div>

        {/* Context — collapsible */}
        {article.sections.context && (
          <div
            className="mt-8 pt-6"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <h3 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Contexto</h3>
            </div>

            {contextOpen ? (
              <div className="space-y-4 anim-fade">
                <RichParagraphs
                  text={article.sections.context}
                  className="text-[15px] leading-[1.8]"
                  style={{ color: "var(--text-secondary)" }}
                />
                <button
                  onClick={() => setContextOpen(false)}
                  className="text-[13px] font-semibold transition-colors"
                  style={{ color: "var(--text-light)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-light)")}
                >
                  Ver menos
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="overflow-hidden" style={{ maxHeight: 72 }}>
                  <RichParagraphs
                    text={article.sections.context}
                    className="text-[15px] leading-[1.8]"
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                  style={{ background: "linear-gradient(transparent, var(--bg))" }}
                />
                <button
                  onClick={() => setContextOpen(true)}
                  className="relative mt-1 text-[13px] font-semibold transition-colors"
                  style={{ color: "var(--blue)" }}
                >
                  Seguir leyendo →
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="mt-8" style={{ borderTop: "1px solid var(--border)" }} />

      {/* ━━━ Tabs ━━━ */}
      <div
        className="flex gap-8 mt-10 overflow-x-auto scrollbar-none"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 pb-3 text-[13px] font-semibold whitespace-nowrap transition-colors relative"
              style={{
                color: isActive ? "var(--text)" : "var(--text-light)",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-muted)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-light)"; }}
            >
              <TabIcon name={tab.icon} size={14} />
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: "var(--text)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ━━━ Tab content ━━━ */}
      <div className="mt-6 min-h-[300px]">
        {activeTab === "medios" && (
          <div className="anim-fade">
            <ArticleSections sections={article.sections} onlyCoverage clusterSources={article.clusterSources} />
          </div>
        )}

        {activeTab === "oculto" && (
          <div className="anim-fade">
            {article.sections.hidden ? (
              <div>
                <p
                  className="text-[13px] font-medium mb-6"
                  style={{ color: "var(--text-light)" }}
                >
                  Comparando la cobertura de los {article.sourcesCount} medios analizados, hemos identificado información
                  que no todos incluyen o que se presenta de forma incompleta.
                </p>
                <div className="space-y-5">
                  <RichParagraphs
                    text={article.sections.hidden}
                    className="text-[15px] leading-[1.8]"
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="text-[14px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Todos los medios han cubierto los aspectos principales de esta noticia.
                </p>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-light)" }}>
                  No se han detectado omisiones significativas entre las fuentes analizadas.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "fuentes" && (
          <div className="anim-fade">
            <GroupedSources sources={article.clusterSources} />
          </div>
        )}
      </div>

      {/* ━━━ Saca tus conclusiones ━━━ */}
      {article.sections.questions?.length > 0 && (
        <div
          className="mt-10 pt-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <h3 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Saca tus conclusiones</h3>
          </div>
          <div className="space-y-4">
            {article.sections.questions.map((q, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ backgroundColor: "var(--blue)" }}>
                  {i + 1}
                </span>
                <p className="text-[15px] leading-relaxed pt-0.5 italic" style={{ color: "var(--text-secondary)" }}>{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back */}
      <div
        className="mt-14 mb-6 pt-8"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13px] font-semibold transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a portada
        </Link>
      </div>
    </article>
  );
}
