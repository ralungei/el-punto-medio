import type { ClusterSource } from "../../types";
import { LEAN_COLORS } from "../../constants";

export function SourcesList({ sources }: { sources: ClusterSource[] }) {
  return (
    <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
      <h4
        className="text-[12px] font-bold uppercase tracking-[1.5px] mb-5"
        style={{ color: "var(--text-muted)" }}
      >
        Fuentes originales
      </h4>
      <div className="space-y-1">
        {sources.map((s) => {
          const color = LEAN_COLORS[s.source?.politicalLean || "center"] || "#868E96";
          return (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 group p-3 -mx-3 transition-colors duration-150"
              style={{ borderRadius: "var(--radius-sm)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div
                className="w-8 h-8 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ backgroundColor: color, borderRadius: "var(--radius-sm)" }}
              >
                {s.source?.name?.charAt(0) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>
                  {s.source?.name}
                </span>
                <p
                  className="text-[13px] truncate group-hover:text-[var(--text-secondary)] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.title}
                </p>
              </div>
              <svg
                className="w-4 h-4 flex-shrink-0 mt-1.5 transition-colors"
                style={{ color: "var(--text-light)" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}
