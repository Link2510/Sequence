/* engine.js — Duel for Middle-Earth rules core. Pure logic, Node-testable. */
(function (root) {
  'use strict';

  var C = root.LOTRDuelCards;
  var ADJ = {
    arnor: ['rhudaur', 'enedwaith'], rhudaur: ['arnor', 'misty'],
    misty: ['rhudaur', 'enedwaith', 'gondor'], enedwaith: ['arnor', 'misty', 'rohan', 'gondor'],
    rohan: ['enedwaith', 'gondor', 'mordor'], gondor: ['misty', 'enedwaith', 'rohan', 'mordor'],
    mordor: ['rohan', 'gondor']
  };
  var QUEST_END = 13, QUEST_START_F = 3, QUEST_START_S = 0;

  function makeRng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, rng) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function createGame(seed) {
    var rng = makeRng(seed || Date.now());
    var decks = {};
    [1, 2, 3].forEach(function (ch) {
      decks[ch] = shuffle(C.CARDS.filter(function (c) { return c.chapter === ch; }).map(function (c) { return c.id; }), rng);
    });
    var allianceStacks = {};
    C.RACES.forEach(function (r) { allianceStacks[r] = shuffle(C.ALLIANCE[r].slice(), rng); });
    var landmarkDeck = shuffle(C.LANDMARKS.slice(), rng);

    var players = {
      fellowship: mkPlayer('fellowship', 3, QUEST_START_F),
      sauron: mkPlayer('sauron', 2, QUEST_START_S)
    };
    players.fellowship.units.arnor = 2;
    players.sauron.units.mordor = 2;

    return {
      rng: rng, players: players, bank: 25, chapter: 1, turn: 'sauron',
      decks: decks, display: [], discard: [], landmarks: [], landmarkDeck: landmarkDeck,
      allianceStacks: allianceStacks, phase: 'playing', winner: null,
      log: [], usedChapter: { 1: 0, 2: 0, 3: 0 }
    };
  }
  function mkPlayer(id, coins, quest) {
    return {
      id: id, coins: coins, quest: quest, played: [], skillsUsed: [],
      units: { arnor: 0, rhudaur: 0, misty: 0, enedwaith: 0, rohan: 0, gondor: 0, mordor: 0 },
      forts: [], races: [], tokens: [], extraRace: false
    };
  }

  function setupChapter(g, ch) {
    g.chapter = ch;
    var ids = g.decks[ch].splice(0, 20);
    g.discard = g.decks[ch].splice(0, 3);
    var heights = ch === 1 ? [4, 4, 3, 3, 3, 2, 1] : ch === 2 ? [1, 2, 3, 3, 4, 4, 3] : [3, 3, 3, 3, 3, 3, 2];
    var k = 0;
    g.display = heights.map(function (h, col) {
      var stack = [];
      for (var i = 0; i < h && k < ids.length; i++) stack.push({ id: ids[k++], faceup: i === h - 1 });
      // top card of each column is the only available one
      return { col: col, stack: stack };
    });
    while (k < ids.length) g.discard.push(ids[k++]);
    while (g.landmarks.length < 3 && g.landmarkDeck.length) g.landmarks.push(g.landmarkDeck.shift());
    g.players.fellowship.skillsUsed = [];
    g.players.sauron.skillsUsed = [];
  }

  function cardById(id) { return C.CARDS.filter(function (c) { return c.id === id; })[0]; }
  function availableCards(g) {
    var out = [];
    g.display.forEach(function (col) {
      if (col.stack.length) {
        var top = col.stack[col.stack.length - 1];
        if (top.faceup) out.push({ col: col.col, card: cardById(top.id) });
      }
    });
    return out;
  }
  function takeFromDisplay(g, col) {
    var c = g.display.filter(function (x) { return x.col === col; })[0];
    if (!c || !c.stack.length) return null;
    var top = c.stack.pop();
    if (c.stack.length) c.stack[c.stack.length - 1].faceup = true;
    return cardById(top.id);
  }

  function skillsOf(player) {
    var out = [];
    player.played.forEach(function (card) {
      (card.effect.skills || []).forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
    });
    return out;
  }
  function chainSymbols(player) {
    return player.played.map(function (c) { return c.chain; }).filter(Boolean);
  }
  function canUseSkill(player, s) { return skillsOf(player).indexOf(s) >= 0 && player.skillsUsed.indexOf(s) < 0; }
  function useSkill(player, s) { if (canUseSkill(player, s)) player.skillsUsed.push(s); }

  function costToPlay(g, player, card) {
    if (g.chapter >= 2 && card.chain && chainSymbols(player).indexOf(card.chain) >= 0) return { free: true, skills: [], coins: card.cost.coins || 0 };
    var need = (card.cost.skills || []).filter(function (s) { return !canUseSkill(player, s); });
    return { free: false, skills: need, coins: (card.cost.coins || 0) + need.length };
  }

  function addLog(g, msg, side) { g.log.push({ msg: msg, side: side || null }); if (g.log.length > 80) g.log.shift(); }

  function giveCoins(g, player, n) {
    var take = Math.min(n, g.bank);
    player.coins += take; g.bank -= take; return take;
  }
  function payCoins(g, player, n) {
    var p = Math.min(n, player.coins);
    player.coins -= p; g.bank += p; return p;
  }

  function conflict(g, region) {
    var f = g.players.fellowship.units[region], s = g.players.sauron.units[region];
    while (f > 0 && s > 0) { f--; s--; }
    g.players.fellowship.units[region] = f;
    g.players.sauron.units[region] = s;
  }
  function placeUnits(g, player, region, n) {
    player.units[region] += n;
    var enemy = player.id === 'fellowship' ? 'sauron' : 'fellowship';
    if (g.players[enemy].units[region] > 0) conflict(g, region);
  }
  function moveUnit(g, player, from, to) {
    if (!player.units[from] || ADJ[from].indexOf(to) < 0) return false;
    player.units[from]--;
    player.units[to]++;
    var enemy = player.id === 'fellowship' ? 'sauron' : 'fellowship';
    if (g.players[enemy].units[to] > 0) conflict(g, to);
    return true;
  }
  function advanceQuest(g, player, n) {
    for (var i = 0; i < n; i++) {
      if (player.quest >= QUEST_END) break;
      player.quest++;
      var b = C.BONUS[player.quest];
      if (b) applyBonus(g, player, b);
      if (player.id === 'fellowship') g.players.sauron.quest = Math.min(QUEST_END, g.players.sauron.quest + 1);
    }
  }
  function applyBonus(g, player, b) {
    if (b.kind === 'coins') giveCoins(g, player, b.n);
    if (b.kind === 'units') {
      var reg = player.id === 'fellowship' ? 'arnor' : 'mordor';
      placeUnits(g, player, reg, b.n);
    }
    if (b.kind === 'quest') advanceQuest(g, player, b.n);
  }
  function checkAlliance(g, player, race) {
    if (race && player.races.indexOf(race) < 0) player.races.push(race);
    if (player.extraRace) return;
    var counts = {};
    player.races.forEach(function (r) { counts[r] = (counts[r] || 0) + 1; });
    var twice = C.RACES.filter(function (r) { return counts[r] >= 2; })[0];
    if (twice) {
      var stack = g.allianceStacks[twice];
      if (stack.length >= 2) { var a = stack.shift(), b = stack.shift(); stack.unshift(b); player.tokens.push(a); applyToken(g, player, a); }
    }
    if (player.races.length >= 3) {
      var uniq = player.races.slice(0, 3), chosen = null;
      uniq.forEach(function (r) { var t = g.allianceStacks[r].shift(); g.allianceStacks[r].push(t); if (!chosen) chosen = t; });
      if (chosen) { player.tokens.push(chosen); applyToken(g, player, chosen); }
      player.extraRace = true;
    }
  }
  function applyToken(g, player, token) {
    if (token.kind === 'coins') giveCoins(g, player, token.n);
    if (token.kind === 'quest') advanceQuest(g, player, token.n);
    if (token.kind === 'units') {
      var reg = player.id === 'fellowship' ? 'arnor' : 'mordor';
      placeUnits(g, player, reg, token.n);
    }
    if (token.kind === 'race') player.extraRace = true;
  }

  function applyEffect(g, player, card) {
    var e = card.effect;
    if (e.skills) e.skills.forEach(function (s) { /* skill availability derived from played card */ });
    if (e.coins) giveCoins(g, player, e.coins);
    if (e.race) checkAlliance(g, player, e.race);
    if (e.quest) advanceQuest(g, player, e.quest);
    if (e.units && e.regions) placeUnits(g, player, e.regions[0], e.units);
    if (e.maneuver) {
      if (e.maneuver === 'move') {
        var from = C.REGIONS.filter(function (r) { return player.units[r] > 0; })[0];
        if (from) { var to = ADJ[from][0]; moveUnit(g, player, from, to); }
      }
      if (e.maneuver === 'stealCoin') { var other = otherPlayer(g, player); other.coins = Math.max(0, other.coins - e.n); }
      if (e.maneuver === 'removeUnit') {
        var enemy = otherPlayer(g, player);
        var reg = C.REGIONS.filter(function (r) { return enemy.units[r] > 0; })[0];
        if (reg) enemy.units[reg]--;
      }
    }
  }

  function otherPlayer(g, p) { return g.players[p.id === 'fellowship' ? 'sauron' : 'fellowship']; }

  function checkVictory(g) {
    var f = g.players.fellowship, s = g.players.sauron;
    if (f.quest >= QUEST_END) return 'fellowship';
    if (s.quest >= f.quest) return 'sauron';
    if (f.races.length + (f.extraRace ? 1 : 0) >= 6) return 'fellowship';
    if (s.races.length + (s.extraRace ? 1 : 0) >= 6) return 'sauron';
    if (presentEverywhere(f)) return 'fellowship';
    if (presentEverywhere(s)) return 'sauron';
    return null;
  }
  function presentEverywhere(p) {
    return C.REGIONS.every(function (r) { return p.units[r] > 0 || p.forts.indexOf(r) >= 0; });
  }
  function regionCount(p) { return C.REGIONS.filter(function (r) { return p.units[r] > 0 || p.forts.indexOf(r) >= 0; }).length; }

  function endTurn(g) {
    var p = g.players[g.turn];
    p.skillsUsed = [];
    var w = checkVictory(g);
    if (w) { g.phase = 'ended'; g.winner = w; return; }
    if (!availableCards(g).length && !g.landmarks.length) {
      if (g.chapter < 3) { setupChapter(g, g.chapter + 1); }
      else {
        g.phase = 'ended';
        var f = regionCount(g.players.fellowship), s = regionCount(g.players.sauron);
        g.winner = f === s ? 'draw' : (f > s ? 'fellowship' : 'sauron');
        return;
      }
    }
    g.turn = g.turn === 'fellowship' ? 'sauron' : 'fellowship';
  }

  function takeChapter(g, col, mode, region) {
    if (g.phase !== 'playing') return { ok: false };
    var p = g.players[g.turn];
    var entry = availableCards(g).filter(function (a) { return a.col === col; })[0];
    if (!entry) return { ok: false, reason: 'unavailable' };
    var card = entry.card, cost = costToPlay(g, p, card);
    if (mode === 'discard') {
      takeFromDisplay(g, col);
      g.discard.push(card.id);
      giveCoins(g, p, g.chapter);
      addLog(g, p.id + ' discarded ' + card.name.en + ' (+' + g.chapter + ' coin)', p.id);
      endTurn(g); return { ok: true, action: 'discard', card: card };
    }
    if (!cost.free) {
      cost.skills.forEach(function (s) { useSkill(p, s); });
      if (p.coins < cost.coins) return { ok: false, reason: 'coins' };
      payCoins(g, p, cost.coins);
    }
    takeFromDisplay(g, col);
    p.played.push(card);
    if (card.effect.units && card.effect.regions && region) {
      applyEffectWithRegion(g, p, card, region);
    } else applyEffect(g, p, card);
    addLog(g, p.id + ' played ' + card.name.en, p.id);
    endTurn(g);
    return { ok: true, action: 'play', card: card };
  }

  function applyEffectWithRegion(g, p, card, region) {
    if (card.effect.regions.indexOf(region) < 0) region = card.effect.regions[0];
    var e = card.effect;
    if (e.coins) giveCoins(g, p, e.coins);
    if (e.race) checkAlliance(g, p, e.race);
    if (e.quest) advanceQuest(g, p, e.quest);
    if (e.units) placeUnits(g, p, region, e.units);
    if (e.maneuver) applyEffect(g, p, card);
  }

  function takeLandmark(g, index) {
    if (g.phase !== 'playing') return { ok: false };
    var p = g.players[g.turn];
    var tile = g.landmarks[index];
    if (!tile) return { ok: false, reason: 'unavailable' };
    var extra = p.forts.length;
    var need = (tile.cost.skills || []).filter(function (s) { return !canUseSkill(p, s); });
    var coins = (tile.cost.coins || 0) + extra + need.length;
    if (p.coins < coins) return { ok: false, reason: 'coins' };
    need.forEach(function (s) { useSkill(p, s); });
    payCoins(g, p, coins);
    g.landmarks.splice(index, 1);
    p.forts.push(tile.region);
    applyLandmark(g, p, tile);
    addLog(g, p.id + ' built ' + tile.name.en, p.id);
    endTurn(g);
    return { ok: true, action: 'landmark', tile: tile };
  }
  function applyLandmark(g, p, tile) {
    var e = tile.effect;
    if (e.coins) giveCoins(g, p, e.coins);
    if (e.quest) advanceQuest(g, p, e.quest);
    if (e.units) placeUnits(g, p, tile.region, e.units);
    if (e.removeUnit) { var o = otherPlayer(g, p); o.units[tile.region] = Math.max(0, o.units[tile.region] - e.removeUnit); }
  }

  /* Heuristic AI for both sides. */
  function chooseMove(g) {
    var p = g.players[g.turn], foe = otherPlayer(g, p);
    var cards = availableCards(g);
    var best = null;
    cards.forEach(function (a) {
      var cost = costToPlay(g, p, a.card);
      var score = scoreCard(g, p, a.card) - (cost.free ? 0 : cost.coins * 2);
      if (!cost.free && p.coins < cost.coins) score = scoreCard(g, p, a.card) + g.chapter - 2;
      if (!best || score > best.score) best = { type: 'card', col: a.col, card: a.card, score: score, cost: cost, mode: (!cost.free && p.coins < cost.coins) ? 'discard' : 'play' };
    });
    g.landmarks.forEach(function (tile, i) {
      var extra = p.forts.length;
      var need = (tile.cost.skills || []).filter(function (s) { return !canUseSkill(p, s); }).length;
      var coins = (tile.cost.coins || 0) + extra + need;
      if (p.coins >= coins) {
        var score = 7 + (tile.effect.quest || 0) * 2 + (tile.effect.units || 0) + (tile.effect.coins || 0) - extra;
        if (!best || score > best.score) best = { type: 'landmark', index: i, score: score };
      }
    });
    if (!best) return null;
    return best;
  }
  function scoreCard(g, p, card) {
    var s = card.type === 'skill' ? 8 : card.type === 'coin' ? 4 : 0;
    if (card.type === 'quest') {
      if (p.id === 'fellowship') s += card.effect.quest * 10;
      else s += card.effect.quest * 2;
    }
    if (card.type === 'unit') s += card.effect.units * 2;
    if (card.type === 'race') s += 6 + (p.races.indexOf(card.effect.race) >= 0 ? 2 : 0);
    if (card.type === 'maneuver') s += 6;
    return s + (g.rng() - 0.5);
  }

  function playAI(g) {
    var m = chooseMove(g);
    if (!m) return { ok: false };
    if (m.type === 'card') {
      var region = null;
      if (m.card.effect.units && m.card.effect.regions) region = m.card.effect.regions[0];
      return takeChapter(g, m.col, m.mode, region);
    }
    return takeLandmark(g, m.index);
  }

  var API = {
    ADJ: ADJ, QUEST_END: QUEST_END, createGame: createGame, setupChapter: setupChapter,
    availableCards: availableCards, skillsOf: skillsOf, chainSymbols: chainSymbols,
    costToPlay: costToPlay, takeChapter: takeChapter, takeLandmark: takeLandmark,
    checkVictory: checkVictory, regionCount: regionCount, playAI: playAI,
    cardById: cardById, otherPlayer: otherPlayer, addLog: addLog
  };
  root.LOTRDuelEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
