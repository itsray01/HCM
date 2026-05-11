// Server-side photo proxy. This is the same approach Wanderlog uses: given a
// Google Maps "place_id" (canonical, owner-curated), fetch the official Place
// Details photo. When no place_id is known, fall back to a strict text search
// rather than the loose "nearbysearch + any-keyword-match" we had before.
//
// Strategy order:
//   0. Direct lookup by place_id              (Place Details, exact)
//   1. Strict findplacefromtext + point bias  (Google's textquery, name must match)
//   2. Nearby search                          (last-resort, strict name match)
//   3. Foursquare                             (fallback for places Google doesn't index)

const GOOGLE_KEY = 'AIzaSyA6R9mIR9kUUWHzi1t9YURFipKS9G5h0tI';
const FSQ_KEY    = 'V0ULF5VY5A4AE3VQRK4ZBMSGTKRBYX5SQKHQFUVDHZF5RGDI';
const HCM_LAT    = 10.7769;
const HCM_LNG    = 106.7009;

// Strip parenthetical hints e.g. "Mặn Mòi (Tao Đàn)" → "Mặn Mòi"
function cleanName(name) {
  return name.replace(/\s*[([（【][^\])[）】]*[\])）】]/g, '').trim();
}

function normalise(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strict: every meaningful word of the query must appear in the candidate name.
// This rejects e.g. "Oasis Spa" when querying "Oasis Cafe".
function strictMatch(candidate, query) {
  if (!candidate || !query) return false;
  const c = normalise(candidate);
  const q = normalise(query);
  if (c === q || c.includes(q) || q.includes(c)) return true;
  const qWords = q.split(' ').filter((w) => w.length >= 3);
  if (!qWords.length) return false;
  // ALL words ≥3 chars must be present
  return qWords.every((w) => c.includes(w));
}

function distMeters(aLat, aLng, bLat, bLng) {
  if (aLat == null || bLat == null) return Infinity;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function photoUrl(ref) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${GOOGLE_KEY}`;
}

// 0. Canonical lookup via place_id — same data Wanderlog uses.
//    Returns { url, urls } — `url` is the first photo, `urls` is up to 10.
async function tryPlaceDetails(placeId) {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=photos,name,place_id` +
    `&key=${GOOGLE_KEY}`;
  const data  = await fetch(url).then((r) => r.json());
  const refs  = (data?.result?.photos ?? [])
    .map((p) => p.photo_reference)
    .filter(Boolean);
  if (!refs.length) return null;
  const urls = refs.map(photoUrl);
  return { url: urls[0], urls };
}

// 1. Stricter text search with POINT bias. Returns { url, placeId, distance } so
//    the caller can decide whether to trust it.
async function tryFindPlace(name, lat, lng) {
  const clean = cleanName(name);
  const input = encodeURIComponent(`${clean} Ho Chi Minh City Vietnam`);
  // Point bias is stricter than circle — Google heavily prefers the exact pt.
  const bias =
    lat != null && lng != null
      ? `point:${lat},${lng}`
      : `circle:5000@${HCM_LAT},${HCM_LNG}`;
  const url =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${input}&inputtype=textquery` +
    `&fields=photos,name,place_id,geometry/location` +
    `&locationbias=${encodeURIComponent(bias)}&key=${GOOGLE_KEY}`;
  const data = await fetch(url).then((r) => r.json());
  const cand = data?.candidates?.[0];
  if (!cand || !strictMatch(cand.name, clean)) return null;
  const cLat = cand.geometry?.location?.lat;
  const cLng = cand.geometry?.location?.lng;
  const dist = distMeters(lat, lng, cLat, cLng);
  // If we have coords, require the result to be within ~1.5 km of the
  // requested point. KML pins can be a couple blocks off, but a Google
  // result kilometres away is almost certainly a name-collision pickup.
  if (lat != null && dist > 1500) return null;
  const ref = cand.photos?.[0]?.photo_reference;
  if (!ref) return null;
  return { url: photoUrl(ref), placeId: cand.place_id ?? null, dist };
}

// 2. Last resort — scan nearby, strict name match only.
async function tryNearbySearch(name, lat, lng) {
  const clean = cleanName(name);
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&radius=300&keyword=${encodeURIComponent(clean)}` +
    `&key=${GOOGLE_KEY}`;
  const data = await fetch(url).then((r) => r.json());
  for (const place of (data?.results ?? []).slice(0, 8)) {
    if (!strictMatch(place.name, clean)) continue;
    const ref = place.photos?.[0]?.photo_reference;
    if (ref) return { url: photoUrl(ref), placeId: place.place_id ?? null };
  }
  return null;
}

async function tryFoursquare(name, lat, lng) {
  const clean     = cleanName(name);
  const centerLat = lat ?? HCM_LAT;
  const centerLng = lng ?? HCM_LNG;
  const searchRes = await fetch(
    `https://api.foursquare.com/v3/places/search` +
    `?query=${encodeURIComponent(clean)}&ll=${centerLat},${centerLng}&radius=300&limit=5&fields=fsq_id,name`,
    { headers: { Authorization: FSQ_KEY } },
  );
  const { results = [] } = await searchRes.json();
  const match = results.find((p) => strictMatch(p.name, clean));
  if (!match) return null;

  const photosRes = await fetch(
    `https://api.foursquare.com/v3/places/${match.fsq_id}/photos?limit=1`,
    { headers: { Authorization: FSQ_KEY } },
  );
  const photos = await photosRes.json();
  const p      = photos?.[0];
  return p?.prefix && p?.suffix ? { url: `${p.prefix}original${p.suffix}` } : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { name, lat, lng, placeId, resolve, multi } = req.query;
  const wantMulti = multi === '1';

  const latNum = lat ? parseFloat(lat) : null;
  const lngNum = lng ? parseFloat(lng) : null;

  try {
    // Resolve a placeId first when we don't already have one, so multi-photo
    // requests still work for stops we've never canonical-IDed.
    let effectivePid = placeId || null;
    if (!effectivePid && name) {
      const fp = await tryFindPlace(name, latNum, lngNum);
      if (fp?.placeId) effectivePid = fp.placeId;
    }

    // 0. Canonical lookup — Place Details. The ONLY path that returns multi.
    if (effectivePid) {
      const det = await tryPlaceDetails(effectivePid);
      if (det) {
        return res.json({
          url:     det.url,
          urls:    wantMulti ? det.urls.slice(0, 5) : undefined,
          placeId: effectivePid,
          source:  'place_details',
        });
      }
    }

    if (!name) return res.json({ url: null });

    // Multi mode is strict — if we can't get a canonical placeId, don't fall
    // back to fuzzy results (they might be wrong).
    if (wantMulti) return res.json({ url: null, urls: [] });

    // 1. Strict text search with point bias
    const fp = await tryFindPlace(name, latNum, lngNum);
    if (fp) {
      if (resolve === '1') {
        return res.json({
          url: fp.url, placeId: fp.placeId, dist: fp.dist, source: 'findplace',
        });
      }
      return res.json({ url: fp.url, placeId: fp.placeId, source: 'findplace' });
    }

    // 2. Nearby search (strict name)
    if (latNum && lngNum) {
      const nb = await tryNearbySearch(name, latNum, lngNum);
      if (nb) {
        return res.json({ url: nb.url, placeId: nb.placeId, source: 'nearby' });
      }
    }

    // 3. Foursquare
    const fsq = await tryFoursquare(name, latNum, lngNum);
    if (fsq) return res.json({ url: fsq.url, source: 'foursquare' });

    return res.json({ url: null });
  } catch (err) {
    console.error('[place-photo]', err);
    return res.json({ url: null });
  }
}
