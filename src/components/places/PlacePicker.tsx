import { useEffect, useRef, useState } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  searchPlaces,
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  type Place,
} from '@/lib/places';

/**
 * "Add a place" — the check-in control that rides along with a composer.
 *
 * Deliberately quiet: no results until three characters and a pause, no map,
 * no counts. Picking a place just tags the post you're already writing.
 */
const PlacePicker = ({
  place,
  onChange,
  defaultOpen = false,
}: {
  place: Place | null;
  onChange: (place: Place | null) => void;
  /** Start on the search field (used by the check-in entry point). */
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchPlaces(trimmed);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) {
          setResults([]);
          toast.error("Couldn't look that place up just now.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  if (place) {
    return (
      <div className="flex items-center gap-2 text-sm font-body text-foreground">
        <MapPin size={14} className="text-muted-foreground shrink-0" />
        <span className="truncate">at {place.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 rounded-[3px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Remove place"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapPin size={14} />
        Add a place
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 100))}
          placeholder="Where are you?"
          className="flex-1 bg-transparent border-b border-border font-body text-sm text-foreground outline-none py-1 placeholder:text-muted-foreground/50"
        />
        {searching && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery('');
            setResults([]);
          }}
          className="p-1 rounded-[3px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close place search"
        >
          <X size={12} />
        </button>
      </div>

      {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
        <p className="font-body text-xs text-muted-foreground/70 pl-6">
          A few more letters.
        </p>
      )}

      {results.length > 0 && (
        <ul className="border border-border rounded-[4px] divide-y divide-border overflow-hidden">
          {results.map((r) => (
            <li key={`${r.id ?? r.name}-${r.lat}-${r.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onChange(r);
                  setOpen(false);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
              >
                <span className="block font-body text-sm text-foreground">{r.name}</span>
                {r.address && (
                  <span className="block font-body text-xs text-muted-foreground truncate">
                    {r.address}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching && results.length === 0 && query.trim().length >= MIN_QUERY_LENGTH && (
        <p className="font-body text-xs text-muted-foreground/70 pl-6">
          Nothing by that name.
        </p>
      )}
    </div>
  );
};

export default PlacePicker;
