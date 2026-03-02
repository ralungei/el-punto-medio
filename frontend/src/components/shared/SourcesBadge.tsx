export function SourcesBadge({ count }: { count: number }) {
  return (
    <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
      {count} medios
    </span>
  );
}
