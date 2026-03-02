import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="py-32 text-center">
      <div className="text-8xl font-extrabold mb-4" style={{ color: "var(--border)", opacity: 0.5 }}>
        404
      </div>
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2" style={{ color: "var(--text-muted)" }}>
        La página que buscas no existe o ha sido movida.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block px-6 py-3 text-[14px] font-semibold text-white transition-colors"
        style={{ backgroundColor: "var(--blue)", borderRadius: "var(--radius-sm)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--blue-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--blue)")}
      >
        Volver a portada
      </Link>
    </div>
  );
}
