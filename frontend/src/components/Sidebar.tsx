import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Vote,
  ClipboardList,
  Landmark,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import emblem from "../assets/emblem.png";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/add-user", label: "Add Users", icon: UserPlus },
  { to: "/users", label: "List of Users", icon: Users },
  { to: "/problems", label: "Vote of Problems", icon: Vote },
  { to: "/scheme-list", label: "List of Schemes", icon: ClipboardList },
  { to: "/schemes", label: "Schemes Near People", icon: Landmark },
  { to: "/profile", label: "Official Profile", icon: UserCircle },
];

export default function Sidebar({ open }: { open: boolean }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside
      className={`fixed z-30 inset-y-0 left-0 h-screen w-64 bg-navy-900 text-white flex flex-col overflow-hidden transition-transform duration-200
      ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      style={{ backgroundColor: "var(--color-navy-900)" }}
    >
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 shrink-0">
        <img
          src={emblem}
          alt="Government of India Emblem"
          className="h-16 w-auto object-contain shrink-0"
          style={{ imageRendering: "-webkit-optimize-contrast" }}
        />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-white/60 leading-none">Government of India</p>
          <p className="font-display font-bold text-sm leading-tight mt-1">Sugam Seva</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`
            }
            style={({ isActive }) =>
              isActive ? { color: "var(--color-navy-900)" } : undefined
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          onClick={() => {
            logout();
            navigate("/signin");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}