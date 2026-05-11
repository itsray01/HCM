import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  AlarmClock,
  MoveLeft,
  TriangleAlert,
  ChevronRight,
  CalendarDays,
  Receipt,
  Search,
  X,
  Loader2,
  MapPin,
  Globe,
  BookMarked,
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
  Heart,
} from 'lucide-react';
import PlannerCard from './PlannerCard.jsx';
import { dayCostTotal, formatCurrency } from './budgetUtils.js';
import { stopId, dayDroppableId } from './plannerIds.js';
import { locations } from '../../data/locations.js';
import { CATEGORY_COLORS } from '../../utils/kmlParser.js';
import { searchPlaces } from '../../utils/searchPlaces.js';

const CATEGORY_ICONS = {
  clothes: ShoppingBag,
  cafeFood: UtensilsCrossed,
  fun: Sparkles,
  nailsLash: Heart,
};

const DEBOUNCE_MS = 500;

function usePlaceSearch(query, enabled) {
  const [state, setState] = useState({ onlineResults: [], loading: false, error: null });
  const timerRef = useRef(null);
  const prevQuery = useRef('');

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 2) {
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
        setState({ onlineResults: [], loading: false, error: 'Search failed' });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [query, enabled]);

  return state;
}

function InlineAddStop({ dayIdx, onAdd, scheduledLocationIds }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const { onlineResults, loading, error } = usePlaceSearch(query, open);

  const onlineNames = new Set(onlineResults.map((r) => r.name.toLowerCase()));
  const localMatches = query.trim().length >= 1
    ? locations
        .filter((l) => l.category !== 'airbnb')
        .filter((l) =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          (l.folderName || '').toLowerCase().includes(query.toLowerCase())
        )
        .filter((l) => !onlineNames.has(l.name.toLowerCase()))
        .slice(0, 5)
    : [];

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function handlePick(place) {
    onAdd(place);
    setOpen(false);
    setQuery('');
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 py-3.5 text-sm font-semibold text-ink/40 transition hover:border-terracotta/40 hover:text-terracotta active:border-terracotta/40 active:text-terracotta sm:py-2.5 sm:text-xs"
      >
        <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        Add stop
      </button>
    );
  }

  const showDropdown = query.trim().length > 0 || loading;

  return (
    <div ref={containerRef} className="relative mt-3" onClick={(e) => e.stopPropagation()}>
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-xl border border-terracotta/40 bg-white px-3 py-2 shadow-sm ring-2 ring-terracotta/10">
        {loading
          ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-terracotta/60" />
          : <Search className="h-3.5 w-3.5 shrink-0 text-ink/40" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search HCM / Saigon…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-ink/30 hover:text-ink"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); setQuery(''); }}
          className="text-ink/30 hover:text-ink"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[50vh] overflow-y-auto overscroll-contain rounded-xl border border-ink/10 bg-white shadow-xl sm:max-h-[320px]">
          {query.trim().length < 2 ? (
            <p className="px-4 py-3 text-xs text-ink/40">Type at least 2 characters…</p>
          ) : (
            <>
              {/* Online results */}
              <div className="flex items-center gap-1.5 border-b border-ink/[0.06] bg-cream/30 px-3 py-1.5">
                <Globe className="h-3 w-3 text-ink/40" />
                <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-ink/45">Web search</span>
                {loading && <Loader2 className="h-3 w-3 animate-spin text-terracotta/60" />}
              </div>
              {error && <p className="px-4 py-2 text-xs text-red-500">{error}</p>}
              {!loading && onlineResults.length === 0 && !error && (
                <p className="px-4 py-2 text-xs text-ink/40">No online results</p>
              )}
              {onlineResults.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handlePick({ ...place, source: 'online' })}
                  className="flex w-full items-start gap-3 px-3 py-2 text-left transition hover:bg-cream/60"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-terracotta/10 text-terracotta">
                    <MapPin className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{place.name}</span>
                    <span className="block truncate text-[11px] text-ink/50">{place.shortAddress}</span>
                  </span>
                </button>
              ))}

              {/* Library results */}
              {localMatches.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 border-b border-ink/[0.06] bg-cream/30 px-3 py-1.5">
                    <BookMarked className="h-3 w-3 text-ink/40" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">Saved library</span>
                  </div>
                  {localMatches.map((loc) => {
                    const Icon = CATEGORY_ICONS[loc.category] || MapPin;
                    const accent = CATEGORY_COLORS[loc.category] || '#888';
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handlePick({ ...loc, source: 'library' })}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-cream/60"
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${accent}1A`, color: accent }}
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{loc.name}</span>
                          <span className="block truncate text-[11px] text-ink/50">{loc.folderName}</span>
                        </span>
                        {scheduledLocationIds?.has(loc.id) && (
                          <span className="shrink-0 rounded-full bg-terracotta/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terracotta">
                            In plan
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {onlineResults.length === 0 && localMatches.length === 0 && !loading && (
                <div className="py-6 text-center text-xs text-ink/40">No matches — try a different name</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SortableStop({ id, stop, dayIdx, stopIdx, seqNumber, onUpdateField, onDelete, onFocus, isFocused }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: 'stop', dayIdx, stopIdx } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <PlannerCard
        stop={stop}
        seqNumber={seqNumber}
        dragAttributes={attributes}
        dragListeners={listeners}
        onUpdateField={onUpdateField}
        onDelete={onDelete}
        onFocus={onFocus}
        isFocused={isFocused}
      />
    </li>
  );
}

export default function DayBucket({
  day,
  dayIdx,
  isActive,
  onActivate,
  onEditDay,
  onAddPlace,
  onUpdateStopField,
  onDeleteStop,
  focusedStopId,
  onFocusStop,
  scheduledLocationIds,
  sectionRef,
}) {
  const droppableId = dayDroppableId(dayIdx);
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'day', dayIdx },
  });

  const stops = day.stops || [];
  const stopIds = stops.map((_, i) => stopId(dayIdx, i));
  const subtotal = dayCostTotal(day);
  const isEarlyWake = day.wakeUp && parseInt(day.wakeUp) < 8;

  // Merge the droppable ref and the scroll-observer ref
  function mergedRef(el) {
    setNodeRef(el);
    if (sectionRef) sectionRef(el);
  }

  return (
    <section
      ref={mergedRef}
      onClick={onActivate}
      className={`relative min-w-0 rounded-2xl border bg-white p-4 shadow-sm transition ${
        isActive ? 'border-terracotta/50 ring-2 ring-terracotta/15' : 'border-ink/[0.08]'
      } ${isOver ? 'border-terracotta bg-terracotta/[0.03] ring-2 ring-terracotta/30' : ''}`}
    >
      {/* Day header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEditDay(); }}
          className="group/header flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition hover:bg-cream/40 active:bg-cream/40 -mx-2 px-2 py-2 sm:py-1"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-maroon font-display text-sm font-semibold text-white shadow-sm">
            {day.day}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">
                Day {day.day}
              </h3>
              <span className="text-xs font-medium text-ink/45">{day.dateLabel}</span>
            </div>
            <p className="truncate text-xs font-medium text-terracotta">{day.subtitle}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink/25 transition group-hover/header:translate-x-0.5 group-hover/header:text-terracotta" />
        </button>
      </div>

      {/* Wake / back / subtotal row */}
      <div className="mb-4 flex flex-wrap gap-2">
        {isEarlyWake ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-[11px] font-semibold text-amber">
            <TriangleAlert className="h-3 w-3" />
            Early · {day.wakeUp}
          </span>
        ) : day.wakeUp ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-terracotta/25 bg-terracotta/[0.08] px-2.5 py-1 text-[11px] font-semibold text-terracotta">
            <AlarmClock className="h-3 w-3" />
            {day.wakeUp}
          </span>
        ) : null}
        {day.returnTime && (
          <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-cream/60 px-2.5 py-1 text-[11px] font-semibold text-ink/55">
            <MoveLeft className="h-3 w-3" />
            {day.returnTime}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-ink/10 bg-cream/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink/65">
          <Receipt className="h-3 w-3" />
          $ {formatCurrency(subtotal)}
        </span>
      </div>

      {/* Stops */}
      <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {stops.length === 0 && !isOver && (
            <li className="rounded-xl border border-dashed border-ink/15 bg-cream/30 px-4 py-6 text-center text-xs text-ink/40">
              <CalendarDays className="mx-auto mb-1 h-5 w-5 opacity-50" />
              Drop a place here, or use Add stop below
            </li>
          )}
          {stops.map((stop, stopIdx) => {
            // Sequence-number only the place stops; flights/airbnb keep the category icon.
            // Computed inline so each card gets its index among preceding place stops.
            const seqNumber = stop.type === 'place'
              ? stops.slice(0, stopIdx + 1).filter((s) => s.type === 'place').length
              : null;
            return (
              <SortableStop
                key={stopId(dayIdx, stopIdx)}
                id={stopId(dayIdx, stopIdx)}
                stop={stop}
                dayIdx={dayIdx}
                stopIdx={stopIdx}
                seqNumber={seqNumber}
                onUpdateField={(partial) => onUpdateStopField(dayIdx, stopIdx, partial)}
                onDelete={() => onDeleteStop(dayIdx, stopIdx)}
                onFocus={() => onFocusStop(stop.locationId || null)}
                isFocused={Boolean(stop.locationId) && stop.locationId === focusedStopId}
              />
            );
          })}
        </ul>
      </SortableContext>

      {/* Add stop */}
      <InlineAddStop
        dayIdx={dayIdx}
        onAdd={onAddPlace}
        scheduledLocationIds={scheduledLocationIds}
      />
    </section>
  );
}
