import { Menu, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header({
  title,
  onMenuClick,
  backTo,
}: {
  title: string;
  onMenuClick: () => void;
  backTo?: { to: string; label: string };
}) {
  const { official } = useAuth();
  const initials = official?.full_name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-ink-100 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-700"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          {backTo && (
            <Link to={backTo.to} className="text-xs font-medium text-gov-blue-600" style={{ color: "var(--color-gov-blue-600)" }}>
              &larr; {backTo.label}
            </Link>
          )}
          <h1 className="font-display text-lg sm:text-xl font-bold text-navy-900 truncate" style={{ color: "var(--color-navy-900)" }}>
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-700 relative"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-saffron-500)" }}
          />
        </button>
        <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-ink-100">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--color-navy-800)" }}
          >
            {initials || "GO"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-ink-900 leading-none">{official?.full_name ?? "Official"}</p>
            <p className="text-[11px] text-ink-500 mt-0.5">Government Official</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
