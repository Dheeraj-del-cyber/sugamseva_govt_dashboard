import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

/**
 * Searchable dropdown for picking one value out of a (long) static list of
 * options, e.g. problem categories. Unlike a native <select>, the option
 * list is our own absolutely-positioned panel: it always opens directly
 * below the field and always renders top-to-bottom in the given order, so
 * it never flips open upward (which is what makes a native <select> look
 * "reversed" when there isn't much room below it, e.g. inside a modal).
 */
export default function SearchableSelect({ label, value, onChange, options, placeholder, required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const handleSelect = (option: string) => {
    onChange(option);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block">
        <span className="text-xs font-semibold text-ink-700">
          {label} {required && <span style={{ color: "var(--color-red-600)" }}>*</span>}
        </span>
        <div className="relative mt-1.5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={open ? query : value}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setQuery("");
              setOpen(true);
            }}
            placeholder={placeholder || "Search categories..."}
            autoComplete="off"
            className="w-full rounded-lg border pl-9 pr-8 py-2.5 text-sm text-ink-900 placeholder:text-ink-500 focus:border-gov-blue-500 outline-none transition-colors"
            style={{ borderColor: "var(--color-ink-300)" }}
          />
          <ChevronDown
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
          />
        </div>
      </label>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-gov-blue-50 transition-colors border-b border-ink-100 last:border-b-0 ${
                  option === value ? "font-semibold text-gov-blue-700 bg-gov-blue-50" : "text-ink-900"
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-3.5 py-2.5 text-xs text-ink-400 italic">No matching category found.</p>
          )}
        </div>
      )}
    </div>
  );
}