import { useLoaderData, useSearchParams, Link, useOutletContext } from "react-router-dom";
import type { Edition, ArticleWithMeta } from "../types";
import type { AppContext } from "../App";
import { EditionBanner } from "../components/home/EditionBanner";
import { ImageCarousel } from "../components/shared/ImageCarousel";
import { CATEGORY_COLORS, SOURCE_DOMAIN, getFavicon } from "../constants";

interface HomeData {
  edition: Edition;
  articles: ArticleWithMeta[];
}

/* ── helpers ── */

function getPrimaryCategory(article: { categories?: string[]; category: string | null }): string | null {
  if (article.categories?.length) return article.categories[0];
  return article.category;
}

function getCategories(article: { categories?: string[]; category: string | null }): string[] {
  if (article.categories?.length) return article.categories;
  return article.category ? [article.category] : [];
}

/* ── Kicker (category labels) ── */
function Kicker({ article, large }: { article: { categories?: string[]; category: string | null }; large?: boolean }) {
  const cats = getCategories(article);
  if (cats.length === 0) return null;
  return (
    <span className="flex items-center gap-1.5">
      {cats.map((cat) => {
        const color = CATEGORY_COLORS[cat] || "var(--text-muted)";
        return (
          <span
            key={cat}
            className={`font-bold uppercase tracking-[0.5px] ${large ? "text-[12px]" : "text-[11px]"}`}
            style={{ color }}
          >
            {cat}
          </span>
        );
      })}
    </span>
  );
}

/* ── Sources count ── */
function Sources({ count, large }: { count: number; large?: boolean }) {
  return (
    <span className={`font-medium ${large ? "text-[12px]" : "text-[11px]"}`} style={{ color: "var(--text-light)" }}>
      {count} medios
    </span>
  );
}

/* ── Image placeholder with media favicons ── */
function ImagePlaceholder({ count, className }: { count: number; className?: string }) {
  const allNames = Object.keys(SOURCE_DOMAIN);
  const shown = allNames.slice(0, Math.min(count, allNames.length));
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div className="flex flex-wrap items-center justify-center gap-3" style={{ maxWidth: "85%" }}>
        {shown.map((name) => {
          const src = getFavicon(name);
          return src ? (
            <img
              key={name}
              src={src}
              alt={name}
              width={24}
              height={24}
              style={{ borderRadius: 3, opacity: 0.6 }}
            />
          ) : null;
        })}
      </div>
    </div>
  );
}

/* ── Hero card (large, spans 2 columns) ── */
function HeroCard({ article }: { article: ArticleWithMeta }) {
  return (
    <div className="group">
      <Link to={`/articulo/${article.slug}`} className="block mb-3 overflow-hidden">
        <ImageCarousel
          images={article.images}
          className="w-full h-[320px]"
          fallbackElement={
            <ImagePlaceholder count={article.sourcesCount} className="w-full h-[320px]" />
          }
        />
      </Link>
      <div className="mb-1.5">
        <Sources count={article.sourcesCount} large />
      </div>
      <Link to={`/articulo/${article.slug}`} className="block">
        <h3
          className="text-[24px] font-black leading-[1.2] group-hover:text-[var(--blue)] transition-colors"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {article.headline}
        </h3>
      </Link>
      {article.summary && (
        <p
          className="mt-1.5 text-[14px] leading-relaxed line-clamp-3"
          style={{ color: "var(--text-muted)" }}
        >
          {article.summary}
        </p>
      )}
    </div>
  );
}

/* ── Side card (stacked on the right of the hero) ── */
function SideCard({ article }: { article: ArticleWithMeta }) {
  return (
    <div
      className="group py-3 first:pt-0 last:pb-0"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <Link to={`/articulo/${article.slug}`} className="shrink-0 overflow-hidden">
          <ImageCarousel
            images={article.images}
            compact
            className="w-[140px] h-[95px]"
            fallbackElement={
              <ImagePlaceholder count={article.sourcesCount} className="w-[140px] h-[95px]" />
            }
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <Sources count={article.sourcesCount} />
          </div>
          <Link to={`/articulo/${article.slug}`} className="block">
            <h3
              className="text-[15px] font-bold leading-[1.3] group-hover:text-[var(--blue)] transition-colors"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {article.headline}
            </h3>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Standard grid card ── */
function ArticleCard({ article }: { article: ArticleWithMeta }) {
  return (
    <div className="group">
      <Link to={`/articulo/${article.slug}`} className="block mb-2 overflow-hidden">
        <ImageCarousel
          images={article.images}
          compact
          className="w-full h-[160px]"
          fallbackElement={
            <ImagePlaceholder count={article.sourcesCount} className="w-full h-[160px]" />
          }
        />
      </Link>
      <div className="mb-1">
        <Sources count={article.sourcesCount} />
      </div>
      <Link to={`/articulo/${article.slug}`} className="block">
        <h3
          className="text-[16px] font-bold leading-[1.25] group-hover:text-[var(--blue)] transition-colors"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {article.headline}
        </h3>
      </Link>
      {article.summary && (
        <p
          className="mt-1 text-[13px] leading-relaxed line-clamp-2"
          style={{ color: "var(--text-muted)" }}
        >
          {article.summary}
        </p>
      )}
    </div>
  );
}

/* ── Promo card (fills empty space in side column) ── */
function PromoCard() {
  return (
    <div
      className="flex-1 flex flex-col justify-center px-5 py-6 mt-1"
      style={{
        background: "var(--blue-wash)",
        borderTop: "2px solid var(--blue)",
      }}
    >
      <div className="flex items-center gap-0 mb-4">
        <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
          EL PUNTO
        </span>
        <span
          className="inline-block w-[7px] h-[7px] rounded-full mx-[3px]"
          style={{ backgroundColor: "var(--blue)" }}
        />
        <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
          MEDIO
        </span>
      </div>

      <p className="text-[13px] leading-[1.7] mb-5" style={{ color: "var(--text-secondary)" }}>
        Un equipo de inteligencias artificiales lee 14 medios de todo el espectro político español,
        cruza sus coberturas y redacta cada noticia con sesgo mínimo. Tú formas tu propia opinión.
      </p>

      <div className="flex gap-[3px] mb-5">
        {["var(--spectrum-left)", "var(--spectrum-center-left)", "var(--spectrum-center)", "var(--spectrum-center-right)", "var(--spectrum-right)", "var(--spectrum-public)"].map((c, i) => (
          <div key={i} className="h-[4px] flex-1" style={{ backgroundColor: c, opacity: 0.5 }} />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5">
          <span className="text-[14px] leading-none mt-[2px]" style={{ color: "var(--blue)" }}>●</span>
          <p className="text-[12px] leading-[1.6]" style={{ color: "var(--text-muted)" }}>
            Cada artículo cruza las fuentes de izquierda a derecha para mostrarte qué se destaca y qué se omite
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-[14px] leading-none mt-[2px]" style={{ color: "var(--blue)" }}>●</span>
          <p className="text-[12px] leading-[1.6]" style={{ color: "var(--text-muted)" }}>
            Analizamos el tono, los hechos clave y el contexto que falta en cada cobertura
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Hero + grid layout for a group of articles ── */
function HeroGrid({ articles, showPromo }: { articles: ArticleWithMeta[]; showPromo?: boolean }) {
  if (articles.length === 0) return null;

  const [hero, ...rest] = articles;
  const sideCards = rest.slice(0, 2);
  const gridCards = rest.slice(2);

  return (
    <>
      {/* Top row: hero (2 cols) + side stack (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <HeroCard article={hero} />
        {sideCards.length > 0 && (
          <div className="flex flex-col gap-1">
            {sideCards.map((a) => (
              <SideCard key={a.id} article={a} />
            ))}
            {showPromo && <PromoCard />}
          </div>
        )}
      </div>

      {/* Bottom row: standard 3-col grid */}
      {gridCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
          {gridCards.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </>
  );
}

/* ── Category section with colored background ── */
function CategorySection({
  title,
  articles,
  color,
}: {
  title: string;
  articles: ArticleWithMeta[];
  color: string;
}) {
  const bgColor = `${color}14`;
  return (
    <section style={{ backgroundColor: bgColor }} className="py-10 mt-2">
      <div className="mx-auto max-w-[1100px] px-5">
        <div className="mb-5">
          <h2
            className="text-[18px] font-extrabold uppercase tracking-[1.5px] mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
          >
            {title}
          </h2>
          <div style={{ height: 3, width: 60, backgroundColor: color }} />
        </div>
        <HeroGrid articles={articles} />
      </div>
    </section>
  );
}

/* ── Main page ── */
export default function HomePage() {
  const data = useLoaderData() as HomeData | null;
  const [searchParams] = useSearchParams();
  const catFilter = searchParams.get("cat");

  if (!data || data.articles.length === 0) {
    return (
      <div className="py-32 text-center">
        <div className="flex items-center justify-center gap-0 mb-4">
          <span className="text-4xl font-bold tracking-[-0.3px]">EL PUNTO</span>
          <span className="inline-block w-[14px] h-[14px] rounded-full mx-[5px]" style={{ backgroundColor: "var(--blue)" }} />
          <span className="text-4xl font-bold tracking-[-0.3px]">MEDIO</span>
        </div>
        <p className="mt-6 text-[15px]" style={{ color: "var(--text-muted)" }}>
          Estamos preparando la próxima edición. Vuelve en unos minutos.
        </p>
      </div>
    );
  }

  const { edition, articles: rawArticles } = data;
  const { hideNegative } = useOutletContext<AppContext>();

  const allArticles = hideNegative
    ? rawArticles.filter((a) => a.sentiment !== "negative")
    : rawArticles;

  /* ── Filtered view: single category ── */
  if (catFilter) {
    const filtered = allArticles.filter((a) => getCategories(a).includes(catFilter));
    const catColor = CATEGORY_COLORS[catFilter] || "var(--text-muted)";

    if (filtered.length === 0) {
      return (
        <div>
          <EditionBanner
            type={edition.type}
            publishedAt={edition.publishedAt}
            articleCount={edition.articleCount}
          />
          <div className="py-20 text-center">
            <span
              className="inline-block text-[12px] font-bold uppercase tracking-wide px-3 py-1 rounded mb-4"
              style={{ color: catColor, backgroundColor: `${catColor}15` }}
            >
              {catFilter}
            </span>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-secondary)" }}>
              No hay noticias de {catFilter} en esta edición
            </h2>
          </div>
        </div>
      );
    }

    return (
      <div>
        <EditionBanner
          type={edition.type}
          publishedAt={edition.publishedAt}
          articleCount={edition.articleCount}
        />
        <section className="py-6">
          <div className="mx-auto max-w-[1100px] px-5">
            <div className="mb-5">
              <h2
                className="text-[18px] font-extrabold uppercase tracking-[1.5px] mb-2"
                style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
              >
                {catFilter}
              </h2>
              <div style={{ height: 3, width: 60, backgroundColor: catColor }} />
            </div>
            <HeroGrid articles={filtered} />
          </div>
        </section>
      </div>
    );
  }

  /* ── Default view: grouped by category ── */

  // 1. Top 6 for principal section
  const topArticles = allArticles.slice(0, 6);
  const remaining = allArticles.slice(6);

  // 2. Group remaining by primary category
  const grouped = new Map<string, ArticleWithMeta[]>();
  for (const article of remaining) {
    const cat = getPrimaryCategory(article) || "_sin_categoría";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(article);
  }

  // 3. Split into full sections (≥3 articles) and overflow (<3)
  const fullSections: { category: string; articles: ArticleWithMeta[]; color: string }[] = [];
  const overflowArticles: ArticleWithMeta[] = [];

  for (const [cat, arts] of grouped) {
    if (arts.length >= 3) {
      fullSections.push({
        category: cat,
        articles: arts,
        color: CATEGORY_COLORS[cat] || "#868E96",
      });
    } else {
      overflowArticles.push(...arts);
    }
  }

  // Sort full sections by number of articles descending
  fullSections.sort((a, b) => b.articles.length - a.articles.length);

  return (
    <div>
      <EditionBanner
        type={edition.type}
        publishedAt={edition.publishedAt}
        articleCount={edition.articleCount}
      />

      {/* ━━━ Principal section ━━━ */}
      {topArticles.length > 0 && (
        <section className="pb-6">
          <div className="mx-auto max-w-[1100px] px-5">
            <HeroGrid articles={topArticles} showPromo />
          </div>
        </section>
      )}

      {/* ━━━ Category sections ━━━ */}
      {fullSections.map(({ category, articles, color }) => (
        <CategorySection
          key={category}
          title={category}
          articles={articles}
          color={color}
        />
      ))}

      {/* ━━━ "Más noticias" overflow ━━━ */}
      {overflowArticles.length > 0 && (
        <section className="py-10 mt-2">
          <div className="mx-auto max-w-[1100px] px-5">
            <div className="mb-5">
              <h2
                className="text-[18px] font-extrabold uppercase tracking-[1.5px] mb-2"
                style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
              >
                Más noticias
              </h2>
              <div style={{ height: 3, width: 60, backgroundColor: "var(--text-light)" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {overflowArticles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
