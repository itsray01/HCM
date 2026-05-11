import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Plane,
  Home,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Clock,
  GripVertical,
  ExternalLink,
  MapPin,
  Trash2,
  StickyNote,
  CircleDollarSign,
  Hourglass,
  CheckCircle2,
  CircleSlash,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Pencil,
  Heart,
  Car,
  Footprints,
  Users,
} from 'lucide-react';
import { CATEGORY_COLORS, googleMapsUrl } from '../../utils/kmlParser.js';
import { getLocationById } from '../../data/locations.js';
import { PLACE_IDS } from '../../data/placeIds.js';
import { PHOTO_OVERRIDES, FORCE_REFETCH } from '../../utils/photoOverrides.js';
import { fetchLocationPhoto, fetchLocationPhotos } from '../../utils/fetchLocationPhoto.js';
import { usePhotoBlocklist, refFromPhotoUrl } from '../../hooks/usePhotoBlocklist.js';
import { TimePopover } from './TimePicker.jsx';

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

function effectiveCategory(stop, location) {
  if (location?.category) return location.category;
  if (stop.type === 'airbnb') return 'airbnb';
  return null;
}

function effectiveReservationStatus(stop) {
  if (stop.reservationStatus) return stop.reservationStatus;
  if (stop.reservationRequired) return 'pending';
  return null;
}

/** Debounced input/textarea — commits onBlur or after 600ms idle.
 *  Resyncs when the upstream `initial` value changes (Firestore push). */
function useDebouncedValue(initial, onCommit, delayMs = 600) {
  const [val, setVal] = useState(initial ?? '');
  const [prevInitial, setPrevInitial] = useState(initial);
  const timeoutRef = useRef();

  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setVal(initial ?? '');
  }

  function setAndDebounce(next) {
    setVal(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onCommit(next), delayMs);
  }

  function flush() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (val !== (initial ?? '')) onCommit(val);
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return [val, setAndDebounce, flush];
}

// ── Photo cache (localStorage, NOT synced to RTDB) ──────────────────────────
// Photos are derived/cosmetic data — they shouldn't trigger writes to the
// shared database. Each browser fetches & caches its own photos locally.
// This prevents the cascading write loop that was reverting user edits.

// Bumped to v2 when we switched the proxy to strict matching + placeId support,
// so every device re-fetches and shedss the old loose-match photos.
const PHOTO_CACHE_KEY = 'hcm-photo-cache-v2';
const LEGACY_PHOTO_CACHE_KEYS = ['hcm-photo-cache-v1'];

function photoCacheLoad() {
  try {
    const raw = localStorage.getItem(PHOTO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function photoCacheSave(cache) {
  try { localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

// One-time migration: drop any legacy caches so users get the new, stricter results.
try {
  for (const k of LEGACY_PHOTO_CACHE_KEYS) localStorage.removeItem(k);
} catch { /* noop */ }

// Cache by placeId when we have one (canonical), otherwise by label.
function photoCacheKey(label, placeId) {
  return placeId ? `pid:${placeId}` : `name:${label}`;
}

function photoCacheGet(label, placeId) {
  const k = photoCacheKey(label, placeId);
  if (!k) return null;
  return photoCacheLoad()[k] ?? null;
}

function photoCacheSet(label, placeId, url) {
  const k = photoCacheKey(label, placeId);
  if (!k || !url) return;
  const cache = photoCacheLoad();
  cache[k] = url;
  photoCacheSave(cache);
}

/** Auto-fetches a photo thumbnail for the stop.
 *  Priority order:
 *    1. Manual override (PHOTO_OVERRIDES const)
 *    2. localStorage cache (per-browser, populated by previous fetches)
 *    3. Legacy stop.photoUrl from RTDB (if not stale) — read-only, never written
 *    4. API fetch -> save to localStorage (NEVER to RTDB)
 *  This intentionally never calls onUpdateField, so it cannot trigger RTDB writes. */
function useAutoPhoto(stop, location) {
  // Resolve a canonical Google place_id from three places, in order:
  //   1. The linked Location's placeId (KML/extras + PLACE_IDS map)
  //   2. The stop's own placeId (manually set on add-from-search)
  //   3. PLACE_IDS keyed by the stop's label — handles itinerary stops that
  //      have `locationId: null` but a name we've still resolved.
  const placeId =
    location?.placeId ?? stop.placeId ?? PLACE_IDS[stop.label] ?? null;
  const [autoUrl, setAutoUrl] = useState(() => photoCacheGet(stop.label, placeId));
  const [loading, setLoading] = useState(false);
  const fetchedForRef = useRef(null);

  const override = PHOTO_OVERRIDES[stop.label] ?? null;

  // Legacy: stop.photoUrl was previously written to RTDB. We still read it as
  // a fallback, but treat known-bad sources as stale so we re-fetch locally.
  const storedUrl = stop.photoUrl ?? null;
  const isStale = storedUrl
    ? (
        storedUrl.includes('wikimedia.org') ||
        storedUrl.includes('wikipedia.org') ||
        storedUrl.includes('maps.googleapis.com/maps/api/place/photo') ||
        storedUrl.includes('foursquare.com') ||
        FORCE_REFETCH.has(stop.label)
      )
    : false;

  const fromLegacy = isStale ? null : storedUrl;
  const rawPersisted = override ?? autoUrl ?? fromLegacy;
  const lat = location?.lat ?? stop.lat ?? null;
  const lng = location?.lng ?? stop.lng ?? null;

  // If the user has hidden the chosen photo for this place, swap to the first
  // un-hidden alternative from Place Details. Overrides are exempt — they're
  // manually set and should win.
  const { isHidden, blocklist } = usePhotoBlocklist();
  const [altUrl, setAltUrl] = useState(null);
  const altUrlFor = useRef(null);

  useEffect(() => {
    setAltUrl(null);                 // reset when stop or placeId changes
    altUrlFor.current = null;
  }, [stop.label, placeId]);

  const currentRef = refFromPhotoUrl(rawPersisted);
  const persistedIsBlocked =
    !override && placeId && currentRef && isHidden(placeId, currentRef);

  useEffect(() => {
    if (!persistedIsBlocked) return;
    const key = `${placeId}|${currentRef}`;
    if (altUrlFor.current === key) return;
    altUrlFor.current = key;

    let cancelled = false;
    fetchLocationPhotos(placeId, stop.label, lat, lng).then((urls) => {
      if (cancelled) return;
      const pick = urls.find((u) => {
        const r = refFromPhotoUrl(u);
        return r && !isHidden(placeId, r);
      });
      if (pick) setAltUrl(pick);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedIsBlocked, blocklist, placeId, currentRef]);

  const persisted = persistedIsBlocked ? (altUrl ?? null) : rawPersisted;

  useEffect(() => {
    if (rawPersisted && !persistedIsBlocked) return; // already have a good photo
    const name = stop.label;
    const fetchKey = `${name}|${placeId ?? ''}`;
    if (!name || fetchedForRef.current === fetchKey) return;
    fetchedForRef.current = fetchKey;

    let cancelled = false;
    setLoading(true);
    fetchLocationPhoto(name, lat, lng, placeId).then((url) => {
      if (cancelled) return;
      setLoading(false);
      if (url) {
        setAutoUrl(url);
        photoCacheSet(name, placeId, url);   // local-only; no RTDB write
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop.label, placeId]);

  return { photoUrl: persisted, loading: !persisted && loading, placeId };
}

export default function PlannerCard({
  stop,
  seqNumber,
  dragAttributes,
  dragListeners,
  onUpdateField,
  onDelete,
  onFocus,
  isFocused,
  isDragOverlay = false,
}) {
  const location = stop.locationId ? getLocationById(stop.locationId) : null;
  const category = effectiveCategory(stop, location);
  const Icon = stop.type === 'flight' ? Plane : (CATEGORY_ICONS[category] || MapPin);
  const accent = stop.type === 'flight' ? '#880E4F' : (CATEGORY_COLORS[category] || '#888');
  const reservation = effectiveReservationStatus(stop);
  // External stops (added from online search) store coords directly on the stop
  const mapsUrl = location
    ? googleMapsUrl(location.lat, location.lng)
    : (stop.lat && stop.lng ? googleMapsUrl(stop.lat, stop.lng) : null);

  const { photoUrl, loading: photoLoading, placeId: placeIdForLightbox } = useAutoPhoto(stop, location);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editingPicker, setEditingPicker] = useState(null); // null | 'time'
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const notesRef = useRef(null);

  function openPicker(kind, e) {
    e.stopPropagation();
    setPickerAnchor(e.currentTarget.getBoundingClientRect());
    setEditingPicker(kind);
  }
  function closePicker() {
    setEditingPicker(null);
    setPickerAnchor(null);
  }

  const [notes, setNotes, flushNotes] = useDebouncedValue(
    stop.notes ?? stop.note ?? '',
    (v) => onUpdateField({ notes: v })
  );

  // Auto-grow the notes textarea to fit all content (no internal scroll).
  // useLayoutEffect runs before paint, so the box is always the right size on
  // first render — no scrollbar flash. Re-fires whenever `notes` changes
  // (mount, Firebase sync, local edits). A ResizeObserver also re-fits on
  // width changes (window resize, drawer toggling, mobile rotation), since
  // wrapping changes the required height.
  useLayoutEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    // iOS Safari measures scrollHeight before web fonts paint — re-fit once fonts land.
    if (document?.fonts?.ready) document.fonts.ready.then(fit).catch(() => {});
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(el);
    }
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      if (ro) ro.disconnect();
    };
  }, [notes]);
  const [costStr, setCostStr, flushCost] = useDebouncedValue(
    stop.cost != null ? String(stop.cost) : '',
    (v) => {
      const num = parseFloat(v);
      onUpdateField({ cost: Number.isFinite(num) ? num : 0 });
    }
  );

  function handleReservationCycle(target) {
    if (reservation === target) {
      onUpdateField({ reservationStatus: null });
    } else {
      onUpdateField({ reservationStatus: target });
    }
  }

  return (
    <>
    <article
      onClick={onFocus}
      className={`group relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition ${
        isFocused
          ? 'border-terracotta/60 ring-2 ring-terracotta/20'
          : 'border-ink/[0.08] hover:-translate-y-px hover:shadow-md'
      } ${isDragOverlay ? 'rotate-1 shadow-2xl' : ''}`}
      style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
    >
      <header className="flex items-start gap-3">
        {dragListeners && (
          <button
            type="button"
            {...dragAttributes}
            {...dragListeners}
            onClick={(e) => e.stopPropagation()}
            className="-ml-1 flex h-10 w-7 shrink-0 cursor-grab items-center justify-center rounded text-ink/25 transition hover:text-ink/60 active:cursor-grabbing sm:h-7 sm:w-5"
            aria-label="Drag to reorder"
            tabIndex={-1}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Numbered pin badge */}
        <NumberedPin accent={accent} number={seqNumber} icon={!seqNumber ? Icon : null} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="min-w-0 break-words font-display text-base font-semibold text-ink">
              {stop.label}
            </h3>
            {category && (
              <span className="text-[11px] font-medium text-ink/45">
                {CATEGORY_LABEL[category]}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {stop.time ? (
              <button
                type="button"
                onClick={(e) => openPicker('time', e)}
                className="inline-flex items-center gap-1 rounded-full bg-ink/[0.04] px-2 py-0.5 text-[11px] font-medium text-ink/65 transition hover:bg-terracotta/10 hover:text-terracotta"
                title="Edit time"
              >
                <Clock className="h-2.5 w-2.5" />
                {stop.time}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => openPicker('time', e)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/15 px-2 py-0.5 text-[11px] font-medium text-ink/35 transition hover:border-terracotta/40 hover:text-terracotta"
                title="Set time"
              >
                <Clock className="h-2.5 w-2.5" />
                Set time
              </button>
            )}
            {stop.travel && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                stop.travel === 'Walk'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {stop.travel === 'Walk'
                  ? <Footprints className="h-2.5 w-2.5" />
                  : <Car className="h-2.5 w-2.5" />
                }
                {stop.travel}
                {stop.distance && ` · ${stop.distance}`}
              </span>
            )}
          </div>
        </div>

        {/* Photo thumbnail */}
        <PhotoThumb
          photoUrl={photoUrl}
          loading={photoLoading}
          label={stop.label}
          accent={accent}
          icon={Icon}
          onOpen={(e) => { e.stopPropagation(); if (photoUrl) setLightboxOpen(true); }}
          onCorrect={(url) => onUpdateField({ photoUrl: url })}
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Remove this stop from the plan?')) onDelete();
          }}
          className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/35 transition hover:bg-red-50 hover:text-red-600 active:bg-red-50 active:text-red-600 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Remove stop"
        >
          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
      </header>

      {/* Reservation toggle */}
      {(stop.reservationRequired || reservation || stop.bookingUrl) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink/80">
            Reservation
          </span>
          <div className="flex overflow-hidden rounded-full border border-ink/10 bg-cream/40 text-xs sm:text-[11px]">
            <ResStatusBtn
              active={reservation === 'pending'}
              onClick={(e) => { e.stopPropagation(); handleReservationCycle('pending'); }}
              icon={Hourglass}
              label="Pending"
              activeBg="bg-yellow-400 text-yellow-900 font-bold"
            />
            <ResStatusBtn
              active={reservation === 'confirmed'}
              onClick={(e) => { e.stopPropagation(); handleReservationCycle('confirmed'); }}
              icon={CheckCircle2}
              label="Confirmed"
              activeBg="bg-emerald-500 text-white font-bold"
            />
            {!stop.reservationRequired && reservation && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUpdateField({ reservationStatus: null }); }}
                className="flex items-center gap-1 px-3 py-2 text-ink/45 hover:bg-ink/5 sm:px-2 sm:py-1"
                aria-label="Clear reservation status"
              >
                <CircleSlash className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              </button>
            )}
          </div>
          {stop.bookingUrl && (
            <a
              href={stop.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full border border-maroon/30 bg-maroon/5 px-2 py-0.5 text-[11px] font-semibold text-maroon hover:bg-maroon hover:text-white"
            >
              Book <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}

      {/* Group tag — only for place stops */}
      {stop.type === 'place' && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-ink/80 sm:text-[11px]">Who</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-1">
            {[
              { value: null,      label: 'Everyone',        Icon: Users,    active: 'bg-terracotta text-white border-terracotta' },
              { value: 'parents', label: 'Parents',         Icon: Heart,    active: 'bg-amber text-white border-amber' },
              { value: 'gf-bff',  label: 'Pei Qi + Celine', Icon: Sparkles, active: 'bg-maroon text-white border-maroon' },
            ].map(({ value, label, Icon: TagIcon, active }) => {
              const current = stop.group ?? null;
              const isActive = current === value;
              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onUpdateField({ group: value }); }}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold transition active:scale-95 sm:px-2 sm:py-0.5 sm:text-[11px] ${
                    isActive
                      ? active
                      : 'border-ink/10 bg-white text-ink/40 hover:border-ink/20 hover:text-ink/65'
                  }`}
                >
                  {TagIcon && <TagIcon className="h-3 w-3 sm:h-2.5 sm:w-2.5" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink/45 sm:text-[11px]">
          <StickyNote className="h-3 w-3" /> Notes
        </label>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={flushNotes}
            onClick={(e) => e.stopPropagation()}
            rows={4}
            placeholder="Add a note…"
            className="mt-1 w-full resize-none rounded-lg border border-ink/10 bg-cream/30 px-2.5 py-2 text-sm leading-relaxed text-ink/90 outline-none ring-terracotta/30 placeholder:text-ink/35 focus:bg-white focus:ring-2"
            style={{
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
              maxWidth: '100%',
              overflow: 'hidden',
              minHeight: '6.5rem',
            }}
          />
      </div>

      {/* Bottom row: cost + maps button */}
      <footer className="flex items-stretch gap-2">
        <label className="relative flex flex-1 items-center" onClick={(e) => e.stopPropagation()}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 sm:left-2.5">
            <CircleDollarSign className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={costStr}
            onChange={(e) => setCostStr(e.target.value)}
            onBlur={flushCost}
            placeholder="0"
            className="w-full rounded-lg border border-ink/10 bg-cream/30 py-2.5 pl-9 pr-2 text-sm tabular-nums text-ink outline-none ring-terracotta/30 placeholder:text-ink/30 focus:bg-white focus:ring-2 sm:py-1.5 sm:pl-8"
            aria-label="Estimated cost"
          />
        </label>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-maroon active:bg-maroon sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <MapPin className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            Maps
            <ExternalLink className="h-3.5 w-3.5 opacity-70 sm:h-3 sm:w-3" />
          </a>
        )}
      </footer>

      {stop.detail && stop.type === 'flight' && (
        <p className="mt-1 text-xs text-ink/55">{stop.detail}</p>
      )}
    </article>

    {lightboxOpen && photoUrl && createPortal(
      <PhotoLightbox
        firstSrc={photoUrl}
        label={stop.label}
        placeId={placeIdForLightbox}
        name={stop.label}
        lat={stop.lat ?? location?.lat ?? null}
        lng={stop.lng ?? location?.lng ?? null}
        onClose={() => setLightboxOpen(false)}
      />,
      document.body
    )}

    {editingPicker === 'time' && (
      <TimePopover
        value={stop.time}
        anchorRect={pickerAnchor}
        onCancel={closePicker}
        onCommit={(v) => {
          onUpdateField({ time: v });
          closePicker();
        }}
      />
    )}
  </>
  );
}

// ─── Numbered pin badge ──────────────────────────────────────────────────────

function NumberedPin({ accent, number, icon: Icon }) {
  return (
    <div className="relative shrink-0" aria-hidden style={{ width: 32, height: 38 }}>
      <svg viewBox="0 0 32 38" className="absolute inset-0 h-full w-full drop-shadow-sm">
        <path
          d="M16 1 C7.16 1 1 7.16 1 15 C1 24 16 37 16 37 C16 37 31 24 31 15 C31 7.16 24.84 1 16 1 Z"
          fill={accent}
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-start justify-center pt-[5px] text-white">
        {number != null ? (
          <span className="font-display text-[12px] font-bold leading-none">{number}</span>
        ) : Icon ? (
          <Icon className="h-3.5 w-3.5" />
        ) : null}
      </div>
    </div>
  );
}

// ─── Photo thumbnail ─────────────────────────────────────────────────────────
// Click photo → lightbox. Hover → pencil icon to correct a wrong URL.

function PhotoThumb({ photoUrl, loading, label, accent, icon: Icon, onOpen, onCorrect }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  function openEdit(e) {
    e.stopPropagation();
    setDraft(photoUrl ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  function commitEdit(e) {
    e?.stopPropagation();
    const trimmed = draft.trim();
    onCorrect(trimmed || null);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-ink/10 bg-cream/40">
        <Loader2 className="h-4 w-4 animate-spin text-ink/30" />
      </div>
    );
  }

  if (editing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 z-20 flex w-[230px] flex-col gap-1.5 rounded-xl border border-ink/15 bg-white p-2 shadow-xl"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">Correct photo URL</p>
        <input
          ref={inputRef}
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit(e);
            if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); }
          }}
          placeholder="https://…"
          className="w-full rounded-md border border-ink/15 bg-cream/30 px-2 py-1 text-xs text-ink outline-none ring-terracotta/30 placeholder:text-ink/35 focus:bg-white focus:ring-2"
        />
        <div className="flex justify-end gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(false); }}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-ink/55 hover:bg-ink/5">Cancel</button>
          <button type="button" onClick={commitEdit}
            className="rounded-md bg-terracotta px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-terracotta/90">Save</button>
        </div>
      </div>
    );
  }

  if (photoUrl) {
    return (
      <div className="group/photo relative shrink-0">
        <button
          type="button"
          onClick={onOpen}
          title={`View photo of ${label}`}
          className="block h-14 w-14 overflow-hidden rounded-xl border border-ink/10 bg-cream/40 transition hover:ring-2 hover:ring-terracotta/50"
          aria-label={`View photo of ${label}`}
        >
          <img
            src={photoUrl}
            alt={label}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </button>
        {/* Pencil correction icon — always visible on touch, hover-only on desktop */}
        <button
          type="button"
          onClick={openEdit}
          title="Correct this photo"
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink/50 shadow ring-1 ring-ink/10 transition hover:text-terracotta active:text-terracotta sm:-right-1.5 sm:-top-1.5 sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover/photo:opacity-100"
          aria-label="Correct photo"
        >
          <Pencil className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
        </button>
      </div>
    );
  }

  // Placeholder — category-coloured tile with icon, pencil to add a photo
  return (
    <div className="group/photo relative shrink-0">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-xl border"
        style={{ backgroundColor: `${accent}18`, borderColor: `${accent}30` }}
        aria-hidden
      >
        {Icon
          ? <Icon className="h-5 w-5" style={{ color: accent }} />
          : <span className="font-display text-lg font-bold" style={{ color: accent }}>
              {label?.[0]?.toUpperCase() ?? '?'}
            </span>
        }
      </div>
      <button
        type="button"
        onClick={openEdit}
        title="Add a photo URL"
        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink/50 shadow ring-1 ring-ink/10 transition hover:text-terracotta active:text-terracotta sm:-right-1.5 sm:-top-1.5 sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover/photo:opacity-100"
        aria-label="Add photo"
      >
        <Pencil className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
      </button>
    </div>
  );
}

// ─── Full-screen lightbox ─────────────────────────────────────────────────────
// Wanderlog-style: large hero photo, prev/next arrows, thumbnail strip below.
// Multi-photo gallery is only shown when we have a canonical Google place_id
// (or can resolve one strictly) — never fuzzy results, to avoid showing wrong
// images. When no placeId is available, falls back to the single firstSrc photo.

function PhotoLightbox({ firstSrc, label, placeId, name, lat, lng, onClose }) {
  const { isHidden, hide } = usePhotoBlocklist();

  // Source-of-truth list, before applying the hide-filter.
  const [allPhotos, setAllPhotos] = useState([firstSrc]);
  const [idx,       setIdx]       = useState(0);
  const [loading,   setLoading]   = useState(!!placeId || !!name);

  useEffect(() => {
    let cancelled = false;
    if (!placeId && !name) { setLoading(false); return; }
    fetchLocationPhotos(placeId, name, lat, lng).then((urls) => {
      if (cancelled) return;
      setLoading(false);
      if (urls && urls.length > 0) {
        const rest = urls.filter((u) => u !== firstSrc);
        setAllPhotos([firstSrc, ...rest].slice(0, 5));
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  // Visible photos = full set minus user-hidden ones.
  const photos = placeId
    ? allPhotos.filter((u) => {
        const r = refFromPhotoUrl(u);
        return !r || !isHidden(placeId, r);
      })
    : allPhotos;

  const count    = photos.length;
  const hasMulti = count > 1;

  // Clamp idx if visible set shrinks (after hide).
  useEffect(() => {
    if (idx >= count && count > 0) setIdx(count - 1);
  }, [count, idx]);

  function handleHideCurrent() {
    if (!placeId) return;
    const url = photos[idx];
    const ref = refFromPhotoUrl(url);
    if (!ref) return;
    hide(placeId, ref);
    if (count <= 1) onClose();
  }

  function go(delta) {
    setIdx((i) => (i + delta + count) % count);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft'  && hasMulti) go(-1);
      if (e.key === 'ArrowRight' && hasMulti) go(+1);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMulti, count]);

  // Preload neighbours so prev/next is instant.
  useEffect(() => {
    if (!hasMulti) return;
    [(idx + 1) % count, (idx - 1 + count) % count].forEach((i) => {
      const img = new Image();
      img.src = photos[i];
    });
  }, [idx, photos, count, hasMulti]);

  // After hiding the last visible photo we close the lightbox; until the
  // close handler fires, render a safe fallback.
  if (count === 0) return null;
  const current = photos[Math.min(idx, count - 1)];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        {placeId && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleHideCurrent(); }}
            className="flex h-9 items-center gap-1.5 rounded-full bg-black/50 px-3 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-rose-500/80"
            aria-label="Hide this photo"
            title="Hide this photo — wrong subject? Click to remove it from the gallery."
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hide photo</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
          aria-label="Close photo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {hasMulti && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 sm:left-6"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(+1); }}
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 sm:right-6"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        className="relative flex max-h-[78vh] w-auto max-w-[92vw] items-center justify-center overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current}
          alt={label}
          className="block max-h-[78vh] w-auto max-w-[92vw] object-contain"
        />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-3 pt-10">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-base font-semibold text-white">{label}</p>
            {hasMulti && (
              <span className="font-mono text-xs text-white/70">{idx + 1} / {count}</span>
            )}
          </div>
        </div>
      </div>

      {hasMulti && (
        <div
          className="mt-3 flex gap-2 px-3"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                i === idx
                  ? 'border-white shadow-lg'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
              aria-label={`Photo ${i + 1}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {loading && !hasMulti && (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading photos…
        </div>
      )}
    </div>
  );
}

function ResStatusBtn({ active, onClick, icon: Icon, label, activeBg }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-2.5 font-semibold transition sm:px-2.5 sm:py-1 ${active ? activeBg : 'text-ink/55 hover:bg-ink/5 active:bg-ink/5'}`}
    >
      <Icon className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
      {label}
    </button>
  );
}
