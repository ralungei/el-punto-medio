import { LEAN_ORDER } from "../../constants";
import type { PoliticalLean } from "../../types";

interface SourceInfo {
  id: number;
  name: string;
  politicalLean: PoliticalLean;
}

/* Domain lookup for favicons */
const SOURCE_DOMAIN: Record<string, string> = {
  "El País": "elpais.com",
  "El Mundo": "elmundo.es",
  ABC: "abc.es",
  "La Vanguardia": "lavanguardia.com",
  "elDiario.es": "eldiario.es",
  "La Razón": "larazon.es",
  Público: "publico.es",
  OKDiario: "okdiario.com",
  "El Confidencial": "elconfidencial.com",
  "20 Minutos": "20minutos.es",
  RTVE: "rtve.es",
  "El Periódico": "elperiodico.com",
  Newtral: "newtral.es",
  "El Español": "elespanol.com",
};

const SHORT_NAME: Record<string, string> = {
  "El País": "País",
  "El Mundo": "Mundo",
  ABC: "ABC",
  "La Vanguardia": "Vanguardia",
  "elDiario.es": "elDiario",
  "La Razón": "Razón",
  Público: "Público",
  OKDiario: "OKDiario",
  "El Confidencial": "Confidencial",
  "20 Minutos": "20Min",
  RTVE: "RTVE",
  "El Periódico": "Periódico",
  Newtral: "Newtral",
  "El Español": "Español",
};

function getFavicon(name: string) {
  const domain = SOURCE_DOMAIN[name];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/* Position each lean on a 0–100 scale */
const LEAN_POSITION: Record<string, number> = {
  left: 5,
  "center-left": 22,
  center: 45,
  public: 50,
  "center-right": 68,
  right: 90,
};

export function SpectrumBar({
  allSources,
  coveredIds,
}: {
  allSources: SourceInfo[];
  coveredIds: Set<number>;
}) {
  const sorted = [...allSources].sort(
    (a, b) => (LEAN_ORDER[a.politicalLean] ?? 2) - (LEAN_ORDER[b.politicalLean] ?? 2)
  );

  const total = sorted.length;
  const covered = sorted.filter((s) => coveredIds.has(s.id)).length;

  /* Compute visual positions and assign staggered above/below */
  const items = sorted.map((source) => {
    const pos = LEAN_POSITION[source.politicalLean] ?? 50;
    const sameGroup = sorted.filter(
      (s) => s.politicalLean === source.politicalLean
    );
    const idx = sameGroup.findIndex((s) => s.id === source.id);
    const spread = 5;
    const off =
      sameGroup.length > 1
        ? (idx - (sameGroup.length - 1) / 2) * spread
        : 0;
    /* Approximate actual pixel position: pos% of ~900px container + offset in px */
    return { source, pos, off, visualX: pos * 9 + off * 10 };
  });

  /* Sort by visual X position, assign alternating above/below */
  const byX = [...items].sort((a, b) => a.visualX - b.visualX);
  const sideMap = new Map<number, boolean>();
  byX.forEach((it, i) => sideMap.set(it.source.id, i % 2 !== 0));

  const BAR_Y = 46;
  const BAR_H = 4;

  return (
    <div
      className="my-8 anim-fade anim-fade-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h4
          className="text-[12px] font-bold uppercase tracking-[1px]"
          style={{ color: "var(--text-muted)" }}
        >
          Espectro de cobertura
        </h4>
        <span className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
          {covered}/{total} medios cubrieron
        </span>
      </div>

      {/* Spectrum timeline */}
      <div className="relative mx-5" style={{ height: 130 }}>
        {/* Gradient bar */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: BAR_Y,
            height: BAR_H,
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #E03131 0%, #F06292 20%, #ADB5BD 45%, #5C7CFA 70%, #2563EB 100%)",
            opacity: 0.25,
          }}
        />
        <div
          className="absolute left-0 right-0"
          style={{
            top: BAR_Y,
            height: BAR_H,
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #E03131 0%, #F06292 20%, #ADB5BD 45%, #5C7CFA 70%, #2563EB 100%)",
            opacity: 0.55,
          }}
        />

        {/* Source markers — circle on bar, connector + name extending away */}
        {items.map(({ source, pos, off }) => {
          const isAbove = sideMap.get(source.id) ?? true;
          const isCovered = coveredIds.has(source.id);
          const favicon = getFavicon(source.name);
          const CIRCLE = 22;
          const CONN = 14;

          const faviconEl = (
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: CIRCLE,
                height: CIRCLE,
                borderRadius: "50%",
                background: isCovered ? "var(--bg)" : "var(--bg-secondary)",
                border: isCovered
                  ? "1.5px solid var(--border)"
                  : "1.5px dashed var(--border)",
                overflow: "hidden",
                opacity: isCovered ? 1 : 0.4,
              }}
            >
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  width={14}
                  height={14}
                  loading="lazy"
                  style={{ filter: isCovered ? "none" : "grayscale(1)" }}
                />
              ) : (
                <span className="text-[8px] font-bold" style={{ color: "var(--text-muted)" }}>
                  {source.name.charAt(0)}
                </span>
              )}
            </div>
          );

          const connEl = (
            <div
              className="flex-shrink-0"
              style={{
                width: 1,
                height: CONN,
                background: "var(--border)",
              }}
            />
          );

          const nameEl = (
            <span
              className="text-[8px] font-semibold text-center leading-tight whitespace-nowrap"
              style={{
                color: isCovered ? "var(--text)" : "var(--text-light)",
                opacity: isCovered ? 1 : 0.4,
              }}
            >
              {SHORT_NAME[source.name] ?? source.name}
            </span>
          );

          return (
            <div
              key={source.id}
              className="absolute flex flex-col items-center"
              title={`${source.name} — ${isCovered ? "Cubrió" : "No cubrió"}`}
              style={{
                left: `calc(${pos}% + ${off * 10}px)`,
                transform: "translateX(-50%)",
                /* Above: name+conn+circle stacks down, bottom touches bar top
                   Below: circle+conn+name stacks down, top starts at bar bottom */
                top: isAbove
                  ? BAR_Y - CIRCLE - CONN - 12   /* 46 - 22 - 8 - 12 = 4 */
                  : BAR_Y + BAR_H,                /* 46 + 4 = 50 */
                width: 52,
              }}
            >
              {isAbove ? (
                /* Top→bottom: name, connector, circle (circle sits on bar) */
                <>{nameEl}{connEl}{faviconEl}</>
              ) : (
                /* Top→bottom: circle (sits on bar), connector, name */
                <>{faviconEl}{connEl}{nameEl}</>
              )}
            </div>
          );
        })}

        {/* Izquierda / Centro / Derecha labels */}
        <div
          className="absolute flex justify-between w-full"
          style={{ top: 110, left: 0, right: 0 }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-wide"
            style={{ color: "#E03131", opacity: 0.6 }}
          >
            ← Izquierda
          </span>
          <span
            className="text-[9px] font-medium"
            style={{ color: "var(--text-light)" }}
          >
            Centro
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wide"
            style={{ color: "#2563EB", opacity: 0.6 }}
          >
            Derecha →
          </span>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-5 px-5 pb-4 pt-1"
      >
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid var(--text)",
              background: "var(--bg)",
            }}
          />
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Cubrió
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "1.5px dashed var(--border-dark)",
              background: "var(--bg-secondary)",
              opacity: 0.5,
            }}
          />
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            No cubrió
          </span>
        </div>
      </div>
    </div>
  );
}
