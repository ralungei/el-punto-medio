import type { ArticleSections as Sections, ClusterSource } from "../../types";
import { CoverageCard } from "./CoverageCard";

export function ArticleSections({
  sections,
  onlyCoverage,
  clusterSources,
}: {
  sections: Sections;
  onlyCoverage?: boolean;
  clusterSources?: ClusterSource[];
}) {
  /* Build a map: source name → first article URL */
  const sourceUrlMap = new Map<string, { title: string; url: string }>();
  if (clusterSources) {
    for (const cs of clusterSources) {
      const name = cs.source?.name;
      if (name && !sourceUrlMap.has(name)) {
        sourceUrlMap.set(name, { title: cs.title, url: cs.url });
      }
    }
  }

  /* When used from the "Medios" tab, only render coverage */
  if (onlyCoverage) {
    if (!sections.coverage?.length) {
      return (
        <p className="text-[14px] py-8 text-center" style={{ color: "var(--text-muted)" }}>
          No hay análisis de cobertura disponible.
        </p>
      );
    }
    return (
      <div className="coverage-grid">
        {sections.coverage.map((source, i) => (
          <CoverageCard
            key={source.sourceName}
            source={source}
            index={i}
            articleLink={sourceUrlMap.get(source.sourceName)}
          />
        ))}
      </div>
    );
  }

  /* Full render (legacy — kept for compatibility) */
  return (
    <div className="space-y-10">
      {/* Facts */}
      <section className="section-facts anim-fade anim-fade-1">
        <div className="flex items-center gap-2.5 mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h3 className="text-[17px] font-bold">Qué ha pasado</h3>
        </div>
        <div className="space-y-4">
          {sections.facts.split("\n\n").map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>{p}</p>
          ))}
        </div>
      </section>

      {/* Coverage */}
      {sections.coverage?.length > 0 && (
        <section className="anim-fade anim-fade-2">
          <div className="flex items-center gap-2.5 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <h3 className="text-[17px] font-bold">Cómo lo cuentan</h3>
          </div>
          <div className="coverage-grid">
            {sections.coverage.map((source, i) => (
              <CoverageCard
                key={source.sourceName}
                source={source}
                index={i}
                articleLink={sourceUrlMap.get(source.sourceName)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Hidden */}
      {sections.hidden && (
        <section className="section-hidden anim-fade anim-fade-3">
          <div className="flex items-center gap-2.5 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <h3 className="text-[17px] font-bold">Lo que no te cuentan</h3>
          </div>
          <div className="space-y-3">
            {sections.hidden.split("\n\n").map((p, i) => (
              <p key={i} className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* Context */}
      {sections.context && (
        <section className="section-context anim-fade anim-fade-4">
          <div className="flex items-center gap-2.5 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <h3 className="text-[17px] font-bold">Contexto</h3>
          </div>
          <div className="space-y-3">
            {sections.context.split("\n\n").map((p, i) => (
              <p key={i} className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* Questions */}
      {sections.questions?.length > 0 && (
        <section className="section-questions anim-fade anim-fade-5">
          <div className="flex items-center gap-2.5 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <h3 className="text-[17px] font-bold">Saca tus conclusiones</h3>
          </div>
          <div className="space-y-4">
            {sections.questions.map((q, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ backgroundColor: "var(--blue)" }}>
                  {i + 1}
                </span>
                <p className="text-[15px] leading-relaxed pt-0.5 italic" style={{ color: "var(--text-secondary)" }}>{q}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
