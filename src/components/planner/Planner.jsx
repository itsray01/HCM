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

  const plannerMapAnchorRef = useRef(null);

  // Bottom tab "Map" links to #planner-map — open map mode and scroll into view
  useEffect(() => {
    function onHash() {
      const h = window.location.hash;
      if (h === '#planner-map') {
        setMobileView('map');
        requestAnimationFrame(() => {
          plannerMapAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else if (h === '#plan') {
        setMobileView('list');
      }
    }
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function handleMobileView(mode) {
    setMobileView(mode);
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      const next = mode === 'map' ? '#planner-map' : '#plan';
      if (window.location.hash !== next) {
        window.history.replaceState(null, '', next);
      }
    }
  }

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
    if (mobileView === 'map') return undefined;

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
  }, [days.length, activeGroup, mobileView]);

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
      className="scroll-mt-20 border-b border-ink/10 bg-cream/50 py-6 sm:py-14"
    >
      <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold sm:mt-1 sm:h-7 sm:w-7" />
            <div>
              <h2 className="font-display text-xl font-semibold text-ink sm:text-3xl">
                Trip planner
              </h2>
              <p className="mt-0.5 text-xs text-ink/55 sm:mt-1 sm:text-sm">
                Drag from the library onto a day. Tap any card to edit.
              </p>
            </div>
          </div>
          {loading && (
            <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-terracotta/50 sm:mt-2 sm:h-5 sm:w-5" />
          )}
          {!loading && (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              syncStatus === 'synced' ? 'bg-green-50 text-green-700'
            : syncStatus === 'error' ? 'bg-red-50 text-red-600'
            : 'bg-amber-50 text-amber-600'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                syncStatus === 'synced' ? 'bg-green-500'
              : syncStatus === 'error' ? 'bg-red-500'
              : 'bg-amber-400 animate-pulse'
              }`} />
              {syncStatus === 'synced' ? 'Live' : syncStatus === 'error' ? 'Sync failed' : 'Syncing…'}
            </div>
          )}
        </div>

        {/* Group tabs */}
        <div className="mb-5">
          <div className="grid grid-cols-3 gap-2">
            {GROUPS.map((g) => {
              const Icon = g.icon;
              const isActive = g.id === activeGroup;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroup(g.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 transition lg:flex-row lg:gap-2 lg:px-3 ${
                    isActive
                      ? `${g.activeClasses} border-transparent shadow-md`
                      : 'border-ink/10 bg-white text-ink/65 shadow-sm hover:bg-white hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="text-center lg:text-left">
                    <div className="text-[10px] font-bold uppercase tracking-wide lg:text-[11px]">
                      <span className="lg:hidden">{g.label === 'Pei Qi + Celine' ? 'Pei Qi' : g.label}</span>
                      <span className="hidden lg:inline">{g.label}</span>
                    </div>
                    <div className={`hidden text-[10px] lg:block ${isActive ? 'opacity-75' : 'text-ink/45'}`}>
                      {g.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day picker — horizontal scroll strip (shown below lg) */}
          <div className="no-scrollbar -mx-3 mt-2 overflow-x-auto px-3 lg:hidden">
            <div className="flex gap-2 pb-1.5">
              {days.map((d, di) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => {
                    setActiveDayIdx(di);
                    setTimeout(() => {
                      dayBucketRefs.current[di]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    di === activeDayIdx
                      ? 'bg-terracotta text-white shadow-sm'
                      : 'border border-ink/10 bg-white text-ink/60'
                  }`}
                >
                  D{d.day}
                  {d.dateLabel && (
                    <span className="ml-1 font-normal opacity-70">
                      {d.dateLabel.replace(/[A-Za-z]+ /, '')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile view toggle */}
        <div className="mb-4 mt-3 flex items-center justify-center sm:mt-0 lg:hidden">
          <div className="flex w-full max-w-xs rounded-full border border-ink/10 bg-white p-1 shadow-sm sm:w-auto sm:inline-flex">
            <ViewToggleBtn
              active={mobileView === 'list'}
              onClick={() => handleMobileView('list')}
              icon={List}
              label="List"
            />
            <ViewToggleBtn
              active={mobileView === 'map'}
              onClick={() => handleMobileView('map')}
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
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
            {/* Sidebar / left pane */}
            <div className={`min-w-0 ${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
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

                <div className="sm:sticky sm:bottom-3 sm:z-30">
                  <BudgetSummary days={days} groupLabel={group.label} />
                </div>
              </div>
            </div>

            {/* Map pane — id anchors bottom-tab #planner-map */}
            <div
              ref={plannerMapAnchorRef}
              id="planner-map"
              className={`min-w-0 scroll-mt-24 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}
            >
              <div className="lg:sticky lg:top-20">
                <div
                  className={
                    mobileView === 'map'
                      ? 'h-[calc(100dvh-10.5rem)] min-h-[280px] w-full max-lg:-mx-3 max-lg:rounded-none max-lg:border-x-0 lg:h-[calc(100vh-7rem)] lg:min-h-[360px]'
                      : 'h-[70vh] min-h-[360px] lg:h-[calc(100vh-7rem)]'
                  }
                >
                  <PlannerMap
                    activeDay={activeDay}
                    focusedLocationId={focusedLocationId}
                    categoryFilter={categoryOverride}
                    gestureHandling={mobileView === 'map' ? 'greedy' : 'cooperative'}
                  />
                </div>

                {/* Day picker beneath map — hidden on mobile in List view; always on lg+ */}
                <div
                  className={
                    mobileView === 'list'
                      ? 'mt-3 hidden flex-wrap gap-2 lg:flex'
                      : 'mt-3 flex flex-wrap gap-2'
                  }
                >
                  {days.map((d, di) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setActiveDayIdx(di)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition lg:py-1 ${
                        di === activeDayIdx
                          ? 'bg-terracotta text-white shadow-sm'
                          : 'border border-ink/10 bg-white text-ink/65 hover:border-terracotta/40'
                      }`}
                    >
                      Day {d.day}
                      {d.dateLabel && (
                        <span className="ml-1 hidden font-normal opacity-80 sm:inline">
                          · {d.dateLabel.replace(/[A-Za-z]+ /, '')}
                        </span>
                      )}
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
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:py-1.5 sm:text-xs ${
        active ? 'bg-ink text-cream shadow-sm' : 'text-ink/55 hover:text-ink active:text-ink'
      }`}
    >
      <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
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
