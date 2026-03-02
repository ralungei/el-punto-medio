import type { CoverageSource } from "../../types";
import { TONE_COLORS } from "../../constants";

/* Convert hex to rgba for proper alpha */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function CoverageCard({
  source,
  index,
  articleLink,
}: {
  source: CoverageSource;
  index: number;
  articleLink?: { title: string; url: string };
}) {
  const color = TONE_COLORS[source.tone.toLowerCase()] || "#868E96";

  return (
    <div className={`coverage-cell anim-fade anim-fade-${(index % 8) + 1}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
          {source.sourceName}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.8px] px-2.5 py-[4px] rounded"
          style={{ color: "var(--text)", backgroundColor: "#fff", border: "1px solid var(--border)" }}
        >
          <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {source.tone}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {source.summary}
      </p>
      {articleLink && (
        <a
          href={articleLink.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-medium transition-colors"
          style={{ color: "var(--text-light)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-light)")}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Ver artículo original
        </a>
      )}
    </div>
  );
}
