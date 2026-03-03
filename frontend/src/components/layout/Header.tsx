import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { SPECTRUM_COLORS, CATEGORY_COLORS } from "../../constants";

const CATEGORIES = Object.keys(CATEGORY_COLORS);

export function Header({
  onSearchOpen,
  hideNegative,
  onToggleHideNegative,
  hiddenCats,
  toggleCat,
}: {
  onSearchOpen: () => void;
  hideNegative: boolean;
  onToggleHideNegative: () => void;
  hiddenCats: Set<string>;
  toggleCat: (cat: string) => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [smileBounce, setSmileBounce] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handlePositiveToggle = () => {
    onToggleHideNegative();
    setSmileBounce(true);
    setTimeout(() => setSmileBounce(false), 600);
  };

  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [filterOpen]);

  const hiddenCount = hiddenCats.size;

  return (
    <>
    <style>{`
      @keyframes smile-bounce {
        0%   { transform: scale(1) rotate(0deg); }
        30%  { transform: scale(1.4) rotate(-10deg); }
        50%  { transform: scale(1.2) rotate(6deg); }
        70%  { transform: scale(1.1) rotate(-3deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      .mouth-morph {
        transition: d 0.4s ease;
      }
      .mouth-neutral {
        d: path("M8 14 C8 14 9.5 14 12 14 C14.5 14 16 14 16 14");
      }
      .mouth-smile {
        d: path("M8 14 C8 14 9.5 16.5 12 16.5 C14.5 16.5 16 14 16 14");
      }
    `}</style>
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
            onClick={handlePositiveToggle}
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full cursor-pointer"
            style={{
              border: `1px solid ${hideNegative ? "var(--blue)" : "var(--border)"}`,
              backgroundColor: hideNegative ? "var(--blue-wash)" : "transparent",
              color: hideNegative ? "var(--blue)" : "var(--text-light)",
              transition: "all 0.2s ease",
            }}
            title="Solo noticias positivas"
            onMouseEnter={(e) => {
              if (!hideNegative) {
                e.currentTarget.style.borderColor = "var(--text-muted)";
                e.currentTarget.style.backgroundColor = "var(--surface)";
              } else {
                e.currentTarget.style.filter = "brightness(0.95)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = hideNegative ? "var(--blue)" : "var(--border)";
              e.currentTarget.style.backgroundColor = hideNegative ? "var(--blue-wash)" : "transparent";
              e.currentTarget.style.filter = "none";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: smileBounce ? "smile-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
              }}
            >
              <circle cx="12" cy="12" r="10" />
              <path className={`mouth-morph ${hideNegative ? "mouth-smile" : "mouth-neutral"}`} />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            Modo positivo
          </button>

          {/* Filter categories dropdown */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full cursor-pointer"
              style={{
                border: `1px solid ${hiddenCount > 0 ? "var(--blue)" : "var(--border)"}`,
                backgroundColor: hiddenCount > 0 ? "var(--blue-wash)" : "transparent",
                color: hiddenCount > 0 ? "var(--blue)" : "var(--text-light)",
                transition: "all 0.2s ease",
              }}
              title="Filtrar categorías"
              onMouseEnter={(e) => {
                if (hiddenCount === 0) {
                  e.currentTarget.style.borderColor = "var(--text-muted)";
                  e.currentTarget.style.backgroundColor = "var(--surface)";
                } else {
                  e.currentTarget.style.filter = "brightness(0.95)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = hiddenCount > 0 ? "var(--blue)" : "var(--border)";
                e.currentTarget.style.backgroundColor = hiddenCount > 0 ? "var(--blue-wash)" : "transparent";
                e.currentTarget.style.filter = "none";
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filtrar
              {hiddenCount > 0 && (
                <span
                  className="flex items-center justify-center w-[16px] h-[16px] rounded-full text-[9px] font-bold"
                  style={{ backgroundColor: "var(--blue)", color: "#fff" }}
                >
                  {hiddenCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div
                className="absolute right-0 mt-2 py-2 rounded-lg shadow-lg"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  minWidth: 180,
                  zIndex: 100,
                }}
              >
                <div
                  className="px-3 pb-2 mb-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-light)", borderBottom: "1px solid var(--border)" }}
                >
                  Ocultar categorías
                </div>
                {CATEGORIES.map((cat) => {
                  const hidden = hiddenCats.has(cat);
                  const color = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCat(cat)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: hidden ? "var(--text-light)" : "var(--text)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span
                        className="w-[10px] h-[10px] rounded-sm shrink-0"
                        style={{ backgroundColor: color, opacity: hidden ? 0.25 : 1 }}
                      />
                      <span
                        className="flex-1 capitalize"
                        style={{
                          opacity: hidden ? 0.4 : 1,
                          textDecoration: hidden ? "line-through" : "none",
                        }}
                      >
                        {cat}
                      </span>
                      {hidden && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-light)" }}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {hiddenCount > 0 && (
                  <>
                    <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                    <button
                      onClick={() => {
                        for (const cat of hiddenCats) toggleCat(cat);
                      }}
                      className="w-full px-3 py-1.5 text-left text-[12px] font-medium transition-colors"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--blue)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      Mostrar todas
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

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
    </>
  );
}
