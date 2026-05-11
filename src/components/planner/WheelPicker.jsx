import { useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const ITEM_H = 36;
const VISIBLE = 5;
const PAD_ROWS = Math.floor(VISIBLE / 2);

/** Apple-alarm-style scroll wheel.
 *  Renders a fixed-height (VISIBLE * ITEM_H px) scrolling column where the row
 *  centered behind the selection band becomes the active value. Spacer rows
 *  above/below let the first and last options reach the band.
 *
 *  Props:
 *    options    : number[]                — values to choose from (e.g. [0..23])
 *    value      : number                  — current selection (must be in options)
 *    onChange   : (n: number) => void     — fired when the user settles on a new value
 *    format?    : (n: number) => string   — render override (defaults to String(n))
 *    ariaLabel  : string
 */
export default function WheelPicker({
  options,
  value,
  onChange,
  format = (n) => String(n),
  ariaLabel,
}) {
  const scrollerRef = useRef(null);
  const settleTimer = useRef(null);
  const programmaticScroll = useRef(false);

  const activeIdx = Math.max(0, options.indexOf(value));

  /** Scroll the chosen index into the center band. */
  function scrollToIndex(idx, behavior = 'smooth') {
    const el = scrollerRef.current;
    if (!el) return;
    programmaticScroll.current = behavior === 'smooth';
    el.scrollTo({ top: idx * ITEM_H, behavior });
    if (behavior !== 'smooth') {
      // for instant jumps, drop the suppression flag right away
      programmaticScroll.current = false;
    } else {
      window.setTimeout(() => { programmaticScroll.current = false; }, 350);
    }
  }

  // Sync scroll position when value changes externally (e.g. on first mount).
  useEffect(() => {
    scrollToIndex(activeIdx, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commitFromScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.min(options.length - 1, Math.max(0, idx));
    const next = options[clamped];
    // snap exactly to the chosen row even if the scroll position drifted
    if (Math.abs(el.scrollTop - clamped * ITEM_H) > 0.5) {
      programmaticScroll.current = true;
      el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
      window.setTimeout(() => { programmaticScroll.current = false; }, 250);
    }
    if (next !== value) onChange(next);
  }

  function handleScroll() {
    if (programmaticScroll.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(commitFromScroll, 110);
  }

  function step(delta) {
    const next = Math.min(options.length - 1, Math.max(0, activeIdx + delta));
    if (next === activeIdx) return;
    onChange(options[next]);
    scrollToIndex(next, 'smooth');
  }

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const heightPx = VISIBLE * ITEM_H;
  const padPx = PAD_ROWS * ITEM_H;

  return (
    <div className="relative select-none" style={{ height: heightPx, width: 76 }}>
      {/* Selection band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 rounded-lg bg-terracotta/[0.08] ring-1 ring-terracotta/25"
        style={{ top: padPx, height: ITEM_H }}
        aria-hidden
      />

      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-white via-white/85 to-transparent"
        style={{ height: padPx }}
        aria-hidden
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white via-white/85 to-transparent"
        style={{ height: padPx }}
        aria-hidden
      />

      {/* Step up */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); step(-1); }}
        className="absolute inset-x-0 top-0 z-30 flex h-6 items-center justify-center text-ink/30 transition hover:text-terracotta"
        aria-label={`${ariaLabel} previous`}
        tabIndex={-1}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      {/* Step down */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); step(1); }}
        className="absolute inset-x-0 bottom-0 z-30 flex h-6 items-center justify-center text-ink/30 transition hover:text-terracotta"
        aria-label={`${ariaLabel} next`}
        tabIndex={-1}
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        role="listbox"
        aria-label={ariaLabel}
        className="no-scrollbar h-full w-full overflow-y-scroll overscroll-contain"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp')   { e.preventDefault(); step(-1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
        }}
      >
        {/* top spacer */}
        <div style={{ height: padPx }} aria-hidden />
        {options.map((opt, i) => {
          const dist = Math.abs(i - activeIdx);
          const isActive = i === activeIdx;
          const opacity = isActive ? 1 : Math.max(0.25, 1 - dist * 0.28);
          return (
            <div
              key={opt}
              role="option"
              aria-selected={isActive}
              onClick={(e) => {
                e.stopPropagation();
                if (!isActive) {
                  onChange(opt);
                  scrollToIndex(i, 'smooth');
                }
              }}
              className="flex cursor-pointer items-center justify-center font-display tabular-nums"
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                scrollSnapStop: 'always',
                fontSize: isActive ? 22 : 18,
                color: isActive ? 'rgb(60 30 25)' : 'rgb(60 30 25)',
                opacity,
                fontWeight: isActive ? 700 : 500,
                transition: 'opacity 120ms, font-size 120ms',
              }}
            >
              {format(opt)}
            </div>
          );
        })}
        {/* bottom spacer */}
        <div style={{ height: padPx }} aria-hidden />
      </div>
    </div>
  );
}
