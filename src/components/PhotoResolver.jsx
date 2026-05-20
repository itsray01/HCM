// Dev-only tool. Iterates every STOP shown on a planner card (across all three
// itinerary versions — full / parents / gf-bff) and asks the photo proxy to
// resolve it via Google's strict-text-search + point-bias. Shows the resolved
// name, photo, and place_id side-by-side so a human can verify before
// committing.
//
// Stops are deduplicated by the lookup key used in PlannerCard:
//   key = locations.find(byLocationId)?.name  ?? stop.label
//
// Stops with a PHOTO_OVERRIDES entry are skipped (the override always wins,
// so resolving a place_id for them would be wasted work).
//
// At the end, click "Copy JSON" — the output is a `{ "Name": "ChIJ..." }`
// block ready to paste into src/data/placeIds.js.

import { useEffect, useMemo, useRef, useState } from 'react';
import { getLocationById } from '../data/locations.js';
import { PLACE_IDS } from '../data/placeIds.js';
import {
  itineraryDays,
  itineraryParents,
  itineraryGfBff,
} from '../data/itinerary.js';
import { PHOTO_OVERRIDES } from '../utils/photoOverrides.js';

/**
 * Collect every unique stop shown on a card across the three itinerary versions.
 *
 * Each returned entry mirrors a "location" enough for the resolver's UI:
 *   { id, name, lat, lng, category, label, source }
 *
 * - `name`     — the key used to look up PLACE_IDS (matches PlannerCard's logic)
 * - `label`    — the stop.label shown on the card (for the user's reference)
 * - `lat/lng`  — from the underlying location (when locationId points to one)
 */
function collectStopsFromItineraries() {
  const seen = new Map(); // key → entry

  const visit = (stop, versionId) => {
    if (!stop || typeof stop !== 'object') return;
    if (!stop.label) return;
    // Skip pure transit stops — no card thumbnail there
    if (stop.type === 'transit') return;
    // Skip stops with a manual photo override — those always win
    if (PHOTO_OVERRIDES[stop.label]) return;

    const loc = stop.locationId ? getLocationById(stop.locationId) : null;
    const name = loc?.name ?? stop.label;
    if (seen.has(name)) {
      seen.get(name).versions.add(versionId);
      return;
    }
    seen.set(name, {
      id:       `stop-${name}`,
      name,
      label:    stop.label,
      lat:      loc?.lat ?? null,
      lng:      loc?.lng ?? null,
      category: loc?.category ?? stop.type ?? null,
      versions: new Set([versionId]),
      hasLocation: !!loc,
    });
  };

  const eachItinerary = (days, versionId) => {
    for (const day of days || []) {
      for (const stop of day.stops || []) visit(stop, versionId);
    }
  };

  eachItinerary(itineraryDays,    'all');
  eachItinerary(itineraryParents, 'parents');
  eachItinerary(itineraryGfBff,   'gf-bff');

  // Unresolved (no existing PLACE_IDS entry) first — that's what needs work.
  return Array.from(seen.values()).sort((a, b) => {
    const aHas = !!PLACE_IDS[a.name];
    const bHas = !!PLACE_IDS[b.name];
    if (aHas !== bHas) return aHas ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

async function resolveOne(loc) {
  const params = new URLSearchParams({ name: loc.name, resolve: '1' });
  if (loc.lat != null) params.set('lat', String(loc.lat));
  if (loc.lng != null) params.set('lng', String(loc.lng));
  try {
    const r = await fetch(`/api/place-photo?${params}`);
    return await r.json();
  } catch {
    return null;
  }
}

// Fetch just the Place Details photo for a known place_id. Used to render
// thumbnails for rows that already have a place_id in PLACE_IDS so the user
// can visually verify the existing entry is still correct.
async function fetchPhotoByPlaceId(placeId) {
  try {
    const r = await fetch(`/api/place-photo?placeId=${encodeURIComponent(placeId)}`);
    const data = await r.json();
    return data?.url ?? null;
  } catch {
    return null;
  }
}

// Paste a Wanderlog URL, Google Maps URL, or bare ChIJ… id; returns the
// canonical place_id + a preview photo so the user can confirm before adding.
async function resolveFromUrl(url) {
  try {
    const r = await fetch(`/api/wanderlog-resolve?url=${encodeURIComponent(url)}`);
    return await r.json();
  } catch {
    return null;
  }
}

// Detect whether the pasted text is a direct image URL we can use as a
// PHOTO_OVERRIDES entry — no API call needed, the URL goes straight into the
// stop's thumbnail. Returns the (possibly extracted) image URL, or null.
function extractImageUrl(pasted) {
  if (!pasted) return null;
  const trimmed = pasted.trim();

  // Google Image Search "View image" link: extract the real image URL
  // from the `imgurl` query param. Same for image landing pages.
  try {
    const u = new URL(trimmed);
    if (/(^|\.)google\./i.test(u.hostname) &&
        (u.pathname.includes('imgres') || u.pathname.includes('imglanding'))) {
      const imgurl = u.searchParams.get('imgurl');
      if (imgurl) {
        try { return decodeURIComponent(imgurl); } catch { return imgurl; }
      }
    }
  } catch { /* not a URL */ }

  // Direct image extensions
  if (/^https?:\/\/.+\.(jpe?g|png|webp|gif|avif|bmp)(\?.*)?(#.*)?$/i.test(trimmed)) {
    return trimmed;
  }

  // Known image CDN hostnames (Google, Imgur, common hotlinking-friendly hosts)
  if (/^https?:\/\/(lh\d+\.googleusercontent\.com|encrypted-tbn\d+\.gstatic\.com|[^/]*\.ggpht\.com|i\.imgur\.com|images\.unsplash\.com|[^/]*\.cloudfront\.net|res\.cloudinary\.com|[^/]*\.cloudinary\.com|[^/]*\.wixstatic\.com|[^/]*\.squarespace-cdn\.com)\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function gmapsUrl(placeId) {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

export default function PhotoResolver({ onClose }) {
  // Only iterate stops that actually appear as cards in the planner.
  const allLocs = useMemo(() => collectStopsFromItineraries(), []);

  // status:    'idle' | 'pending' | 'ok' | 'fail'
  // urlStatus: 'idle' | 'pending' | 'ok' | 'fail'  (paste-URL override)
  const [rows, setRows] = useState(() =>
    allLocs.map((l) => ({
      loc: l,
      status: PLACE_IDS[l.name] ? 'ok' : 'idle',
      placeId: PLACE_IDS[l.name] || null,
      photoUrl: null,
      dist: null,
      accepted: !!PLACE_IDS[l.name],
      // Paste-URL override (place lookup)
      urlInput:  '',
      urlStatus: 'idle',          // 'idle' | 'pending' | 'ok' | 'fail' | 'image'
      urlError:  null,
      urlPreview: null,           // { name, address, photoUrl } from the resolver
      // Image-URL override — paste a direct image link to bypass place_id
      // entirely. Used by the PHOTO_OVERRIDES block in the JSON output.
      imageOverride: null,        // string URL or null
    }))
  );
  const [running, setRunning]   = useState(false);
  const [progress, setProgress] = useState(0);

  // On mount, lazy-load thumbnails for rows that already have a place_id so
  // the user can visually verify the existing PLACE_IDS entries. Runs serially
  // to avoid blasting the photo proxy with N parallel requests.
  const initialLoadStarted = useRef(false);
  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;

    let cancelled = false;
    (async () => {
      // Snapshot the place_ids to load — we don't need to react to state changes
      // here; the override flow updates photoUrl synchronously when it resolves.
      const toLoad = rows
        .map((r, i) => ({ i, placeId: r.placeId }))
        .filter((x) => x.placeId);

      for (const { i, placeId } of toLoad) {
        if (cancelled) return;
        // eslint-disable-next-line no-await-in-loop
        const url = await fetchPhotoByPlaceId(placeId);
        if (cancelled) return;
        if (url) {
          setRows((cur) =>
            cur.map((row, idx) =>
              idx === i && row.placeId === placeId && !row.photoUrl
                ? { ...row, photoUrl: url }
                : row,
            ),
          );
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAll() {
    setRunning(true);
    const next = [...rows];
    for (let i = 0; i < next.length; i += 1) {
      if (next[i].accepted) continue; // skip already-locked ones
      next[i] = { ...next[i], status: 'pending' };
      setRows([...next]);
      setProgress(i + 1);
      // eslint-disable-next-line no-await-in-loop
      const r = await resolveOne(next[i].loc);
      if (r?.placeId) {
        next[i] = {
          ...next[i],
          status: 'ok',
          placeId: r.placeId,
          photoUrl: r.url || null,
          dist: r.dist ?? null,
          accepted: true,
        };
      } else {
        next[i] = { ...next[i], status: 'fail' };
      }
      setRows([...next]);
    }
    setRunning(false);
  }

  function toggle(i) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, accepted: !row.accepted } : row)));
  }

  function setUrlInput(i, value) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, urlInput: value } : row)));
  }

  async function runUrlOverride(i) {
    const cur = rows[i];
    const url = (cur.urlInput || '').trim();
    if (!url) return;

    // ── Image URL path — no API call, just use it directly ────────────────
    const imageUrl = extractImageUrl(url);
    if (imageUrl) {
      setRows((r) =>
        r.map((row, idx) =>
          idx === i
            ? {
                ...row,
                urlStatus: 'image',
                urlError:  null,
                urlPreview: null,
                imageOverride: imageUrl,
                photoUrl: imageUrl,   // show in the thumbnail column
                accepted: true,       // image overrides count toward "accepted"
              }
            : row,
        ),
      );
      return;
    }

    // ── Place URL / place_id path — server-side resolution ───────────────
    setRows((r) =>
      r.map((row, idx) =>
        idx === i ? { ...row, urlStatus: 'pending', urlError: null } : row,
      ),
    );
    const data = await resolveFromUrl(url);
    if (!data?.placeId) {
      setRows((r) =>
        r.map((row, idx) =>
          idx === i
            ? { ...row, urlStatus: 'fail', urlError: data?.error || 'no place_id found' }
            : row,
        ),
      );
      return;
    }
    setRows((r) =>
      r.map((row, idx) =>
        idx === i
          ? {
              ...row,
              urlStatus: 'ok',
              urlError:  null,
              urlPreview: {
                name:     data.name || null,
                address:  data.address || null,
                photoUrl: data.photoUrl || null,
              },
              // Apply to the row as the new canonical answer.
              status:   'ok',
              placeId:  data.placeId,
              photoUrl: data.photoUrl || row.photoUrl,
              accepted: true,
              imageOverride: null,    // clear any prior image override
            }
          : row,
      ),
    );
  }

  // Derived JSON output — TWO blocks:
  //   • PLACE_IDS       keyed by location.name (matches PlannerCard lookup)
  //   • PHOTO_OVERRIDES keyed by stop.label    (matches PHOTO_OVERRIDES lookup)
  // Rendered to a visible textarea below so it can be copied even when the
  // clipboard API is blocked (some contexts).
  const jsonText = useMemo(() => {
    const pids = {};
    const overrides = {};
    for (const r of rows) {
      if (r.accepted && r.imageOverride) {
        overrides[r.loc.label || r.loc.name] = r.imageOverride;
      } else if (r.accepted && r.placeId) {
        pids[r.loc.name] = r.placeId;
      }
    }
    const pidsJson = JSON.stringify(pids, null, 2);
    const ovrJson  = JSON.stringify(overrides, null, 2);
    const hasOverrides = Object.keys(overrides).length > 0;
    return hasOverrides
      ? `export const PLACE_IDS = ${pidsJson};\n\n// Append these into PHOTO_OVERRIDES in src/utils/photoOverrides.js\nexport const PHOTO_OVERRIDES_ADDITIONS = ${ovrJson};\n`
      : `export const PLACE_IDS = ${pidsJson};\n`;
  }, [rows]);

  function copyJson() {
    try { navigator.clipboard.writeText(jsonText); } catch { /* fall back to textarea */ }
  }

  const okCount   = rows.filter((r) => r.status === 'ok').length;
  const failCount = rows.filter((r) => r.status === 'fail').length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1100, maxHeight: '92vh',
          background: '#0e0e0e', color: 'white',
          borderRadius: 12, border: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12,
        }}
      >
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontSize: 14, flex: 1 }}>
            Resolve photo IDs · {allLocs.length} cards
            <span style={{ color: '#666', fontWeight: 'normal', fontSize: 11, marginLeft: 6 }}>
              (itinerary stops only · overrides excluded)
            </span>
          </strong>
          <span style={{ color: '#4ade80' }}>ok {okCount}</span>
          <span style={{ color: '#f87171' }}>fail {failCount}</span>
          {running && <span style={{ color: '#fbbf24' }}>{progress}/{allLocs.length}</span>}
          <button
            type="button"
            onClick={runAll}
            disabled={running}
            style={{
              padding: '6px 10px', background: '#1f6feb', color: 'white',
              border: 'none', borderRadius: 6, cursor: running ? 'wait' : 'pointer',
              fontFamily: 'inherit', fontSize: 12, opacity: running ? 0.6 : 1,
            }}
          >{running ? 'Resolving…' : 'Resolve all'}</button>
          <button
            type="button"
            onClick={copyJson}
            disabled={running}
            style={{
              padding: '6px 10px', background: '#16a34a', color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12,
            }}
          >Copy JSON</button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 10px', background: '#374151', color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12,
            }}
          >Close</button>
        </header>

        <div style={{ overflow: 'auto', padding: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#888', textAlign: 'left' }}>
                <th style={{ padding: 6, width: 32 }}>✓</th>
                <th style={{ padding: 6 }}>Name</th>
                <th style={{ padding: 6, width: 72 }}>Photo</th>
                <th style={{ padding: 6, width: 240 }}>Place ID</th>
                <th style={{ padding: 6, width: 90 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.loc.id} style={{ borderTop: '1px solid #1f1f1f' }}>
                  <td style={{ padding: 6, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={r.accepted}
                      onChange={() => toggle(i)}
                      disabled={!r.placeId}
                    />
                  </td>
                  <td style={{ padding: 6 }}>
                    <div style={{ color: 'white' }}>{r.loc.name}</div>
                    {r.loc.label && r.loc.label !== r.loc.name && (
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>
                        card label: "{r.loc.label}"
                      </div>
                    )}
                    <div style={{ color: '#666', fontSize: 11 }}>
                      {r.loc.category || '—'}
                      {r.loc.lat != null && r.loc.lng != null && (
                        <> · {r.loc.lat.toFixed(4)}, {r.loc.lng.toFixed(4)}</>
                      )}
                      {!r.loc.hasLocation && <> · <span style={{ color: '#fbbf24' }}>label-only</span></>}
                      {r.dist != null && <> · dist {Math.round(r.dist)}m</>}
                    </div>
                    <div style={{ color: '#555', fontSize: 10, marginTop: 1 }}>
                      in: {[...r.loc.versions].join(', ')}
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={r.urlInput}
                        onChange={(e) => setUrlInput(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            runUrlOverride(i);
                          }
                        }}
                        placeholder="paste Wanderlog URL · Google image URL · ChIJ… id"
                        spellCheck={false}
                        style={{
                          flex: 1, minWidth: 0,
                          background: '#020617', color: '#a5f3fc',
                          border: '1px solid #1e293b', borderRadius: 4,
                          padding: '3px 6px', fontSize: 11,
                          fontFamily: 'inherit',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => runUrlOverride(i)}
                        disabled={!r.urlInput.trim() || r.urlStatus === 'pending'}
                        style={{
                          padding: '3px 8px',
                          background: r.urlStatus === 'pending' ? '#374151' : '#0891b2',
                          color: 'white',
                          border: 'none', borderRadius: 4,
                          cursor: r.urlStatus === 'pending' ? 'wait' : 'pointer',
                          fontSize: 11, fontFamily: 'inherit',
                          opacity: !r.urlInput.trim() ? 0.4 : 1,
                        }}
                      >
                        {r.urlStatus === 'pending' ? '…' : 'use'}
                      </button>
                    </div>
                    {r.urlStatus === 'ok' && r.urlPreview && (
                      <div style={{
                        marginTop: 4, padding: '4px 6px',
                        background: '#022c22', border: '1px solid #064e3b',
                        borderRadius: 4, fontSize: 11, color: '#6ee7b7',
                      }}>
                        ✓ {r.urlPreview.name || 'matched'}
                        {r.urlPreview.address && (
                          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>
                            {r.urlPreview.address}
                          </div>
                        )}
                      </div>
                    )}
                    {r.urlStatus === 'image' && (
                      <div style={{
                        marginTop: 4, padding: '4px 6px',
                        background: '#1e1b4b', border: '1px solid #3730a3',
                        borderRadius: 4, fontSize: 11, color: '#c7d2fe',
                      }}>
                        ✓ image override (PHOTO_OVERRIDES)
                        <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 1, wordBreak: 'break-all' }}>
                          {r.imageOverride}
                        </div>
                      </div>
                    )}
                    {r.urlStatus === 'fail' && (
                      <div style={{
                        marginTop: 4, padding: '4px 6px',
                        background: '#3f1d1d', border: '1px solid #7f1d1d',
                        borderRadius: 4, fontSize: 11, color: '#fca5a5',
                      }}>
                        ✗ {r.urlError || 'failed'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 6 }}>
                    {r.photoUrl ? (
                      <a href={r.placeId ? gmapsUrl(r.placeId) : '#'} target="_blank" rel="noreferrer">
                        <img
                          src={r.photoUrl}
                          alt={r.loc.name}
                          style={{
                            width: 56, height: 56, objectFit: 'cover',
                            borderRadius: 6, border: '1px solid #333',
                          }}
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div style={{
                        width: 56, height: 56, borderRadius: 6,
                        background: '#1a1a1a', border: '1px solid #2a2a2a',
                      }} />
                    )}
                  </td>
                  <td style={{ padding: 6, color: '#bbb', wordBreak: 'break-all', fontSize: 11 }}>
                    {r.imageOverride ? (
                      <span style={{ color: '#a5b4fc' }}>image override</span>
                    ) : r.placeId ? (
                      <a
                        href={gmapsUrl(r.placeId)}
                        target="_blank" rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}
                      >{r.placeId}</a>
                    ) : <span style={{ color: '#444' }}>—</span>}
                  </td>
                  <td style={{ padding: 6 }}>
                    {r.status === 'ok'      && <span style={{ color: '#4ade80' }}>OK</span>}
                    {r.status === 'pending' && <span style={{ color: '#fbbf24' }}>…</span>}
                    {r.status === 'fail'    && <span style={{ color: '#f87171' }}>no match</span>}
                    {r.status === 'idle'    && <span style={{ color: '#555' }}>idle</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer style={{ padding: '10px 16px', borderTop: '1px solid #2a2a2a', color: '#888', fontSize: 11 }}>
          <div style={{ marginBottom: 6 }}>
            Three ways to fix a row:{' '}
            <strong style={{ color: '#a5f3fc' }}>(1)</strong> paste a <strong>Wanderlog place URL</strong>{' '}
            → page is fetched server-side and the embedded Google place_id is extracted.{' '}
            <strong style={{ color: '#c7d2fe' }}>(2)</strong> paste a direct{' '}
            <strong>image URL</strong> (Google Images, etc.) → goes straight into
            <code> PHOTO_OVERRIDES</code>, bypassing place_id.{' '}
            <strong style={{ color: '#a5f3fc' }}>(3)</strong> paste a bare <code>ChIJ…</code> id.
            Then "Copy JSON" — the output has separate <code>PLACE_IDS</code> and{' '}
            <code>PHOTO_OVERRIDES_ADDITIONS</code> blocks; paste each into its respective file.
          </div>
          <textarea
            readOnly
            value={jsonText}
            data-resolver-json="1"
            style={{
              width: '100%', height: 140, background: '#020617', color: '#a5f3fc',
              border: '1px solid #1e293b', borderRadius: 4, padding: 8,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11,
              resize: 'vertical',
            }}
          />
        </footer>
      </div>
    </div>
  );
}
