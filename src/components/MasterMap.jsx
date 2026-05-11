import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ExternalLink } from 'lucide-react';
import { locations } from '../data/locations.js';
import { CATEGORY_COLORS, googleMapsUrl } from '../utils/kmlParser.js';

const ZOOM = 13;

// Compute centroid of all pins so the map is always perfectly centered
const CENTER = (() => {
  if (!locations.length) return [10.785, 106.695];
  const lat = locations.reduce((s, l) => s + l.lat, 0) / locations.length;
  const lng = locations.reduce((s, l) => s + l.lng, 0) / locations.length;
  return [lat, lng];
})();

const LABELS = {
  clothes: 'Clothes',
  airbnb: 'Airbnb',
  cafeFood: 'Cafe / Food',
  fun: 'For da funz',
  nailsLash: 'Nails & Lash',
};

export default function MasterMap() {
  return (
    <section id="map" className="scroll-mt-20 border-b border-ink/10 bg-white py-12 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Master map
        </h2>
        <p className="mt-2 max-w-2xl text-ink/60">
          All 72 saved spots, grouped by category. Tap any pin to open it in Google Maps.
        </p>
      </div>

      <div className="relative mx-auto mt-8 max-w-6xl px-0 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-none border-y border-ink/10 shadow-sm sm:rounded-2xl sm:border">
          <MapContainer
            center={CENTER}
            zoom={ZOOM}
            scrollWheelZoom={true}
            className="z-0 h-[min(70vh,560px)] w-full"
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map((loc) => (
              <CircleMarker
                key={loc.id}
                center={[loc.lat, loc.lng]}
                radius={loc.category === 'airbnb' ? 16 : 8}
                pathOptions={{
                  color: loc.category === 'airbnb' ? '#FF5252' : '#fff',
                  weight: loc.category === 'airbnb' ? 3 : 2,
                  fillColor: CATEGORY_COLORS[loc.category] || '#888',
                  fillOpacity: 0.95,
                }}
              >
                <Popup>
                  <div className="min-w-[180px] py-1">
                    <div className="font-sans text-sm font-semibold text-ink">
                      {loc.name}
                    </div>
                    <div className="mt-0.5 text-xs text-ink/50">
                      {LABELS[loc.category] || loc.folderName}
                    </div>
                    <a
                      href={googleMapsUrl(loc.lat, loc.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-cream px-3 py-2 text-xs font-semibold text-ink transition hover:bg-terracotta hover:text-white hover:border-terracotta"
                    >
                      Open in Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Legend — desktop */}
        <div className="pointer-events-none absolute bottom-6 left-6 z-[500] hidden rounded-xl border border-ink/10 bg-white/95 px-4 py-3 text-xs shadow-md backdrop-blur sm:block">
          <div className="font-semibold text-ink">Legend</div>
          <ul className="mt-2 space-y-1.5">
            {Object.entries(LABELS).map(([key, label]) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-ink/10 shadow-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[key] }}
                />
                <span className="text-ink/70">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Legend — mobile */}
      <div className="mx-auto mt-4 max-w-6xl px-4 sm:hidden sm:px-6">
        <div className="flex flex-wrap gap-3 rounded-xl border border-ink/10 bg-white p-3 text-xs shadow-sm">
          {Object.entries(LABELS).map(([key, label]) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-ink/70">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[key] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
