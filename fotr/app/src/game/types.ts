export type Suit = 'hills' | 'forests' | 'mountains' | 'shadows' | 'rings';

export interface Card {
  id: string; // e.g. 'hills-5', 'rings-1'
  suit: Suit;
  rank: number; // 1..8 for standard suits, 1..5 for rings
}

export type CharacterId =
  | 'frodo'
  | 'bilbo'
  | 'gandalf'
  | 'samwise'
  | 'merry'
  | 'pippin'
  | 'aragorn'
  | 'legolas'
  | 'gimli'
  | 'boromir'
  | 'tom_bombadil'
  | 'goldberry'
  | 'glorfindel'
  | 'elrond'
  | 'galadriel';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  portraitUrl?: string;
  accentColor: string;
  crestType:
    | 'ring'
    | 'acorn'
    | 'staff'
    | 'lantern'
    | 'horn'
    | 'goblet'
    | 'sword'
    | 'bow'
    | 'axe'
    | 'shield'
    | 'feather'
    | 'lily'
    | 'star'
    | 'crown'
    | 'mirror';
  lore: string;
}

export interface ChapterCharacterRule {
  characterId: CharacterId;
  required: boolean;
  goalLabel: string;
  goalDescription: string;
  setupPower?: string;
}

export interface ChapterDef {
  id: number;
  title: string;
  englishTitle: string;
  subtitle: string;
  difficulty: 'Dễ (Khởi đầu)' | 'Trung bình' | 'Thử thách' | 'Cao cấp';
  storyIntro: string;
  specialRuleText?: string;
  hasBlackRider?: boolean;
  hasGandalfLostCardExchange?: boolean;
  characters: ChapterCharacterRule[]; // Exactly 4 seats for 4-player play
}

export type GoalStatus = 'met' | 'on_track' | 'failed';

export interface GoalEvaluation {
  status: GoalStatus;
  progressText: string;
}

export interface PlayedCard {
  seatIndex: number;
  card: Card;
  oneRingClaimWin?: boolean;
}

export interface TrickRecord {
  trickNumber: number;
  leadSeat: number;
  winnerSeat: number;
  cards: PlayedCard[];
}

export interface ExchangeTask {
  fromSeat: number;
  toSeat: number;
  label: string;
  completed: boolean;
}

export type GamePhase =
  | 'SETUP_EXCHANGE'
  | 'PLAYING'
  | 'TRICK_COMPLETE'
  | 'ROUND_OVER';

export interface PlayerSeat {
  seatIndex: number;
  name: string;
  isBot: boolean;
  playerId?: string;
  characterId: CharacterId;
  hand: Card[];
  wonTricks: TrickRecord[];
  wonCards: Card[];
}

export interface GameState {
  chapterId: number;
  phase: GamePhase;
  seats: PlayerSeat[];
  lostCard: Card;
  lostCardRevealedToSeat: number | null;
  blackRiderRank: number | null; // 1..4 for chapters with Black Rider
  ringsBroken: boolean;
  leadSeat: number;
  currentTurnSeat: number;
  trickNumber: number; // 1..9
  currentTrick: PlayedCard[];
  lastTrickWinnerSeat: number | null;
  exchangeQueue: ExchangeTask[];
  passedCardLog: string[];
  chapterVictory: boolean | null;
  actionLog: string[];
}

export type RoomStatus = 'LOBBY' | 'IN_GAME';

export interface RoomSeatInfo {
  seatIndex: number;
  playerId: string | null;
  playerName: string;
  isBot: boolean;
  ready: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  chapterId: number;
  status: RoomStatus;
  seats: RoomSeatInfo[];
  gameState: GameState | null;
  updatedAt: number;
}
