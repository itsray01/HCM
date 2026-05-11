import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Clock, Hourglass } from 'lucide-react';
import WheelPicker from './WheelPicker.jsx';

const POPOVER_H_EST = 290;

function popoverWidth() {
  if (typeof window === 'undefined') return 260;
  // Allow some breathing room on narrow phones; cap at 280 on larger screens.
  return Math.min(280, Math.max(232, window.innerWidth - 24));
}

/** Bottom safety margin: tab bar (~64-80px) is fixed at the bottom on mobile/tablet.
 *  Desktop (>=1024px) hides it, so margin is just a small gap. */
function bottomReserved() {
  if (typeof window === 'undefined') return 16;
  return window.innerWidth >= 1024 ? 16 : 96;
}

/** ── Parsing helpers ──────────────────────────────────────────────────────── */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function snapToStep(n, step) {
  return Math.round(n / step) * step;
}

/** Parse a stop time string like "10:30" / "~17:45" / "" into parts.
 *  Always returns sensible defaults so the wheels never start empty. */
export function parseTime(raw) {
  if (!raw || typeof raw !== 'string') {
    return { hours: 12, minutes: 0, approx: false };
  }
  const trimmed = raw.trim();
  const approx = trimmed.startsWith('~');
  const body = (approx ? trimmed.slice(1) : trimmed).trim();
  const m = body.match(/^(\d{1,2})[:.](\d{1,2})/);
  if (!m) return { hours: 12, minutes: 0, approx };
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10) || 0));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10) || 0));
  return { hours: h, minutes: snapToStep(min, 5) % 60, approx };
}

export function formatTime({ hours, minutes, approx }) {
  return `${approx ? '~' : ''}${pad2(hours)}:${pad2(minutes)}`;
}

/** Parse a duration string like "~1 hr" / "~1.5 hrs" / "~30 min" /
 *  "~2 hr 30 min" / "1h 15m" into parts. Returns 0/0 when blank. */
export function parseDuration(raw) {
  if (!raw || typeof raw !== 'string') {
    return { hours: 0, minutes: 30, approx: true };
  }
  const trimmed = raw.trim();
  const approx = trimmed.startsWith('~');
  const body = (approx ? trimmed.slice(1) : trimmed).trim().toLowerCase();

  let hours = 0;
  let minutes = 0;

  // "1.5 hrs" / "2 hr" / "1h" — capture decimal hours
  const hMatch = body.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  if (hMatch) {
    const f = parseFloat(hMatch[1]);
    hours = Math.floor(f);
    if (f % 1 !== 0) minutes += Math.round((f % 1) * 60);
  }

  // "30 min" / "15m" — add explicit minutes
  const mMatch = body.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (mMatch) {
    minutes += parseInt(mMatch[1], 10) || 0;
  }

  // If nothing parsed, fall back to a sensible default
  if (!hMatch && !mMatch) {
    return { hours: 0, minutes: 30, approx };
  }

  // Roll minutes over into hours if needed, then snap to nearest 15
  hours += Math.floor(minutes / 60);
  minutes = minutes % 60;
  minutes = snapToStep(minutes, 15) % 60;
  // (a snap to 60 would have rolled over inside snapToStep; modulo 60 keeps it sane)

  hours = Math.min(12, Math.max(0, hours));
  return { hours, minutes, approx };
}

export function formatDuration({ hours, minutes, approx }) {
  if (hours === 0 && minutes === 0) return '';
  const prefix = approx ? '~' : '';
  if (hours > 0 && minutes === 0) {
    return `${prefix}${hours} hr${hours > 1 ? 's' : ''}`;
  }
  if (hours === 0 && minutes > 0) {
    return `${prefix}${minutes} min`;
  }
  return `${prefix}${hours} hr${hours > 1 ? 's' : ''} ${minutes} min`;
}

/** ── Positioning ──────────────────────────────────────────────────────────── */

function computePosition(anchorRect) {
  const width = popoverWidth();
  if (!anchorRect) {
    return { top: 80, left: 12, width };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  const bottomReserve = bottomReserved();

  // Prefer below the anchor, flip above if it would clip the bottom (incl. mobile tab bar)
  const spaceBelow = vh - bottomReserve - anchorRect.bottom;
  const spaceAbove = anchorRect.top - margin;
  const placeAbove = spaceBelow < POPOVER_H_EST && spaceAbove > spaceBelow;

  let top = placeAbove
    ? anchorRect.top - POPOVER_H_EST - margin
    : anchorRect.bottom + margin;

  let left = anchorRect.left;
  if (left + width + margin > vw) left = vw - width - margin;
  if (left < margin) left = margin;
  if (top < margin) top = margin;
  // last-resort clamp so it never goes off the bottom edge / under the tab bar
  const maxTop = vh - bottomReserve - POPOVER_H_EST;
  if (top > maxTop && maxTop > margin) top = maxTop;

  return { top, left, width };
}

/** ── Shared popover shell ─────────────────────────────────────────────────── */

function Popover({ anchorRect, title, icon: Icon, children, onCancel, onCommit }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(() => computePosition(anchorRect));

  useLayoutEffect(() => {
    setPos(computePosition(anchorRect));
  }, [anchorRect]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        onCommit();
      }
    }
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onCancel();
    }
    function onResize() {
      setPos(computePosition(anchorRect));
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [anchorRect, onCancel, onCommit]);

  return createPortal(
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[9998] rounded-2xl border border-ink/10 bg-white p-3 shadow-2xl ring-1 ring-ink/5"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      role="dialog"
      aria-modal="true"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/55">
        {Icon && <Icon className="h-3 w-3 text-terracotta" />}
        {title}
      </div>
      {children}
    </div>,
    document.body,
  );
}

function ApproxToggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
        on
          ? 'bg-terracotta text-white shadow-sm'
          : 'border border-ink/15 bg-white text-ink/55 hover:border-terracotta/40 hover:text-terracotta'
      }`}
      aria-pressed={on}
    >
      <span className="font-mono text-[12px]">~</span>
      Approx
    </button>
  );
}

function PopoverFooter({ onCancel, onCommit }) {
  return (
    <div className="mt-2 flex justify-end gap-1.5">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-ink/55 hover:bg-ink/5"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCommit(); }}
        className="rounded-lg bg-terracotta px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-terracotta/90"
      >
        Done
      </button>
    </div>
  );
}

/** ── Time picker ──────────────────────────────────────────────────────────── */

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5);

export function TimePopover({ value, anchorRect, onCancel, onCommit }) {
  const [state, setState] = useState(() => parseTime(value));

  function commit() {
    onCommit(formatTime(state));
  }

  return (
    <Popover
      anchorRect={anchorRect}
      title="Time"
      icon={Clock}
      onCancel={onCancel}
      onCommit={commit}
    >
      <div className="flex items-center justify-center gap-2">
        <WheelPicker
          options={HOURS_24}
          value={state.hours}
          onChange={(h) => setState((s) => ({ ...s, hours: h }))}
          format={pad2}
          ariaLabel="Hours"
        />
        <span className="font-display text-2xl font-bold text-ink/30">:</span>
        <WheelPicker
          options={MINUTES_5}
          value={state.minutes}
          onChange={(m) => setState((s) => ({ ...s, minutes: m }))}
          format={pad2}
          ariaLabel="Minutes"
        />
      </div>
      <div className="mt-2">
        <ApproxToggle
          on={state.approx}
          onChange={(v) => setState((s) => ({ ...s, approx: v }))}
        />
      </div>
      <PopoverFooter onCancel={onCancel} onCommit={commit} />
    </Popover>
  );
}

/** ── Duration picker ──────────────────────────────────────────────────────── */

const DUR_HOURS = Array.from({ length: 13 }, (_, i) => i);   // 0..12
const DUR_MINUTES = [0, 15, 30, 45];

export function DurationPopover({ value, anchorRect, onCancel, onCommit }) {
  const [state, setState] = useState(() => {
    const parsed = parseDuration(value);
    // ensure minutes is one of the 15-min options
    return { ...parsed, minutes: snapToStep(parsed.minutes, 15) % 60 };
  });

  function commit() {
    onCommit(formatDuration(state));
  }

  return (
    <Popover
      anchorRect={anchorRect}
      title="Duration"
      icon={Hourglass}
      onCancel={onCancel}
      onCommit={commit}
    >
      <div className="flex items-center justify-center gap-2">
        <div className="flex flex-col items-center">
          <WheelPicker
            options={DUR_HOURS}
            value={state.hours}
            onChange={(h) => setState((s) => ({ ...s, hours: h }))}
            format={(n) => String(n)}
            ariaLabel="Hours"
          />
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/45">hr</span>
        </div>
        <div className="flex flex-col items-center">
          <WheelPicker
            options={DUR_MINUTES}
            value={state.minutes}
            onChange={(m) => setState((s) => ({ ...s, minutes: m }))}
            format={pad2}
            ariaLabel="Minutes"
          />
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/45">min</span>
        </div>
      </div>
      <div className="mt-2">
        <ApproxToggle
          on={state.approx}
          onChange={(v) => setState((s) => ({ ...s, approx: v }))}
        />
      </div>
      <PopoverFooter onCancel={onCancel} onCommit={commit} />
    </Popover>
  );
}
