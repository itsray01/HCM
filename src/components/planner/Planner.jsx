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
import PoiPanel from './PoiPanel.jsx';
import BudgetSummary from './BudgetSummary.jsx';
import { DayEditDrawer } from './PlannerDrawers.jsx';
import AddPlaceBar from './AddPlaceBar.jsx';
import TripHeader from './TripHeader.jsx';

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
  const [selectedPoi, setSelectedPoi] = useState(null);   // POI detail panel

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
  const leftColRef    = useRef(null);

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
      {
        // On desktop the left column scrolls independently — observe against
        // it. On mobile leftColRef is null which falls back to the viewport.
        root: leftColRef.current || null,
        threshold: Array.from({ length: 21 }, (_, i) => i / 20),
      }
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

  // Clear POI panel whenever the active day changes — its numbered marker for
  // that POI may no longer exist, so the panel reference would dangle.
  useEffect(() => { setSelectedPoi(null); }, [activeDayIdx, activeGroup]);

  const categoryOverride =
    activeFilter?.kind === 'category' ? activeFilter.id : null;

  return (
    <section id="plan" className="h-full overflow-hidden bg-cream/50">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragItem(null)}
      >
        <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(440px,520px)_minmax(0,1fr)]">
          {/* ── Left column ─ scrolls independently on desktop ─────────────── */}
          <div
            ref={leftColRef}
            className={`min-w-0 lg:h-full lg:overflow-y-auto lg:overflow-x-hidden lg:border-r lg:border-ink/10 ${
              mobileView === 'map' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="space-y-3 px-3 pb-10 pt-3 sm:px-4 sm:pt-4 lg:px-4">
              {/* Compact trip info card (replaces the old full-page Hero) */}
              <TripHeader />

              {/* Sync status + planner sub-heading */}
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                  <h2 className="font-display text-sm font-semibold text-ink">
                    Itinerary
                  </h2>
                </div>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-terracotta/50" />
                ) : (
                  <div
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      syncStatus === 'synced'
                        ? 'bg-green-50 text-green-700'
                        : syncStatus === 'error'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        syncStatus === 'synced'
                          ? 'bg-green-500'
                          : syncStatus === 'error'
                            ? 'bg-red-500'
                            : 'bg-amber-400 animate-pulse'
                      }`}
                    />
                    {syncStatus === 'synced'
                      ? 'Live'
                      : syncStatus === 'error'
                        ? 'Sync failed'
                        : 'Syncing…'}
                  </div>
                )}
              </div>

              {/* Group tabs */}
              <div className="grid grid-cols-3 gap-1.5">
                {GROUPS.map((g) => {
                  const Icon = g.icon;
                  const isActive = g.id === activeGroup;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveGroup(g.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                        isActive
                          ? `${g.activeClasses} border-transparent shadow-sm`
                          : 'border-ink/10 bg-white text-ink/60 hover:text-ink'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {g.label === 'Pei Qi + Celine' ? 'Pei Qi' : g.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile view toggle — switch between itinerary list and map */}
              <div className="lg:hidden">
                <div className="flex w-full rounded-full border border-ink/10 bg-white p-1 shadow-sm">
                  <ViewToggleBtn
                    active={mobileView === 'list'}
                    onClick={() => handleMobileView('list')}
                    icon={List}
                    label="Itinerary"
                  />
                  <ViewToggleBtn
                    active={mobileView === 'map'}
                    onClick={() => handleMobileView('map')}
                    icon={MapIcon}
                    label="Map"
                  />
                </div>
              </div>

              {/* Day jump strip — quick navigation in the scrolling left column */}
              <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
                <div className="flex gap-1.5 pb-1">
                  {days.map((d, di) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => {
                        setActiveDayIdx(di);
                        setTimeout(() => {
                          dayBucketRefs.current[di]?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                        }, 50);
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
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

              <div className="sticky bottom-0 z-30 -mx-1 bg-gradient-to-t from-cream/50 from-60% pb-1 pt-2">
                <BudgetSummary days={days} groupLabel={group.label} />
              </div>
            </div>
          </div>

          {/* ── Right column ─ map fills the full remaining viewport ───────── */}
          <div
            ref={plannerMapAnchorRef}
            id="planner-map"
            className={`min-w-0 ${mobileView === 'list' ? 'hidden lg:block' : 'block'} lg:h-full`}
          >
            <div
              className={`relative ${
                mobileView === 'map'
                  ? 'h-[calc(100dvh-10.5rem)] min-h-[280px] w-full lg:h-full'
                  : 'h-[60vh] min-h-[360px] lg:h-full'
              }`}
            >
              <PlannerMap
                activeDay={activeDay}
                focusedLocationId={focusedLocationId}
                categoryFilter={categoryOverride}
                onSelectPoi={setSelectedPoi}
                selectedPoiKey={selectedPoi?.key || null}
              />
              <PoiPanel poi={selectedPoi} onClose={() => setSelectedPoi(null)} />
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
