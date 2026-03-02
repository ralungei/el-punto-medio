export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      <h2 className="text-[12px] font-bold uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
        {title}
      </h2>
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
    </div>
  );
}
