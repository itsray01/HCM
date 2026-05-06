import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref as dbRef,
  onValue,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyByWPSvucqPpOFfbZUIcYPKmHrB0NNA5Pg',
  authDomain: 'hcm1-b2769.firebaseapp.com',
  projectId: 'hcm1-b2769',
  storageBucket: 'hcm1-b2769.firebasestorage.app',
  messagingSenderId: '992446835681',
  appId: '1:992446835681:web:b22600a32848142d4800a0',
  databaseURL: 'https://hcm1-b2769-default-rtdb.asia-southeast1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);

// Firebase Realtime Database — uses the .read/.write rules you already set up
export const rtdb = getDatabase(app);

// ── Connection state observer ────────────────────────────────────────────────
// Firebase exposes a synthetic ref `.info/connected` that fires whenever the
// SDK's WebSocket connection status changes. We mirror it into a tiny pub/sub
// store so any component can react to it.

let _connected = false;
const _listeners = new Set();

function notify() { _listeners.forEach((l) => l(_connected)); }

onValue(dbRef(rtdb, '.info/connected'), (snap) => {
  const next = snap.val() === true;
  if (next === _connected) return;
  _connected = next;
  console.log(`[firebase] RTDB connection -> ${next ? 'CONNECTED' : 'DISCONNECTED'}`);
  notify();
});

export function getConnectionState() { return _connected; }

export function onConnectionChange(listener) {
  _listeners.add(listener);
  // Fire once with current state so subscriber gets initial value
  listener(_connected);
  return () => _listeners.delete(listener);
}
