import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-ink-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: "blue" | "green" | "saffron";
}) {
  const accentColor =
    accent === "green"
      ? "var(--color-green-600)"
      : accent === "saffron"
      ? "var(--color-saffron-500)"
      : "var(--color-gov-blue-600)";
  const bg =
    accent === "green"
      ? "var(--color-green-100)"
      : accent === "saffron"
      ? "var(--color-saffron-100)"
      : "var(--color-gov-blue-100)";

  return (
    <Card className="p-5 flex items-center gap-4">
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: bg, color: accentColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-display font-extrabold text-ink-900 leading-none">{value}</p>
        <p className="text-xs text-ink-500 mt-1.5">{label}</p>
      </div>
    </Card>
  );
}

export function StatusPill({ status }: { status: "verified" | "pending" | "eligible" | "critical" | "info" }) {
  const map = {
    verified: { bg: "var(--color-green-100)", fg: "var(--color-green-600)", label: "Verified" },
    eligible: { bg: "var(--color-green-100)", fg: "var(--color-green-600)", label: "Eligible" },
    pending: { bg: "var(--color-amber-100)", fg: "var(--color-amber-600)", label: "Pending" },
    critical: { bg: "var(--color-red-100)", fg: "var(--color-red-600)", label: "Critical" },
    info: { bg: "var(--color-gov-blue-100)", fg: "var(--color-gov-blue-600)", label: "Info" },
  } as const;
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.fg }} />
      {s.label}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
      style={{ backgroundColor: "var(--color-gov-blue-600)" }}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border transition-colors hover:bg-ink-100 ${className}`}
      style={{ borderColor: "var(--color-ink-300)", color: "var(--color-navy-900)" }}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextField({
  label,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-700">
        {label} {required && <span style={{ color: "var(--color-red-600)" }}>*</span>}
      </span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-500 focus:border-gov-blue-500 outline-none transition-colors"
        style={{ borderColor: "var(--color-ink-300)" }}
      />
    </label>
  );
}
