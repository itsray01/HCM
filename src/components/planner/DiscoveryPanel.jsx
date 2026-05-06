import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Search,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Home,
  Compass,
  ExternalLink,
  Plus,
  GripVertical,
  Heart,
} from 'lucide-react';
import { locations } from '../../data/locations.js';
import { CATEGORY_COLORS, googleMapsUrl } from '../../utils/kmlParser.js';
import { discoveryDragId } from './plannerIds.js';

const CATEGORY_ICONS = {
  clothes: ShoppingBag,
  cafeFood: UtensilsCrossed,
  fun: Sparkles,
  airbnb: Home,
  nailsLash: Heart,
};

const CATEGORY_LABEL = {
  clothes: 'Clothes',
  cafeFood: 'Cafe / Food',
  fun: 'For da funz',
  airbnb: 'Airbnb',
  nailsLash: 'Nails & Lash',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'clothes', label: 'Clothes' },
  { id: 'cafeFood', label: 'Cafe / Food' },
  { id: 'fun', label: 'For da funz' },
  { id: 'nailsLash', label: 'Nails & Lash' },
];

function DiscoveryItem({ location, scheduledDays, onAddToActive, onFocus, isFocused }) {
  const id = discoveryDragId(location.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id, data: { type: 'discovery', location } });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const Icon = CATEGORY_ICONS[location.category] || Compass;
  const accent = CATEGORY_COLORS[location.category] || '#888';

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onFocus}
      className={`group/item flex items-center gap-2.5 rounded-xl border bg-white p-2.5 shadow-sm transition cursor-pointer ${
        isFocused ? 'border-terracotta/50 ring-2 ring-terracotta/15' : 'border-ink/[0.08] hover:border-terracotta/30 hover:shadow-md'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="-ml-1 flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded text-ink/25 hover:text-ink/60 active:cursor-grabbing"
        aria-label={`Drag ${location.name}`}
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{location.name}</p>
        <p className="truncate text-[11px] text-ink/50">
          {CATEGORY_LABEL[location.category] || location.folderName}
          {scheduledDays?.length > 0 && (
            <span className="ml-1 text-terracotta">
              · Day {scheduledDays.join(', ')}
            </span>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAddToActive(); }}
        className="shrink-0 rounded-full p-1.5 text-ink/40 opacity-0 transition group-hover/item:opacity-100 hover:bg-terracotta/10 hover:text-terracotta"
        title="Add to active day"
        aria-label="Add to active day"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <a
        href={googleMapsUrl(location.lat, location.lng)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 rounded-full p-1.5 text-ink/40 opacity-0 transition group-hover/item:opacity-100 hover:bg-ink/5 hover:text-ink"
        title="Open in Google Maps"
        aria-label="Open in Google Maps"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </li>
  );
}

export default function DiscoveryPanel({
  scheduledLocationIds,
  scheduledLocationDayMap,
  onAddToActive,
  onFocusLocation,
  focusedLocationId,
  categoryOverride = null,
}) {
  const [query, setQuery] = useState('');
  const [internalCategory, setInternalCategory] = useState('all');
  const [hideScheduled, setHideScheduled] = useState(false);

  const category = categoryOverride ?? internalCategory;

  const allAvailable = useMemo(() => locations.filter((loc) => loc.category !== 'airbnb'), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAvailable.filter((loc) => {
      if (category !== 'all' && loc.category !== category) return false;
      if (hideScheduled && scheduledLocationIds.has(loc.id)) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        (loc.description && loc.description.toLowerCase().includes(q)) ||
        loc.folderName.toLowerCase().includes(q)
      );
    });
  }, [query, category, hideScheduled, scheduledLocationIds, allAvailable]);

  const scheduledCount = useMemo(
    () => allAvailable.filter((loc) => scheduledLocationIds.has(loc.id)).length,
    [allAvailable, scheduledLocationIds]
  );

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-maroon/10 text-maroon">
          <Compass className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-ink">
            Discovery library
          </h3>
          <p className="text-xs text-ink/55">
            Drag any pin onto a day, or tap + to add to the active day.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-ink/10 bg-cream/40 py-2 pl-8 pr-2 text-sm text-ink outline-none ring-terracotta/30 placeholder:text-ink/40 focus:bg-white focus:ring-2"
          aria-label="Search locations"
        />
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setInternalCategory(f.id)}
            disabled={Boolean(categoryOverride)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              category === f.id
                ? 'bg-maroon text-white shadow-sm'
                : 'border border-ink/10 bg-white text-ink/65 hover:border-terracotta/30'
            } ${categoryOverride ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {f.label}
          </button>
        ))}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-ink/55 hover:text-ink">
          <input
            type="checkbox"
            checked={hideScheduled}
            onChange={(e) => setHideScheduled(e.target.checked)}
            className="h-3 w-3 rounded border-ink/20 accent-terracotta"
          />
          Hide scheduled
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-ink/50">
          <span className="font-semibold text-ink">{filtered.length}</span>
          {' '}of{' '}
          <span className="font-semibold text-ink">{allAvailable.length}</span>
          {' '}spots
        </p>
        {scheduledCount > 0 && (
          <span className="text-[11px] text-terracotta/70">
            {scheduledCount} in plan
          </span>
        )}
      </div>

      {/* List */}
      <ul className="mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {filtered.map((loc) => (
          <DiscoveryItem
            key={loc.id}
            location={loc}
            scheduledDays={scheduledLocationDayMap.get(loc.id) || []}
            onAddToActive={() => onAddToActive(loc)}
            onFocus={() => onFocusLocation(loc.id)}
            isFocused={focusedLocationId === loc.id}
          />
        ))}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-dashed border-ink/15 bg-cream/30 px-3 py-5 text-center text-xs text-ink/40">
            No matches
          </li>
        )}
      </ul>
    </section>
  );
}
