import { EDITION_LABELS } from "../../constants";
import { formatTime } from "../../lib/format";

export function EditionBanner({
  type,
  publishedAt,
  articleCount,
}: {
  type: string;
  publishedAt: string | null;
  articleCount: number;
}) {
  const time = formatTime(publishedAt);

  return (
    <div className="flex items-center gap-3 py-3 mb-4 anim-fade" style={{ borderBottom: "1px solid var(--border)" }}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: "var(--blue)", animation: "livePulse 2s infinite" }}
      />
      <span
        className="px-3 py-1 text-[12px] font-semibold"
        style={{ color: "var(--blue)", background: "var(--blue-light)" }}
      >
        {EDITION_LABELS[type] || type}
      </span>
      {time && (
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{time}h</span>
      )}
      <span style={{ color: "var(--border-dark)" }}>&middot;</span>
      <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        {articleCount} artículos · 14 medios
      </span>
    </div>
  );
}
