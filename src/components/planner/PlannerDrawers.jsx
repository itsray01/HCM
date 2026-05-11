import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';

const inputCls =
  'mt-1 w-full rounded-xl border border-ink/15 bg-cream/40 px-3 py-3 text-sm text-ink outline-none ring-terracotta/20 focus:ring-2 sm:py-2';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</span>
      {children}
    </label>
  );
}

function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function Drawer({ open, onClose, title, eyebrow, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-[1000] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-label="Close drawer"
        tabIndex={open ? 0 : -1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:border-l sm:border-ink/10 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                {eyebrow}
              </p>
            )}
            <h3 className="truncate font-display text-lg font-semibold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/55 transition hover:bg-ink/5 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="border-t border-ink/10 bg-cream/40 px-5 py-3">{footer}</footer>
        )}
      </aside>
    </div>
  );
}

// ── Day edit drawer ──────────────────────────────────────────────────────────

function dayFormFromDay(day) {
  return {
    subtitle: day?.subtitle ?? '',
    wakeUp: day?.wakeUp ?? '',
    returnTime: day?.returnTime ?? '',
    earlyNote: day?.earlyNote ?? '',
  };
}

export function DayEditDrawer({ open, day, onClose, onSave }) {
  const [form, setForm] = useState(() => dayFormFromDay(day));
  const [prevDay, setPrevDay] = useState(day);

  if (day !== prevDay) {
    setPrevDay(day);
    setForm(dayFormFromDay(day));
  }

  if (!day) return <Drawer open={open} onClose={onClose} title="" />;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={day.dateLabel}
      title={`Day ${day.day}`}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink/70 hover:bg-cream sm:px-3 sm:py-1.5 sm:text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onSave(form); onClose(); }}
            className="rounded-lg bg-terracotta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-terracotta/90 sm:px-4 sm:py-1.5 sm:text-xs"
          >
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Subtitle">
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Wake up">
          <input
            type="text"
            value={form.wakeUp}
            onChange={(e) => setForm((f) => ({ ...f, wakeUp: e.target.value }))}
            placeholder="e.g. 07:30"
            className={inputCls}
          />
        </Field>
        <Field label="Back by">
          <input
            type="text"
            value={form.returnTime}
            onChange={(e) => setForm((f) => ({ ...f, returnTime: e.target.value }))}
            placeholder="e.g. 22:00"
            className={inputCls}
          />
        </Field>
        <Field label="Early note">
          <textarea
            value={form.earlyNote}
            onChange={(e) => setForm((f) => ({ ...f, earlyNote: e.target.value }))}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>
    </Drawer>
  );
}

// ── Stop edit drawer (label/time/duration/distance/travel) ───────────────────

export function StopEditDrawer({ open, stop, dayLabel, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => stop ?? {});
  const [prevStop, setPrevStop] = useState(stop);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (stop !== prevStop) {
    setPrevStop(stop);
    setForm(stop ?? {});
    setConfirmDelete(false);
  }

  if (!stop) return <Drawer open={open} onClose={onClose} title="" />;

  function patch(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    onSave(stripUndefined({ ...stop, ...form }));
    onClose();
  }

  const travelVal = form.travel ?? '';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={`${dayLabel ?? ''} · ${stop.type}`}
      title={form.label || 'Stop'}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs font-semibold text-red-700">Delete this stop?</span>
              <button
                type="button"
                onClick={() => { onDelete(); onClose(); }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-cream"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete stop
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-cream"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-terracotta px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-terracotta/90"
            >
              Save
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <input
            type="text"
            value={form.label ?? ''}
            onChange={(e) => patch('label', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Time">
          <input
            type="text"
            value={form.time ?? ''}
            onChange={(e) => patch('time', e.target.value)}
            placeholder="e.g. 08:00"
            className={inputCls}
          />
        </Field>
        {stop.type === 'flight' && (
          <Field label="Details">
            <textarea
              value={form.detail ?? ''}
              onChange={(e) => patch('detail', e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </Field>
        )}
        {(stop.type === 'place' || stop.type === 'airbnb') && (
          <>
            <Field label="Distance">
              <input
                type="text"
                value={form.distance ?? ''}
                onChange={(e) => patch('distance', e.target.value)}
                placeholder="e.g. ~1.3 km"
                className={inputCls}
              />
            </Field>
            <Field label="Travel">
              <div className="flex flex-wrap gap-2">
                {['Walk', 'Grab'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => patch('travel', opt)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      travelVal === opt
                        ? 'bg-terracotta text-white shadow-sm'
                        : 'border border-ink/15 bg-white text-ink/70 hover:border-terracotta/40'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => patch('travel', '')}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    !travelVal ? 'bg-ink/10 text-ink' : 'border border-ink/15 bg-white text-ink/50 hover:border-ink/25'
                  }`}
                >
                  Clear
                </button>
              </div>
            </Field>
            {stop.type === 'place' && (
              <Field label="Duration">
                <input
                  type="text"
                  value={form.duration ?? ''}
                  onChange={(e) => patch('duration', e.target.value)}
                  placeholder="e.g. ~2 hrs"
                  className={inputCls}
                />
              </Field>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
