import { useEffect, useState } from 'react';
import {
  X, MapPin, ExternalLink, Star, Clock, Globe,
} from 'lucide-react';
import { CATEGORY_COLORS, googleMapsUrl } from '../../utils/kmlParser.js';

const CATEGORY_LABEL = {
  clothes:   'Clothes & shopping',
  cafeFood:  'Cafe / Food',
  fun:       'For da funz',
  airbnb:    'Stay · Airbnb',
  nailsLash: 'Nails & Lash',
};

// Friendly labels for Google Places "types" — only show the ones humans care
// about. Wanderlog displays the same kind of tag chips below the write-up.
const TYPE_LABEL = {
  restaurant:           'Restaurant',
  cafe:                 'Café',
  bar:                  'Bar',
  bakery:               'Bakery',
  meal_takeaway:        'Takeaway',
  food:                 'Food',
  tourist_attraction:   'Tourist attraction',
  point_of_interest:    null,
  establishment:        null,
  store:                'Shop',
  shopping_mall:        'Shopping mall',
  clothing_store:       'Clothing',
  beauty_salon:         'Beauty salon',
  hair_care:            'Hair salon',
  spa:                  'Spa',
  lodging:              'Stay',
  park:                 'Park',
  museum:               'Museum',
  art_gallery:          'Art gallery',
  place_of_worship:     'Place of worship',
  buddhist_temple:      'Buddhist temple',
  church:               'Church',
  night_club:           'Nightlife',
};

function proxiedImageUrl(src) {
  if (!src) return null;
  if (src.startsWith('/')) return null;
  if (src.startsWith('/api/image-proxy')) return null;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

// Module-level cache so reopening the same POI doesn't re-fetch
const detailCache = new Map(); // key → { url, detail }

async function fetchPlaceDetail({ placeId, name, lat, lng }) {
  const cacheKey = placeId
    ? `pid:${placeId}`
    : name ? `nm:${name}:${lat ?? ''}:${lng ?? ''}` : null;
  if (!cacheKey) return null;
  if (detailCache.has(cacheKey)) return detailCache.get(cacheKey);

  const params = new URLSearchParams();
  if (placeId) params.set('placeId', placeId);
  if (name)    params.set('name', name);
  if (lat != null) params.set('lat', String(lat));
  if (lng != null) params.set('lng', String(lng));

  try {
    const r = await fetch(`/api/place-photo?${params}`);
    const d = await r.json();
    const out = { url: d?.url ?? null, detail: d?.detail ?? null };
    detailCache.set(cacheKey, out);
    return out;
  } catch {
    return { url: null, detail: null };
  }
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
  const [detail,   setDetail]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [imgState, setImgState] = useState('direct'); // 'direct' | 'proxy' | 'failed'
  const [hoursOpen, setHoursOpen] = useState(false);

  useEffect(() => {
    setPhotoUrl(null);
    setDetail(null);
    setImgState('direct');
    setHoursOpen(false);
    if (!poi) return;
    let cancelled = false;
    setLoading(true);
    fetchPlaceDetail({
      placeId: poi.placeId || null,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
    }).then((d) => {
      if (cancelled) return;
      setPhotoUrl(d?.url || null);
      setDetail(d?.detail || null);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
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

  // Write-up paragraph — Google's editorial_summary takes priority over the
  // locally-curated description.
  const writeUp = detail?.summary || poi.description || null;
  const address = detail?.address || poi.address || null;

  // Tag chips — friendly type labels from Google + our internal category
  const typeChips = (detail?.types || [])
    .map((t) => TYPE_LABEL[t])
    .filter((label, i, arr) => label && arr.indexOf(label) === i)
    .slice(0, 4);

  return (
    <div
      role="dialog"
      aria-label={`Details for ${poi.name}`}
      className="
        pointer-events-auto absolute inset-x-0 bottom-0 z-[600]
        max-h-[65%] overflow-y-auto rounded-t-2xl border-t border-ink/10
        bg-white shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)]
        animate-[slideUp_180ms_ease-out_both]
        lg:bottom-3 lg:left-3 lg:right-3 lg:max-h-[70%] lg:rounded-2xl lg:border lg:shadow-2xl
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

      <div className="flex flex-col gap-3 p-3 sm:flex-row-reverse sm:items-start sm:gap-4 sm:p-4">
        {/* Photo — on desktop sits on the right like Wanderlog */}
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

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-display text-lg font-semibold leading-tight text-ink sm:text-xl">
            <MapPin className="h-4 w-4 shrink-0 text-terracotta" />
            <span className="truncate">{poi.name}</span>
          </h3>

          {/* Write-up — the Wanderlog-style paragraph */}
          {loading && !writeUp ? (
            <p className="mt-2 animate-pulse text-[13px] text-ink/40">
              Loading place description…
            </p>
          ) : writeUp ? (
            <p className="mt-2 text-[13px] leading-relaxed text-ink/75">
              {writeUp}
            </p>
          ) : null}

          {/* Tag chips — category + Google types */}
          {(category || typeChips.length > 0 || poi.time) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {category && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ background: accent }}
                >
                  {CATEGORY_LABEL[category] || category}
                </span>
              )}
              {typeChips.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/65"
                >
                  {label}
                </span>
              ))}
              {poi.time && (
                <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-[11px] font-semibold text-terracotta">
                  {poi.time}
                </span>
              )}
            </div>
          )}

          {/* Rating + price level */}
          {(detail?.rating || detail?.priceLevel) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              {detail?.rating && (
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {detail.rating.toFixed(1)}
                  {detail.ratingCount && (
                    <span className="font-normal text-ink/45">
                      ({detail.ratingCount.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
              {detail?.priceLevel != null && (
                <span className="text-ink/55">
                  {'$'.repeat(Math.max(1, detail.priceLevel))}
                  <span className="text-ink/25">{'$'.repeat(4 - Math.max(1, detail.priceLevel))}</span>
                </span>
              )}
              {detail?.openNow != null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  detail.openNow ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {detail.openNow ? 'Open now' : 'Closed'}
                </span>
              )}
            </div>
          )}

          {/* Address */}
          {(address || (poi.lat != null && poi.lng != null)) && (
            <p className="mt-2 flex items-start gap-1 text-[12px] text-ink/55">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
              <span className="min-w-0 break-words">
                {address || `${poi.lat.toFixed(5)}, ${poi.lng.toFixed(5)}`}
              </span>
            </p>
          )}

          {/* Hours — collapsible weekly schedule */}
          {detail?.hours?.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setHoursOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink/65 hover:text-ink"
              >
                <Clock className="h-3.5 w-3.5" />
                {hoursOpen ? 'Hide hours' : 'Show weekly hours'}
              </button>
              {hoursOpen && (
                <ul className="mt-1 space-y-0.5 pl-5 text-[11px] text-ink/60">
                  {detail.hours.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Action chips — Wanderlog "Open in" rail */}
          <div className="mt-3 flex flex-wrap gap-2">
            <ExternalChip
              href={detail?.googleUrl || googleMapsUrl(poi.lat, poi.lng)}
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
            {detail?.website && (
              <ExternalChip
                href={detail.website}
                label="Website"
                tint="#6b5c54"
                icon={Globe}
              />
            )}
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
