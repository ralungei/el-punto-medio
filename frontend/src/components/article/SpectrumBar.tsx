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
  "Agencia SINC": "agenciasinc.es",
  "Redacción Médica": "redaccionmedica.com",
  "Europa Press": "europapress.es",
  Hipertextual: "hipertextual.com",
  "NatGeo España": "nationalgeographic.com.es",
  EFE: "efe.com",
  Xataka: "xataka.com",
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
  "Agencia SINC": "SINC",
  "Redacción Médica": "RedMédica",
  "Europa Press": "EuropaP",
  Hipertextual: "Hipertext",
  "NatGeo España": "NatGeo",
  EFE: "EFE",
  Xataka: "Xataka",
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

  /* Sort by visual X position, assign alternating above/below + staggered heights */
  const byX = [...items].sort((a, b) => a.visualX - b.visualX);
  const sideMap = new Map<number, boolean>();
  const heightMap = new Map<number, number>();
  let aboveIdx = 0;
  let belowIdx = 0;
  byX.forEach((it, i) => {
    const isAbove = i % 2 !== 0;
    sideMap.set(it.source.id, isAbove);
    heightMap.set(it.source.id, isAbove ? aboveIdx++ : belowIdx++);
  });

  const BAR_Y = 100;
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
      <div className="relative mx-5" style={{ height: 260 }}>
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
          const CIRCLE = 28;
          const CONN = 30;

          const faviconEl = (
            <div
              className="flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-115"
              style={{
                width: CIRCLE,
                height: CIRCLE,
                borderRadius: "50%",
                background: isCovered ? "var(--bg)" : "var(--bg-secondary)",
                border: isCovered
                  ? "1.5px solid var(--border)"
                  : "1.5px dashed var(--border)",
                overflow: "hidden",
                opacity: isCovered ? 1 : 0.6,
              }}
            >
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  width={18}
                  height={18}
                  loading="lazy"
                  style={{ filter: isCovered ? "none" : "grayscale(0.8)" }}
                />
              ) : (
                <span className="text-[8px] font-bold" style={{ color: "var(--text-muted)" }}>
                  {source.name.charAt(0)}
                </span>
              )}
            </div>
          );

          const nameEl = (
            <span
              className="text-[8px] font-semibold text-center leading-tight whitespace-nowrap"
              style={{
                color: isCovered ? "var(--text)" : "var(--text-muted)",
                opacity: isCovered ? 1 : 0.6,
              }}
            >
              {SHORT_NAME[source.name] ?? source.name}
            </span>
          );

          const hIdx = heightMap.get(source.id) ?? 0;
          const STAGGER = 20;
          const connHeight = CONN + (hIdx % 3) * STAGGER;

          const connEl = (
            <div
              className="flex-shrink-0"
              style={{
                width: 1,
                height: connHeight,
                background: "var(--border)",
              }}
            />
          );

          const domain = SOURCE_DOMAIN[source.name];
          const href = domain ? `https://${domain}` : undefined;

          return (
            <a
              key={source.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute flex flex-col items-center cursor-pointer group"
              title={source.name}
              style={{
                left: `calc(${pos}% + ${off * 10}px)`,
                transform: "translateX(-50%)",
                top: isAbove
                  ? BAR_Y - CIRCLE - connHeight - 12
                  : BAR_Y + BAR_H,
                width: 52,
                textDecoration: "none",
              }}
            >
              {isAbove ? (
                <>{nameEl}{faviconEl}{connEl}</>
              ) : (
                <>{connEl}{faviconEl}{nameEl}</>
              )}
            </a>
          );
        })}

        {/* Izquierda / Centro / Derecha chips on bar */}
        {[
          { label: "Izquierda", left: "0%", color: "#E03131", bg: "#FFF0F0", align: "left" },
          { label: "Centro", left: "50%", color: "#868E96", bg: "#F8F9FA", align: "center" },
          { label: "Derecha", left: "100%", color: "#2563EB", bg: "#EDF2FF", align: "right" },
        ].map((chip) => (
          <div
            key={chip.label}
            className="absolute text-[8px] font-bold uppercase tracking-[0.5px] px-2 py-[2px] rounded-full whitespace-nowrap"
            style={{
              left: chip.left,
              top: BAR_Y + BAR_H / 2,
              transform: `translate(${chip.align === "left" ? "0" : chip.align === "right" ? "-100%" : "-50%"}, -50%)`,
              color: chip.color,
              background: chip.bg,
              border: `1px solid ${chip.color}30`,
              zIndex: 1,
            }}
          >
            {chip.label}
          </div>
        ))}
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
