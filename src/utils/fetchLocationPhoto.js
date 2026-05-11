import { PHOTO_OVERRIDES } from './photoOverrides.js';

/**
 * Fetches a photo thumbnail for a location.
 *
 * Priority:
 *  0. Manual override (photoOverrides.js) — never replaced
 *  1. /api/place-photo serverless proxy → Google Places (nearbysearch → findplace) → Foursquare
 *  2. Wikimedia Commons geosearch (coordinate-based)
 *  3. Wikipedia opensearch / full-text search
 */

const cache = new Map(); // key → url | null

// ── Serverless proxy (Google Places + Foursquare, server-side, no CORS) ───────

async function fetchViaProxy(name, lat, lng, placeId) {
  try {
    const params = new URLSearchParams();
    if (name)    params.set('name', name);
    if (lat != null) params.set('lat', String(lat));
    if (lng != null) params.set('lng', String(lng));
    if (placeId) params.set('placeId', placeId);
    const res  = await fetch(`/api/place-photo?${params}`);
    const data = await res.json();
    return data?.url ?? null;
  } catch {
    return null;
  }
}

// ── Wikimedia Commons geosearch ───────────────────────────────────────────────

async function fetchCommonsGeoPhoto(lat, lng, radius = 80) {
  try {
    const geoRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch` +
      `&gscoord=${lat}|${lng}&gsradius=${radius}&gslimit=5&gsnamespace=6&format=json&origin=*`,
    );
    const hits = (await geoRes.json())?.query?.geosearch;
    if (!hits?.length) return null;

    const imgRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query` +
      `&titles=${encodeURIComponent(hits[0].title)}` +
      `&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`,
    );
    const page = Object.values((await imgRes.json())?.query?.pages || {})[0];
    return page?.imageinfo?.[0]?.thumburl ?? null;
  } catch {
    return null;
  }
}

// ── Wikipedia ─────────────────────────────────────────────────────────────────

function isRelevant(title, name) {
  const t = title.toLowerCase();
  const n = name.toLowerCase();
  if (t.includes(n) || n.includes(t)) return true;
  const words = n.split(/[\s/&'""''()\-–—,]+/).filter((w) => w.length >= 3);
  return words.some((w) => t.includes(w));
}

async function fetchWikipediaThumb(title) {
  try {
    const res  = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
      `&prop=pageimages&format=json&pithumbsize=800&origin=*`,
    );
    const page = Object.values((await res.json())?.query?.pages || {})[0];
    return page?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

async function tryWikipedia(name) {
  // Opensearch with HCM context
  const [, t1] = await (
    await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(`${name} Ho Chi Minh`)}&limit=5&format=json&origin=*`,
    )
  ).json();
  const h1 = t1?.find((t) => isRelevant(t, name));
  if (h1) { const u = await fetchWikipediaThumb(h1); if (u) return u; }

  // Opensearch name only
  const [, t2] = await (
    await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=5&format=json&origin=*`,
    )
  ).json();
  const h2 = t2?.find((t) => isRelevant(t, name));
  if (h2) { const u = await fetchWikipediaThumb(h2); if (u) return u; }

  // Full-text search
  const sd = await (
    await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${name} Ho Chi Minh City Vietnam`)}&srlimit=5&srprop=&format=json&origin=*`,
    )
  ).json();
  const h3 = sd?.query?.search?.find((r) => isRelevant(r.title, name));
  if (h3) { const u = await fetchWikipediaThumb(h3.title); if (u) return u; }

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * @param {string}      name     Place display name
 * @param {number|null} lat      Latitude  (optional but improves accuracy)
 * @param {number|null} lng      Longitude (optional but improves accuracy)
 * @param {string|null} placeId  Google Maps place_id — when present, fetches
 *                                the canonical Place Details photo (same as
 *                                Wanderlog), bypassing fuzzy text search.
 */
export async function fetchLocationPhoto(name, lat, lng, placeId = null) {
  // Strategy 0: manual override — always wins
  if (PHOTO_OVERRIDES[name]) return PHOTO_OVERRIDES[name];

  const key = placeId
    ? `pid:${placeId}`
    : (lat != null ? `${name}|${lat}|${lng}` : name);
  if (cache.has(key)) return cache.get(key);
  cache.set(key, null);

  try {
    // Strategy 1: server-side proxy (Place Details → strict findplace → nearby → Foursquare)
    const proxyUrl = await fetchViaProxy(name, lat, lng, placeId);
    if (proxyUrl) { cache.set(key, proxyUrl); return proxyUrl; }

    // Strategy 2: Wikimedia Commons geosearch (coordinate-based)
    if (lat != null && lng != null) {
      const commonsUrl = await fetchCommonsGeoPhoto(lat, lng);
      if (commonsUrl) { cache.set(key, commonsUrl); return commonsUrl; }
    }

    // Strategy 3: Wikipedia (last resort)
    const wikiUrl = await tryWikipedia(name);
    if (wikiUrl) { cache.set(key, wikiUrl); return wikiUrl; }

    cache.set(key, null);
    return null;
  } catch {
    return null;
  }
}
