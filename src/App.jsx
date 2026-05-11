import Hero from './components/Hero.jsx';
import MasterMap from './components/MasterMap.jsx';
import Planner from './components/planner/Planner.jsx';
import { Map, CalendarHeart, Home } from 'lucide-react';

/** Top nav — Master map at #map, planner at #plan */
const nav = [
  { href: '#top',  label: 'Home', icon: Home },
  { href: '#map',  label: 'Map',  icon: Map },
  { href: '#plan', label: 'Plan', icon: CalendarHeart },
];

/** Bottom tab bar — Map opens the trip planner Google map (routes + days), not the master Leaflet map */
const bottomNav = [
  { href: '#top',          label: 'Home', icon: Home },
  { href: '#planner-map',  label: 'Map',  icon: Map },
  { href: '#plan',         label: 'Plan', icon: CalendarHeart },
];

export default function App() {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-maroon focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <a href="#top" className="font-display text-sm font-semibold text-ink sm:text-base">
            HCM · 2026
          </a>
          {/* Desktop nav links only — tablet/mobile uses bottom tab bar */}
          <ul className="hidden lg:flex lg:items-center lg:gap-2">
            {nav.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink/70 transition hover:bg-white hover:text-maroon"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Page content ────────────────────────────────────────────────── */}
      {/* pb-20 on mobile/tablet makes room for the fixed bottom nav */}
      <main id="main" className="pb-20 lg:pb-0">
        <Hero />
        <MasterMap />
        <Planner />
      </main>

      <footer className="border-t border-ink/10 bg-ink py-8 text-center text-sm text-cream/70">
        <p>Babys HCM Trip · May 25–30, 2026 · Built with React, Tailwind & Leaflet</p>
      </footer>

      {/* ── Bottom tab bar (mobile + tablet, hides at desktop 1024px+) ──── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-white/95 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {bottomNav.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest text-ink/40 transition active:scale-95 hover:text-terracotta"
            >
              <Icon className="h-5 w-5" />
              {label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
