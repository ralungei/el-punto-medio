import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../../constants";

export function NavBar() {
  const location = useLocation();

  return (
    <nav
      className="overflow-x-auto scrollbar-none"
      style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[1120px] px-6 flex gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? location.pathname === "/" && !location.search
              : decodeURIComponent(location.pathname + location.search) === item.href;

          return (
            <Link
              key={item.label}
              to={item.href}
              className="relative px-3 py-3 whitespace-nowrap transition-colors duration-150"
              style={{
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--blue)" : "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {item.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                  style={{ backgroundColor: "var(--blue)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
