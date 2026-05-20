// Server-side resolver that extracts a Google Maps place_id from a pasted URL.
//
// Why: Wanderlog has no public API, BUT every Wanderlog public place page
// embeds the canonical Google place_id (the same ChIJ… string Google uses) in
// the address link, e.g. `query_place_id=ChIJ4zGFAZpYwokRGUGph3Mf37k`.
//
// So the user can: search Wanderlog → open the right place → paste the URL
// here → we fetch the page server-side (no CORS), regex out the place_id, and
// the rest of the photo pipeline already knows what to do with it.
//
// Also accepts:
//   • Google Maps share URLs that contain `query_place_id=ChIJ…` or
//     `!1s<placeId>` patterns
//   • A bare `ChIJ…` string pasted directly
//
// Returns { placeId, source, name?, photoUrl? } so the UI can render a
// confirmation preview before the user commits the entry.

const GOOGLE_KEY = 'AIzaSyA6R9mIR9kUUWHzi1t9YURFipKS9G5h0tI';

// Google place_ids almost always start with ChIJ; a few legacy/derived IDs
// use other prefixes. Match the broad family.
const PLACE_ID_RE = /\b((?:ChIJ|GhIJ|EkIJ|EhIJ|Ei[A-Za-z0-9_-]{2}|EiI[A-Za-z0-9_-]{2})[A-Za-z0-9_-]{20,})\b/;
// Tighter — only ChIJ — we prefer this when present.
const CHIJ_RE     = /\b(ChIJ[A-Za-z0-9_-]{20,})\b/;
// Google Maps "Feature ID" — a hex pair, NOT a ChIJ place_id, but co-located
// with a place's name + coords in the URL so we can look it up.
const FID_RE      = /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i;

function extractPlaceId(text) {
  if (!text) return null;
  const m = CHIJ_RE.exec(text) || PLACE_ID_RE.exec(text);
  return m ? m[1] : null;
}

// Pull `name`, `lat`, `lng` out of a Google Maps URL such as:
//   https://www.google.com/maps/place/Pizza+4P's/@10.78,106.7,17z/data=!…
// Returns nulls when nothing usable is found.
function parseGoogleMapsUrl(u) {
  try {
    const url     = new URL(u);
    const segs    = url.pathname.split('/').filter(Boolean);
    const placeIx = segs.indexOf('place');
    const rawName = placeIx >= 0 && segs[placeIx + 1] ? segs[placeIx + 1] : null;
    const name    = rawName ? decodeURIComponent(rawName.replace(/\+/g, ' ')) : null;
    // Look for the `@lat,lng,zoom` pattern in either the path or hash.
    const latMatch =
      /[/@](-?\d+\.\d+),(-?\d+\.\d+),/.exec(url.pathname) ||
      /[/@](-?\d+\.\d+),(-?\d+\.\d+),/.exec(url.hash);
    const lat = latMatch ? parseFloat(latMatch[1]) : null;
    const lng = latMatch ? parseFloat(latMatch[2]) : null;
    return { name, lat, lng };
  } catch {
    return { name: null, lat: null, lng: null };
  }
}

// Last-ditch: Google's findplacefromtext can turn a (name + point) into a
// canonical place_id. We use this when the URL has an FID but no ChIJ id.
async function placeIdFromText(name, lat, lng) {
  if (!name) return null;
  const bias = lat != null && lng != null ? `point:${lat},${lng}` : '';
  const u =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(name)}&inputtype=textquery` +
    `&fields=place_id,name,geometry/location` +
    (bias ? `&locationbias=${encodeURIComponent(bias)}` : '') +
    `&key=${GOOGLE_KEY}`;
  try {
    const r = await fetch(u);
    const d = await r.json();
    return d?.candidates?.[0]?.place_id ?? null;
  } catch {
    return null;
  }
}

async function fetchPlaceDetails(placeId) {
  const u =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=name,place_id,photos,formatted_address,geometry/location` +
    `&key=${GOOGLE_KEY}`;
  try {
    const r = await fetch(u);
    const d = await r.json();
    const refs = (d?.result?.photos ?? [])
      .map((p) => p.photo_reference)
      .filter(Boolean);
    return {
      name:     d?.result?.name ?? null,
      address:  d?.result?.formatted_address ?? null,
      lat:      d?.result?.geometry?.location?.lat ?? null,
      lng:      d?.result?.geometry?.location?.lng ?? null,
      photoUrl: refs[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${refs[0]}&key=${GOOGLE_KEY}`
        : null,
    };
  } catch {
    return { name: null, address: null, lat: null, lng: null, photoUrl: null };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'missing url' });

  let trimmed = String(url).trim();

  try {
    // Case 1 — bare place_id pasted directly.
    if (!/^https?:\/\//i.test(trimmed)) {
      const pid = extractPlaceId(trimmed);
      if (!pid) return res.json({ placeId: null, error: 'not a URL or place_id' });
      const det = await fetchPlaceDetails(pid);
      return res.json({ placeId: pid, source: 'direct', ...det });
    }

    // Case 1b — Google Maps short URL: expand the redirect first so the
    // canonical URL (with the FID + place name) is what we work against.
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(trimmed)) {
      try {
        const head = await fetch(trimmed, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (head?.url && head.url !== trimmed) trimmed = head.url;
      } catch { /* keep the short URL and try the regex paths below */ }
    }

    // Case 2 — URL with place_id directly in the querystring or hash.
    // (Some Google Maps share links and Wanderlog deep links have this.)
    const fromUrl = extractPlaceId(trimmed);
    if (fromUrl) {
      const det = await fetchPlaceDetails(fromUrl);
      return res.json({ placeId: fromUrl, source: 'url', ...det });
    }

    // Case 2b — Google Maps URL with only an FID (`!1s0x…:0x…`) and the place
    // name in the path. Reconstruct the place_id via findplacefromtext.
    const isGoogleMaps =
      /(^|\.)google\.[a-z.]+\/maps/i.test(trimmed) ||
      /maps\.app\.goo\.gl/i.test(trimmed);
    if (isGoogleMaps && FID_RE.test(trimmed)) {
      const { name, lat, lng } = parseGoogleMapsUrl(trimmed);
      const pid = await placeIdFromText(name, lat, lng);
      if (pid) {
        const det = await fetchPlaceDetails(pid);
        return res.json({ placeId: pid, source: 'gmaps-fid', ...det });
      }
    }

    // Case 3 — full HTML fetch (Wanderlog place pages embed the ChIJ id in
    // every Google Maps backlink, but not in the URL itself).
    const r = await fetch(trimmed, {
      headers: {
        // Wanderlog returns a stub HTML for non-browser UAs; pretend to be one.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!r.ok) {
      return res.json({ placeId: null, error: `fetch ${r.status}` });
    }
    const html = await r.text();
    const pid  = extractPlaceId(html);
    if (!pid) return res.json({ placeId: null, error: 'no place_id in page' });

    const det = await fetchPlaceDetails(pid);
    return res.json({
      placeId: pid,
      source:  /wanderlog\.com/i.test(trimmed) ? 'wanderlog' : 'page',
      ...det,
    });
  } catch (err) {
    return res.json({ placeId: null, error: String(err?.message || err) });
  }
}
