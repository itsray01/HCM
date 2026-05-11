// Dev-only tool. Iterates every location and asks the photo proxy to resolve
// it via Google's strict-text-search + point-bias. Shows the resolved name,
// photo, and place_id side-by-side with the location data so a human can
// verify before committing.
//
// At the end, click "Copy JSON" — the output is a `{ "Name": "ChIJ..." }`
// block ready to paste into src/data/placeIds.js.

import { useEffect, useMemo, useState } from 'react';
import { locations } from '../data/locations.js';
import { PLACE_IDS } from '../data/placeIds.js';

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

function gmapsUrl(placeId) {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

export default function PhotoResolver({ onClose }) {
  const allLocs = useMemo(
    () => locations.filter((l) => l.name && l.lat != null && l.lng != null),
    []
  );

  // status: 'idle' | 'pending' | 'ok' | 'fail'
  const [rows, setRows] = useState(() =>
    allLocs.map((l) => ({
      loc: l,
      status: PLACE_IDS[l.name] ? 'ok' : 'idle',
      placeId: PLACE_IDS[l.name] || null,
      photoUrl: null,
      dist: null,
      accepted: !!PLACE_IDS[l.name],
    }))
  );
  const [running, setRunning]   = useState(false);
  const [progress, setProgress] = useState(0);

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

  // Derived JSON string — also rendered to a visible textarea below so it can
  // be copied even when the clipboard API is blocked (some contexts).
  const jsonText = useMemo(() => {
    const obj = {};
    for (const r of rows) {
      if (r.accepted && r.placeId) obj[r.loc.name] = r.placeId;
    }
    return JSON.stringify(obj, null, 2);
  }, [rows]);

  function copyJson() {
    const body = `export const PLACE_IDS = ${jsonText};\n`;
    try { navigator.clipboard.writeText(body); } catch { /* fall back to textarea */ }
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
          width: '100%', maxWidth: 980, maxHeight: '92vh',
          background: '#0e0e0e', color: 'white',
          borderRadius: 12, border: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12,
        }}
      >
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontSize: 14, flex: 1 }}>Resolve photo IDs · {allLocs.length} places</strong>
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
                    <div style={{ color: '#666', fontSize: 11 }}>
                      {r.loc.category} · {r.loc.lat?.toFixed(4)}, {r.loc.lng?.toFixed(4)}
                      {r.dist != null && <> · dist {Math.round(r.dist)}m</>}
                    </div>
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
                    {r.placeId ? (
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
            Uncheck any wrong matches. Click "Copy JSON" or just select-all in the textarea
            below. Paste replaces the PLACE_IDS export in <code>src/data/placeIds.js</code>.
          </div>
          <textarea
            readOnly
            value={jsonText}
            data-resolver-json="1"
            style={{
              width: '100%', height: 100, background: '#020617', color: '#a5f3fc',
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
