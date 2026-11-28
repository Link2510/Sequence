import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { RoomSeatInfo, RoomState } from '../game/types';
import { getFirestoreDb, isFirebaseConfigured } from '../lib/firebaseClient';

export type TransportMode = 'firebase' | 'server' | 'local';

const LOCAL_ROOM_PREFIX = 'lotr_room_';

/** Firestore rejects `undefined` field values; drop them before writing a room. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) out[key] = stripUndefined(val);
    }
    return out as T;
  }
  return value;
}

export function getLocalPlayerIdentity(): { playerId: string; playerName: string } {
  if (typeof window === 'undefined') {
    return { playerId: 'player-ssr', playerName: 'Lữ Khách' };
  }
  let playerId = window.localStorage.getItem('lotr_player_id');
  if (!playerId) {
    playerId = 'p-' + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem('lotr_player_id', playerId);
  }
  const playerName = window.localStorage.getItem('lotr_player_name') || 'Người Chơi';
  return { playerId, playerName };
}

export function saveLocalPlayerName(name: string): void {
  if (typeof window !== 'undefined' && name.trim()) {
    window.localStorage.setItem('lotr_player_name', name.trim().slice(0, 24));
  }
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `RING-${suffix}`;
}

export function buildInviteUrl(roomCode: string): string {
  if (typeof window === 'undefined') return `?room=${roomCode}`;
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomCode);
  return url.toString();
}

function buildInitialSeats(hostId: string, hostName: string): RoomSeatInfo[] {
  return [
    { seatIndex: 0, playerId: hostId, playerName: hostName, isBot: false, ready: true },
    { seatIndex: 1, playerId: null, playerName: 'Chỗ Trống (Hoặc AI)', isBot: true, ready: true },
    { seatIndex: 2, playerId: null, playerName: 'Chỗ Trống (Hoặc AI)', isBot: true, ready: true },
    { seatIndex: 3, playerId: null, playerName: 'Chỗ Trống (Hoặc AI)', isBot: true, ready: true },
  ];
}

async function detectServerApiAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

let serverAvailableCache: boolean | null = null;

export async function resolveTransportMode(): Promise<TransportMode> {
  if (isFirebaseConfigured()) return 'firebase';
  if (serverAvailableCache === null) {
    serverAvailableCache = await detectServerApiAvailable();
  }
  return serverAvailableCache ? 'server' : 'local';
}

function broadcastLocalRoom(room: RoomState): void {
  try {
    window.localStorage.setItem(LOCAL_ROOM_PREFIX + room.code, JSON.stringify(room));
    const bc = new BroadcastChannel(`lotr_room_${room.code}`);
    bc.postMessage(room);
    bc.close();
  } catch {
    // ignore storage errors
  }
}

export async function createRoom(
  hostId: string,
  hostName: string,
  chapterId: number
): Promise<{ room: RoomState; mode: TransportMode }> {
  const code = generateRoomCode();
  const room: RoomState = {
    code,
    hostId,
    chapterId,
    status: 'LOBBY',
    seats: buildInitialSeats(hostId, hostName),
    gameState: null,
    updatedAt: Date.now(),
  };

  const mode = await resolveTransportMode();

  if (mode === 'firebase') {
    const db = getFirestoreDb();
    if (!db) throw new Error('Chưa cấu hình Firestore');
    await setDoc(doc(db, 'rooms', code), stripUndefined(room));
    return { room, mode };
  }

  if (mode === 'server') {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
    if (!res.ok) throw new Error('Không thể tạo phòng trên máy chủ');
    const created = (await res.json()) as RoomState;
    return { room: created, mode };
  }

  broadcastLocalRoom(room);
  return { room, mode: 'local' };
}

export async function fetchRoom(
  roomCode: string
): Promise<{ room: RoomState | null; mode: TransportMode }> {
  const code = roomCode.trim().toUpperCase();
  const mode = await resolveTransportMode();

  if (mode === 'firebase') {
    const db = getFirestoreDb();
    if (!db) return { room: null, mode };
    const snap = await getDoc(doc(db, 'rooms', code));
    return { room: snap.exists() ? (snap.data() as RoomState) : null, mode };
  }

  if (mode === 'server') {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
    if (!res.ok) return { room: null, mode };
    const data = (await res.json()) as RoomState;
    return { room: data, mode };
  }

  const raw = window.localStorage.getItem(LOCAL_ROOM_PREFIX + code);
  return { room: raw ? (JSON.parse(raw) as RoomState) : null, mode: 'local' };
}

export async function updateRoom(room: RoomState): Promise<void> {
  const nextRoom: RoomState = { ...room, updatedAt: Date.now() };
  const mode = await resolveTransportMode();

  if (mode === 'firebase') {
    const db = getFirestoreDb();
    if (!db) return;
    await setDoc(doc(db, 'rooms', nextRoom.code), stripUndefined(nextRoom));
    return;
  }

  if (mode === 'server') {
    await fetch(`/api/rooms/${encodeURIComponent(nextRoom.code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextRoom),
    });
    return;
  }

  broadcastLocalRoom(nextRoom);
}

export async function joinRoomSeat(
  roomCode: string,
  playerId: string,
  playerName: string,
  preferredSeatIndex?: number
): Promise<RoomState | null> {
  const { room } = await fetchRoom(roomCode);
  if (!room) return null;

  // Already in room?
  const existingIdx = room.seats.findIndex((s) => s.playerId === playerId);
  if (existingIdx >= 0) {
    const updatedSeats = room.seats.map((s, idx) =>
      idx === existingIdx ? { ...s, playerName, isBot: false } : s
    );
    const next = { ...room, seats: updatedSeats };
    await updateRoom(next);
    return next;
  }

  // Pick requested open seat or first bot/open seat
  let targetIdx =
    preferredSeatIndex !== undefined &&
    room.seats[preferredSeatIndex] &&
    room.seats[preferredSeatIndex].playerId === null
      ? preferredSeatIndex
      : room.seats.findIndex((s) => s.playerId === null);

  if (targetIdx < 0) {
    return room; // Room is full (4 human players)
  }

  const updatedSeats = room.seats.map((s, idx) =>
    idx === targetIdx
      ? { seatIndex: idx, playerId, playerName, isBot: false, ready: true }
      : s
  );

  const next = { ...room, seats: updatedSeats };
  await updateRoom(next);
  return next;
}

export function subscribeToRoom(
  roomCode: string,
  onUpdate: (room: RoomState) => void,
  onError?: (err: string) => void
): () => void {
  const code = roomCode.trim().toUpperCase();
  let cleanup: (() => void) | null = null;
  let cancelled = false;

  resolveTransportMode().then((mode) => {
    if (cancelled) return;

    if (mode === 'firebase') {
      const db = getFirestoreDb();
      if (!db) {
        onError?.('Chưa cấu hình Firestore');
        return;
      }
      cleanup = onSnapshot(
        doc(db, 'rooms', code),
        (snap) => {
          if (snap.exists()) {
            onUpdate(snap.data() as RoomState);
          }
        },
        (err) => {
          onError?.(err.message);
        }
      );
      return;
    }

    if (mode === 'server') {
      const es = new EventSource(`/api/rooms/${encodeURIComponent(code)}/events`);
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as RoomState;
          onUpdate(parsed);
        } catch {
          // ignore malformed ping
        }
      };
      es.onerror = () => {
        // SSE auto-reconnects; fallback poll if needed
      };
      cleanup = () => es.close();
      return;
    }

    const bc = new BroadcastChannel(`lotr_room_${code}`);
    bc.onmessage = (ev) => {
      if (ev.data) onUpdate(ev.data as RoomState);
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LOCAL_ROOM_PREFIX + code && ev.newValue) {
        try {
          onUpdate(JSON.parse(ev.newValue) as RoomState);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    cleanup = () => {
      bc.close();
      window.removeEventListener('storage', onStorage);
    };
  });

  return () => {
    cancelled = true;
    cleanup?.();
  };
}
