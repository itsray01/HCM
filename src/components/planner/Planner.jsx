import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Sparkles,
  CalendarDays,
  Heart,
  Loader2,
  List,
  Map as MapIcon,
} from 'lucide-react';
import {
  itineraryDays,
  itineraryParents,
  itineraryGfBff,
} from '../../data/itinerary.js';
import { useItinerary } from '../../hooks/useItinerary.js';
import DebugPanel from '../DebugPanel.jsx';

import DayBucket from './DayBucket.jsx';
import DiscoveryPanel from './DiscoveryPanel.jsx';
import {
  parseStopId,
  parseDayId,
  parseDiscoveryId,
} from './plannerIds.js';
import PlannerCard from './PlannerCard.jsx';
import PlannerMap from './PlannerMap.jsx';
import BudgetSummary from './BudgetSummary.jsx';
import { DayEditDrawer } from './PlannerDrawers.jsx';
import AddPlaceBar from './AddPlaceBar.jsx';

const GROUPS = [
  {
    id: 'all',
    label: 'Everyone',
    sublabel: 'All stops',
    icon: CalendarDays,
    fallback: itineraryDays,
    activeClasses: 'bg-terracotta text-white',
  },
  {
    id: 'parents',
    label: 'Parents',
    sublabel: 'Relaxed pace',
    icon: Heart,
    fallback: itineraryParents,
    activeClasses: 'bg-amber text-white',
  },
  {
    id: 'gf-bff',
    label: 'Pei Qi + Celine',
    sublabel: 'Cafés · beauty',
    icon: Sparkles,
    fallback: itineraryGfBff,
    activeClasses: 'bg-maroon text-white',
  },
];

export default function Planner() {
  const [activeGroup, setActiveGroup] = useState('all');
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [focusedLocationId, setFocusedLocationId] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'
  const [activeFilter, setActiveFilter] = useState(null); // { kind: 'category'|'day', id } | null

  // ── Scroll-sync refs (effect runs after days is defined below) ──────────────
  const dayBucketRefs = useRef([]);

  const registerDayBucketRef = useCallback((el, dayIdx) => {
    dayBucketRefs.current[dayIdx] = el;
  }, []);

  const {
    versions,
    loading,
    syncStatus,
    debugInfo,
    deleteStop,
    updateDayMeta,
    reorderStops,
    addStopFromLocation,
    addExternalStop,
    moveStopBetweenDays,
    updateStopFields,
  } = useItinerary();

  const group = GROUPS.find((g) => g.id === activeGroup);
  const days = versions[activeGroup] || group.fallback;
  const activeDay = days[activeDayIdx] || days[0];

  // ── Scroll-sync: re-attach observer whenever group/day-count changes ─────────
  useEffect(() => {
    const visibilityMap = new Map(); // dayIdx → { ratio, top }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.dataset.dayScrollIdx);
          visibilityMap.set(idx, {
            ratio: entry.intersectionRatio,
            top: entry.boundingClientRect.top,
          });
        });

        // Pick the most-visible day; break ties by topmost position
        let bestIdx = null;
        let bestRatio = 0;
        let bestTop = Infinity;
        for (const [idx, { ratio, top }] of visibilityMap) {
          if (ratio > bestRatio || (ratio === bestRatio && top < bestTop)) {
            bestRatio = ratio;
            bestTop = top;
            bestIdx = idx;
          }
        }
        if (bestIdx !== null && bestRatio > 0) setActiveDayIdx(bestIdx);
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
    );

    dayBucketRefs.current.forEach((el, idx) => {
      if (!el) return;
      el.dataset.dayScrollIdx = String(idx);
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [days.length, activeGroup]);

  const scheduledLocationIds = useMemo(() => {
    const set = new Set();
    for (const d of days) {
      for (const s of d.stops) if (s.locationId) set.add(s.locationId);
    }
    return set;
  }, [days]);

  const scheduledLocationDayMap = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      for (const s of d.stops) {
        if (!s.locationId) continue;
        const cur = map.get(s.locationId) || [];
        if (!cur.includes(d.day)) map.set(s.locationId, [...cur, d.day]);
      }
    }
    return map;
  }, [days]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(e) {
    const data = e.active?.data?.current;
    if (data?.type === 'discovery') {
      setActiveDragItem({ kind: 'discovery', location: data.location });
    } else if (data?.type === 'stop') {
      const day = days[data.dayIdx];
      const stop = day?.stops?.[data.stopIdx];
      if (stop) setActiveDragItem({ kind: 'stop', stop });
    }
  }

  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveDragItem(null);
    if (!over) return;

    const activeData = active.data?.current;
    const overData = over.data?.current;

    // ── Library → Day ────────────────────────────────────────────────────
    if (activeData?.type === 'discovery') {
      const fromDisc = parseDiscoveryId(active.id);
      if (!fromDisc) return;
      const location = activeData.location;

      let toDayIdx = null;
      let atIdx = null;
      if (overData?.type === 'day') {
        toDayIdx = overData.dayIdx;
      } else if (overData?.type === 'stop') {
        toDayIdx = overData.dayIdx;
        atIdx = overData.stopIdx;
      } else {
        const fromDayParse = parseDayId(over.id);
        if (fromDayParse) toDayIdx = fromDayParse.dayIdx;
        const stopParse = parseStopId(over.id);
        if (stopParse) { toDayIdx = stopParse.dayIdx; atIdx = stopParse.stopIdx; }
      }
      if (toDayIdx == null) return;
      addStopFromLocation(activeGroup, toDayIdx, location, atIdx);
      setActiveDayIdx(toDayIdx);
      return;
    }

    // ── Stop drag ────────────────────────────────────────────────────────
    if (activeData?.type === 'stop') {
      const from = parseStopId(active.id);
      if (!from) return;

      // Drop onto another stop
      let toDayIdx = null;
      let toStopIdx = null;
      if (overData?.type === 'stop') {
        toDayIdx = overData.dayIdx;
        toStopIdx = overData.stopIdx;
      } else if (overData?.type === 'day') {
        toDayIdx = overData.dayIdx;
        toStopIdx = null; // append to end
      } else {
        const stopParse = parseStopId(over.id);
        const dayParse = parseDayId(over.id);
        if (stopParse) { toDayIdx = stopParse.dayIdx; toStopIdx = stopParse.stopIdx; }
        else if (dayParse) { toDayIdx = dayParse.dayIdx; toStopIdx = null; }
      }
      if (toDayIdx == null) return;

      if (toDayIdx === from.dayIdx) {
        if (toStopIdx == null || toStopIdx === from.stopIdx) return;
        reorderStops(activeGroup, from.dayIdx, from.stopIdx, toStopIdx);
      } else {
        moveStopBetweenDays(
          activeGroup,
          from.dayIdx,
          from.stopIdx,
          toDayIdx,
          toStopIdx
        );
      }
    }
  }

  function handleInlineAddPlace(place, dayIdx) {
    if (place.source === 'online') {
      addExternalStop(activeGroup, dayIdx, place);
    } else {
      addStopFromLocation(activeGroup, dayIdx, place);
    }
    setActiveDayIdx(dayIdx);
  }

  function handleAddDiscoveryToActive(location) {
    addStopFromLocation(activeGroup, activeDayIdx, location);
  }

  function handleAddPlaceToDay(location, dayIdx) {
    if (location.source === 'online') {
      addExternalStop(activeGroup, dayIdx, location);
    } else {
      addStopFromLocation(activeGroup, dayIdx, location);
    }
    setActiveDayIdx(dayIdx);
  }

  function handleChangeFilter(filter) {
    setActiveFilter(filter);
    if (filter?.kind === 'day') setActiveDayIdx(filter.id);
  }

  const categoryOverride =
    activeFilter?.kind === 'category' ? activeFilter.id : null;

  return (
    <section
      id="plan"
      className="scroll-mt-20 border-b border-ink/10 bg-cream/50 py-10 sm:py-14"
    >
      <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-7 w-7 shrink-0 text-gold" />
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                Trip planner
              </h2>
              <p className="mt-1 text-sm text-ink/55">
                Drag from the library onto a day. Tap any card to edit notes, cost & reservations.
              </p>
            </div>
          </div>
          {loading && (
            <Loader2 className="mt-2 h-5 w-5 shrink-0 animate-spin text-terracotta/50" />
          )}
          {/* Sync status badge */}
          {!loading && (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              syncStatus === 'synced'     ? 'bg-green-50 text-green-700'
            : syncStatus === 'error'     ? 'bg-red-50 text-red-600'
            : 'bg-amber-50 text-amber-600'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                syncStatus === 'synced'   ? 'bg-green-500'
              : syncStatus === 'error'   ? 'bg-red-500'
              : 'bg-amber-400 animate-pulse'
              }`} />
              {syncStatus === 'synced'   ? 'Live' : syncStatus === 'error' ? 'Sync failed' : 'Syncing…'}
            </div>
          )}
        </div>

        {/* Group tabs */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            const isActive = g.id === activeGroup;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 transition sm:flex-row sm:gap-2 ${
                  isActive
                    ? `${g.activeClasses} border-transparent shadow-md`
                    : 'border-ink/10 bg-white text-ink/65 shadow-sm hover:bg-white hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="text-center sm:text-left">
                  <div className="text-[11px] font-bold uppercase tracking-wide">
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

        {/* Mobile view toggle */}
        <div className="mb-4 flex items-center justify-center lg:hidden">
          <div className="inline-flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
            <ViewToggleBtn
              active={mobileView === 'list'}
              onClick={() => setMobileView('list')}
              icon={List}
              label="List"
            />
            <ViewToggleBtn
              active={mobileView === 'map'}
              onClick={() => setMobileView('map')}
              icon={MapIcon}
              label="Map"
            />
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragItem(null)}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
            {/* Sidebar / left pane */}
            <div className={mobileView === 'map' ? 'hidden lg:block' : 'block'}>
              <div className="space-y-4">
                <AddPlaceBar
                  days={days}
                  scheduledLocationIds={scheduledLocationIds}
                  scheduledLocationDayMap={scheduledLocationDayMap}
                  onAddToDay={handleAddPlaceToDay}
                  activeFilter={activeFilter}
                  onChangeFilter={handleChangeFilter}
                  activeDayIdx={activeDayIdx}
                />

                {days.map((day, dayIdx) => (
                  <DayBucket
                    key={day.day}
                    day={day}
                    dayIdx={dayIdx}
                    isActive={dayIdx === activeDayIdx}
                    onActivate={() => setActiveDayIdx(dayIdx)}
                    onEditDay={() => {
                      setActiveDayIdx(dayIdx);
                      setEditingDay({ dayIdx, day });
                    }}
                    onAddPlace={(place) => handleInlineAddPlace(place, dayIdx)}
                    scheduledLocationIds={scheduledLocationIds}
                    onUpdateStopField={(dIdx, sIdx, partial) =>
                      updateStopFields(activeGroup, dIdx, sIdx, partial)
                    }
                    onDeleteStop={(dIdx, sIdx) => {
                      deleteStop(activeGroup, dIdx, sIdx);
                    }}
                    focusedStopId={focusedLocationId}
                    onFocusStop={(locId) => {
                      setActiveDayIdx(dayIdx);
                      setFocusedLocationId(locId);
                    }}
                    sectionRef={(el) => registerDayBucketRef(el, dayIdx)}
                  />
                ))}

                <DiscoveryPanel
                  scheduledLocationIds={scheduledLocationIds}
                  scheduledLocationDayMap={scheduledLocationDayMap}
                  onAddToActive={handleAddDiscoveryToActive}
                  onFocusLocation={setFocusedLocationId}
                  focusedLocationId={focusedLocationId}
                  categoryOverride={categoryOverride}
                />

                <div className="sticky bottom-3 z-30">
                  <BudgetSummary days={days} groupLabel={group.label} />
                </div>
              </div>
            </div>

            {/* Map pane */}
            <div className={mobileView === 'list' ? 'hidden lg:block' : 'block'}>
              <div className="lg:sticky lg:top-20">
                <div className="h-[calc(100vh-7rem)] min-h-[420px] lg:h-[calc(100vh-7rem)]">
                  <PlannerMap
                    activeDay={activeDay}
                    focusedLocationId={focusedLocationId}
                    categoryFilter={categoryOverride}
                  />
                </div>

                {/* Day picker beneath map (desktop only) */}
                <div className="mt-3 hidden lg:flex flex-wrap gap-2">
                  {days.map((d, di) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setActiveDayIdx(di)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        di === activeDayIdx
                          ? 'bg-terracotta text-white shadow-sm'
                          : 'border border-ink/10 bg-white text-ink/65 hover:border-terracotta/40'
                      }`}
                    >
                      Day {d.day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={null}>
            {activeDragItem?.kind === 'stop' && (
              <div className="w-[min(420px,90vw)]">
                <PlannerCard
                  stop={activeDragItem.stop}
                  onUpdateField={() => {}}
                  onDelete={() => {}}
                  onFocus={() => {}}
                  isDragOverlay
                />
              </div>
            )}
            {activeDragItem?.kind === 'discovery' && (
              <DiscoveryDragPreview location={activeDragItem.location} />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Day-edit drawer */}
      <DayEditDrawer
        open={Boolean(editingDay)}
        day={editingDay?.day ?? null}
        onClose={() => setEditingDay(null)}
        onSave={(fields) => {
          if (!editingDay) return;
          updateDayMeta(activeGroup, editingDay.dayIdx, fields);
        }}
      />

      <DebugPanel versions={versions} debugInfo={debugInfo} syncStatus={syncStatus} />
    </section>
  );
}

function ViewToggleBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-ink text-cream shadow-sm' : 'text-ink/55 hover:text-ink'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function DiscoveryDragPreview({ location }) {
  return (
    <div className="rounded-xl border border-terracotta bg-white p-3 shadow-2xl">
      <p className="text-sm font-semibold text-ink">{location.name}</p>
      <p className="text-[11px] text-ink/55">{location.folderName}</p>
    </div>
  );
}
