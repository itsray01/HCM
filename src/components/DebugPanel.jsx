import { useEffect, useState } from 'react';
import { onConnectionChange, getConnectionState } from '../firebase.js';

const VERSION_IDS = ['all', 'parents', 'gf-bff'];

function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

function ago(ts) {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

function readLocalStorageStops() {
  try {
    const raw = localStorage.getItem('hcm-itinerary-v6');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return VERSION_IDS.reduce((acc, vId) => {
      acc[vId] = (parsed[vId] || []).reduce((n, d) => n + (d.stops?.length || 0), 0);
      return acc;
    }, {});
  } catch {
    return null;
  }
}

export default function DebugPanel({ versions, debugInfo, syncStatus }) {
  const [open, setOpen]         = useState(true);
  const [connected, setConn]    = useState(getConnectionState());
  const [_, force]              = useState(0); // tick to refresh "Xs ago" labels
  const [lsCounts, setLsCounts] = useState(readLocalStorageStops);

  useEffect(() => onConnectionChange(setConn), []);
  useEffect(() => {
    const t = setInterval(() => {
      force((n) => n + 1);
      setLsCounts(readLocalStorageStops());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Render only when ?debug=1 is in the URL (avoid clutter for normal users)
  const enabled = typeof window !== 'undefined' && window.location.search.includes('debug=1');
  if (!enabled) return null;

  const inMem = VERSION_IDS.reduce((acc, vId) => {
    acc[vId] = (versions?.[vId] || []).reduce((n, d) => n + (d.stops?.length || 0), 0);
    return acc;
  }, {});

  const di = debugInfo || {};

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
          padding: '8px 12px', borderRadius: 8,
          background: '#111', color: 'white', fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          border: '1px solid #333', cursor: 'pointer',
        }}
      >
        debug · {connected ? 'live' : 'offline'}
      </button>
    );
  }

  const row = (label, value, color) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0' }}>
      <span style={{ color: '#999' }}>{label}</span>
      <span style={{ color: color || 'white', textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
        width: 340, padding: 14, borderRadius: 10,
        background: 'rgba(15,15,15,0.96)', color: 'white',
        fontSize: 11, lineHeight: 1.5,
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        border: '1px solid #333',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>RTDB DEBUG</strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: '2px 8px', background: 'transparent', color: '#999',
            border: '1px solid #333', borderRadius: 4, cursor: 'pointer',
            fontSize: 11,
          }}
        >×</button>
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8 }}>
        {row('build', di.buildTime ? new Date(di.buildTime).toLocaleTimeString() : '?')}
        {row('build id', di.buildId || '?')}
        {row('session', di.sessionId || '?')}
        {row('connection',
          connected ? 'CONNECTED' : 'DISCONNECTED',
          connected ? '#4ade80' : '#f87171')}
        {row('sync',
          syncStatus,
          syncStatus === 'synced' ? '#4ade80' : syncStatus === 'error' ? '#f87171' : '#fbbf24')}
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 8 }}>
        <div style={{ color: '#666', marginBottom: 4 }}>STOPS COUNT</div>
        {VERSION_IDS.map((vId) => (
          <div key={vId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#999' }}>{vId}</span>
            <span>
              <span style={{ color: 'white' }}>mem {inMem[vId]}</span>
              <span style={{ color: '#666' }}> · </span>
              <span style={{ color: lsCounts && lsCounts[vId] !== inMem[vId] ? '#fbbf24' : '#666' }}>
                ls {lsCounts ? lsCounts[vId] : '—'}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 8 }}>
        <div style={{ color: '#666', marginBottom: 4 }}>LAST SNAPSHOT</div>
        {di.lastSnapshot ? (
          <>
            {row('vId',     di.lastSnapshot.vId)}
            {row('exists',  String(di.lastSnapshot.exists))}
            {row('stops',   di.lastSnapshot.stops)}
            {row('cache',   String(di.lastSnapshot.fromCache))}
            {row('when',    `${fmtTime(di.lastSnapshot.ts)} (${ago(di.lastSnapshot.ts)})`)}
            {row('applied', di.snapshotCount)}
            {row('suppressed', di.suppressedCount, di.suppressedCount > 0 ? '#fbbf24' : '#666')}
          </>
        ) : <div style={{ color: '#666' }}>—</div>}
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 8 }}>
        <div style={{ color: '#666', marginBottom: 4 }}>LAST WRITE</div>
        {di.lastWrite ? (
          <>
            {row('vId',     di.lastWrite.vId)}
            {row('reason',  di.lastWrite.reason)}
            {row('status',  di.lastWrite.status,
              di.lastWrite.status === 'ok' ? '#4ade80' : '#f87171')}
            {di.lastWrite.error && row('error', di.lastWrite.error, '#f87171')}
            {row('when',    `${fmtTime(di.lastWrite.ts)} (${ago(di.lastWrite.ts)})`)}
            {row('total',   di.writeCount)}
          </>
        ) : <div style={{ color: '#666' }}>—</div>}
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 8, display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('hcm-itinerary-v6');
            localStorage.removeItem('hcm-itinerary-v5');
            localStorage.removeItem('hcm-itinerary-v4');
            localStorage.removeItem('hcm-itinerary-v3');
            localStorage.removeItem('hcm-photo-cache-v1');
            location.reload();
          }}
          style={{
            flex: 1, padding: '6px 8px', background: '#dc2626', color: 'white',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11,
            fontFamily: 'inherit',
          }}
        >clear LS + reload</button>
        <button
          type="button"
          onClick={() => location.reload()}
          style={{
            flex: 1, padding: '6px 8px', background: '#374151', color: 'white',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11,
            fontFamily: 'inherit',
          }}
        >reload</button>
      </div>
    </div>
  );
}
