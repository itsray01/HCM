import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from '@react-google-maps/api';
import { Route } from 'lucide-react';
import { CATEGORY_COLORS } from '../../utils/kmlParser.js';
import { locations, getLocationById } from '../../data/locations.js';

const GOOGLE_KEY    = 'AIzaSyA6R9mIR9kUUWHzi1t9YURFipKS9G5h0tI';
const DEFAULT_CENTER = { lat: 10.785, lng: 106.695 };
const DEFAULT_ZOOM   = 13;

// Clean, warm minimal style — close to Wanderlog
const MAP_STYLES = [
  { elementType: 'geometry',                  stylers: [{ color: '#f2ede8' }] },
  { elementType: 'labels.icon',               stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',          stylers: [{ color: '#6b5c54' }] },
  { elementType: 'labels.text.stroke',        stylers: [{ color: '#f2ede8' }] },
  { featureType: 'administrative.locality',   elementType: 'labels.text.fill',   stylers: [{ color: '#3d2b1f' }] },
  { featureType: 'poi',                       stylers: [{ visibility: 'off' }] },
  { featureType: 'road',                      elementType: 'geometry',            stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial',             elementType: 'geometry',            stylers: [{ color: '#f5ede0' }] },
  { featureType: 'road.highway',              elementType: 'geometry',            stylers: [{ color: '#ead5b0' }] },
  { featureType: 'road.highway',              elementType: 'geometry.stroke',     stylers: [{ color: '#dfc090' }] },
  { featureType: 'transit',                   stylers: [{ visibility: 'off' }] },
  { featureType: 'water',                     elementType: 'geometry',            stylers: [{ color: '#a8c8d8' }] },
  { featureType: 'landscape.natural',         elementType: 'geometry',            stylers: [{ color: '#d8e8c8' }] },
];

const MAP_OPTIONS_BASE = {
  styles:               MAP_STYLES,
  disableDefaultUI:     false,
  zoomControl:          true,
  mapTypeControl:       false,
  streetViewControl:    false,
  fullscreenControl:    true,
  clickableIcons:       false,
};

// ── Icon helpers (data-URL SVGs) ──────────────────────────────────────────────

function numIconUrl(num, color, size = 30) {
  const half = size / 2;
  const fs   = size <= 30 ? 12 : 14;
  const svg  = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${half}" cy="${half}" r="${half - 2}" fill="${color}" stroke="white" stroke-width="2.5"/>` +
    `<text x="${half}" y="${half + 4.5}" text-anchor="middle" fill="white" ` +
    `font-size="${fs}" font-weight="800" font-family="system-ui,sans-serif">${num}</text>` +
    `</svg>`,
  );
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
}

function tearDropUrl(color = '#1F2937', opacity = 0.6) {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="20">` +
    `<path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13C14 3.134 10.866 0 7 0z" fill="${color}" opacity="${opacity}"/>` +
    `<circle cx="7" cy="7" r="2.5" fill="white" opacity="0.9"/>` +
    `</svg>`,
  );
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
}

// Build a Google Maps Icon object — only called after window.google is loaded
function makeGIcon(url, w, h, anchorX, anchorY) {
  const G = window.google.maps;
  return { url, scaledSize: new G.Size(w, h), anchor: new G.Point(anchorX, anchorY) };
}

// ── OSRM road-following route ─────────────────────────────────────────────────

async function fetchOsrmRoute(stops) {
  if (stops.length < 2) return null;
  const coords = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  try {
    const res  = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    );
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    // GeoJSON is [lng, lat] — Google Maps wants { lat, lng }
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return null;
  }
}

// ── Data helper ───────────────────────────────────────────────────────────────

function resolveDayStops(day) {
  if (!day?.stops) return [];
  const result = [];
  let seq = 0;
  for (const stop of day.stops) {
    let lat, lng, locId, color;
    if (stop.lat != null && stop.lng != null) {
      lat = stop.lat; lng = stop.lng; locId = null;
    } else if (stop.locationId) {
      const loc = getLocationById(stop.locationId);
      if (!loc) continue;
      lat = loc.lat; lng = loc.lng; locId = stop.locationId;
      color = CATEGORY_COLORS[loc.category];
    } else {
      continue;
    }
    if (!color) {
      color = stop.type === 'flight'  ? '#6B7280'
            : stop.type === 'airbnb'  ? '#FF5252'
            : CATEGORY_COLORS.cafeFood;
    }
    seq++;
    result.push({ seq, lat, lng, locId, name: stop.label, color, stop });
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlannerMap({
  activeDay,
  focusedLocationId,
  categoryFilter = null,
  // `greedy` = scroll only when cursor is over the map; no "Use Ctrl + scroll"
  // overlay. Parent can still override (e.g. for mobile full-screen view).
  gestureHandling = 'greedy',
  onSelectPoi,
  selectedPoiKey = null,
}) {
  const { isLoaded } = useJsApiLoader({
    id:              'google-map-script',
    googleMapsApiKey: GOOGLE_KEY,
  });

  const dayStops       = useMemo(() => resolveDayStops(activeDay), [activeDay]);
  const activeDayLocIds = useMemo(
    () => new Set(dayStops.map((s) => s.locId).filter(Boolean)),
    [dayStops],
  );

  const [mapRef,    setMapRef]    = useState(null);
  const [routePath, setRoutePath] = useState(null);

  // Fetch road-following route from OSRM (free, no billing needed)
  useEffect(() => {
    setRoutePath(null);
    if (dayStops.length < 2) return;
    let cancelled = false;
    fetchOsrmRoute(dayStops).then((path) => {
      if (!cancelled) setRoutePath(path);
    });
    return () => { cancelled = true; };
  }, [dayStops]);

  // Pan to focused stop
  useEffect(() => {
    if (!mapRef || !focusedLocationId) return;
    const loc = getLocationById(focusedLocationId);
    if (loc) mapRef.panTo({ lat: loc.lat, lng: loc.lng });
  }, [mapRef, focusedLocationId]);

  // Fit map to active day's stops so routes & pins stay in frame (esp. mobile)
  useEffect(() => {
    if (!mapRef || !window.google?.maps) return;
    if (dayStops.length === 0) {
      mapRef.panTo(DEFAULT_CENTER);
      mapRef.setZoom(DEFAULT_ZOOM);
      return;
    }
    if (dayStops.length === 1) {
      mapRef.panTo({ lat: dayStops[0].lat, lng: dayStops[0].lng });
      mapRef.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    for (const s of dayStops) bounds.extend({ lat: s.lat, lng: s.lng });
    const pad = 56;
    mapRef.fitBounds(bounds, pad);
    // Re-run after layout — map container may have just become visible (mobile Map tab)
    const t = window.setTimeout(() => {
      window.google.maps.event.trigger(mapRef, 'resize');
      mapRef.fitBounds(bounds, pad);
    }, 200);
    return () => window.clearTimeout(t);
  }, [mapRef, activeDay?.day, dayStops]);

  const onMapLoad = useCallback((m) => setMapRef(m), []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-ink/10 bg-cream">
        <p className="text-sm text-ink/40">Loading map…</p>
      </div>
    );
  }

  // Forward a click on a marker (background pin or active-day numbered stop) to
  // the parent as a structured POI payload. The PoiPanel consumes this shape.
  function selectBackgroundPoi(loc) {
    onSelectPoi?.({
      key: `loc:${loc.id}`,
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      category: loc.category,
      description: loc.description || null,
      placeId: loc.placeId || null,
      folderName: loc.folderName || null,
    });
  }

  function selectStopPoi({ seq, lat, lng, locId, name, stop }) {
    const loc = locId ? getLocationById(locId) : null;
    onSelectPoi?.({
      key: `stop:${activeDay?.day}:${seq}`,
      seq,
      name,
      lat,
      lng,
      category: loc?.category || (stop.type === 'airbnb' ? 'airbnb' : null),
      description: loc?.description || stop.notes || null,
      placeId: loc?.placeId || stop.placeId || null,
      folderName: loc?.folderName || null,
      stopType: stop.type || null,
      time: stop.time || null,
    });
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-ink/10 shadow-sm">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        options={{ ...MAP_OPTIONS_BASE, gestureHandling }}
        onLoad={onMapLoad}
        onClick={() => onSelectPoi?.(null)}
      >
        {/* ── Background pins ─────────────────────────────────────────────── */}
        {locations.map((loc) => {
          if (activeDayLocIds.has(loc.id)) return null;
          const matchesFilter = !categoryFilter || loc.category === categoryFilter || loc.category === 'airbnb';
          if (!matchesFilter) return null;
          const isAirbnb  = loc.category === 'airbnb';
          const isActive  = selectedPoiKey === `loc:${loc.id}`;
          const tdUrl     = tearDropUrl(
            isAirbnb ? '#FF5252' : '#1F2937',
            isActive ? 1 : (isAirbnb ? 0.85 : 0.55),
          );
          const dim       = isActive ? 20 : 14;
          const h         = isActive ? 28 : 20;
          return (
            <Marker
              key={loc.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              icon={makeGIcon(tdUrl, dim, h, dim / 2, h)}
              zIndex={isActive ? 90 : 1}
              onClick={() => selectBackgroundPoi(loc)}
            />
          );
        })}

        {/* ── Road-following route (OSRM geometry on Google Maps) ────────────── */}
        {routePath && routePath.length >= 2 && (
          <>
            <Polyline
              path={routePath}
              options={{ strokeColor: '#ffffff', strokeWeight: 9, strokeOpacity: 0.55, zIndex: 1 }}
            />
            <Polyline
              path={routePath}
              options={{ strokeColor: '#E8834A', strokeWeight: 5, strokeOpacity: 1, zIndex: 2 }}
            />
          </>
        )}

        {/* ── Numbered markers (active day) ────────────────────────────────── */}
        {dayStops.map((entry) => {
          const { seq, lat, lng, locId, name, color, stop } = entry;
          const isAirbnb = stop.type === 'airbnb';
          const isActive = selectedPoiKey === `stop:${activeDay?.day}:${seq}`;
          const size     = (isAirbnb ? 34 : 30) + (isActive ? 6 : 0);
          const iconUrl  = numIconUrl(seq, color, size);
          return (
            <Marker
              key={`stop-${seq}`}
              position={{ lat, lng }}
              icon={makeGIcon(iconUrl, size, size, size / 2, size / 2)}
              zIndex={(isActive ? 500 : 100) + seq}
              onClick={() => selectStopPoi(entry)}
            />
          );
        })}
      </GoogleMap>

      {/* Day badge */}
      {activeDay && (
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full border border-ink/10 bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-md backdrop-blur">
          <Route className="h-3.5 w-3.5 text-terracotta" />
          Day {activeDay.day} · {activeDay.dateLabel}
        </div>
      )}
    </div>
  );
}
