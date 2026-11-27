export type GamePhase = 'LOBBY' | 'PLAYING' | 'GAME_OVER';

export type TurnStep =
  | 'WAIT_ROLL'
  | 'ROLLING'
  | 'MOVING'
  | 'RESOLVING'
  | 'SELECT_FESTIVAL'
  | 'SELECT_WORLD_TOUR'
  | 'GAME_END';

export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'RESORT'
  | 'CHANCE'
  | 'LOST_ISLAND'
  | 'FESTIVAL'
  | 'WORLD_TOUR'
  | 'TAX';

export type ColorGroup =
  | 'teal'
  | 'sky'
  | 'amber'
  | 'coral'
  | 'rose'
  | 'violet'
  | 'indigo'
  | 'ruby'
  | 'resort';

export type BoardSide = 'bottom' | 'left' | 'top' | 'right' | 'corner';

export interface BoardTile {
  id: number;
  name: string;
  shortName: string;
  subtitle?: string;
  type: TileType;
  side: BoardSide;
  row: number;
  col: number;
  group?: ColorGroup;
  /** Land purchase price (in K VNĐ units, e.g. 600 = 600K) */
  price?: number;
  /** Cost per house/hotel upgrade */
  houseCost?: number;
  /** Rent tiers: [land, 1 house, 2 houses, 3 houses, hotel] */
  rents?: [number, number, number, number, number];
  /** Tax base amount or percentage */
  taxAmount?: number;
  taxPercent?: number;
  landmarkTag?: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  badgeText: string;
  defaultColor: PlayerColorKey;
}

export type PlayerColorKey = 'red' | 'blue' | 'emerald' | 'purple';

export interface PlayerSlotConfig {
  id: number;
  name: string;
  isAI: boolean;
  characterId: string;
  color: PlayerColorKey;
}

export interface Player {
  id: number;
  name: string;
  isAI: boolean;
  characterId: string;
  avatar: string;
  color: PlayerColorKey;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  escapeCards: number;
  worldTourReady: boolean;
  doublesStreak: number;
  bankrupt: boolean;
}

export interface PropertyState {
  ownerId: number;
  /** 0 = land only, 1..3 = houses, 4 = 5-star hotel */
  level: 0 | 1 | 2 | 3 | 4;
  hasFestival: boolean;
}

export interface ChanceCard {
  id: string;
  title: string;
  description: string;
  kind: 'GAIN' | 'PAY' | 'MOVE_TO' | 'GO_JAIL' | 'ESCAPE_CARD' | 'REPAIR' | 'STORM';
  amount?: number;
  targetTileId?: number;
  collectStart?: boolean;
}

export type PendingModal =
  | { type: 'BUY_PROPERTY'; tileId: number }
  | { type: 'UPGRADE_PROPERTY'; tileId: number }
  | { type: 'BUYOUT_PROPERTY'; tileId: number; buyoutPrice: number }
  | { type: 'CHANCE_CARD'; card: ChanceCard }
  | { type: 'JAIL_OPTIONS' }
  | { type: 'LIQUIDATE'; amountOwed: number; creditorId: number | null; reason: string }
  | null;

export interface LogEntry {
  id: string;
  text: string;
  tone: 'neutral' | 'good' | 'warn' | 'bad';
  playerColor?: PlayerColorKey;
}

export type VictoryType =
  | 'BANKRUPTCY'
  | 'THREE_MONOPOLIES'
  | 'LINE_VICTORY'
  | 'FOUR_RESORTS';

export interface VictorySummary {
  winnerId: number;
  type: VictoryType;
  label: string;
  description: string;
}

export interface MoneyTransferEvent {
  id: string;
  seq: number;
  fromId: number | 'BANK';
  toId: number | 'BANK';
  amount: number;
  reason: string;
}

export interface ChanceNoticeEvent {
  id: string;
  seq: number;
  playerId: number;
  card: ChanceCard;
}

