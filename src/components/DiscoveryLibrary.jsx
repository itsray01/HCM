import { useMemo, useState } from 'react';
import { Search, LayoutGrid } from 'lucide-react';
import { locations } from '../data/locations.js';
import { locationIdToDays } from '../data/itineraryMeta.js';
import LocationCard from './LocationCard.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'clothes', label: 'Clothes' },
  { id: 'cafeFood', label: 'Cafe / Food' },
  { id: 'fun', label: 'For da funz' },
  { id: 'nailsLash', label: 'Nails & Lash' },
  { id: 'airbnb', label: 'Airbnb' },
];

export default function DiscoveryLibrary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((loc) => {
      if (category !== 'all' && loc.category !== category) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        (loc.description && loc.description.toLowerCase().includes(q)) ||
        loc.folderName.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <section id="library" className="scroll-mt-20 bg-cream py-14 pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <LayoutGrid className="mt-1 h-8 w-8 shrink-0 text-maroon" />
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                Discovery library
              </h2>
              <p className="mt-2 max-w-2xl text-ink/60">
                Search and filter all {locations.length} saved pins. Day tags show
                what&apos;s already on the plan.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            placeholder="Search names or notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-white py-3 pl-11 pr-4 text-sm text-ink shadow-sm outline-none ring-terracotta/30 placeholder:text-ink/40 focus:ring-2"
            aria-label="Search locations"
          />
        </div>

        {/* Category filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCategory(f.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === f.id
                  ? 'bg-maroon text-white shadow-md shadow-maroon/20'
                  : 'border border-ink/10 bg-white text-ink/70 hover:border-terracotta/30 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-ink/60">
          Showing <strong className="text-ink">{filtered.length}</strong> locations
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              dayBadges={locationIdToDays.get(loc.id) || []}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-12 text-center text-ink/60">
            No matches — try another search or category.
          </p>
        )}
      </div>
    </section>
  );
}
