import Hero from './components/Hero.jsx';
import MasterMap from './components/MasterMap.jsx';
import Planner from './components/planner/Planner.jsx';
import { Map, CalendarHeart, Home } from 'lucide-react';

const nav = [
  { href: '#top', label: 'Home', icon: Home },
  { href: '#map', label: 'Map', icon: Map },
  { href: '#plan', label: 'Plan', icon: CalendarHeart },
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

      <nav className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
          <a href="#top" className="font-display text-sm font-semibold text-ink sm:text-base">
            HCM · 2026
          </a>
          <ul className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            {nav.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-white hover:text-maroon sm:px-3 sm:text-sm"
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main id="main">
        <Hero />
        <MasterMap />
        <Planner />
      </main>

      <footer className="border-t border-ink/10 bg-ink py-8 text-center text-sm text-cream/70">
        <p>Babys HCM Trip · May 25–30, 2026 · Built with React, Tailwind & Leaflet</p>
      </footer>
    </div>
  );
}
