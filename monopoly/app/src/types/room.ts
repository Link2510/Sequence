import {
  BoardTile,
  LogEntry,
  PendingModal,
  Player,
  PlayerColorKey,
  PropertyState,
  TurnStep,
  VictorySummary,
} from './game.ts';

export type SlotKind = 'HUMAN' | 'AI' | 'OPEN';

export interface RoomSlotView {
  slotIndex: number;
  kind: SlotKind;
  isHost: boolean;
  isYou: boolean;
  name: string;
  characterId: string;
  color: PlayerColorKey;
  ready: boolean;
  connected: boolean;
}

export interface RoomMoveEvent {
  seq: number;
  playerId: number;
  from: number;
  to: number;
  steps: number;
}

export interface RoomGameState {
  players: Player[];
  ownership: Record<number, PropertyState>;
  currentPlayerIndex: number;
  turnStep: TurnStep;
  dice: [number, number];
  lastMove: RoomMoveEvent | null;
  pendingModal: {
    forPlayerId: number;
    modal: PendingModal;
  } | null;
  logs: LogEntry[];
  victory: VictorySummary | null;
}

export interface RoomPublicView {
  code: string;
  status: 'WAITING' | 'PLAYING' | 'GAME_OVER';
  startingCash: number;
  yourSlotIndex: number | null;
  isHost: boolean;
  slots: RoomSlotView[];
  game: RoomGameState | null;
}

export type ClientWsMessage =
  | { type: 'CREATE_ROOM'; clientId: string; playerName: string; characterId?: string; color?: PlayerColorKey }
  | { type: 'JOIN_ROOM'; clientId: string; code: string; playerName: string }
  | { type: 'LEAVE_ROOM'; clientId: string; code: string }
  | { type: 'UPDATE_MY_SLOT'; clientId: string; code: string; name?: string; characterId?: string; color?: PlayerColorKey; ready?: boolean }
  | { type: 'SET_SLOT_KIND'; clientId: string; code: string; slotIndex: number; kind: 'AI' | 'OPEN' }
  | { type: 'FILL_AI_SLOTS'; clientId: string; code: string }
  | { type: 'SET_STARTING_CASH'; clientId: string; code: string; startingCash: number }
  | { type: 'START_ROOM_GAME'; clientId: string; code: string }
  | { type: 'RETURN_TO_WAITING'; clientId: string; code: string }
  | { type: 'GAME_ACTION'; clientId: string; code: string; action: GameActionPayload };

export type GameActionPayload =
  | { kind: 'ROLL_DICE' }
  | { kind: 'BUY_PROPERTY'; tileId: number; targetLevel: 0 | 1 | 2 | 3 }
  | { kind: 'UPGRADE_PROPERTY'; tileId: number; targetLevel: 1 | 2 | 3 | 4 }
  | { kind: 'BUYOUT_PROPERTY'; tileId: number }
  | { kind: 'SKIP_BUY' }
  | { kind: 'CONFIRM_CHANCE' }
  | { kind: 'JAIL_PAY_BAIL' }
  | { kind: 'JAIL_USE_CARD' }
  | { kind: 'JAIL_ROLL_DOUBLES' }
  | { kind: 'SELECT_FESTIVAL_TILE'; tileId: number }
  | { kind: 'SELECT_WORLD_TOUR_TILE'; tileId: number }
  | { kind: 'SELL_PROPERTY_DEBT'; tileId: number }
  | { kind: 'SETTLE_DEBT' }
  | { kind: 'DECLARE_BANKRUPTCY' };

export type ServerWsMessage =
  | { type: 'ROOM_STATE'; room: RoomPublicView }
  | { type: 'ROOM_LEFT' }
  | { type: 'ERROR'; message: string };

export type TileHoverInfo = BoardTile;
