/**
 * Parse Google Earth / Maps KML into a flat list of placemarks with folder → category.
 * KML coordinates are lon,lat[,alt]; Leaflet expects lat,lng.
 */

export const CATEGORY_KEYS = {
  Clothes: 'clothes',
  Airbnb: 'airbnb',
  'Cafe/Food': 'cafeFood',
  'for da funz': 'fun',
};

/** Marker colors aligned with plan */
export const CATEGORY_COLORS = {
  clothes: '#D4A843',
  airbnb: '#FF5252',
  cafeFood: '#880E4F',
  fun: '#0288D1',
  nailsLash: '#E91E63',
};

const FOLDER_TO_CATEGORY = {
  Clothes: 'clothes',
  Airbnb: 'airbnb',
  'Cafe/Food': 'cafeFood',
  'for da funz': 'fun',
};

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56);
}

function extractPlacemarkName(placemarkXml) {
  const cdata = placemarkXml.match(/<name><!\[CDATA\[([\s\S]*?)\]\]><\/name>/);
  if (cdata) return cdata[1].trim();
  const plain = placemarkXml.match(/<name>([^<]*)<\/name>/);
  return plain ? plain[1].trim() : 'Unknown';
}

function extractDescription(placemarkXml) {
  const cdata = placemarkXml.match(
    /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/
  );
  if (cdata) return cdata[1].trim();
  const plain = placemarkXml.match(/<description>([^<]*)<\/description>/);
  return plain ? plain[1].trim() : '';
}

function extractCoordinates(placemarkXml) {
  const m = placemarkXml.match(/<coordinates>\s*([\d.,\-\s]+)\s*<\/coordinates>/);
  if (!m) return null;
  const nums = m[1]
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  const lng = nums[0];
  const lat = nums[1];
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function reservationRequiredForName(name) {
  return (
    /Anan Saigon/i.test(name) ||
    /Pizza\s*4P/i.test(name) ||
    /Mặn Mòi/i.test(name)
  );
}

/**
 * @param {string} kmlString raw KML XML
 * @returns {Array<{
 *   id: string,
 *   name: string,
 *   lat: number,
 *   lng: number,
 *   category: string,
 *   folderName: string,
 *   description: string,
 *   reservationRequired: boolean
 * }>}
 */
export function parseKml(kmlString) {
  const docSlice = kmlString.includes('</Document>')
    ? kmlString.slice(0, kmlString.indexOf('</Document>'))
    : kmlString;

  const locations = [];
  let globalIndex = 0;

  const folderRegex = /<Folder>\s*([\s\S]*?)<\/Folder>/g;
  let folderMatch;

  while ((folderMatch = folderRegex.exec(docSlice)) !== null) {
    const body = folderMatch[1];
    const nameMatch = body.match(/^\s*<name>([^<]*)<\/name>/);
    const folderName = nameMatch ? nameMatch[1].trim() : '';

    const category = FOLDER_TO_CATEGORY[folderName];
    if (!category) continue;

    const placemarkRegex = /<Placemark>\s*([\s\S]*?)<\/Placemark>/g;
    let pmMatch;

    while ((pmMatch = placemarkRegex.exec(body)) !== null) {
      const pmXml = pmMatch[1];
      const name = extractPlacemarkName(pmXml);
      const description = extractDescription(pmXml);
      const coords = extractCoordinates(pmXml);
      if (!coords) continue;

      const slug = slugify(name) || 'place';
      const id = `${category}-${slug}-${globalIndex}`;
      globalIndex += 1;

      locations.push({
        id,
        name,
        lat: coords.lat,
        lng: coords.lng,
        category,
        folderName,
        description,
        reservationRequired: reservationRequiredForName(name),
      });
    }
  }

  return locations;
}

export function googleMapsUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
