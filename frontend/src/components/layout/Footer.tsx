import { Link } from "react-router-dom";
import { SPECTRUM_COLORS } from "../../constants";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)" }}>
      <div className="mx-auto max-w-[1120px] px-6 py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-0 mb-2">
              <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
                EL PUNTO
              </span>
              <span
                className="inline-block w-[8px] h-[8px] rounded-full mx-[3px]"
                style={{ backgroundColor: "var(--blue)" }}
              />
              <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
                MEDIO
              </span>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Analizamos cómo los medios españoles cubren las mismas noticias.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/archivo"
              className="text-[13px] font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              Archivo
            </Link>
            <div className="flex gap-1">
              {SPECTRUM_COLORS.map((c, i) => (
                <div
                  key={i}
                  className="h-1.5 w-4"
                  style={{ backgroundColor: c, opacity: 0.4 }}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-8 pt-5 flex items-center justify-between text-[11px]"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-light)" }}
        >
          <span>&copy; 2026 El Punto·Medio</span>
          <span>14 medios · Todo el espectro político</span>
        </div>
      </div>
    </footer>
  );
}
