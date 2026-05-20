import { useEffect, useState } from 'react';
import { X, MapPin, ExternalLink, Star } from 'lucide-react';
import { fetchLocationPhoto } from '../../utils/fetchLocationPhoto.js';
import { CATEGORY_COLORS, googleMapsUrl } from '../../utils/kmlParser.js';

const CATEGORY_LABEL = {
  clothes:   'Clothes & shopping',
  cafeFood:  'Cafe / Food',
  fun:       'For da funz',
  airbnb:    'Stay · Airbnb',
  nailsLash: 'Nails & Lash',
};

function proxiedImageUrl(src) {
  if (!src) return null;
  if (src.startsWith('/')) return null;
  if (src.startsWith('/api/image-proxy')) return null;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

/**
 * Wanderlog-style POI detail panel. Anchored to the bottom of the map column
 * on desktop and rendered as a slide-up sheet on mobile. The parent controls
 * visibility via the `poi` prop (null = hidden).
 *
 * `poi` shape: { name, lat, lng, category, description, placeId?, folderName?,
 *               seq?, stopType?, time?, address? }
 */
export default function PoiPanel({ poi, onClose }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [imgState, setImgState] = useState('direct'); // 'direct' | 'proxy' | 'failed'

  useEffect(() => {
    setPhotoUrl(null);
    setImgState('direct');
    if (!poi) return;
    let cancelled = false;
    fetchLocationPhoto(poi.name, poi.lat, poi.lng, poi.placeId || null)
      .then((url) => { if (!cancelled) setPhotoUrl(url || null); })
      .catch(() => { if (!cancelled) setPhotoUrl(null); });
    return () => { cancelled = true; };
  }, [poi?.name, poi?.lat, poi?.lng, poi?.placeId]);

  if (!poi) return null;

  const category = poi.category || null;
  const accent = category ? CATEGORY_COLORS[category] || '#8b5a3c' : '#8b5a3c';
  const proxied = proxiedImageUrl(photoUrl);
  const renderSrc =
    imgState === 'failed' ? null
  : imgState === 'proxy' && proxied ? proxied
  : photoUrl;

  return (
    <div
      role="dialog"
      aria-label={`Details for ${poi.name}`}
      className="
        pointer-events-auto absolute inset-x-0 bottom-0 z-[600]
        max-h-[55%] overflow-y-auto rounded-t-2xl border-t border-ink/10
        bg-white shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)]
        animate-[slideUp_180ms_ease-out_both]
        lg:bottom-3 lg:left-3 lg:right-3 lg:max-h-[60%] lg:rounded-2xl lg:border lg:shadow-2xl
      "
    >
      {/* Tab strip + close */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-1">
          {['About', 'Photos', 'Map'].map((label, idx) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                idx === 0
                  ? 'bg-terracotta/10 text-terracotta'
                  : 'text-ink/40'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/55 transition hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:p-4">
        {/* Photo */}
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-ink/5 sm:h-32 sm:w-44">
          {renderSrc ? (
            <img
              src={renderSrc}
              alt={poi.name}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => {
                if (imgState === 'direct' && proxied) setImgState('proxy');
                else setImgState('failed');
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink/30">
              <MapPin className="h-7 w-7" />
            </div>
          )}
          {poi.seq != null && (
            <span
              className="absolute left-2 top-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow"
              style={{ background: accent }}
            >
              {poi.seq}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-tight text-ink sm:text-xl">
            {poi.name}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {category && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: accent }}
              >
                {CATEGORY_LABEL[category] || category}
              </span>
            )}
            {poi.time && (
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/65">
                {poi.time}
              </span>
            )}
            {poi.folderName && !category && (
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/65">
                {poi.folderName}
              </span>
            )}
          </div>

          {poi.description && (
            <p className="mt-2 text-[13px] leading-snug text-ink/70">
              {poi.description}
            </p>
          )}

          {(poi.address || (poi.lat != null && poi.lng != null)) && (
            <p className="mt-2 inline-flex items-start gap-1 text-[12px] text-ink/55">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
              <span className="truncate">
                {poi.address || `${poi.lat.toFixed(5)}, ${poi.lng.toFixed(5)}`}
              </span>
            </p>
          )}

          {/* Action chips — Wanderlog uses the same "Open in" rail */}
          <div className="mt-3 flex flex-wrap gap-2">
            <ExternalChip
              href={googleMapsUrl(poi.lat, poi.lng)}
              label="Google Maps"
              tint="#34A853"
            />
            <ExternalChip
              href={`https://www.google.com/search?q=${encodeURIComponent(poi.name + ' Ho Chi Minh City')}`}
              label="Google"
              tint="#4285F4"
            />
            <ExternalChip
              href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(poi.name)}`}
              label="Tripadvisor"
              tint="#00AA6C"
              icon={Star}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExternalChip({ href, label, tint, icon: Icon = ExternalLink }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink/80 shadow-sm transition hover:border-ink/20 hover:bg-ink/[0.03]"
    >
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full"
        style={{ background: tint, color: 'white' }}
      >
        <Icon className="h-2.5 w-2.5" />
      </span>
      {label}
    </a>
  );
}
