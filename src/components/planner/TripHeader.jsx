import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Plane,
  Home,
  ChevronDown,
  ExternalLink,
  MapPin,
  Wallet,
  Smartphone,
  Ticket,
} from 'lucide-react';
import { googleMapsUrl } from '../../utils/kmlParser.js';

const DEPARTURE_MS = new Date('2026-05-25T16:00:00+08:00').getTime();

const AIRBNB = {
  label: 'Four P Home',
  address: '330/15B Đường Phan Đình Phùng, HCMC',
  lat: 10.7986267,
  lng: 106.6810827,
  conf: '6534514126',
};

const FLIGHTS = {
  outbound: {
    code: 'TR516',
    aircraft: 'A321neo',
    from: 'SIN 16:00',
    to: 'SGN 17:15',
    when: 'Mon May 25 · Changi T1 → Tan Son Nhat T2',
    duration: '~2h 15m',
  },
  ret: {
    code: 'TR553',
    aircraft: 'A320',
    from: 'SGN 15:40',
    to: 'SIN 18:45',
    when: 'Sat May 30 · Tan Son Nhat T2 → Changi T1',
    duration: '~2h 5m',
  },
  conf: 'O4CMRB',
};

const APPS = [
  { name: 'TADA',       desc: 'Cheaper taxi rate than Grab' },
  { name: 'Green SM',   desc: 'EV taxi/ride-hail (Vinfast)' },
  { name: 'Sinh SM',    desc: 'Local ride-hail alternative' },
  { name: 'Capichi',    desc: 'Food delivery — better D1/D3 photos than Grab' },
  { name: 'Zalo',       desc: 'Local messaging app' },
  { name: 'Kuli Kuli',  desc: 'Translate signs / handwriting' },
  { name: '12GO',       desc: 'Trains, buses, transfers across Vietnam' },
  { name: 'Moreta Pay', desc: 'Local payment (cards / wallet)' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatCountdown(ms) {
  if (ms <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, live: false };
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  return { days, hours, mins, secs, live: true };
}

/**
 * Compact trip-info card that lives at the top of the planner's left column.
 * Replaces the old full-page Hero — collapses by default to leave room for
 * the itinerary which is the primary content in the Wanderlog layout.
 */
export default function TripHeader() {
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cd = formatCountdown(DEPARTURE_MS - now);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white shadow-sm">
      {/* Always-visible compact header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-cream/40 sm:px-4"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-semibold leading-tight text-ink sm:text-lg">
            Ho Chi Minh City
          </h1>
          <p className="text-[11px] text-ink/55 sm:text-xs">
            May 25 – May 30, 2026 · 6 days
          </p>
        </div>
        <div className="text-right">
          {cd.live ? (
            <>
              <div className="font-display text-xl font-semibold tabular-nums leading-none text-terracotta sm:text-2xl">
                {cd.days}
                <span className="text-[10px] font-medium uppercase tracking-wider text-ink/45">d</span>
                {' '}
                {pad(cd.hours)}
                <span className="text-[10px] font-medium uppercase tracking-wider text-ink/45">h</span>
              </div>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-ink/40">
                til departure
              </p>
            </>
          ) : (
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
              In Vietnam
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Cash warning — always visible (high-priority reminder) */}
      <div className="mx-3 mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 sm:mx-4 sm:mb-4">
        <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-800" />
        <p className="text-[11px] leading-snug text-amber-900">
          <span className="font-bold">Bring CASH.</span>{' '}
          Most stalls & small shops are cash-only. ATMs charge ~₫50k per withdrawal.
        </p>
      </div>

      {/* Expanded essentials */}
      {expanded && (
        <div className="space-y-3 border-t border-ink/8 bg-cream/30 px-3 py-3 sm:px-4 sm:py-4">
          {/* Flights */}
          <div className="rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Plane className="h-3.5 w-3.5 text-maroon" />
              <span className="font-display text-xs font-semibold text-ink">Flights · Scoot</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-maroon/20 bg-maroon/5 px-2 py-0.5 text-[10px] font-semibold text-maroon">
                <Ticket className="h-2.5 w-2.5" />
                {FLIGHTS.conf}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <FlightStrip label="Outbound" data={FLIGHTS.outbound} />
              <FlightStrip label="Return" data={FLIGHTS.ret} />
            </div>
          </div>

          {/* Stay */}
          <div className="rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Home className="h-3.5 w-3.5 text-airbnb" />
              <span className="font-display text-xs font-semibold text-ink">Stay · Airbnb</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-airbnb/20 bg-airbnb/5 px-2 py-0.5 text-[10px] font-semibold text-airbnb">
                <Ticket className="h-2.5 w-2.5" />
                {AIRBNB.conf}
              </span>
            </div>
            <div className="rounded-lg bg-cream/40 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                {AIRBNB.label} · Phú Nhuận
              </div>
              <div className="mt-0.5 text-xs font-medium text-ink">{AIRBNB.address}</div>
              <a
                href={googleMapsUrl(AIRBNB.lat, AIRBNB.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-airbnb hover:underline"
              >
                <MapPin className="h-3 w-3" />
                Open in Maps
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* Apps */}
          <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setAppsOpen((v) => !v)}
              aria-expanded={appsOpen}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-cream/40"
            >
              <Smartphone className="h-3.5 w-3.5 text-terracotta" />
              <span className="font-display text-xs font-semibold text-ink">Apps to download</span>
              <span className="text-[10px] text-ink/45">({APPS.length})</span>
              <ChevronDown
                className={`ml-auto h-3 w-3 text-ink/40 transition-transform ${appsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {appsOpen && (
              <ul className="grid grid-cols-1 gap-1.5 border-t border-ink/8 bg-cream/30 p-2 sm:grid-cols-2">
                {APPS.map((a) => (
                  <li
                    key={a.name}
                    className="rounded-lg border border-ink/8 bg-white px-2 py-1.5"
                  >
                    <div className="text-[11px] font-semibold text-ink">{a.name}</div>
                    <div className="text-[10px] leading-tight text-ink/55">{a.desc}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FlightStrip({ label, data }) {
  return (
    <div className="rounded-lg bg-cream/40 p-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-ink/50">
        {label} · {data.code}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-1 font-display text-sm font-semibold text-ink">
        <span>{data.from}</span>
        <span className="text-ink/40">→</span>
        <span>{data.to}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-ink/50">{data.when}</div>
    </div>
  );
}
