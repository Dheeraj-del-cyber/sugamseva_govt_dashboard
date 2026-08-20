import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { api } from "../api/client";

interface LocationResult {
  display_name: string;
  short_name: string;
  lat?: string;
  lon?: string;
  type?: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

/**
 * Worldwide place search field. Typing any place name (e.g. "Hassan")
 * queries every matching location on earth and lets the user pick the
 * right one (e.g. "Hassan, Karnataka, India") from a dropdown, the same
 * way for any city/town/village anywhere - not just India.
 */
export default function LocationAutocomplete({ label, value, onChange, placeholder, required }: Props) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (text: string) => {
    setQuery(text);
    onChange(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/locations/search", { params: { q: text.trim() } });
        setResults(data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (loc: LocationResult) => {
    setQuery(loc.display_name);
    onChange(loc.display_name);
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block">
        <span className="text-xs font-semibold text-ink-700">
          {label} {required && <span style={{ color: "var(--color-red-600)" }}>*</span>}
        </span>
        <div className="relative mt-1.5">
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder || "Search any city, town or village..."}
            autoComplete="off"
            className="w-full rounded-lg border border-ink-300 pl-9 pr-8 py-2.5 text-sm text-ink-900 placeholder:text-ink-500 focus:border-gov-blue-500 outline-none transition-colors"
            style={{ borderColor: "var(--color-ink-300)" }}
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 animate-spin" />
          )}
        </div>
      </label>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-lg">
          {results.map((loc, idx) => (
            <button
              type="button"
              key={`${loc.lat}-${loc.lon}-${idx}`}
              onClick={() => handleSelect(loc)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-gov-blue-50 transition-colors flex items-start gap-2 border-b border-ink-100 last:border-b-0"
            >
              <MapPin size={13} className="text-gov-blue-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-900 truncate">{loc.short_name || loc.display_name}</p>
                <p className="text-[10px] text-ink-500 truncate">{loc.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-ink-200 bg-white shadow-lg px-3.5 py-2.5">
          <p className="text-xs text-ink-400 italic">No matching location found.</p>
        </div>
      )}
    </div>
  );
}