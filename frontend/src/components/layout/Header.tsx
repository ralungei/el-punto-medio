import { Link } from "react-router-dom";
import { SPECTRUM_COLORS } from "../../constants";

export function Header({
  onSearchOpen,
  hideNegative,
  onToggleHideNegative,
}: {
  onSearchOpen: () => void;
  hideNegative: boolean;
  onToggleHideNegative: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-[1120px] px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-0">
          <span
            className="text-[22px] font-bold tracking-[-0.3px]"
            style={{ color: "var(--text)" }}
          >
            EL PUNTO
          </span>
          <span
            className="inline-block w-[10px] h-[10px] rounded-full mx-[5px]"
            style={{ backgroundColor: "var(--blue)" }}
          />
          <span
            className="text-[22px] font-bold tracking-[-0.3px]"
            style={{ color: "var(--text)" }}
          >
            MEDIO
          </span>
          <span
            className="text-[10px] font-medium tracking-[0.3px] ml-2 self-start mt-[2px]"
            style={{ color: "var(--text-light)" }}
          >
            IA
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Spectrum dots */}
          <div className="hidden sm:flex items-center gap-1">
            {SPECTRUM_COLORS.map((c, i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c, opacity: 0.6 }}
              />
            ))}
          </div>

          {/* Positive-only toggle */}
          <button
            onClick={onToggleHideNegative}
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-all"
            style={{
              border: `1px solid ${hideNegative ? "var(--blue)" : "var(--border)"}`,
              backgroundColor: hideNegative ? "var(--blue-wash)" : "transparent",
              color: hideNegative ? "var(--blue)" : "var(--text-light)",
            }}
            title="Solo noticias positivas"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            Modo positivo
          </button>

          {/* Search button */}
          <button
            onClick={onSearchOpen}
            className="flex items-center justify-center w-9 h-9 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            aria-label="Buscar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
