import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Search,
  X,
  ChevronLeft,
  Check,
  ListFilter,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Home,
  CalendarDays,
  Loader2,
  Globe,
  BookMarked,
  Heart,
} from 'lucide-react';
import { locations } from '../../data/locations.js';
import { CATEGORY_COLORS } from '../../utils/kmlParser.js';
import { searchPlaces } from '../../utils/searchPlaces.js';

const CATEGORY_ICONS = {
  clothes: ShoppingBag,
  cafeFood: UtensilsCrossed,
  fun: Sparkles,
  airbnb: Home,
  nailsLash: Heart,
};

const CATEGORIES = [
  { id: 'cafeFood', label: 'Food Places' },
  { id: 'clothes', label: 'Fashion Shops' },
  { id: 'fun', label: 'For da funz' },
  { id: 'nailsLash', label: 'Nails & Lash' },
];

const DEBOUNCE_MS = 500;

function fuzzyMatch(text, query) {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

/** Debounced Nominatim live search.
 *  Uses a ref-driven state machine to avoid setState-in-effect lint errors. */
function usePlaceSearch(query) {
  const [state, setState] = useState({ onlineResults: [], loading: false, error: null });
  const timerRef = useRef(null);
  const prevQuery = useRef('');

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();

    if (q.length < 2) {
      // Schedule the clear on the next tick so it's not synchronous inside the effect
      timerRef.current = setTimeout(() => {
        setState({ onlineResults: [], loading: false, error: null });
      }, 0);
      return () => clearTimeout(timerRef.current);
    }

    if (q === prevQuery.current) return;

    timerRef.current = setTimeout(async () => {
      prevQuery.current = q;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const results = await searchPlaces(q);
        setState({ onlineResults: results, loading: false, error: null });
      } catch {
        setState({ onlineResults: [], loading: false, error: 'Search failed — check your connection' });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  return state;
}

export default function AddPlaceBar({
  days,
  scheduledLocationIds,
  scheduledLocationDayMap,
  onAddToDay,
  activeFilter,
  onChangeFilter,
}) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [chosen, setChosen] = useState(null);
  const containerRef = useRef(null);

  const { onlineResults, loading, error } = usePlaceSearch(searchOpen ? query : '');

  // KML library local matches — deduplicated against online results
  const onlineNames = new Set(onlineResults.map((r) => r.name.toLowerCase()));
  const localMatches = query.trim().length >= 1
    ? locations
        .filter((l) => l.category !== 'airbnb')
        .filter((l) => fuzzyMatch(l.name, query) || fuzzyMatch(l.folderName, query))
        .filter((l) => !onlineNames.has(l.name.toLowerCase())) // hide if already shown online
        .slice(0, 4)
    : [];

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSearchOpen(false);
        setLabelsOpen(false);
        setChosen(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function reset() {
    setQuery('');
    setChosen(null);
    setSearchOpen(false);
    setLabelsOpen(false);
  }

  function handlePickDay(dayIdx) {
    if (!chosen) return;
    onAddToDay(chosen, dayIdx);
    reset();
  }

  const filterLabel = activeFilter
    ? activeFilter.kind === 'category'
      ? CATEGORIES.find((c) => c.id === activeFilter.id)?.label
      : `Day ${days[activeFilter.id]?.day} · ${days[activeFilter.id]?.dateLabel}`
    : null;

  const showDropdown = searchOpen && (query.trim().length > 0 || !chosen);

  return (
    <div ref={containerRef} className="relative z-40">
      {/* ── Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-2xl border-2 border-terracotta/30 bg-white p-2 shadow-md ring-0 transition focus-within:border-terracotta focus-within:shadow-lg focus-within:ring-2 focus-within:ring-terracotta/20">
        <div className="relative flex flex-1 items-center">
          {loading
            ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 animate-spin text-terracotta" />
            : <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terracotta" />
          }
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); setChosen(null); }}
            onFocus={() => { setSearchOpen(true); setLabelsOpen(false); }}
            placeholder="Search and add a place to your trip…"
            className="w-full rounded-xl bg-transparent py-2 pl-10 pr-8 text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink/50"
            aria-label="Search places to add"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setChosen(null); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/30 hover:bg-ink/5 hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setLabelsOpen((v) => !v); setSearchOpen(false); }}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition ${
            activeFilter || labelsOpen
              ? 'border-terracotta bg-terracotta text-white shadow-sm'
              : 'border-terracotta/30 bg-terracotta/5 text-terracotta hover:bg-terracotta/10'
          }`}
          aria-label="Filter by labels"
          title="Filter by labels"
        >
          <ListFilter className="h-4 w-4" />
        </button>
      </div>

      {/* Active filter chip */}
      {activeFilter && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-ink/50">Filtering:</span>
          <button
            type="button"
            onClick={() => onChangeFilter(null)}
            className="inline-flex items-center gap-1 rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 font-semibold text-terracotta hover:bg-terracotta hover:text-white"
          >
            {filterLabel}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Search dropdown ──────────────────────────────────────── */}
      {showDropdown && !chosen && (
        <div className="absolute left-0 right-0 top-full mt-2 max-h-[420px] overflow-y-auto overscroll-contain rounded-2xl border border-ink/10 bg-white shadow-xl">
          {query.trim().length < 2 ? (
            <SearchHint />
          ) : (
            <>
              {/* Online results */}
              <SectionHeader icon={Globe} label="Web search" loading={loading} />
              {error && (
                <p className="px-4 py-2 text-xs text-red-500">{error}</p>
              )}
              {!loading && onlineResults.length === 0 && !error && (
                <p className="px-4 py-2 pb-3 text-xs text-ink/45">
                  No results found online
                </p>
              )}
              {onlineResults.map((place) => (
                <OnlineResultRow
                  key={place.id}
                  place={place}
                  onPick={() => setChosen(place)}
                />
              ))}

              {/* KML library section */}
              {localMatches.length > 0 && (
                <>
                  <SectionHeader icon={BookMarked} label="Saved library" />
                  {localMatches.map((loc) => (
                    <LibraryResultRow
                      key={loc.id}
                      loc={loc}
                      isScheduled={scheduledLocationIds.has(loc.id)}
                      onPick={() => setChosen({ ...loc, source: 'library' })}
                    />
                  ))}
                </>
              )}

              {onlineResults.length === 0 && localMatches.length === 0 && !loading && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Search className="h-5 w-5 text-ink/30" />
                  <p className="text-sm text-ink/55">No matches — try a different name</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Day picker step */}
      {searchOpen && chosen && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl">
          <DayPickerStep
            location={chosen}
            days={days}
            scheduledDays={scheduledLocationDayMap.get(chosen.id) || []}
            onPick={handlePickDay}
            onBack={() => setChosen(null)}
          />
        </div>
      )}

      {/* ── Labels popover ───────────────────────────────────────── */}
      {labelsOpen && (
        <LabelsPopover
          days={days}
          activeFilter={activeFilter}
          onPick={(filter) => { onChangeFilter(filter); setLabelsOpen(false); }}
        />
      )}
    </div>
  );
}

// ─── Hint shown before typing ────────────────────────────────────────────────

function SearchHint() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5 py-8 text-center">
      <Search className="h-5 w-5 text-ink/25" />
      <p className="text-sm font-semibold text-ink/60">Search for any place</p>
      <p className="text-xs text-ink/40">
        Searches OpenStreetMap live + your saved library
      </p>
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, loading }) {
  return (
    <div className="flex items-center gap-2 border-b border-ink/[0.06] bg-cream/30 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-ink/40" />
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-ink/45">
        {label}
      </span>
      {loading && <Loader2 className="h-3 w-3 animate-spin text-terracotta/60" />}
    </div>
  );
}

// ─── Online (Nominatim) result row ───────────────────────────────────────────

function OnlineResultRow({ place, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-cream/60"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
        <MapPin className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{place.name}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-snug text-ink/50">
          {place.shortAddress}
        </span>
      </span>
    </button>
  );
}

// ─── Saved library result row ─────────────────────────────────────────────────

function LibraryResultRow({ loc, isScheduled, onPick }) {
  const Icon = CATEGORY_ICONS[loc.category] || MapPin;
  const accent = CATEGORY_COLORS[loc.category] || '#888';
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-cream/60"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{loc.name}</span>
        <span className="block truncate text-[11px] text-ink/50">{loc.folderName}</span>
      </span>
      {isScheduled && (
        <span className="shrink-0 rounded-full bg-terracotta/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terracotta">
          In plan
        </span>
      )}
    </button>
  );
}

// ─── Day picker step ──────────────────────────────────────────────────────────

function DayPickerStep({ location, days, scheduledDays, onPick, onBack }) {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-ink/10 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/55 hover:bg-ink/5 hover:text-ink"
          aria-label="Back to search"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">Add to day</p>
          <p className="truncate text-sm font-semibold text-ink">{location.name}</p>
          {location.shortAddress && (
            <p className="truncate text-[11px] text-ink/45">{location.shortAddress}</p>
          )}
        </div>
      </div>
      <ul className="px-2 py-1.5">
        {days.map((day, di) => {
          const already = scheduledDays.includes(day.day);
          return (
            <li key={day.day}>
              <button
                type="button"
                onClick={() => onPick(di)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-cream/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-maroon text-[11px] font-bold text-white shadow-sm">
                  {day.day}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    Day {day.day} · {day.dateLabel}
                  </span>
                  <span className="block truncate text-[11px] text-ink/50">{day.subtitle}</span>
                </span>
                {already && (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <Check className="h-2.5 w-2.5" /> Added
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Labels popover (categories + days) ──────────────────────────────────────

function LabelsPopover({ days, activeFilter, onPick }) {
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-[260px] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl">
      <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink/45">
        Categories
      </div>
      <ul className="px-1.5">
        {CATEGORIES.map((c) => {
          const isActive = activeFilter?.kind === 'category' && activeFilter.id === c.id;
          const Icon = CATEGORY_ICONS[c.id] || MapPin;
          const accent = CATEGORY_COLORS[c.id] || '#888';
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(isActive ? null : { kind: 'category', id: c.id })}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                  isActive ? 'bg-terracotta/10 font-semibold text-terracotta' : 'text-ink/80 hover:bg-cream/60'
                }`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${accent}1A`, color: accent }}
                  aria-hidden
                >
                  <Icon className="h-3 w-3" />
                </span>
                <span className="flex-1 truncate">{c.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-terracotta" />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-1 border-t border-ink/[0.06] px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink/45">
        Days
      </div>
      <ul className="px-1.5 pb-1.5">
        {days.map((day, di) => {
          const isActive = activeFilter?.kind === 'day' && activeFilter.id === di;
          return (
            <li key={day.day}>
              <button
                type="button"
                onClick={() => onPick(isActive ? null : { kind: 'day', id: di })}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                  isActive ? 'bg-terracotta/10 font-semibold text-terracotta' : 'text-ink/80 hover:bg-cream/60'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-terracotta to-maroon text-[10px] font-semibold text-white">
                  {day.day}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{day.dateLabel}</span>
                  <span className="block truncate text-[10px] text-ink/45">{day.subtitle}</span>
                </span>
                {isActive && <Check className="h-3.5 w-3.5 text-terracotta" />}
              </button>
            </li>
          );
        })}
      </ul>

      {activeFilter && (
        <div className="border-t border-ink/[0.06] p-2">
          <button
            type="button"
            onClick={() => onPick(null)}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-cream/60 py-1.5 text-xs font-semibold text-ink/65 hover:bg-cream"
          >
            <CalendarDays className="h-3 w-3" />
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
