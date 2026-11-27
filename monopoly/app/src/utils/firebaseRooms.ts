/* Firebase RTDB transport for the 32-tile business board.
   The browser that creates a room runs the authoritative room logic (tourServerCore);
   other devices send intents through RTDB and receive their private room view. */
import type { ClientWsMessage, ServerWsMessage } from '../types/room';
import {
  handleBrowserMessage,
  disconnectBrowserClient,
  setEmitFn,
} from './tourServerCore';

const CFG = {
  apiKey: 'AIzaSyBL7SP3B4QL6kN4mdKJ_yMtXOXyKagrZ2I',
  authDomain: 'sequence-23c7f.firebaseapp.com',
  databaseURL:
    'https://sequence-23c7f-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'sequence-23c7f',
  appId: '1:535984225423:web:53fd014176d3c3b59104fa',
};
const ROOT = 'lotr-fotr-rooms/tour-rooms';

let db: any = null;
let initPromise: Promise<boolean> | null = null;
let myClientId = '';
let hostAuthority = false;
let hostListening = false;
let onMessage: (msg: ServerWsMessage) => void = () => {};
const queued: ClientWsMessage[] = [];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load failed'));
    document.head.appendChild(s);
  });
}

function initialize(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const w = window as any;
      await loadScript(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'
      );
      await loadScript(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'
      );
      if (!w.firebase.apps || !w.firebase.apps.length)
        w.firebase.initializeApp(CFG);
      db = w.firebase.database();
      setEmitFn((clientId: string, msg: ServerWsMessage) => {
        db.ref(`${ROOT}/views/${clientId}`).set(msg);
      });
      return true;
    } catch {
      return false;
    }
  })();
  return initPromise;
}

/* RTDB drops empty objects and nulls, and turns arrays into keyed objects.
   Restore the shape the React UI expects before delivering a room view. */
function normalize(msg: ServerWsMessage): ServerWsMessage {
  if (!msg || msg.type !== 'ROOM_STATE') return msg;
  const room: any = msg.room;
  if (!room) return msg;
  room.slots = Array.isArray(room.slots) ? room.slots : Object.values(room.slots || {});
  const game: any = room.game;
  if (game) {
    game.players = Array.isArray(game.players)
      ? game.players
      : Object.values(game.players || {});
    game.logs = Array.isArray(game.logs) ? game.logs : Object.values(game.logs || {});
    game.dice = Array.isArray(game.dice) ? game.dice : Object.values(game.dice || {});
    game.ownership = game.ownership || {};
    game.lastMove = game.lastMove || null;
    game.pendingModal = game.pendingModal || null;
    game.victory = game.victory || null;
  }
  return msg;
}

function startHostListening() {
  if (hostListening || !db) return;
  hostListening = true;
  db.ref(`${ROOT}/intents`).on('child_added', (snap: any) => {
    const data = snap.val();
    if (!data || data.clientId === myClientId) return;
    try {
      handleBrowserMessage(data.clientId, data.raw);
    } catch {
      /* keep the room alive even if one intent is malformed */
    }
    snap.ref.remove();
  });
}

export async function connectFirebaseRooms(
  clientId: string,
  handler: (msg: ServerWsMessage) => void
): Promise<boolean> {
  myClientId = clientId;
  onMessage = handler;
  const ok = await initialize();
  if (!ok) return false;
  db.ref(`${ROOT}/views/${clientId}`).on('value', (snap: any) => {
    const msg = snap.val();
    if (msg && typeof msg.type === 'string') onMessage(normalize(msg));
  });
  if (hostAuthority) startHostListening();
  queued.splice(0).forEach((m) => sendFirebaseMessage(m));
  return true;
}

export function sendFirebaseMessage(msg: ClientWsMessage) {
  if (msg.type === 'CREATE_ROOM') {
    hostAuthority = true;
    startHostListening();
  }
  if (!db || !initPromise) {
    queued.push(msg);
    return;
  }
  const raw = JSON.stringify(msg);
  if (hostAuthority) {
    handleBrowserMessage(myClientId, raw);
  } else {
    db.ref(`${ROOT}/intents`).push({ clientId: myClientId, raw });
  }
}

export function disconnectFirebaseRooms() {
  if (!db) return;
  db.ref(`${ROOT}/views/${myClientId}`).off();
  db.ref(`${ROOT}/intents`).off();
  disconnectBrowserClient(myClientId);
}

export function firebaseRoomsReady(): boolean {
  return !!db;
}
