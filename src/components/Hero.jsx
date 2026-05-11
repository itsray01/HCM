import { useEffect, useState } from 'react';
import {
  Clock,
  MapPin,
  Plane,
  ExternalLink,
  CalendarDays,
  Wallet,
  Smartphone,
  ChevronDown,
  Ticket,
  Home,
} from 'lucide-react';
import { googleMapsUrl } from '../utils/kmlParser.js';

const DEPARTURE_MS = new Date('2026-05-25T16:00:00+08:00').getTime();

const AIRBNB = {
  label: 'Four P Home',
  address: '330/15B Đường Phan Đình Phùng, HCMC',
  lat: 10.7986267,
  lng: 106.6810827,
};

const APPS = [
  { name: 'TADA',       desc: 'Cheaper taxi rate than Grab' },
  { name: 'Green SM',   desc: 'EV taxi/ride-hail (Vinfast)' },
  { name: 'Sinh SM',    desc: 'Local ride-hail alternative' },
  { name: 'Capichi',    desc: 'Food delivery — better D1/D3 photos & reviews than Grab' },
  { name: 'Zalo',       desc: 'Messaging app — locals use this, not WhatsApp' },
  { name: 'Kuli Kuli',  desc: 'Translate signs, handwriting & identify products' },
  { name: '12GO',       desc: 'Book trains, buses, transfers across Vietnam' },
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

export default function Hero() {
  const [now, setNow] = useState(() => Date.now());
  const [appsOpen, setAppsOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = DEPARTURE_MS - now;
  const cd = formatCountdown(remaining);

  const airbnbMaps = googleMapsUrl(AIRBNB.lat, AIRBNB.lng);
  const flightStatus = 'https://flightstatus.flyscoot.com/';

  return (
    <header
      id="top"
      className="relative border-b border-ink/10 bg-gradient-to-br from-cream via-white to-[#f0ebe3]"
      style={{ overflow: 'hidden', contain: 'paint' }}
    >
      {/*
        Ambient glows — kept fully inside container (no negative right/left)
        so iOS Safari's non-clipping of blur filters can't cause horizontal overflow.
      */}
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 -translate-y-1/2 translate-x-1/3 rounded-full bg-terracotta/10 blur-[80px]" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 translate-y-1/3 -translate-x-1/4 rounded-full bg-maroon/10 blur-[60px]" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8">

        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-ink/50 shadow-sm backdrop-blur sm:mb-4">
          <CalendarDays className="h-3.5 w-3.5 text-terracotta" strokeWidth={2} />
          May 25 – May 30, 2026
        </p>

        <h1 className="font-display text-[2.5rem] font-semibold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Ho Chi Minh City
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink/60 sm:mt-3 sm:text-base">
          Six days · one dashboard — flights, stay, map, and every saved pin.
        </p>

        {/* ── Cash warning ─────────────────────────────────────────────── */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-3 shadow-sm sm:mt-6 sm:px-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-800 sm:h-9 sm:w-9">
            <Wallet className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900">Must bring CASH!</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80">
              Most local food stalls, markets and small shops are cash-only. ATMs charge ~₫50,000 per withdrawal, so bring SGD and exchange in HCMC for the best rate.
            </p>
          </div>
        </div>

        {/* ── Countdown ────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-4 gap-2 sm:mt-10 sm:gap-3">
          {[
            ['Days',  cd.days],
            ['Hours', cd.hours],
            ['Mins',  cd.mins],
            ['Secs',  cd.secs],
          ].map(([label, val]) => (
            <div
              key={label}
              className="rounded-2xl border border-ink/10 bg-white px-1.5 py-4 text-center shadow-sm sm:px-3 sm:py-4"
            >
              <div className="font-display text-3xl font-semibold tabular-nums text-ink sm:text-3xl sm:text-4xl">
                {pad(val)}
              </div>
              <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50 sm:mt-1.5 sm:text-xs">
                {label}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-ink/55 sm:mt-3 sm:text-sm">
          <Clock className="h-3.5 w-3.5 shrink-0 text-terracotta sm:h-4 sm:w-4" />
          {cd.live
            ? 'Until departure from Changi (TR516 · 16:00 SIN)'
            : 'Trip window — enjoy HCMC!'}
        </p>

        {/* ── Flight strip ─────────────────────────────────────────────── */}
        <div className="mt-5 min-w-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:mt-10 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Plane className="h-4 w-4 text-maroon sm:h-5 sm:w-5" />
            <span className="font-display text-base font-semibold text-ink sm:text-lg">Flights</span>
            <span className="rounded-full border border-ink/10 bg-cream/60 px-2.5 py-0.5 text-xs font-medium text-ink/50">
              Scoot
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-maroon/20 bg-maroon/5 px-2.5 py-1 text-xs font-semibold text-maroon">
              <Ticket className="h-3 w-3" />
              Conf #O4CMRB
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {/* Outbound */}
            <div className="min-w-0 rounded-xl border border-ink/8 bg-cream/40 p-3 sm:p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                Outbound · TR516 · A321neo
              </div>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-1.5 font-display text-xl font-semibold text-ink sm:mt-2 sm:gap-2 sm:text-2xl">
                <span>SIN 16:00</span>
                <span className="text-ink/40">→</span>
                <span>SGN 17:15</span>
              </div>
              <div className="mt-1 text-xs text-ink/50">
                Mon May 25 · Changi T1 → Tan Son Nhat T2 · ~2h 15m
              </div>
            </div>
            {/* Return */}
            <div className="min-w-0 rounded-xl border border-ink/8 bg-cream/40 p-3 sm:p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                Return · TR553 · A320
              </div>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-1.5 font-display text-xl font-semibold text-ink sm:mt-2 sm:gap-2 sm:text-2xl">
                <span>SGN 15:40</span>
                <span className="text-ink/40">→</span>
                <span>SIN 18:45</span>
              </div>
              <div className="mt-1 text-xs text-ink/50">
                Sat May 30 · Tan Son Nhat T2 → Changi T1 · ~2h 5m
              </div>
            </div>
          </div>
        </div>

        {/* ── Stay ─────────────────────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:mt-5 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
            <Home className="h-4 w-4 text-airbnb sm:h-5 sm:w-5" />
            <span className="font-display text-base font-semibold text-ink sm:text-lg">Stay</span>
            <span className="rounded-full border border-ink/10 bg-cream/60 px-2.5 py-0.5 text-xs font-medium text-ink/50">
              Airbnb
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-airbnb/20 bg-airbnb/5 px-2.5 py-1 text-xs font-semibold text-airbnb">
              <Ticket className="h-3 w-3" />
              Conf #6534514126
            </span>
          </div>
          <div className="rounded-xl border border-ink/8 bg-cream/40 p-3 sm:p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Four P Home · Phú Nhuận
            </div>
            <div className="mt-1 font-display text-base font-semibold text-ink sm:mt-1.5 sm:text-lg">
              {AIRBNB.address}
            </div>
            <div className="mt-1 text-xs text-ink/50">
              Mon May 25 — Sat May 30 · Reservation under Pei Qi & Ms Quek
            </div>
          </div>
        </div>

        {/* ── Quick links ──────────────────────────────────────────────── */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:flex-wrap">
          <a
            href={airbnbMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-4 text-sm font-medium text-ink/70 shadow-sm transition hover:border-airbnb/40 hover:shadow-md active:border-airbnb/40 sm:min-w-[200px] sm:flex-1 sm:px-4 sm:py-3"
          >
            <MapPin className="h-4 w-4 text-airbnb" />
            <span>Open in Maps</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-ink/40" />
          </a>
          <a
            href={flightStatus}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-4 text-sm font-medium text-ink/70 shadow-sm transition hover:border-maroon/40 hover:shadow-md active:border-maroon/40 sm:min-w-[200px] sm:flex-1 sm:px-4 sm:py-3"
          >
            <Plane className="h-4 w-4 text-maroon" />
            <span className="truncate">Scoot flight status</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-ink/40" />
          </a>
        </div>

        {/* ── Apps to download ─────────────────────────────────────────── */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm sm:mt-5">
          <button
            type="button"
            onClick={() => setAppsOpen((v) => !v)}
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-cream/40 active:bg-cream/40 sm:px-5 sm:py-4"
            aria-expanded={appsOpen}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta sm:h-9 sm:w-9">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-semibold text-ink sm:text-base">
                Apps to download
              </div>
              <div className="text-xs text-ink/55">
                {APPS.length} essentials for getting around HCMC
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${appsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {appsOpen && (
            <ul className="grid gap-2 border-t border-ink/8 bg-cream/30 p-3 sm:grid-cols-2 sm:p-4">
              {APPS.map((a) => (
                <li
                  key={a.name}
                  className="rounded-xl border border-ink/8 bg-white px-3 py-2.5 shadow-sm"
                >
                  <div className="text-sm font-semibold text-ink">{a.name}</div>
                  <div className="mt-0.5 text-xs leading-snug text-ink/55">{a.desc}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}
