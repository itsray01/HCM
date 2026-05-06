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

function namesMatch(candidate, query) {
  if (!candidate || !query) return false;
  const c = normalise(candidate);
  const q = normalise(query);
  if (c.includes(q) || q.includes(c)) return true;
  const words = q.split(' ').filter((w) => w.length >= 3);
  return words.length > 0 && words.some((w) => c.includes(w));
}

function photoUrl(ref) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${GOOGLE_KEY}`;
}

async function tryNearbySearch(name, lat, lng) {
  const clean = cleanName(name);
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&keyword=${encodeURIComponent(clean)}&rankby=distance&key=${GOOGLE_KEY}`;
  const data = await fetch(url).then((r) => r.json());
  for (const place of (data?.results ?? []).slice(0, 5)) {
    if (!namesMatch(place.name, clean)) continue;
    const ref = place.photos?.[0]?.photo_reference;
    if (ref) return photoUrl(ref);
  }
  return null;
}

async function tryFindPlace(name) {
  const clean = cleanName(name);
  const input = encodeURIComponent(`${clean} Ho Chi Minh City Vietnam`);
  const bias  = encodeURIComponent(`circle:5000@${HCM_LAT},${HCM_LNG}`);
  const url =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${input}&inputtype=textquery&fields=photos,name&locationbias=${bias}&key=${GOOGLE_KEY}`;
  const data      = await fetch(url).then((r) => r.json());
  const candidate = data?.candidates?.[0];
  if (!candidate || !namesMatch(candidate.name, clean)) return null;
  const ref = candidate.photos?.[0]?.photo_reference;
  return ref ? photoUrl(ref) : null;
}

async function tryFoursquare(name, lat, lng) {
  const clean     = cleanName(name);
  const centerLat = lat ?? HCM_LAT;
  const centerLng = lng ?? HCM_LNG;
  const searchRes = await fetch(
    `https://api.foursquare.com/v3/places/search` +
    `?query=${encodeURIComponent(clean)}&ll=${centerLat},${centerLng}&radius=500&limit=5&fields=fsq_id,name`,
    { headers: { Authorization: FSQ_KEY } },
  );
  const { results = [] } = await searchRes.json();
  const match = results.find((p) => namesMatch(p.name, clean));
  if (!match) return null;

  const photosRes  = await fetch(
    `https://api.foursquare.com/v3/places/${match.fsq_id}/photos?limit=1`,
    { headers: { Authorization: FSQ_KEY } },
  );
  const photos = await photosRes.json();
  const p      = photos?.[0];
  return p?.prefix && p?.suffix ? `${p.prefix}original${p.suffix}` : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { name, lat, lng } = req.query;
  if (!name) return res.json({ url: null });

  const latNum = lat ? parseFloat(lat) : null;
  const lngNum = lng ? parseFloat(lng) : null;

  try {
    // 1. Google Places Nearby Search (most accurate — same photo as Google Business profile)
    if (latNum && lngNum) {
      const url = await tryNearbySearch(name, latNum, lngNum);
      if (url) return res.json({ url });
    }

    // 2. Google Places Find Place (for stops without GPS coords)
    const findUrl = await tryFindPlace(name);
    if (findUrl) return res.json({ url: findUrl });

    // 3. Foursquare fallback
    const fsqUrl = await tryFoursquare(name, latNum, lngNum);
    if (fsqUrl) return res.json({ url: fsqUrl });

    return res.json({ url: null });
  } catch (err) {
    console.error('[place-photo]', err);
    return res.json({ url: null });
  }
}
