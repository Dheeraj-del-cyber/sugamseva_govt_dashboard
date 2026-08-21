import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * list is our own panel: it always opens directly below the field and
 * always renders top-to-bottom in the given order, so it never flips open
 * upward (which is what makes a native <select> look "reversed" when there
 * isn't much room below it, e.g. inside a modal).
 *
 * The panel is rendered through a portal into document.body and positioned
 * with fixed coordinates taken from the field's own bounding box. Panels
 * that live inside a card/modal are otherwise absolutely-positioned
 * relative to that card, which means when the option list is taller than
 * the remaining space in the card it visually spills out past the card's
 * rounded edges. Portaling it — and capping its height to the room that's
 * actually left in the viewport — keeps it looking like a proper floating
 * menu regardless of where it's opened from.
 */
export default function SearchableSelect({ label, value, onChange, options, placeholder, required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 256 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelId = `searchable-select-panel-${useId()}`;

  const updateCoords = () => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    setCoords({
      top: rect.bottom + margin,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(256, spaceBelow)),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !document.getElementById(panelId)?.contains(target)
      ) {
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
        <div className="relative mt-1.5" ref={fieldRef}>
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

      {open &&
        createPortal(
          <div
            id={panelId}
            className="fixed z-50 overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-lg"
            style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: coords.maxHeight }}
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}