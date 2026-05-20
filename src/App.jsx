import Planner from './components/planner/Planner.jsx';
import { Loader2 } from 'lucide-react';

export default function App() {
  return (
    <div className="flex h-[100dvh] flex-col bg-cream/50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-maroon focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* ── Top bar — single thin nav, just trip name. The planner now fills
            the rest of the viewport (Wanderlog-style). ────────────────────── */}
      <header className="shrink-0 border-b border-ink/10 bg-cream/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <a href="#main" className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-ink sm:text-base">
              HCM · 2026
            </span>
            <span className="hidden text-xs text-ink/45 sm:inline">
              May 25 – 30
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="https://wanderlog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-[11px] text-ink/40 hover:text-ink/65 sm:inline"
            >
              · inspired by Wanderlog
            </a>
            <Loader2 className="hidden h-3 w-3 animate-spin text-terracotta/40" aria-hidden />
          </div>
        </div>
      </header>

      {/* ── Main — fills remaining viewport, Planner manages internal scroll ── */}
      <main id="main" className="min-h-0 flex-1">
        <Planner />
      </main>
    </div>
  );
}
