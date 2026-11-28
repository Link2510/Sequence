import { getChapterById } from './chapters';
import {
  Card,
  CharacterId,
  ExchangeTask,
  GameState,
  GoalEvaluation,
  PlayedCard,
  PlayerSeat,
  Suit,
  TrickRecord,
} from './types';

export const SUIT_ORDER: Suit[] = ['hills', 'forests', 'mountains', 'shadows', 'rings'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const standardSuits: Suit[] = ['hills', 'forests', 'mountains', 'shadows'];
  for (const suit of standardSuits) {
    for (let rank = 1; rank <= 8; rank++) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  for (let rank = 1; rank <= 5; rank++) {
    deck.push({ id: `rings-${rank}`, suit: 'rings', rank });
  }
  return deck;
}

export function shuffleCards<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return a.rank - b.rank;
  });
}

export function formatCardName(card: Card): string {
  const names: Record<Suit, string> = {
    hills: 'Đồi Cỏ',
    forests: 'Rừng Thẳm',
    mountains: 'Núi Đá',
    shadows: 'Bóng Tối',
    rings: 'Nhẫn',
  };
  if (card.id === 'rings-1') return '1 Nhẫn (Chiếc Nhẫn Duy Nhất)';
  return `${card.rank} ${names[card.suit]}`;
}

export interface SeatSetupSpec {
  name: string;
  isBot: boolean;
  playerId?: string;
}

export function dealChapter(chapterId: number, seatSpecs: SeatSetupSpec[]): GameState {
  const chapter = getChapterById(chapterId);
  const shuffled = shuffleCards(createDeck());

  // Pick Lost Card (cannot be 1 of Rings)
  let lostIdx = shuffled.findIndex((c) => c.id !== 'rings-1');
  if (lostIdx < 0) lostIdx = 0;
  const lostCard = shuffled[lostIdx];
  const remaining = shuffled.filter((_, idx) => idx !== lostIdx);

  // Deal 9 cards per seat
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < 36; i++) {
    hands[i % 4].push(remaining[i]);
  }

  // Whoever holds 1 of Rings must be Frodo
  let frodoSeat = hands.findIndex((h) => h.some((c) => c.id === 'rings-1'));
  if (frodoSeat < 0) frodoSeat = 0;

  const otherCharIds = chapter.characters
    .map((c) => c.characterId)
    .filter((id) => id !== 'frodo');
  const shuffledOthers = shuffleCards(otherCharIds);

  const seatCharIds: CharacterId[] = new Array(4);
  seatCharIds[frodoSeat] = 'frodo';
  let otherPtr = 0;
  for (let s = 0; s < 4; s++) {
    if (s !== frodoSeat) {
      seatCharIds[s] = shuffledOthers[otherPtr++];
    }
  }

  const seats: PlayerSeat[] = seatSpecs.slice(0, 4).map((spec, idx) => ({
    seatIndex: idx,
    name: spec.name,
    isBot: spec.isBot,
    playerId: spec.playerId,
    characterId: seatCharIds[idx],
    hand: sortHand(hands[idx]),
    wonTricks: [],
    wonCards: [],
  }));

  // Black Rider card for Chapter 2 (pick a Hills rank 1..4 that is not the Lost Card)
  let blackRiderRank: number | null = null;
  if (chapter.hasBlackRider) {
    const validRanks = [1, 2, 3, 4].filter((r) => lostCard.id !== `hills-${r}`);
    blackRiderRank = validRanks[Math.floor(Math.random() * validRanks.length)] ?? 3;
  }

  // Gandalf Lost Card exchange setup
  const exchangeQueue: ExchangeTask[] = [];
  let lostCardRevealedToSeat: number | null = null;
  if (chapter.hasGandalfLostCardExchange) {
    const gandalfSeat = seats.findIndex((s) => s.characterId === 'gandalf');
    if (gandalfSeat >= 0) {
      lostCardRevealedToSeat = gandalfSeat;
      // Gandalf takes Lost Card temporarily into hand (10 cards), passes 1 to Frodo, Frodo sets 1 aside as new Lost Card
      seats[gandalfSeat].hand = sortHand([...seats[gandalfSeat].hand, lostCard]);
      exchangeQueue.push(
        {
          fromSeat: gandalfSeat,
          toSeat: frodoSeat,
          label: `${seats[gandalfSeat].name} (Gandalf) chọn 1 lá bài đưa cho Frodo`,
          completed: false,
        },
        {
          fromSeat: frodoSeat,
          toSeat: -1,
          label: `${seats[frodoSeat].name} (Frodo) chọn 1 lá bài đặt làm Lá Thất Lạc mới`,
          completed: false,
        }
      );
    }
  }

  const startPhase = exchangeQueue.length > 0 ? 'SETUP_EXCHANGE' : 'PLAYING';
  const actionLog = [
    `${chapter.title} bắt đầu! ${seats[frodoSeat].name} giữ Chiếc Nhẫn Duy Nhất và vào vai Frodo.`,
  ];
  if (blackRiderRank !== null) {
    actionLog.push(`Thẻ Ma Nhẫn Đen số ${blackRiderRank} xuất hiện — Samwise cần thắng lá ${blackRiderRank} Đồi Cỏ.`);
  }
  if (exchangeQueue.length > 0) {
    actionLog.push(`Gandalf thu nhận Lá Bài Thất Lạc và chuẩn bị trao đổi bài với Frodo.`);
  }

  return {
    chapterId: chapter.id,
    phase: startPhase,
    seats,
    lostCard,
    lostCardRevealedToSeat,
    blackRiderRank,
    ringsBroken: false,
    leadSeat: frodoSeat,
    currentTurnSeat: exchangeQueue.length > 0 ? exchangeQueue[0].fromSeat : frodoSeat,
    trickNumber: 1,
    currentTrick: [],
    lastTrickWinnerSeat: null,
    exchangeQueue,
    passedCardLog: [],
    chapterVictory: null,
    actionLog,
  };
}

export function getLegalCards(hand: Card[], state: GameState, seatIndex: number): Card[] {
  if (state.phase === 'SETUP_EXCHANGE') {
    const task = state.exchangeQueue.find((t) => !t.completed);
    if (!task || task.fromSeat !== seatIndex) return [];
    // Frodo cannot pass or discard the 1 of Rings
    if (state.seats[seatIndex].characterId === 'frodo') {
      return hand.filter((c) => c.id !== 'rings-1');
    }
    return hand;
  }

  if (state.phase !== 'PLAYING' || state.currentTurnSeat !== seatIndex) {
    return [];
  }

  // Leading a trick
  if (state.currentTrick.length === 0) {
    if (state.ringsBroken) {
      return hand;
    }
    const nonRings = hand.filter((c) => c.suit !== 'rings');
    // Cannot lead Rings unless Rings is broken or player only holds Rings
    return nonRings.length > 0 ? nonRings : hand;
  }

  // Following suit
  const leadSuit = state.currentTrick[0].card.suit;
  const matching = hand.filter((c) => c.suit === leadSuit);
  return matching.length > 0 ? matching : hand;
}

export function evaluateTrickWinner(trick: PlayedCard[]): number {
  if (trick.length === 0) return 0;

  // Check if 1 of Rings chose to claim the trick
  const claimedOneRing = trick.find(
    (p) => p.card.id === 'rings-1' && p.oneRingClaimWin === true
  );
  if (claimedOneRing) {
    return claimedOneRing.seatIndex;
  }

  // Check if any Rings (trump) card was played
  const ringPlays = trick.filter((p) => p.card.suit === 'rings');
  if (ringPlays.length > 0) {
    let best = ringPlays[0];
    for (const play of ringPlays) {
      if (play.card.rank > best.card.rank) {
        best = play;
      }
    }
    return best.seatIndex;
  }

  // Otherwise highest of lead suit wins
  const leadSuit = trick[0].card.suit;
  const leadPlays = trick.filter((p) => p.card.suit === leadSuit);
  let best = leadPlays[0];
  for (const play of leadPlays) {
    if (play.card.rank > best.card.rank) {
      best = play;
    }
  }
  return best.seatIndex;
}

export function performExchange(state: GameState, seatIndex: number, cardId: string): GameState {
  if (state.phase !== 'SETUP_EXCHANGE') return state;
  const taskIdx = state.exchangeQueue.findIndex((t) => !t.completed);
  if (taskIdx < 0) return state;
  const task = state.exchangeQueue[taskIdx];
  if (task.fromSeat !== seatIndex) return state;

  const legal = getLegalCards(state.seats[seatIndex].hand, state, seatIndex);
  const chosen = legal.find((c) => c.id === cardId);
  if (!chosen) return state;

  const newSeats = state.seats.map((s) => ({ ...s, hand: [...s.hand] }));
  newSeats[seatIndex].hand = sortHand(newSeats[seatIndex].hand.filter((c) => c.id !== cardId));

  let newLostCard = state.lostCard;
  const newLog = [...state.actionLog];
  const passedLog = [...state.passedCardLog];

  if (task.toSeat === -1) {
    newLostCard = chosen;
    newLog.push(`${newSeats[seatIndex].name} đã đặt 1 lá bài làm Lá Thất Lạc mới.`);
    passedLog.push(`${newSeats[seatIndex].name} -> Lá Thất Lạc`);
  } else {
    newSeats[task.toSeat].hand = sortHand([...newSeats[task.toSeat].hand, chosen]);
    newLog.push(`${newSeats[seatIndex].name} đã trao 1 lá bài bí mật cho ${newSeats[task.toSeat].name}.`);
    passedLog.push(`${newSeats[seatIndex].name} -> ${newSeats[task.toSeat].name}`);
  }

  const newQueue = state.exchangeQueue.map((t, idx) =>
    idx === taskIdx ? { ...t, completed: true } : t
  );
  const nextTask = newQueue.find((t) => !t.completed);

  if (nextTask) {
    return {
      ...state,
      seats: newSeats,
      lostCard: newLostCard,
      exchangeQueue: newQueue,
      currentTurnSeat: nextTask.fromSeat,
      passedCardLog: passedLog,
      actionLog: newLog.slice(-12),
    };
  }

  newLog.push(`Trao đổi hoàn tất! ${newSeats[state.leadSeat].name} (Frodo) mở đầu Trick 1.`);
  return {
    ...state,
    phase: 'PLAYING',
    seats: newSeats,
    lostCard: newLostCard,
    exchangeQueue: newQueue,
    currentTurnSeat: state.leadSeat,
    passedCardLog: passedLog,
    actionLog: newLog.slice(-12),
  };
}

export function playCard(
  state: GameState,
  seatIndex: number,
  cardId: string,
  oneRingClaimWin?: boolean
): GameState {
  if (state.phase !== 'PLAYING' || state.currentTurnSeat !== seatIndex) return state;

  const seat = state.seats[seatIndex];
  const legal = getLegalCards(seat.hand, state, seatIndex);
  const card = legal.find((c) => c.id === cardId);
  if (!card) return state;

  const newSeats = state.seats.map((s, idx) =>
    idx === seatIndex
      ? { ...s, hand: s.hand.filter((c) => c.id !== cardId) }
      : s
  );

  const play: PlayedCard = {
    seatIndex,
    card,
    oneRingClaimWin: card.id === 'rings-1' ? Boolean(oneRingClaimWin) : undefined,
  };

  const newTrick = [...state.currentTrick, play];
  const ringsBrokenNow = state.ringsBroken || card.suit === 'rings';

  const newLog = [...state.actionLog];
  if (card.id === 'rings-1') {
    newLog.push(
      `${seat.name} đánh 1 Nhẫn (${oneRingClaimWin ? 'Kích hoạt Thắng Trick' : 'Nhường Quyền Thắng'}).`
    );
  } else {
    newLog.push(`${seat.name} đánh ${formatCardName(card)}.`);
  }

  if (!state.ringsBroken && card.suit === 'rings') {
    newLog.push(`Chất Nhẫn Quyền Năng đã được khai mở!`);
  }

  if (newTrick.length < 4) {
    return {
      ...state,
      seats: newSeats,
      currentTrick: newTrick,
      ringsBroken: ringsBrokenNow,
      currentTurnSeat: (seatIndex + 1) % 4,
      actionLog: newLog.slice(-12),
    };
  }

  const winnerSeat = evaluateTrickWinner(newTrick);
  newLog.push(`${newSeats[winnerSeat].name} thắng Trick ${state.trickNumber}!`);

  return {
    ...state,
    phase: 'TRICK_COMPLETE',
    seats: newSeats,
    currentTrick: newTrick,
    ringsBroken: ringsBrokenNow,
    lastTrickWinnerSeat: winnerSeat,
    actionLog: newLog.slice(-12),
  };
}

export function resolveCurrentTrick(state: GameState): GameState {
  if (state.phase !== 'TRICK_COMPLETE' || state.currentTrick.length !== 4) return state;

  const winnerSeat = state.lastTrickWinnerSeat ?? evaluateTrickWinner(state.currentTrick);
  const trickRecord: TrickRecord = {
    trickNumber: state.trickNumber,
    leadSeat: state.leadSeat,
    winnerSeat,
    cards: state.currentTrick,
  };

  const newSeats = state.seats.map((s, idx) =>
    idx === winnerSeat
      ? {
          ...s,
          wonTricks: [...s.wonTricks, trickRecord],
          wonCards: [...s.wonCards, ...state.currentTrick.map((p) => p.card)],
        }
      : s
  );

  const isRoundOver = state.trickNumber >= 9 || newSeats.every((s) => s.hand.length === 0);

  if (isRoundOver) {
    const tempState: GameState = {
      ...state,
      phase: 'ROUND_OVER',
      seats: newSeats,
      currentTrick: [],
    };
    const victory = newSeats.every((s) => evaluatePlayerGoal(s, tempState).status === 'met');
    return {
      ...tempState,
      chapterVictory: victory,
      actionLog: [
        ...state.actionLog,
        victory
          ? `Hội Đồng hoàn thành ${getChapterById(state.chapterId).title}!`
          : `Chương ${state.chapterId} thất bại — một thành viên chưa đạt mục tiêu.`,
      ].slice(-12),
    };
  }

  return {
    ...state,
    phase: 'PLAYING',
    seats: newSeats,
    currentTrick: [],
    trickNumber: state.trickNumber + 1,
    leadSeat: winnerSeat,
    currentTurnSeat: winnerSeat,
  };
}

export function evaluatePlayerGoal(seat: PlayerSeat, state: GameState): GoalEvaluation {
  const tricksWon = seat.wonTricks.length;
  const remainingTricks = 9 - state.trickNumber + (state.phase === 'ROUND_OVER' ? 0 : 1);
  const countSuit = (suit: Suit) => seat.wonCards.filter((c) => c.suit === suit).length;
  const ringsWon = countSuit('rings');
  const hillsWon = countSuit('hills');
  const forestsWon = countSuit('forests');
  const mountainsWon = countSuit('mountains');
  const shadowsWon = countSuit('shadows');
  const isFinal = state.phase === 'ROUND_OVER';

  const othersMaxSuit = (suit: Suit) =>
    Math.max(
      ...state.seats
        .filter((s) => s.seatIndex !== seat.seatIndex)
        .map((s) => s.wonCards.filter((c) => c.suit === suit).length)
    );
  const othersMaxTricks = () =>
    Math.max(
      ...state.seats
        .filter((s) => s.seatIndex !== seat.seatIndex)
        .map((s) => s.wonTricks.length)
    );

  const exactTricks = (target: number): GoalEvaluation => {
    if (tricksWon > target) {
      return { status: 'failed', progressText: `Trick: ${tricksWon}/${target} (Vượt)` };
    }
    if (tricksWon === target) {
      return { status: 'met', progressText: `Trick: ${target}/${target}` };
    }
    return {
      status: !isFinal && tricksWon + remainingTricks >= target ? 'on_track' : 'failed',
      progressText: `Trick: ${tricksWon}/${target}`,
    };
  };

  const rangeTricks = (min: number, max: number): GoalEvaluation => {
    if (tricksWon > max) {
      return { status: 'failed', progressText: `Trick: ${tricksWon} (Tối đa ${max})` };
    }
    if (tricksWon >= min && tricksWon <= max) {
      return { status: 'met', progressText: `Trick: ${tricksWon} (${min}–${max})` };
    }
    return {
      status: !isFinal && tricksWon + remainingTricks >= min ? 'on_track' : 'failed',
      progressText: `Trick: ${tricksWon} (Cần ${min}–${max})`,
    };
  };

  const minTricks = (min: number): GoalEvaluation => ({
    status: tricksWon >= min ? 'met' : !isFinal && tricksWon + remainingTricks >= min ? 'on_track' : 'failed',
    progressText: `Trick: ${tricksWon}/${min}+`,
  });

  const minRings = (min: number): GoalEvaluation => ({
    status: ringsWon >= min ? 'met' : !isFinal ? 'on_track' : 'failed',
    progressText: `Lá Nhẫn: ${ringsWon}/${min}`,
  });

  const exactRings = (target: number): GoalEvaluation => {
    if (ringsWon > target) {
      return { status: 'failed', progressText: `Lá Nhẫn: ${ringsWon}/${target} (Vượt)` };
    }
    if (ringsWon === target) {
      return { status: 'met', progressText: `Lá Nhẫn: ${target}/${target}` };
    }
    return {
      status: !isFinal ? 'on_track' : 'failed',
      progressText: `Lá Nhẫn: ${ringsWon}/${target}`,
    };
  };

  const blackRiderGoal = (): GoalEvaluation => {
    const targetRank = state.blackRiderRank ?? 3;
    const targetId = `hills-${targetRank}`;
    const hasTarget = seat.wonCards.some((c) => c.id === targetId);
    const someoneElseWonTarget = state.seats.some(
      (s) => s.seatIndex !== seat.seatIndex && s.wonCards.some((c) => c.id === targetId)
    );
    return {
      status: hasTarget ? 'met' : someoneElseWonTarget || isFinal ? 'failed' : 'on_track',
      progressText: hasTarget ? `Đã giữ ${targetRank} Đồi Cỏ` : `Cần ${targetRank} Đồi Cỏ`,
    };
  };

  switch (`${state.chapterId}:${seat.characterId}`) {
    // CH 1
    case '1:frodo':
      return minRings(2);
    case '1:gandalf':
      return minTricks(1);
    case '1:bilbo':
      return exactTricks(3);
    case '1:pippin':
      return { status: tricksWon === 0 ? 'met' : 'failed', progressText: `Trick: ${tricksWon}/0` };

    // CH 2
    case '2:frodo':
      return minRings(2);
    case '2:samwise':
      return blackRiderGoal();
    case '2:merry':
      return rangeTricks(1, 2);
    case '2:pippin':
      return { status: tricksWon === 0 ? 'met' : 'failed', progressText: `Trick: ${tricksWon}/0` };

    // CH 3
    case '3:frodo':
      return {
        status: tricksWon >= 2 && ringsWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/2+ · Nhẫn: ${ringsWon}/1+`,
      };
    case '3:samwise': {
      const ok = seat.wonCards.some((c) => c.suit === 'forests' && c.rank >= 5);
      return {
        status: ok ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: ok ? 'Đã có Rừng >= 5' : 'Cần Rừng >= 5',
      };
    }
    case '3:merry': {
      const frodo = state.seats.find((s) => s.characterId === 'frodo');
      const frodoTricks = frodo ? frodo.wonTricks.length : 0;
      return {
        status: tricksWon >= 1 && tricksWon < frodoTricks ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Merry: ${tricksWon} · Frodo: ${frodoTricks}`,
      };
    }
    case '3:pippin':
      return exactTricks(1);

    // CH 4: Khu Rừng Già
    case '4:frodo':
      return minRings(2);
    case '4:tom_bombadil': {
      if (shadowsWon > 0) {
        return { status: 'failed', progressText: `Rừng: ${forestsWon}/2 · Bóng Tối: ${shadowsWon}/0` };
      }
      return {
        status: forestsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Rừng: ${forestsWon}/2 · Bóng Tối: 0/0`,
      };
    }
    case '4:samwise':
      return minTricks(2);
    case '4:pippin':
      return { status: tricksWon === 0 ? 'met' : 'failed', progressText: `Trick: ${tricksWon}/0` };

    // CH 5: Ngôi Nhà Tom Bombadil
    case '5:frodo':
      return exactRings(1);
    case '5:tom_bombadil':
      return {
        status: ringsWon >= 1 && tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Nhẫn: ${ringsWon}/1 · Trick: ${tricksWon}/2`,
      };
    case '5:goldberry': {
      if (shadowsWon > 0 || tricksWon > 2) {
        return { status: 'failed', progressText: `Trick: ${tricksWon}/2 · Bóng Tối: ${shadowsWon}/0` };
      }
      return {
        status: tricksWon === 2 ? 'met' : !isFinal && tricksWon + remainingTricks >= 2 ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/2 · Bóng Tối: 0/0`,
      };
    }
    case '5:merry':
      return {
        status: mountainsWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Núi Đá: ${mountainsWon}/1+`,
      };

    // CH 6: Đồi Mộ Cổ
    case '6:frodo':
      return {
        status: tricksWon >= 2 && ringsWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/2 · Nhẫn: ${ringsWon}/1`,
      };
    case '6:samwise':
      return blackRiderGoal();
    case '6:merry':
      return {
        status: shadowsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/2+`,
      };
    case '6:pippin':
      return exactTricks(1);

    // CH 7: Quán Chú Ngựa Nhỏ
    case '7:frodo':
      return exactRings(1);
    case '7:aragorn':
      return {
        status: shadowsWon >= 2 && tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/2 · Trick: ${tricksWon}/2`,
      };
    case '7:samwise': {
      const frodo = state.seats.find((s) => s.characterId === 'frodo');
      const frodoTricks = frodo ? frodo.wonTricks.length : 0;
      return {
        status: tricksWon >= frodoTricks ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Sam: ${tricksWon} · Frodo: ${frodoTricks}`,
      };
    }
    case '7:merry':
      return exactTricks(2);

    // CH 8: Weathertop
    case '8:frodo':
      return {
        status: ringsWon >= 2 && tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Nhẫn: ${ringsWon}/2 · Trick: ${tricksWon}/2`,
      };
    case '8:aragorn':
      return {
        status: shadowsWon >= 3 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/3+`,
      };
    case '8:gandalf':
      return minTricks(2);
    case '8:pippin':
      return exactTricks(1);

    // CH 9: Flight to the Ford
    case '9:frodo':
      return minRings(2);
    case '9:glorfindel':
      return {
        status: tricksWon >= 3 && hillsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/3 · Đồi Cỏ: ${hillsWon}/2`,
      };
    case '9:aragorn':
      return {
        status: shadowsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/2+`,
      };
    case '9:samwise':
      return rangeTricks(1, 2);

    // CH 10: Many Meetings
    case '10:frodo':
      return minRings(2);
    case '10:elrond':
      return {
        status: forestsWon >= 2 && mountainsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Rừng: ${forestsWon}/2 · Núi: ${mountainsWon}/2`,
      };
    case '10:gandalf':
      return exactTricks(2);
    case '10:bilbo':
      return rangeTricks(0, 1);

    // CH 11: Council of Elrond
    case '11:frodo':
      return minRings(2);
    case '11:legolas':
      return {
        status: forestsWon >= 3 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Rừng Thẳm: ${forestsWon}/3+`,
      };
    case '11:gimli':
      return {
        status: mountainsWon >= 3 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Núi Đá: ${mountainsWon}/3+`,
      };
    case '11:boromir': {
      const maxOther = othersMaxTricks();
      return {
        status: tricksWon > maxOther && ringsWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon} (Khác: ${maxOther}) · Nhẫn: ${ringsWon}/1`,
      };
    }

    // CH 12: Ring Goes South
    case '12:frodo':
      return minRings(2);
    case '12:aragorn':
      return {
        status: tricksWon >= 3 && shadowsWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/3 · Bóng Tối: ${shadowsWon}/1`,
      };
    case '12:gimli':
      return {
        status: mountainsWon >= 2 && tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Núi: ${mountainsWon}/2 · Trick: ${tricksWon}/2`,
      };
    case '12:pippin':
      return { status: tricksWon === 0 ? 'met' : 'failed', progressText: `Trick: ${tricksWon}/0` };

    // CH 13: Doors of Durin
    case '13:frodo':
      return minRings(2);
    case '13:gandalf':
      return rangeTricks(2, 3);
    case '13:legolas':
      return {
        status: forestsWon >= 2 && mountainsWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Rừng: ${forestsWon}/2 · Núi: ${mountainsWon}/1`,
      };
    case '13:merry':
      return { status: shadowsWon === 0 ? 'met' : 'failed', progressText: `Bóng Tối: ${shadowsWon}/0` };

    // CH 14: A Journey in the Dark
    case '14:frodo':
      return {
        status: ringsWon >= 2 && tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Nhẫn: ${ringsWon}/2 · Trick: ${tricksWon}/2`,
      };
    case '14:gimli': {
      const maxOther = othersMaxSuit('mountains');
      return {
        status: mountainsWon > maxOther ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Núi Đá: ${mountainsWon} (Khác: ${maxOther})`,
      };
    }
    case '14:aragorn':
      return {
        status: shadowsWon >= 3 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/3+`,
      };
    case '14:boromir':
      if (ringsWon > 0) return { status: 'failed', progressText: `Trick: ${tricksWon}/2 · Nhẫn: ${ringsWon}/0` };
      return {
        status: tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/2 · Nhẫn: 0/0`,
      };

    // CH 15: Bridge of Khazad-dum
    case '15:frodo':
      return minRings(2);
    case '15:gandalf':
      return {
        status: shadowsWon >= 3 && tricksWon >= 3 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/3 · Trick: ${tricksWon}/3`,
      };
    case '15:samwise':
      if (shadowsWon > 0) return { status: 'failed', progressText: `Trick: ${tricksWon}/1 · Bóng Tối: ${shadowsWon}/0` };
      return {
        status: tricksWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/1 · Bóng Tối: 0/0`,
      };
    case '15:legolas':
      return exactTricks(2);

    // CH 16: Lothlorien
    case '16:frodo': {
      if (ringsWon > 2) return { status: 'failed', progressText: `Lá Nhẫn: ${ringsWon} (1–2)` };
      if (ringsWon >= 1) return { status: 'met', progressText: `Lá Nhẫn: ${ringsWon} (1–2)` };
      return { status: !isFinal ? 'on_track' : 'failed', progressText: `Lá Nhẫn: 0 (Cần 1–2)` };
    }
    case '16:galadriel': {
      if (tricksWon > 2) return { status: 'failed', progressText: `Trick: ${tricksWon}/2 (Vượt)` };
      return {
        status: tricksWon === 2 && forestsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/2 · Rừng: ${forestsWon}/2`,
      };
    }
    case '16:legolas': {
      const maxOther = othersMaxSuit('forests');
      return {
        status: forestsWon > maxOther ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Rừng Thẳm: ${forestsWon} (Khác: ${maxOther})`,
      };
    }
    case '16:gimli':
      if (shadowsWon > 0) return { status: 'failed', progressText: `Núi: ${mountainsWon}/2 · Bóng Tối: ${shadowsWon}/0` };
      return {
        status: mountainsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Núi: ${mountainsWon}/2 · Bóng Tối: 0/0`,
      };

    // CH 17: Mirror of Galadriel
    case '17:frodo':
      return {
        status: ringsWon >= 2 && tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Nhẫn: ${ringsWon}/2 · Trick: ${tricksWon}/2`,
      };
    case '17:galadriel':
      return exactRings(1);
    case '17:samwise':
      return {
        status: tricksWon >= 2 && hillsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/2 · Đồi Cỏ: ${hillsWon}/2`,
      };
    case '17:aragorn':
      return {
        status: shadowsWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/2+`,
      };

    // CH 18: Breaking of the Fellowship
    case '18:frodo':
      return minRings(3);
    case '18:samwise':
      return {
        status: tricksWon >= 2 && hillsWon >= 1 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon}/2 · Đồi Cỏ: ${hillsWon}/1`,
      };
    case '18:aragorn':
      return {
        status: shadowsWon >= 2 && tricksWon >= 2 ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Bóng Tối: ${shadowsWon}/2 · Trick: ${tricksWon}/2`,
      };
    case '18:boromir': {
      if (ringsWon > 0) return { status: 'failed', progressText: `Trick: ${tricksWon} · Nhẫn: ${ringsWon}/0` };
      const maxOther = othersMaxTricks();
      return {
        status: tricksWon > maxOther ? 'met' : !isFinal ? 'on_track' : 'failed',
        progressText: `Trick: ${tricksWon} (Khác: ${maxOther}) · Nhẫn: 0/0`,
      };
    }

    default:
      return {
        status: tricksWon >= 1 ? 'met' : 'on_track',
        progressText: `Trick: ${tricksWon}`,
      };
  }
}
