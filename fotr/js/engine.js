/* engine.js — official-style Fellowship Trick-Taking rules. Pure logic, Node-testable. */
(function (root) {
  'use strict';

  var SUITS = ['hill', 'mountain', 'forest', 'shadow', 'ring'];
  var SUIT_INFO = {
    hill:     { symbol: '◆', name: { vi: 'Đồi',     en: 'Hills'     }, css: 'suit-hill',     color: '#c69a63' },
    mountain: { symbol: '▲', name: { vi: 'Núi',     en: 'Mountains' }, css: 'suit-mountain', color: '#9aa8b5' },
    forest:   { symbol: '❧', name: { vi: 'Rừng',    en: 'Forests'   }, css: 'suit-forest',   color: '#79a566' },
    shadow:   { symbol: '◈', name: { vi: 'Bóng Tối', en: 'Shadows'  }, css: 'suit-shadow',   color: '#9874a6' },
    ring:     { symbol: '✦', name: { vi: 'Nhẫn',    en: 'Rings'     }, css: 'suit-ring',     color: '#d9b45f' }
  };

  function makeRng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function makeDeck() {
    var deck = [], id = 0;
    SUITS.forEach(function (suit) {
      var max = suit === 'ring' ? 5 : 8;
      for (var r = 1; r <= max; r++) {
        deck.push({ id: 'c' + (id++), suit: suit, rank: r, isOneRing: (suit === 'ring' && r === 1) });
      }
    });
    return deck; // 8+8+8+8+5 = 37
  }

  function createRound(config) {
    var rng = makeRng(config.seed || Date.now());
    var deck = shuffle(makeDeck(), rng);
    var lost = deck.pop();
    // Lost card may not be the One Ring.
    var guard = 0;
    while (lost.isOneRing && guard++ < 20) {
      deck.push(lost); shuffle(deck, rng); lost = deck.pop();
    }
    var playerCount = config.playerCount === 3 ? 3 : 4;
    var handSize = playerCount === 3 ? 12 : 9;
    var humans = config.humanIndices || [config.humanIndex || 0];
    var players = [];
    for (var i = 0; i < playerCount; i++) {
      var hand = [];
      for (var k = 0; k < handSize; k++) hand.push(deck.pop());
      hand.sort(function (a, b) {
        if (a.suit === b.suit) return a.rank - b.rank;
        return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      });
      players.push({ index: i, hand: hand, wonCards: [], tricksWon: 0, characterId: null, threat: null, isHuman: humans.indexOf(i) >= 0 });
    }
    var oneRingHolder = -1;
    players.forEach(function (p, i) {
      if (p.hand.some(function (c) { return c.isOneRing; })) oneRingHolder = i;
    });

    var threatDeck = [];
    if (config.threat === 'black') threatDeck = shuffle([1, 2, 3, 4], rng);
    if (config.threat === 'number') threatDeck = shuffle([1, 2, 3, 4, 5, 6, 7], rng);

    return {
      chapter: config.chapter,
      rng: rng,
      deck: deck,
      lostCard: lost,
      players: players,
      playerCount: playerCount,
      totalTricks: handSize,
      humanIndices: humans.slice(),
      oneRingHolder: oneRingHolder,
      threatDeck: threatDeck,
      ringLocked: true,          // cannot lead Rings until broken
      ledSuit: null,
      plays: [],
      trick: 1,
      turnIndex: oneRingHolder >= 0 ? oneRingHolder : 0,
      leaderIndex: oneRingHolder >= 0 ? oneRingHolder : 0,
      trickHistory: [],
      phase: 'setup'
    };
  }

  function drawThreat(state) {
    if (!state.threatDeck.length) return null;
    var v = state.threatDeck.shift();
    // Sam's threat may not match the lost card's rank when the lost card is a Hill.
    if (state.lostCard && state.lostCard.suit === 'hill' && v === state.lostCard.rank && state.threatDeck.length) {
      state.threatDeck.push(v);
      shuffle(state.threatDeck, state.rng);
      v = state.threatDeck.shift();
    }
    return v;
  }

  function legalCards(state, playerIndex) {
    var hand = state.players[playerIndex].hand;
    if (state.phase !== 'playing') return [];
    if (state.ledSuit === null) {
      var canLeadRing = !state.ringLocked || hand.filter(function (c) { return c.suit !== 'ring'; }).length === 0;
      return hand.filter(function (c) { return c.suit !== 'ring' || canLeadRing; });
    }
    var followers = hand.filter(function (c) { return c.suit === state.ledSuit; });
    return followers.length ? followers : hand.slice();
  }

  function playCard(state, playerIndex, cardId, useRingPower) {
    if (state.phase !== 'playing') return { ok: false, reason: 'phase' };
    if (state.turnIndex !== playerIndex) return { ok: false, reason: 'turn' };
    var p = state.players[playerIndex];
    var card = p.hand.filter(function (c) { return c.id === cardId; })[0];
    if (!card) return { ok: false, reason: 'missing' };
    if (!legalCards(state, playerIndex).some(function (c) { return c.id === cardId; })) return { ok: false, reason: 'illegal' };

    p.hand = p.hand.filter(function (c) { return c.id !== cardId; });
    if (state.ledSuit === null) state.ledSuit = card.suit;
    else if (card.suit === 'ring') state.ringLocked = false; // Rings played off-suit -> broken
    var usePower = !!(card.isOneRing && useRingPower);
    state.plays.push({ playerIndex: playerIndex, card: card, useRingPower: usePower });
    state.turnIndex = (state.turnIndex + 1) % state.playerCount;

    if (state.plays.length === state.playerCount) return resolveTrick(state);
    return { ok: true, complete: false };
  }

  function resolveTrick(state) {
    var powerPlay = state.plays.filter(function (p) { return p.useRingPower; })[0];
    var winner;
    if (powerPlay) {
      winner = powerPlay;
    } else {
      var pool = state.plays.filter(function (p) { return p.card.suit === state.ledSuit; });
      if (!pool.length) pool = state.plays.slice();
      winner = pool[0];
      pool.forEach(function (p) { if (p.card.rank > winner.card.rank) winner = p; });
    }
    var player = state.players[winner.playerIndex];
    player.tricksWon++;
    state.plays.forEach(function (p) { player.wonCards.push(p.card); });
    state.trickHistory.push({
      trick: state.trick,
      ledSuit: state.ledSuit,
      plays: state.plays.slice(),
      winner: winner.playerIndex,
      usedRingPower: !!powerPlay
    });

    var result = {
      ok: true, complete: true, winner: winner.playerIndex,
      card: winner.card, usedRingPower: !!powerPlay, trick: state.trick
    };

    var allEmpty = state.players.every(function (p) { return p.hand.length === 0; });
    if (allEmpty) {
      state.phase = 'roundOver';
      result.roundOver = true;
    } else {
      state.trick++;
      state.plays = [];
      state.ledSuit = null;
      state.leaderIndex = winner.playerIndex;
      state.turnIndex = winner.playerIndex;
    }
    return result;
  }

  function startRound(state) { state.phase = 'playing'; }

  function countSuit(cards, suit) {
    return cards.filter(function (c) { return c.suit === suit; }).length;
  }

  function checkGoal(charId, ctx) {
    var s = ctx.state, idx = ctx.playerIndex, p = s.players[idx];
    var won = p.wonCards, tricks = p.tricksWon, threat = ctx.threat;
    var history = s.trickHistory, last = history[history.length - 1];
    var last3 = history.slice(-3);
    var others = s.players.map(function (q, i) { return i === idx ? -1 : q.tricksWon; }).filter(function (n) { return n >= 0; });
    var minOther = others.length ? Math.min.apply(null, others) : 0;
    var ringWon = countSuit(won, 'ring');

    switch (charId) {
      case 'frodo': return ringWon >= (s.playerCount === 3 ? 4 : 2);
      case 'bilbo':
      case 'bilbo_stretched': return tricks >= 3;
      case 'gandalf':
      case 'gandalf_flame': return tricks >= 1;
      case 'pippin': return tricks === 0 || tricks <= minOther;
      case 'pippin_burdened': return (tricks === 0 || tricks <= minOther) && !won.some(function (c) { return c.isOneRing; });
      case 'sam': return threat != null && won.some(function (c) { return c.suit === 'hill' && c.rank === threat; });
      case 'sam_burdened': return (threat != null && won.some(function (c) { return c.suit === 'hill' && c.rank === threat; })) && !won.some(function (c) { return c.isOneRing; });
      case 'merry': return tricks === 1 || tricks === 2;
      case 'merry_burdened': return (tricks === 1 || tricks === 2) && !won.some(function (c) { return c.isOneRing; });
      case 'fatty': return tricks === 1;
      case 'gildor': return !!last && last.plays.some(function (pl) { return pl.playerIndex === idx && pl.card.suit === 'forest'; });
      case 'farmer_maggot': return threat != null && won.some(function (c) { return c.rank === threat; });
      case 'tom': return !!last && last.winner === idx;
      case 'goldberry': {
        if (tricks !== 3) return false;
        var run = 0, best = 0;
        history.forEach(function (h) { run = h.winner === idx ? run + 1 : 0; best = Math.max(best, run); });
        return best >= 3;
      }
      case 'underhill': return tricks === 0;
      case 'barliman': return last3.some(function (h) { return h.winner === idx; });
      case 'strider': return threat == null || tricks !== threat;
      case 'glorfindel': return won.some(function (c) { return c.suit === 'forest'; });
      case 'bill': return tricks >= 1;
      case 'elrond': return ringWon >= 1;
      case 'arwen': return countSuit(won, 'forest') > Math.max.apply(null, [0].concat(s.players.map(function (q, i) { return i === idx ? 0 : countSuit(q.wonCards, 'forest'); })));
      case 'gloin': return countSuit(won, 'hill') > Math.max.apply(null, [0].concat(s.players.map(function (q, i) { return i === idx ? 0 : countSuit(q.wonCards, 'hill'); })));
      case 'aragorn': return threat != null && tricks === threat;
      case 'aragorn_burdened': return (threat != null && tricks === threat) && !won.some(function (c) { return c.isOneRing; });
      case 'boromir': return !!last && last.winner === idx && !won.some(function (c) { return c.isOneRing; });
      case 'boromir_burdened': return !!last && last.winner === idx && !won.some(function (c) { return c.isOneRing; });
      case 'gwaihir': return history.some(function (h) { return h.winner === idx && h.plays.filter(function (pl) { return pl.playerIndex === idx && pl.card.suit === 'shadow'; }).length >= 2; });
      case 'shadowfax': return history.some(function (h) { return h.winner === idx && h.plays.filter(function (pl) { return pl.playerIndex === idx && pl.card.suit === 'hill'; }).length >= 2; });
      case 'radagast': return history.some(function (h) { return h.winner === idx && h.plays.filter(function (pl) { return pl.playerIndex === idx && pl.card.suit === 'forest'; }).length >= 2; });
      case 'legolas': return countSuit(won, 'forest') >= Math.max.apply(null, s.players.map(function (q) { return countSuit(q.wonCards, 'forest'); }));
      case 'legolas_burdened': return countSuit(won, 'forest') >= Math.max.apply(null, s.players.map(function (q) { return countSuit(q.wonCards, 'forest'); })) && !won.some(function (c) { return c.isOneRing; });
      case 'gimli': return countSuit(won, 'mountain') >= Math.max.apply(null, s.players.map(function (q) { return countSuit(q.wonCards, 'mountain'); }));
      case 'gimli_burdened': return countSuit(won, 'mountain') >= Math.max.apply(null, s.players.map(function (q) { return countSuit(q.wonCards, 'mountain'); })) && !won.some(function (c) { return c.isOneRing; });
      case 'haldir': return tricks >= 2;
      case 'orophin': return won.some(function (c) { return c.suit === 'forest'; });
      case 'galadriel': return ringWon >= 1;
      case 'celeborn': return won.some(function (c) { return c.suit === 'forest'; });
      default: return false;
    }
  }

  function evaluateRound(state, assigned) {
    return state.players.map(function (p, i) {
      var charId = p.characterId;
      var ok = charId ? checkGoal(charId, { state: state, playerIndex: i, threat: p.threat }) : true;
      return { playerIndex: i, characterId: charId, complete: ok };
    });
  }

  /* Cooperative heuristic AI: defer to the teammate whose goal is more urgent. */
  var PRIORITY = {
    frodo: 10, sam: 9, bilbo: 8, gandalf: 7, merry: 6, pippin: 5,
    barliman: 6, goldberry: 6, fatty: 6, aragorn: 6, boromir: 5,
    legolas: 4, gimli: 4, arwen: 4, gloin: 4, farmer_maggot: 5
  };

  function chooseAICard(state, playerIndex) {
    var legal = legalCards(state, playerIndex);
    if (!legal.length) return null;
    if (legal.length === 1) return { card: legal[0], useRingPower: wantRingPower(state, playerIndex, legal[0]) };

    var me = state.players[playerIndex];
    var assigned = me.characterId;
    var current = state.plays.length ? currentWinner(state) : null;
    var curPlayer = current ? state.players[current.playerIndex] : null;
    var curChar = curPlayer ? curPlayer.characterId : null;
    var myNeed = shouldWin(state, playerIndex, assigned);
    var curNeed = current && curPlayer ? shouldWin(state, current.playerIndex, curChar) : false;
    var myPri = PRIORITY[assigned] || 4;
    var curPri = curChar ? (PRIORITY[curChar] || 4) : -1;

    // Never let Pippin pile up tricks; take the trick away from him.
    var stealFromPippin = current && /pippin/.test(curChar || '');
    // Defer when a higher-priority teammate still needs this trick.
    var defer = current && !stealFromPippin && curNeed && curPri > myPri;

    var scored = legal.map(function (card) {
      var score;
      var canWin = !current || card.suit === state.ledSuit || card.isOneRing;
      if (defer) {
        score = 40 - card.rank + (card.suit === 'ring' ? -8 : 0);
      } else if (stealFromPippin || myNeed) {
        score = canWin ? 70 + card.rank : 12 - card.rank;
        if (card.suit === state.ledSuit && card.rank >= 7) score += 6;
      } else {
        score = 35 - card.rank + (card.suit === 'ring' ? -16 : 0);
      }
      // Dump Rings cards off-suit only when they cannot help Frodo win the trick.
      if (card.suit === 'ring' && assigned !== 'frodo' && state.ledSuit !== 'ring') score -= 30;
      if (assigned === 'frodo' && card.suit === 'ring') score += 14;
      if ((assigned === 'sam' || assigned === 'sam_burdened') && card.suit === 'hill' && card.rank === me.threat) score += 30;
      if ((assigned === 'gildor' || assigned === 'orophin' || assigned === 'celeborn') && card.suit === 'forest') score += 5;
      score += (state.rng() - 0.5) * 3;
      return { card: card, score: score, useRingPower: false };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var choice = scored[0];
    choice.useRingPower = wantRingPower(state, playerIndex, choice.card);
    return choice;
  }

  function currentWinner(state) {
    var pool = state.plays.filter(function (p) { return p.card.suit === state.ledSuit; });
    if (!pool.length) return null;
    var best = pool[0];
    pool.forEach(function (p) { if (p.card.rank > best.card.rank) best = p; });
    return best;
  }

  function shouldWin(state, idx, charId) {
    var p = state.players[idx];
    var won = p.wonCards;
    switch (charId) {
      case 'frodo': return countSuit(won, 'ring') < (state.playerCount === 3 ? 4 : 2);
      case 'bilbo':
      case 'bilbo_stretched': return p.tricksWon < 3;
      case 'gandalf': return p.tricksWon < 1;
      case 'pippin':
      case 'pippin_burdened': return false;
      case 'merry':
      case 'merry_burdened': return p.tricksWon < 2;
      case 'fatty': return p.tricksWon < 1;
      case 'barliman': return p.tricksWon < 1;
      case 'goldberry': return p.tricksWon < 3;
      case 'sam': return !won.some(function (c) { return c.suit === 'hill' && c.rank === p.threat; });
      default: return true;
    }
  }

  function wantRingPower(state, idx, card) {
    if (!card.isOneRing) return false;
    var p = state.players[idx], ch = p.characterId;
    var lastTrick = state.trickHistory.length === state.playerCount * (state.playerCount - 1);
    if (ch === 'frodo') return countSuit(p.wonCards, 'ring') < (state.playerCount === 3 ? 4 : 2);
    if (ch === 'boromir' || ch === 'boromir_burdened') return state.trick >= state.players[0].hand.length;
    if (ch === 'gandalf' || ch === 'bilbo') return p.tricksWon === 0;
    return false;
  }

  var API = {
    SUITS: SUITS, SUIT_INFO: SUIT_INFO,
    makeRng: makeRng, shuffle: shuffle, makeDeck: makeDeck,
    createRound: createRound, drawThreat: drawThreat, legalCards: legalCards,
    playCard: playCard, startRound: startRound, checkGoal: checkGoal,
    evaluateRound: evaluateRound, chooseAICard: chooseAICard,
    countSuit: countSuit
  };
  root.LOTREngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
