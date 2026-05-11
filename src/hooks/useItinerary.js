import { useState, useEffect, useRef } from 'react';
import {
  ref as dbRef,
  set,
  onValue,
  off,
} from 'firebase/database';
import { rtdb } from '../firebase.js';
import {
  itineraryDays,
  itineraryParents,
  itineraryGfBff,
} from '../data/itinerary.js';

// Build constants injected by Vite at build time.
// eslint-disable-next-line no-undef
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';
// eslint-disable-next-line no-undef
const BUILD_ID   = typeof __BUILD_ID__   !== 'undefined' ? __BUILD_ID__   : 'dev';

const TRIP_ID     = 'hcm-2026';
const LS_KEY      = 'hcm-itinerary-v7'; // bumped: PANG PANG + Bitexco buffet + Bánh Canh Cua 87 etc.
const VERSION_IDS = ['all', 'parents', 'gf-bff'];

const SEED = {
  all:      itineraryDays,
  parents:  itineraryParents,
  'gf-bff': itineraryGfBff,
};

// Per-tab session ID — lets us distinguish logs between normal/incognito windows.
const SESSION_ID = Math.random().toString(36).slice(2, 8);
const TAG        = `[useItinerary][s:${SESSION_ID}][b:${BUILD_ID}]`;

console.log(`${TAG} module loaded — build ${BUILD_TIME}`);

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (VERSION_IDS.every((id) => Array.isArray(parsed[id]))) return parsed;
    return null;
  } catch {
    return null;
  }
}

function lsSave(versions) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(versions)); } catch { /* ignore */ }
}

function countStops(versions) {
  return VERSION_IDS.reduce((acc, vId) => {
    acc[vId] = (versions?.[vId] || []).reduce((n, d) => n + (d.stops?.length || 0), 0);
    return acc;
  }, {});
}

// ── RTDB helpers ──────────────────────────────────────────────────────────────

function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function versionRef(vId) {
  return dbRef(rtdb, `trips/${TRIP_ID}/versions/${vId}`);
}

function writeToDB(vId, days) {
  return set(versionRef(vId), { days: stripUndefined(days) });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useItinerary() {
  const [versions,   setVersions]   = useState(() => {
    const loaded = lsLoad();
    console.log(`${TAG} initial state from`, loaded ? 'localStorage' : 'SEED', '— stops:',
      countStops(loaded ?? SEED));
    return loaded ?? SEED;
  });
  const [syncStatus, setSyncStatus] = useState('connecting');
  const versionsRef = useRef(versions);

  /**
   * Per-version pending-write counter.
   * While a version has > 0 writes in flight, ALL incoming snapshots for that
   * version are suppressed. This prevents:
   *   (a) echoes of our own writes from "applying" stale older state
   *   (b) snapshots from older queued writes overwriting newer optimistic state
   *
   * After all pending writes resolve, the next snapshot is the source of truth.
   */
  const pendingWrites = useRef({ all: 0, parents: 0, 'gf-bff': 0 });

  // Debug telemetry exposed to UI
  const [debugInfo, setDebugInfo] = useState({
    sessionId:    SESSION_ID,
    buildId:      BUILD_ID,
    buildTime:    BUILD_TIME,
    lastSnapshot: null,
    lastWrite:    null,
    snapshotCount: 0,
    writeCount:    0,
    suppressedCount: 0,
  });

  function recordSnapshot(info) {
    setDebugInfo((d) => ({ ...d, lastSnapshot: info, snapshotCount: d.snapshotCount + 1 }));
  }
  function recordSuppressed() {
    setDebugInfo((d) => ({ ...d, suppressedCount: d.suppressedCount + 1 }));
  }
  function recordWrite(info) {
    setDebugInfo((d) => ({ ...d, lastWrite: info, writeCount: d.writeCount + 1 }));
  }

  useEffect(() => {
    console.log(`${TAG} useEffect MOUNT`);
    let cancelled = false;
    const cleanups = [];

    VERSION_IDS.forEach((vId) => {
      const ref     = versionRef(vId);
      const handler = (snap) => {
        if (cancelled) {
          console.log(`${TAG} snapshot ignored (cancelled) for ${vId}`);
          return;
        }

        const exists    = snap.exists();
        const fromCache = snap.metadata?.fromCache ?? null;
        const days      = exists ? snap.val()?.days : null;
        const stopCount = Array.isArray(days) ? days.reduce((n, d) => n + (d.stops?.length || 0), 0) : 0;

        // ⚠️ CRITICAL: suppress snapshots while we have writes in flight.
        // Otherwise an echo of an older write (or another tab's snapshot
        // arriving mid-flight) can revert our newest optimistic state.
        if (pendingWrites.current[vId] > 0) {
          console.log(
            `${TAG} snapshot vId=${vId} SUPPRESSED (${pendingWrites.current[vId]} writes pending) ` +
            `stops=${stopCount}`,
          );
          recordSuppressed();
          return;
        }

        console.log(
          `${TAG} snapshot vId=${vId} exists=${exists} fromCache=${fromCache} stops=${stopCount}`,
        );
        recordSnapshot({ vId, ts: Date.now(), exists, stops: stopCount, fromCache });

        if (!exists) {
          setSyncStatus('synced');
          return;
        }

        if (!Array.isArray(days)) {
          console.log(`${TAG} snapshot vId=${vId} has malformed data, ignoring`);
          setSyncStatus('synced');
          return;
        }

        const localJson  = JSON.stringify(versionsRef.current[vId]);
        const remoteJson = JSON.stringify(days);
        if (localJson === remoteJson) {
          console.log(`${TAG} snapshot vId=${vId} matches local — skip`);
          setSyncStatus('synced');
          return;
        }

        const localStops = (versionsRef.current[vId] || []).reduce((n, d) => n + (d.stops?.length || 0), 0);
        console.log(
          `${TAG} APPLYING server snapshot vId=${vId}: local=${localStops} -> remote=${stopCount}`,
        );

        const updated = { ...versionsRef.current, [vId]: days };
        versionsRef.current = updated;
        setVersions(updated);
        lsSave(updated);
        setSyncStatus('synced');
      };

      onValue(ref, handler, (err) => {
        console.warn(`${TAG} RTDB listener error vId=${vId}:`, err.message);
        if (!cancelled) setSyncStatus('error');
      });

      cleanups.push(() => {
        console.log(`${TAG} detaching listener for vId=${vId}`);
        off(ref, 'value', handler);
      });
    });

    return () => {
      console.log(`${TAG} useEffect UNMOUNT`);
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Write helpers ─────────────────────────────────────────────────────────

  function _getDays(vId) {
    return versionsRef.current[vId] ?? SEED[vId];
  }

  function _applyAndWrite(vId, newDays, reason = 'unknown') {
    const cleaned = stripUndefined(newDays);
    const updated = { ...versionsRef.current, [vId]: cleaned };
    const stopCount = cleaned.reduce((n, d) => n + (d.stops?.length || 0), 0);

    pendingWrites.current[vId] = (pendingWrites.current[vId] || 0) + 1;
    console.log(
      `${TAG} WRITE start vId=${vId} reason=${reason} stops=${stopCount} ` +
      `pending=${pendingWrites.current[vId]}`,
    );

    versionsRef.current = updated;
    setVersions(updated);
    lsSave(updated);

    setSyncStatus('connecting');
    const startedAt = Date.now();
    writeToDB(vId, cleaned)
      .then(() => {
        const dur = Date.now() - startedAt;
        pendingWrites.current[vId] = Math.max(0, (pendingWrites.current[vId] || 1) - 1);
        console.log(
          `${TAG} WRITE ok    vId=${vId} reason=${reason} (${dur}ms) ` +
          `pending=${pendingWrites.current[vId]}`,
        );
        recordWrite({ vId, ts: Date.now(), status: 'ok', error: null, reason });
        if (pendingWrites.current[vId] === 0) setSyncStatus('synced');
      })
      .catch((err) => {
        const dur = Date.now() - startedAt;
        pendingWrites.current[vId] = Math.max(0, (pendingWrites.current[vId] || 1) - 1);
        console.error(
          `${TAG} WRITE FAIL vId=${vId} reason=${reason} (${dur}ms): ${err.message} ` +
          `pending=${pendingWrites.current[vId]}`,
        );
        recordWrite({ vId, ts: Date.now(), status: 'error', error: err.message, reason });
        setSyncStatus('error');
      });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function updateStop(vId, dayIdx, stopIdx, updatedStop) {
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => {
      if (di !== dayIdx) return d;
      return { ...d, stops: d.stops.map((s, si) => si === stopIdx ? stripUndefined(updatedStop) : s) };
    }), 'updateStop');
  }

  function addStop(vId, dayIdx, newStop) {
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => {
      if (di !== dayIdx) return d;
      return { ...d, stops: [...d.stops, stripUndefined(newStop)] };
    }), 'addStop');
  }

  function deleteStop(vId, dayIdx, stopIdx) {
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => {
      if (di !== dayIdx) return d;
      return { ...d, stops: d.stops.filter((_, si) => si !== stopIdx) };
    }), 'deleteStop');
  }

  function updateDayMeta(vId, dayIdx, fields) {
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => di === dayIdx ? { ...d, ...fields } : d), 'updateDayMeta');
  }

  function reorderStops(vId, dayIdx, fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => {
      if (di !== dayIdx) return d;
      const stops = [...d.stops];
      const [moved] = stops.splice(fromIdx, 1);
      stops.splice(toIdx, 0, moved);
      return { ...d, stops };
    }), 'reorderStops');
  }

  function addExternalStop(vId, dayIdx, place, atIdx = null) {
    const newStop = {
      type: 'place', label: place.name,
      address: place.shortAddress || place.address,
      lat: place.lat, lng: place.lng,
      time: '12:00', notes: '', cost: 0,
    };
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => {
      if (di !== dayIdx) return d;
      const stops = [...d.stops];
      const at = atIdx == null ? stops.length : Math.max(0, Math.min(atIdx, stops.length));
      stops.splice(at, 0, newStop);
      return { ...d, stops };
    }), 'addExternalStop');
  }

  function addStopFromLocation(vId, dayIdx, location, atIdx = null) {
    if (!location) return;
    const newStop = {
      type: location.category === 'airbnb' ? 'airbnb' : 'place',
      locationId: location.id, label: location.name, time: '12:00',
      reservationRequired: Boolean(location.reservationRequired),
      reservationStatus: location.reservationRequired ? 'pending' : undefined,
      notes: '', cost: 0,
    };
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => {
      if (di !== dayIdx) return d;
      const stops = [...d.stops];
      const at = atIdx == null ? stops.length : Math.max(0, Math.min(atIdx, stops.length));
      stops.splice(at, 0, newStop);
      return { ...d, stops };
    }), 'addStopFromLocation');
  }

  function moveStopBetweenDays(vId, fromDayIdx, fromStopIdx, toDayIdx, toStopIdx) {
    if (fromDayIdx === toDayIdx && fromStopIdx === toStopIdx) return;
    const days    = _getDays(vId);
    const fromDay = days[fromDayIdx];
    if (!fromDay || !fromDay.stops[fromStopIdx]) return;
    const moving  = fromDay.stops[fromStopIdx];
    const newDays = days.map((d) => ({ ...d, stops: [...d.stops] }));
    newDays[fromDayIdx].stops.splice(fromStopIdx, 1);
    const at = toStopIdx == null
      ? newDays[toDayIdx].stops.length
      : Math.max(0, Math.min(toStopIdx, newDays[toDayIdx].stops.length));
    newDays[toDayIdx].stops.splice(at, 0, moving);
    _applyAndWrite(vId, newDays, 'moveStopBetweenDays');
  }

  function updateStopFields(vId, dayIdx, stopIdx, partial) {
    const days = _getDays(vId);
    _applyAndWrite(vId, days.map((d, di) => {
      if (di !== dayIdx) return d;
      return { ...d, stops: d.stops.map((s, si) => si === stopIdx ? stripUndefined({ ...s, ...partial }) : s) };
    }), 'updateStopFields');
  }

  return {
    versions,
    loading: syncStatus === 'connecting',
    syncStatus,
    debugInfo,
    updateStop,
    addStop,
    deleteStop,
    updateDayMeta,
    reorderStops,
    addStopFromLocation,
    addExternalStop,
    moveStopBetweenDays,
    updateStopFields,
  };
}
