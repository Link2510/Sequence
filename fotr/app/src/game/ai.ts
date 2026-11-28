import {
  evaluatePlayerGoal,
  evaluateTrickWinner,
  formatCardName,
  getLegalCards,
} from './engine';
import { Card, GameState } from './types';

export interface AiDecision {
  cardId: string;
  oneRingClaimWin?: boolean;
  reason: string;
}

function cardPowerScore(card: Card, leadSuit?: Card['suit']): number {
  if (card.id === 'rings-1') return 100; // Flexible trump
  if (card.suit === 'rings') return 20 + card.rank;
  if (!leadSuit || card.suit === leadSuit) return card.rank;
  return card.rank * 0.2;
}

function wantsMoreTricks(state: GameState, seatIndex: number): 'avoid' | 'need' | 'neutral' {
  const seat = state.seats[seatIndex];
  const evalResult = evaluatePlayerGoal(seat, state);
  const tricks = seat.wonTricks.length;

  switch (`${state.chapterId}:${seat.characterId}`) {
    case '1:pippin':
    case '2:pippin':
    case '4:pippin':
    case '12:pippin':
      return 'avoid';
    case '1:bilbo':
      return tricks < 3 ? 'need' : 'avoid';
    case '2:merry':
    case '9:samwise':
      return tricks < 1 ? 'need' : tricks >= 2 ? 'avoid' : 'neutral';
    case '3:pippin':
    case '6:pippin':
    case '8:pippin':
      return tricks < 1 ? 'need' : 'avoid';
    case '5:goldberry':
    case '7:merry':
    case '10:gandalf':
    case '15:legolas':
    case '16:galadriel':
      return tricks < 2 ? 'need' : 'avoid';
    case '10:bilbo':
      return tricks >= 1 ? 'avoid' : 'neutral';
    case '13:gandalf':
      return tricks < 2 ? 'need' : tricks >= 3 ? 'avoid' : 'neutral';
    case '11:boromir':
    case '18:boromir':
      return 'need';
    default:
      return evalResult.status === 'met' ? 'neutral' : 'need';
  }
}

export function chooseAiExchangeCard(state: GameState, seatIndex: number): Card | null {
  const legal = getLegalCards(state.seats[seatIndex].hand, state, seatIndex);
  if (legal.length === 0) return null;

  const seat = state.seats[seatIndex];
  // Gandalf passes a Ring (other than 1) or high card to Frodo to help Frodo win Rings
  if (seat.characterId === 'gandalf') {
    const ringCard = legal.find((c) => c.suit === 'rings' && c.id !== 'rings-1');
    if (ringCard) return ringCard;
    const mid = [...legal].sort((a, b) => a.rank - b.rank);
    return mid[Math.floor(mid.length / 2)];
  }

  // Frodo discards weakest non-Ring card (prefer low Shadows or Hills)
  const nonRings = legal.filter((c) => c.suit !== 'rings');
  if (nonRings.length > 0) {
    return [...nonRings].sort((a, b) => a.rank - b.rank)[0];
  }
  return legal[0];
}

export function chooseAiCard(state: GameState, seatIndex: number): AiDecision {
  const seat = state.seats[seatIndex];
  const legal = getLegalCards(seat.hand, state, seatIndex);
  if (legal.length === 0) {
    return { cardId: '', reason: 'Không có lá bài hợp lệ.' };
  }

  const desire = wantsMoreTricks(state, seatIndex);
  const leadSuit = state.currentTrick[0]?.card.suit;
  const trickHasRings = state.currentTrick.some((p) => p.card.suit === 'rings');

  // Check if a teammate currently winning desperately wants to AVOID tricks
  let currentWinnerIdx = -1;
  let rescueTeammate = false;
  if (state.currentTrick.length > 0) {
    currentWinnerIdx = evaluateTrickWinner(state.currentTrick);
    if (currentWinnerIdx !== seatIndex && wantsMoreTricks(state, currentWinnerIdx) === 'avoid') {
      rescueTeammate = true;
    }
  }

  // Check if Samwise's Black Rider Hills card is in current trick
  const samTargetInTrick =
    state.blackRiderRank !== null &&
    state.currentTrick.some((p) => p.card.id === `hills-${state.blackRiderRank}`);

  // If leading
  if (state.currentTrick.length === 0) {
    // Samwise in Ch2 shouldn't lead his target card weakly if he can avoid, or if he holds higher card wait
    if (desire === 'avoid') {
      const lowest = [...legal].sort(
        (a, b) => cardPowerScore(a) - cardPowerScore(b)
      )[0];
      return {
        cardId: lowest.id,
        oneRingClaimWin: false,
        reason: `Đánh lá nhỏ nhất (${formatCardName(lowest)}) để tránh ăn trick.`,
      };
    }

    // If Frodo leads and already has Rings broken, may lead a Ring or strong card
    const nonOneRing = legal.filter((c) => c.id !== 'rings-1');
    const pool = nonOneRing.length > 0 ? nonOneRing : legal;

    // Prefer leading a suit matching goal (e.g. Aragorn Shadows, Legolas Forests, Gimli Mountains)
    if (seat.characterId === 'legolas') {
      const forest = pool.filter((c) => c.suit === 'forests').sort((a, b) => b.rank - a.rank)[0];
      if (forest) {
        return {
          cardId: forest.id,
          reason: `Dẫn ${formatCardName(forest)} để thu phục chất Rừng Thẳm.`,
        };
      }
    }
    if (seat.characterId === 'gimli') {
      const mountain = pool.filter((c) => c.suit === 'mountains').sort((a, b) => b.rank - a.rank)[0];
      if (mountain) {
        return {
          cardId: mountain.id,
          reason: `Dẫn ${formatCardName(mountain)} để giữ chất Núi Đá.`,
        };
      }
    }
    if (seat.characterId === 'aragorn') {
      const shadow = pool.filter((c) => c.suit === 'shadows').sort((a, b) => b.rank - a.rank)[0];
      if (shadow) {
        return {
          cardId: shadow.id,
          reason: `Dẫn ${formatCardName(shadow)} để chặn Bóng Tối.`,
        };
      }
    }

    const sorted = [...pool].sort((a, b) => b.rank - a.rank);
    const pick = desire === 'need' ? sorted[0] : sorted[sorted.length - 1];
    return {
      cardId: pick.id,
      oneRingClaimWin: pick.id === 'rings-1' ? desire === 'need' : false,
      reason:
        desire === 'need'
          ? `Mở lượt bằng ${formatCardName(pick)} để tìm cơ hội thắng trick.`
          : `Mở lượt an toàn với ${formatCardName(pick)}.`,
    };
  }

  // Following in trick
  const winningChoices: Card[] = [];
  const losingChoices: Card[] = [];

  for (const card of legal) {
    if (card.id === 'rings-1') {
      // 1 of Rings can either win or lose depending on choice
      winningChoices.push(card);
      losingChoices.push(card);
      continue;
    }
    const simulated = [...state.currentTrick, { seatIndex, card }];
    if (evaluateTrickWinner(simulated) === seatIndex) {
      winningChoices.push(card);
    } else {
      losingChoices.push(card);
    }
  }

  // If Samwise sees his Black Rider Hills card in trick, try to win it!
  if (samTargetInTrick && seat.characterId === 'samwise' && winningChoices.length > 0) {
    const winCard = [...winningChoices].sort((a, b) => cardPowerScore(a, leadSuit) - cardPowerScore(b, leadSuit))[0];
    return {
      cardId: winCard.id,
      oneRingClaimWin: winCard.id === 'rings-1',
      reason: `Dùng ${formatCardName(winCard)} để lấy lá ${state.blackRiderRank} Đồi Cỏ cho Samwise!`,
    };
  }

  // If someone else holds Sam's target card in trick and Sam hasn't played yet or Sam isn't winning, don't steal from Sam!
  if (samTargetInTrick && seat.characterId !== 'samwise') {
    const samSeat = state.seats.find((s) => s.characterId === 'samwise');
    if (samSeat && currentWinnerIdx === samSeat.seatIndex && losingChoices.length > 0) {
      const safeLose = losingChoices.filter((c) => c.id !== 'rings-1')[0] || losingChoices[0];
      return {
        cardId: safeLose.id,
        oneRingClaimWin: false,
        reason: `Nhường trick này cho Samwise lấy lá Đồi Cỏ mục tiêu.`,
      };
    }
  }

  // If trick has Rings and Frodo still needs Rings
  const frodoSeat = state.seats.find((s) => s.characterId === 'frodo');
  const frodoNeedsRings =
    frodoSeat && evaluatePlayerGoal(frodoSeat, state).status !== 'met';

  if (seat.characterId === 'frodo' && trickHasRings && frodoNeedsRings && winningChoices.length > 0) {
    const oneRing = winningChoices.find((c) => c.id === 'rings-1');
    if (oneRing) {
      return {
        cardId: oneRing.id,
        oneRingClaimWin: true,
        reason: `Kích hoạt Chiếc Nhẫn Duy Nhất để thắng các lá Nhẫn trên bàn!`,
      };
    }
    const highWin = [...winningChoices].sort((a, b) => cardPowerScore(b, leadSuit) - cardPowerScore(a, leadSuit))[0];
    return {
      cardId: highWin.id,
      reason: `Đánh ${formatCardName(highWin)} để thu thập lá Nhẫn.`,
    };
  }

  // Avoid tricks
  if (desire === 'avoid') {
    if (losingChoices.length > 0) {
      // Dump highest losing card so we don't accidentally win later tricks!
      const nonOne = losingChoices.filter((c) => c.id !== 'rings-1');
      const pool = nonOne.length > 0 ? nonOne : losingChoices;
      const dump = [...pool].sort((a, b) => b.rank - a.rank)[0];
      return {
        cardId: dump.id,
        oneRingClaimWin: false,
        reason: `Xả ${formatCardName(dump)} để giữ 0 trick và loại lá lớn khỏi tay.`,
      };
    }
    const smallestWin = [...legal].sort((a, b) => cardPowerScore(a, leadSuit) - cardPowerScore(b, leadSuit))[0];
    return {
      cardId: smallestWin.id,
      oneRingClaimWin: false,
      reason: `Buộc phải theo lượt bằng ${formatCardName(smallestWin)}.`,
    };
  }

  // Rescue teammate or need tricks
  if ((desire === 'need' || rescueTeammate) && winningChoices.length > 0) {
    const nonOne = winningChoices.filter((c) => c.id !== 'rings-1');
    if (nonOne.length > 0) {
      const smartWin = [...nonOne].sort((a, b) => cardPowerScore(a, leadSuit) - cardPowerScore(b, leadSuit))[0];
      return {
        cardId: smartWin.id,
        reason: rescueTeammate
          ? `Đánh ${formatCardName(smartWin)} để cứu đồng đội khỏi phải ăn trick này.`
          : `Đánh ${formatCardName(smartWin)} để giành trick tiến gần mục tiêu.`,
      };
    }
    // Only 1 of Rings can win
    return {
      cardId: 'rings-1',
      oneRingClaimWin: true,
      reason: `Dùng Chiếc Nhẫn Duy Nhất giành lấy trick quan trọng này.`,
    };
  }

  // Neutral: play smartly (don't steal trick from Frodo if trick has Rings and Frodo needs Rings)
  if (losingChoices.length > 0) {
    const nonOne = losingChoices.filter((c) => c.id !== 'rings-1');
    const pool = nonOne.length > 0 ? nonOne : losingChoices;
    const safe = [...pool].sort((a, b) => a.rank - b.rank)[0];
    return {
      cardId: safe.id,
      oneRingClaimWin: false,
      reason: `Đánh ${formatCardName(safe)} để nhường cơ hội cho đồng đội.`,
    };
  }

  const fallback = legal[0];
  return {
    cardId: fallback.id,
    oneRingClaimWin: fallback.id === 'rings-1' ? desire === 'need' : false,
    reason: `Đánh ${formatCardName(fallback)}.`,
  };
}

export function getBeginnerHint(state: GameState, seatIndex: number): AiDecision | null {
  if (state.phase === 'SETUP_EXCHANGE') {
    const card = chooseAiExchangeCard(state, seatIndex);
    if (!card) return null;
    return {
      cardId: card.id,
      reason: `Gandalf khuyên nên chọn ${formatCardName(card)} để cân bằng bài cho Frodo.`,
    };
  }
  if (state.phase === 'PLAYING' && state.currentTurnSeat === seatIndex) {
    return chooseAiCard(state, seatIndex);
  }
  return null;
}
