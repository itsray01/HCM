import { useCallback, useEffect, useState } from 'react';
import { ref as dbRef, onValue, set, remove } from 'firebase/database';
import { rtdb } from '../firebase.js';

// Trip-scoped photo blocklist shared between users via RTDB.
//   /trips/{tripId}/photoBlocklist/{placeId}/{photoRef}: true
//
// `photoRef` is the Google Places photo_reference, which is URL-safe base64
// (only [A-Za-z0-9_-]) — Firebase-key-safe. We still URL-encode defensively
// in case a future ref contains a forbidden character.

const TRIP_ID = 'hcm-2026';

function keyFor(ref) {
  return encodeURIComponent(ref).replace(/\./g, '%2E');
}

export function usePhotoBlocklist() {
  const [blocklist, setBlocklist] = useState({}); // { [placeId]: { [encodedRef]: true } }

  useEffect(() => {
    const r = dbRef(rtdb, `trips/${TRIP_ID}/photoBlocklist`);
    const unsub = onValue(r, (snap) => {
      setBlocklist(snap.val() || {});
    });
    return () => unsub();
  }, []);

  const isHidden = useCallback(
    (placeId, ref) => {
      if (!placeId || !ref) return false;
      return Boolean(blocklist?.[placeId]?.[keyFor(ref)]);
    },
    [blocklist],
  );

  const hide = useCallback((placeId, ref) => {
    if (!placeId || !ref) return;
    const k = keyFor(ref);
    setBlocklist((b) => ({
      ...b,
      [placeId]: { ...(b[placeId] || {}), [k]: true },
    }));
    set(dbRef(rtdb, `trips/${TRIP_ID}/photoBlocklist/${placeId}/${k}`), true)
      .catch((err) => console.warn('[photoBlocklist] hide failed:', err.message));
  }, []);

  const unhide = useCallback((placeId, ref) => {
    if (!placeId || !ref) return;
    const k = keyFor(ref);
    setBlocklist((b) => {
      if (!b[placeId]) return b;
      const next = { ...b[placeId] };
      delete next[k];
      return { ...b, [placeId]: next };
    });
    remove(dbRef(rtdb, `trips/${TRIP_ID}/photoBlocklist/${placeId}/${k}`))
      .catch((err) => console.warn('[photoBlocklist] unhide failed:', err.message));
  }, []);

  const hiddenCount = useCallback(
    (placeId) => {
      if (!placeId) return 0;
      return Object.keys(blocklist?.[placeId] || {}).length;
    },
    [blocklist],
  );

  return { blocklist, isHidden, hide, unhide, hiddenCount };
}

/**
 * Extract the photo_reference from a Google Places photo URL.
 * Handles both `?photoreference=` (request format) and `?photo_reference=`
 * (sometimes returned after redirect).
 */
export function refFromPhotoUrl(url) {
  if (!url) return null;
  const m = url.match(/[?&]photo(?:_)?reference=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
