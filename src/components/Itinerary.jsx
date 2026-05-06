import { useState, useEffect } from 'react';
import {
  itineraryDays,
  itineraryParents,
  itineraryGfBff,
} from '../data/itinerary.js';
import { getLocationById } from '../data/locations.js';
import { googleMapsUrl } from '../utils/kmlParser.js';
import { useItinerary } from '../hooks/useItinerary.js';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plane,
  MapPin,
  ExternalLink,
  Sparkles,
  Clock,
  BadgeAlert,
  AlarmClock,
  Home,
  Navigation,
  Footprints,
  Car,
  MoveLeft,
  TriangleAlert,
  Star,
  ArrowRight,
  Users,
  Heart,
  CalendarDays,
  Loader2,
  Plus,
  X,
  GripVertical,
  Trash2,
} from 'lucide-react';

// ── Group config ──────────────────────────────────────────────────────────────

const GROUPS = [
  {
    id: 'all',
    label: 'Full Plan',
    sublabel: 'Everyone · all activities',
    icon: CalendarDays,
    fallback: itineraryDays,
    activeClasses: 'bg-terracotta text-white',
  },
  {
    id: 'parents',
    label: 'Parents',
    sublabel: 'Traditional · relaxed pace',
    icon: Heart,
    fallback: itineraryParents,
    activeClasses: 'bg-amber text-white',
  },
  {
    id: 'gf-bff',
    label: 'Pei Qi + Celine',
    sublabel: 'Cafés · beauty · onsen',
    icon: Sparkles,
    fallback: itineraryGfBff,
    activeClasses: 'bg-maroon text-white',
  },
];

function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer shell — right-side slide-out
// ─────────────────────────────────────────────────────────────────────────────

function Drawer({ open, onClose, title, eyebrow, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
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
      className={`fixed inset-0 z-[100] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
            <h3 className="truncate font-display text-lg font-semibold text-ink">
              {title}
            </h3>
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
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
        {footer && (
          <footer className="border-t border-ink/10 bg-cream/40 px-5 py-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stop edit drawer
// ─────────────────────────────────────────────────────────────────────────────

function StopEditDrawer({ open, stop, dayLabel, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => stop ?? {});
  const [prevStop, setPrevStop] = useState(stop);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (stop !== prevStop) {
    setPrevStop(stop);
    setForm(stop ?? {});
    setConfirmDelete(false);
  }

  if (!stop) {
    return <Drawer open={open} onClose={onClose} title="" />;
  }

  function patch(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    onSave(stripUndefined({ ...stop, ...form }));
    onClose();
  }

  const travelVal = form.travel ?? '';
  const isPlaceLike = stop.type === 'place' || stop.type === 'airbnb';

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

        {isPlaceLike && (
          <>
            <Field label="Notes">
              <textarea
                value={form.note ?? ''}
                onChange={(e) => patch('note', e.target.value)}
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </Field>

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
                    !travelVal
                      ? 'bg-ink/10 text-ink'
                      : 'border border-ink/15 bg-white text-ink/50 hover:border-ink/25'
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

// ─────────────────────────────────────────────────────────────────────────────
// Day edit drawer
// ─────────────────────────────────────────────────────────────────────────────

function dayFormFromDay(day) {
  return {
    subtitle: day?.subtitle ?? '',
    wakeUp: day?.wakeUp ?? '',
    returnTime: day?.returnTime ?? '',
    earlyNote: day?.earlyNote ?? '',
  };
}

function DayEditDrawer({ open, day, onClose, onSave }) {
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
            className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onSave(form); onClose(); }}
            className="rounded-lg bg-terracotta px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-terracotta/90"
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

const inputCls =
  'mt-1 w-full rounded-xl border border-ink/15 bg-cream/40 px-3 py-2 text-sm text-ink outline-none ring-terracotta/20 focus:ring-2';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</span>
      {children}
    </label>
  );
}

// ── Group badge ───────────────────────────────────────────────────────────────

function GroupPill({ group }) {
  if (!group) return null;
  if (group === 'parents') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[11px] font-semibold text-amber">
        <Heart className="h-2.5 w-2.5" />Parents
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-maroon/25 bg-maroon/[0.08] px-2 py-0.5 text-[11px] font-semibold text-maroon">
      <Sparkles className="h-2.5 w-2.5" />Pei Qi + Celine
    </span>
  );
}

function TogetherPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink/50">
      <Users className="h-2.5 w-2.5" />Together
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Itinerary() {
  const [activeGroup, setActiveGroup] = useState('all');
  const [editingStop, setEditingStop] = useState(null);
  const [editingDay, setEditingDay] = useState(null);

  const {
    versions,
    loading,
    updateStop,
    addStop,
    deleteStop,
    updateDayMeta,
    reorderStops,
  } = useItinerary();

  const group = GROUPS.find((g) => g.id === activeGroup);
  const days = versions[activeGroup] || group.fallback;

  return (
    <section id="plan" className="scroll-mt-20 border-b border-ink/10 bg-white py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-8 w-8 shrink-0 text-gold" />
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                Master plan
              </h2>
              <p className="mt-2 text-ink/60">
                Six days, three perspectives. Tap any card to edit, drag to reorder.
              </p>
            </div>
          </div>
          {loading && (
            <Loader2 className="mt-2 h-5 w-5 shrink-0 animate-spin text-terracotta/50" />
          )}
        </div>

        {/* Group selector */}
        <div className="mb-10 grid grid-cols-3 gap-2">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            const isActive = g.id === activeGroup;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 transition sm:flex-row sm:gap-2.5 sm:px-4 ${
                  isActive
                    ? `${g.activeClasses} border-transparent shadow-md`
                    : 'border-ink/10 bg-white text-ink/60 shadow-sm hover:bg-cream hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="text-center sm:text-left">
                  <div className={`text-xs font-bold uppercase tracking-wide ${isActive ? '' : 'text-ink/70'}`}>
                    {g.label}
                  </div>
                  <div className={`hidden text-[10px] sm:block ${isActive ? 'opacity-75' : 'text-ink/45'}`}>
                    {g.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mb-10 flex flex-wrap gap-2 rounded-xl border border-ink/10 bg-cream/50 px-4 py-3">
          <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wider text-ink/50">Key</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold">
            <Star className="h-3 w-3 fill-gold" /> Featured
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs font-semibold text-amber">
            <TriangleAlert className="h-3 w-3" /> Time-critical
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-maroon/25 bg-maroon/[0.08] px-2.5 py-0.5 text-xs font-semibold text-maroon">
            <BadgeAlert className="h-3 w-3" /> Reservation
          </span>
          <TogetherPill />
          {activeGroup === 'all' && (
            <>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber">
                <Heart className="h-2.5 w-2.5" /> Parents only
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-maroon/25 bg-maroon/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-maroon">
                <Sparkles className="h-2.5 w-2.5" /> Pei Qi + Celine only
              </span>
            </>
          )}
        </div>

        {/* Timeline */}
        <div className="relative space-y-10 before:absolute before:left-[18px] before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-gradient-to-b before:from-terracotta/50 before:via-terracotta/20 before:to-transparent sm:before:left-5">
          {days.map((day, dayIdx) => (
            <DayCard
              key={day.day}
              day={day}
              dayIdx={dayIdx}
              groupId={activeGroup}
              onEditDay={() => setEditingDay({ dayIdx, day })}
              onOpenStopEdit={(stopIdx, stop) =>
                setEditingStop({ dayIdx, stopIdx, stop, dayLabel: `Day ${day.day} · ${day.dateLabel}` })
              }
              onAddStop={(newStop) => addStop(activeGroup, dayIdx, newStop)}
              onReorder={(fromIdx, toIdx) =>
                reorderStops(activeGroup, dayIdx, fromIdx, toIdx)
              }
            />
          ))}
        </div>
      </div>

      <StopEditDrawer
        open={Boolean(editingStop)}
        stop={editingStop?.stop ?? null}
        dayLabel={editingStop?.dayLabel}
        onClose={() => setEditingStop(null)}
        onSave={(updated) => {
          if (!editingStop) return;
          updateStop(activeGroup, editingStop.dayIdx, editingStop.stopIdx, updated);
        }}
        onDelete={() => {
          if (!editingStop) return;
          deleteStop(activeGroup, editingStop.dayIdx, editingStop.stopIdx);
        }}
      />

      <DayEditDrawer
        open={Boolean(editingDay)}
        day={editingDay?.day ?? null}
        onClose={() => setEditingDay(null)}
        onSave={(fields) => {
          if (!editingDay) return;
          updateDayMeta(activeGroup, editingDay.dayIdx, fields);
        }}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Day card
// ─────────────────────────────────────────────────────────────────────────────

function DayCard({
  day,
  dayIdx,
  groupId,
  onEditDay,
  onOpenStopEdit,
  onAddStop,
  onReorder,
}) {
  const isEarlyWake = day.wakeUp && parseInt(day.wakeUp) < 8;

  // Local stop list for instant DnD feedback (Firestore syncs after)
  const [localStops, setLocalStops] = useState(day.stops);
  const [prevServerStops, setPrevServerStops] = useState(day.stops);
  if (day.stops !== prevServerStops) {
    setPrevServerStops(day.stops);
    setLocalStops(day.stops);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function stopId(idx) { return `${dayIdx}-${idx}`; }

  function handleDragEnd(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = Number(active.id.split('-')[1]);
    const toIdx = Number(over.id.split('-')[1]);
    setLocalStops((prev) => arrayMove(prev, fromIdx, toIdx));
    onReorder(fromIdx, toIdx);
  }

  return (
    <article className="relative pl-12 sm:pl-14">
      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-maroon font-display text-sm font-semibold text-white shadow-md sm:left-1 sm:h-11 sm:w-11">
        {day.day}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        {/* Day header — tappable */}
        <button
          type="button"
          onClick={onEditDay}
          className="group flex w-full items-start justify-between gap-2 rounded-lg text-left transition hover:bg-cream/40 -mx-2 px-2 py-1"
          aria-label={`Edit day ${day.day}`}
        >
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-display text-xl font-semibold text-ink">Day {day.day}</h3>
              <span className="text-sm font-medium text-ink/50">{day.dateLabel}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-terracotta">
              {day.subtitle}
            </p>
          </div>
          <span className="shrink-0 self-center rounded-full bg-ink/[0.04] px-2 py-1 text-[11px] font-semibold text-ink/0 opacity-0 transition group-hover:bg-terracotta/10 group-hover:text-terracotta group-hover:opacity-100">
            Edit day
          </span>
        </button>

        {/* Early-start banner */}
        {isEarlyWake && (
          <div className="mt-4 flex flex-wrap items-start gap-2.5 rounded-xl border border-amber/25 bg-amber/[0.07] px-4 py-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div>
              <span className="text-sm font-semibold text-amber">
                Early start — wake up {day.wakeUp}
              </span>
              {day.earlyNote && (
                <p className="mt-0.5 text-xs text-amber/70">{day.earlyNote}</p>
              )}
            </div>
          </div>
        )}

        {/* Wake / return row */}
        {(!isEarlyWake || day.returnTime) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!isEarlyWake && day.wakeUp && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/25 bg-terracotta/[0.08] px-3 py-1 text-xs font-semibold text-terracotta">
                <AlarmClock className="h-3.5 w-3.5" />
                Wake up {day.wakeUp}
              </span>
            )}
            {day.returnTime && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-cream/60 px-3 py-1 text-xs font-semibold text-ink/60">
                <MoveLeft className="h-3.5 w-3.5" />
                Back by {day.returnTime}
              </span>
            )}
          </div>
        )}

        {/* Sortable stops */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localStops.map((_, i) => stopId(i))}
            strategy={verticalListSortingStrategy}
          >
            <ul className="mt-6 space-y-3">
              {localStops.map((stop, stopIdx) => (
                <SortableStopItem
                  key={stopId(stopIdx)}
                  id={stopId(stopIdx)}
                  stop={stop}
                  groupId={groupId}
                  showTravelLead={stopIdx > 0 && Boolean(stop.travel)}
                  onOpenEdit={() => onOpenStopEdit(stopIdx, stop)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {/* Add stop — always visible */}
        <button
          type="button"
          onClick={() => onAddStop({
            type: 'place',
            label: 'New stop',
            time: '12:00',
            note: '',
            distance: '',
            travel: 'Grab',
          })}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 py-3 text-sm font-medium text-ink/40 transition hover:border-terracotta/40 hover:text-terracotta"
        >
          <Plus className="h-4 w-4" />
          Add stop
        </button>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable stop wrapper
// ─────────────────────────────────────────────────────────────────────────────

function SortableStopItem({ id, stop, groupId, showTravelLead, onOpenEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 'auto',
  };

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'opacity-90' : ''}>
      {showTravelLead && (
        <div className="mb-3 flex items-center gap-2 pl-1">
          <ArrowRight className="h-3 w-3 shrink-0 text-ink/25" />
          <TravelBadge distance={stop.distance} travel={stop.travel} />
        </div>
      )}
      <div className="relative">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute -left-7 top-1/2 z-10 hidden h-7 w-5 -translate-y-1/2 cursor-grab items-center justify-center rounded text-ink/25 transition hover:text-ink/60 active:cursor-grabbing sm:flex"
          aria-label="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <StopCard stop={stop} groupId={groupId} onOpenEdit={onOpenEdit} dragListeners={listeners} dragAttributes={attributes} />
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Travel badge
// ─────────────────────────────────────────────────────────────────────────────

function TravelBadge({ distance, travel }) {
  if (!distance && !travel) return null;
  const isWalk = travel === 'Walk';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      isWalk ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
    }`}>
      {isWalk ? <Footprints className="h-3 w-3" /> : <Car className="h-3 w-3" />}
      {distance && <span>{distance}</span>}
      {travel && <span className="opacity-70">· {travel}</span>}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stop router
// ─────────────────────────────────────────────────────────────────────────────

function StopCard({ stop, groupId, onOpenEdit, dragListeners, dragAttributes }) {
  if (stop.type === 'flight') return <FlightStop stop={stop} onOpenEdit={onOpenEdit} dragListeners={dragListeners} dragAttributes={dragAttributes} />;
  if (stop.type === 'airbnb') return <AirbnbStop stop={stop} onOpenEdit={onOpenEdit} dragListeners={dragListeners} dragAttributes={dragAttributes} />;
  return <PlaceStop stop={stop} groupId={groupId} onOpenEdit={onOpenEdit} dragListeners={dragListeners} dragAttributes={dragAttributes} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile-only drag affordance — small grip on the top-left of cards on mobile
// ─────────────────────────────────────────────────────────────────────────────

function MobileGrip({ listeners, attributes }) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="absolute left-1 top-1 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded text-ink/20 transition hover:text-ink/50 active:cursor-grabbing sm:hidden"
      aria-label="Drag to reorder"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tappable card outer
// ─────────────────────────────────────────────────────────────────────────────

function TappableCard({ children, onOpenEdit, className = '', ariaLabel }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenEdit();
        }
      }}
      aria-label={ariaLabel || 'Edit stop'}
      className={`group relative cursor-pointer rounded-xl border p-4 pl-7 sm:pl-4 transition hover:-translate-y-px hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flight stop
// ─────────────────────────────────────────────────────────────────────────────

function FlightStop({ stop, onOpenEdit, dragListeners, dragAttributes }) {
  const cls = stop.alert
    ? 'border-amber/25 bg-amber/5 ring-1 ring-amber/15'
    : 'border-ink/[0.07] bg-cream/30';
  return (
    <TappableCard onOpenEdit={onOpenEdit} className={cls} ariaLabel={`Edit ${stop.label}`}>
      <MobileGrip listeners={dragListeners} attributes={dragAttributes} />
      <div className="flex items-start gap-3">
        <Plane className="mt-0.5 h-5 w-5 shrink-0 text-maroon" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{stop.label}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-maroon/10 px-2 py-0.5 text-xs font-semibold text-maroon">
              <Clock className="h-3 w-3" />{stop.time}
            </span>
            {stop.alert && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber/25 bg-amber/10 px-2 py-0.5 text-xs font-semibold text-amber">
                <TriangleAlert className="h-3 w-3" />Critical
              </span>
            )}
          </div>
          {stop.detail && (
            <p className="mt-1.5 text-sm text-ink/60">{stop.detail}</p>
          )}
        </div>
      </div>
    </TappableCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Airbnb stop
// ─────────────────────────────────────────────────────────────────────────────

function AirbnbStop({ stop, onOpenEdit, dragListeners, dragAttributes }) {
  const loc = stop.locationId ? getLocationById(stop.locationId) : null;
  const mapsUrl = loc ? googleMapsUrl(loc.lat, loc.lng) : null;
  const cls = `bg-red-50/60 ${stop.alert ? 'border-airbnb/40 ring-1 ring-airbnb/20' : 'border-airbnb/20'}`;
  return (
    <TappableCard onOpenEdit={onOpenEdit} className={cls} ariaLabel={`Edit ${stop.label}`}>
      <MobileGrip listeners={dragListeners} attributes={dragAttributes} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Home className="h-4 w-4 shrink-0 text-airbnb" />
            <span className="font-semibold text-ink">{stop.label}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-airbnb/10 px-2 py-0.5 text-xs font-medium text-airbnb">
              <Clock className="h-3 w-3" />{stop.time}
            </span>
          </div>
          {stop.note && (
            <p className="mt-1.5 text-sm text-ink/60">{stop.note}</p>
          )}
        </div>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-airbnb px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-airbnb/90"
          >
            <Navigation className="h-4 w-4" />Maps<ExternalLink className="h-3.5 w-3.5 opacity-75" />
          </a>
        )}
      </div>
    </TappableCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Place stop
// ─────────────────────────────────────────────────────────────────────────────

function PlaceStop({ stop, groupId, onOpenEdit, dragListeners, dragAttributes }) {
  const loc = stop.locationId ? getLocationById(stop.locationId) : null;
  const mapsUrl = loc ? googleMapsUrl(loc.lat, loc.lng) : null;
  const reserve = Boolean(stop.reservationRequired) || Boolean(loc?.reservationRequired);

  let cls;
  if (stop.alert && stop.featured) {
    cls = 'border-gold/35 bg-gold/5 ring-1 ring-gold/15';
  } else if (stop.alert) {
    cls = 'border-amber/25 bg-amber/5 ring-1 ring-amber/15';
  } else if (stop.featured) {
    cls = 'border-l-[3px] border-l-gold border-ink/[0.07] bg-white';
  } else if (reserve) {
    cls = 'border-maroon/20 bg-white';
  } else {
    cls = 'border-ink/[0.07] bg-cream/30';
  }

  return (
    <TappableCard onOpenEdit={onOpenEdit} className={cls} ariaLabel={`Edit ${stop.label}`}>
      <MobileGrip listeners={dragListeners} attributes={dragAttributes} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* Name + time row */}
          <div className="flex flex-wrap items-center gap-2">
            {stop.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}
            <span className="font-semibold text-ink">{stop.label}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/60">
              {stop.time}
            </span>
            {stop.duration && <span className="text-xs text-ink/40">{stop.duration}</span>}
          </div>

          {/* Badges */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stop.alert && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber/25 bg-amber/10 px-2 py-0.5 text-xs font-semibold text-amber">
                <TriangleAlert className="h-3 w-3" />Time-critical
              </span>
            )}
            {reserve && (
              stop.bookingUrl ? (
                <a
                  href={stop.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-full border border-maroon/40 bg-maroon/10 px-2 py-0.5 text-xs font-semibold text-maroon transition hover:bg-maroon hover:text-white hover:border-maroon"
                >
                  <BadgeAlert className="h-3 w-3" />Book now
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-maroon/25 bg-maroon/[0.07] px-2 py-0.5 text-xs font-semibold text-maroon">
                  <BadgeAlert className="h-3 w-3" />Reservation required
                </span>
              )
            )}
            {groupId === 'all' && stop.group && <GroupPill group={stop.group} />}
            {stop.shared && (groupId !== 'all' || !stop.group) && <TogetherPill />}
          </div>

          {/* Note */}
          {stop.note && (
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{stop.note}</p>
          )}
        </div>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-cream/60 px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-terracotta hover:text-white hover:border-terracotta"
          >
            <MapPin className="h-4 w-4" />Maps<ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        )}
      </div>
    </TappableCard>
  );
}
