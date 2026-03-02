import { useState, useEffect } from "react";
import { formatDate } from "../../lib/format";

/* Edition schedule (hours in local time) */
const EDITIONS = [
  { hour: 8, min: 0, label: "matinal" },
  { hour: 14, min: 0, label: "mediodía" },
  { hour: 21, min: 0, label: "nocturna" },
];

function getNextEdition() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  for (const ed of EDITIONS) {
    const edMins = ed.hour * 60 + ed.min;
    if (edMins > nowMins) {
      const diff = edMins - nowMins;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return { label: ed.label, h, m };
    }
  }

  /* Next is tomorrow's morning edition */
  const firstEd = EDITIONS[0];
  const edMins = firstEd.hour * 60 + firstEd.min;
  const diff = 24 * 60 - nowMins + edMins;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return { label: firstEd.label, h, m };
}

export function TopBar() {
  const dateStr = formatDate(new Date().toISOString());
  const [next, setNext] = useState(getNextEdition);

  useEffect(() => {
    const id = setInterval(() => setNext(getNextEdition()), 30_000);
    return () => clearInterval(id);
  }, []);

  const countdown =
    next.h > 0 ? `${next.h}h ${next.m}min` : `${next.m}min`;

  return (
    <div
      className="py-2"
      style={{ background: "#000" }}
    >
      <div className="mx-auto max-w-[1120px] px-6 flex items-center justify-between">
        <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>
          14 medios <span style={{ opacity: 0.5, margin: "0 3px" }}>·</span> Todo el espectro político
        </span>
        <div className="flex items-center gap-3" style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>
          <span className="hidden sm:flex items-center gap-1.5">
            <span
              className="inline-block w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: "#4ADE80" }}
            />
            <span>Ed. {next.label} en {countdown}</span>
          </span>
          <span className="capitalize">{dateStr}</span>
        </div>
      </div>
    </div>
  );
}
