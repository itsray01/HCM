import { MapPin, ExternalLink } from 'lucide-react';
import { CATEGORY_COLORS, googleMapsUrl } from '../utils/kmlParser.js';

const CATEGORY_LABEL = {
  clothes: 'Clothes',
  cafeFood: 'Cafe / Food',
  fun: 'For da funz',
  airbnb: 'Airbnb',
  nailsLash: 'Nails & Lash',
};

export default function LocationCard({ location, dayBadges = [] }) {
  const url = googleMapsUrl(location.lat, location.lng);
  const color = CATEGORY_COLORS[location.category] || '#888';
  const catLabel = CATEGORY_LABEL[location.category] || location.folderName;

  return (
    <article className="flex flex-col rounded-2xl border border-ink/10 bg-white p-4 shadow-sm transition hover:border-terracotta/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold leading-snug text-ink">
          {location.name}
        </h3>
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full border border-ink/10 shadow-sm"
          style={{ backgroundColor: color }}
          title={catLabel}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-ink/10 bg-cream/60 px-2.5 py-0.5 text-xs font-medium text-ink/60">
          {catLabel}
        </span>
        {location.reservationRequired && (
          <span className="rounded-full border border-maroon/25 bg-maroon/[0.07] px-2.5 py-0.5 text-xs font-semibold text-maroon">
            Reservation
          </span>
        )}
        {dayBadges.map((d) => (
          <span
            key={d}
            className="rounded-full border border-terracotta/25 bg-terracotta/[0.08] px-2.5 py-0.5 text-xs font-semibold text-terracotta"
          >
            Day {d}
          </span>
        ))}
      </div>

      {location.description && (
        <p className="mt-2 line-clamp-2 text-sm text-ink/60">{location.description}</p>
      )}

      <div className="mt-auto pt-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 bg-cream/50 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-maroon hover:text-white hover:border-maroon"
        >
          <MapPin className="h-4 w-4" />
          Navigate
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </a>
      </div>
    </article>
  );
}
