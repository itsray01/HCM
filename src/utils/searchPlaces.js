/**
 * Live place search using Nominatim (OpenStreetMap). No API key required.
 * Results are biased toward Ho Chi Minh City via the viewbox parameter.
 * Rate-limit: 1 req/s per Nominatim ToS — the debounced hook handles this.
 */

const HCM_VIEWBOX = '106.4,11.2,107.1,10.4'; // west,north,east,south

/**
 * @param {string} query
 * @returns {Promise<Array<{id, name, address, shortAddress, lat, lng, type}>>}
 */
export async function searchPlaces(query) {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '8',
    addressdetails: '1',
    extratags: '1',
    namedetails: '1',
    'accept-language': 'en',
    countrycodes: 'vn',
    viewbox: HCM_VIEWBOX,
    bounded: '0', // still show outside viewbox if nothing found inside
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        // Nominatim ToS requires a User-Agent / Referer
        'Accept-Language': 'en',
      },
    }
  );
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();

  return data.map((item) => {
    const namedetail = item.namedetails || {};
    const addr = item.address || {};
    const name =
      namedetail['name:en'] ||
      namedetail.name ||
      item.name ||
      item.display_name.split(',')[0];

    // Build a short human-readable address: road, suburb/quarter, district
    const parts = [
      addr.road || addr.pedestrian || addr.footway,
      addr.suburb || addr.quarter || addr.neighbourhood,
      addr.city_district || addr.district,
    ].filter(Boolean);
    const shortAddress = parts.join(', ') || addr.city || 'Ho Chi Minh City';

    return {
      id: String(item.osm_id),
      name,
      address: item.display_name,
      shortAddress,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.class,
      source: 'online',
    };
  });
}
