/* engine.js — classic Monopoly rules core. Pure logic, Node-testable. */
(function (root) {
  'use strict';
  var B = root.LOTRMonopolyBoard, CARDS = root.LOTRMonopolyCards;
  var TILES = B.TILES, START_CASH = 1500, GO_BONUS = 200, JAIL_POS = 10, JAIL_FEE = 50;

  function makeRng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, rng) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function createGame(config) {
    var rng = makeRng(config.seed || Date.now());
    var players = config.players.map(function (p, i) {
      return {
        id: p.id || ('p' + i), name: p.name, token: p.token || i, isHuman: !!p.isHuman,
        cash: START_CASH, pos: 0, jailTurns: 0, freeJail: 0,
        properties: [], houses: {}, hotels: [], mortgaged: [], bankrupt: false
      };
    });
    return {
      rng: rng, players: players, current: 0, phase: 'roll', dice: null, doubles: 0,
      chance: shuffle(CARDS.CHANCE.slice(), rng), chest: shuffle(CARDS.CHEST.slice(), rng),
      bank: 100000, log: [], winner: null, pending: null, auction: null,
      lastCard: null, lastRent: null, turns: 0, maxTurns: config.maxTurns || 400
    };
  }
  function log(s, text) { s.log.push(text); if (s.log.length > 120) s.log.shift(); }
  function active(s) { return s.players.filter(function (p) { return !p.bankrupt; }); }
  function ownerOf(s, tile) {
    return s.players.filter(function (p) { return !p.bankrupt && p.properties.indexOf(tile) >= 0; })[0] || null;
  }
  function addCash(s, p, n) { p.cash += n; }

  function nextPlayer(s) {
    var i = s.current;
    for (var k = 0; k < s.players.length; k++) {
      i = (i + 1) % s.players.length;
      if (!s.players[i].bankrupt) { s.current = i; return; }
    }
  }
  function checkWin(s) {
    var a = active(s);
    if (a.length === 1) { s.winner = a[0].id; s.phase = 'ended'; log(s, '🏆 ' + a[0].name + ' thắng!'); }
  }

  function move(s, p, steps, collectGo) {
    var from = p.pos;
    p.pos = (p.pos + steps + 40) % 40;
    if (collectGo !== false && p.pos < from || (collectGo !== false && steps > 0 && from + steps >= 40)) {
      addCash(s, p, GO_BONUS); log(s, p.name + ' đi qua KHỞI ĐẦU, nhận ' + GO_BONUS + 'đ');
    }
  }

  function rentOf(s, tile, diceSum) {
    var t = TILES[tile], owner = ownerOf(s, tile);
    if (!owner || owner.mortgaged.indexOf(tile) >= 0) return 0;
    if (t.type === 'railroad') {
      var n = owner.properties.filter(function (i) { return TILES[i].type === 'railroad'; }).length;
      return [0, 25, 50, 100, 200][n] || 25;
    }
    if (t.type === 'utility') {
      var u = owner.properties.filter(function (i) { return TILES[i].type === 'utility'; }).length;
      return (diceSum || 7) * (u >= 2 ? 10 : 4);
    }
    var houses = owner.houses[tile] || 0;
    var hotel = owner.hotels.indexOf(tile) >= 0;
    return t.rents[hotel ? 5 : houses] || t.rents[0];
  }

  function pay(s, from, to, amount, reason) {
    if (amount <= 0) return true;
    if (from.cash < amount) {
      var had = from.cash; from.cash = 0;
      if (to) to.cash += had;
      bankrupt(s, from, to);
      return false;
    }
    from.cash -= amount;
    if (to) to.cash += amount; else s.bank += amount;
    log(s, from.name + ' trả ' + amount + 'đ' + (to ? ' cho ' + to.name : '') + (reason ? ' (' + reason + ')' : ''));
    return true;
  }

  function bankrupt(s, p, creditor) {
    p.bankrupt = true;
    p.properties.forEach(function (tile) {
      if (creditor) creditor.properties.push(tile);
      else {
        var owner = ownerOf(s, tile);
        if (!owner) { /* returns to bank: nothing to do */ }
      }
      p.houses[tile] = 0;
    });
    if (creditor) {
      p.properties.forEach(function (tile) {
        if (p.mortgaged.indexOf(tile) >= 0) creditor.mortgaged.push(tile);
        if (p.hotels.indexOf(tile) >= 0) creditor.hotels.push(tile);
      });
    }
    p.properties = [];
    log(s, '💥 ' + p.name + ' phá sản' + (creditor ? ', tài sản chuyển cho ' + creditor.name : ''));
    checkWin(s);
  }

  function applyCard(s, p, card) {
    s.lastCard = card;
    log(s, '🃏 ' + p.name + ': ' + card.text);
    var e = card.effect;
    if (e.kind === 'cash') {
      if (e.amount >= 0) addCash(s, p, e.amount);
      else pay(s, p, null, -e.amount, 'thẻ');
      log(s, p.name + (e.amount >= 0 ? ' nhận ' : ' trả ') + Math.abs(e.amount) + 'đ');
    }
    if (e.kind === 'freeJail') p.freeJail++;
    if (e.kind === 'collectEach') active(s).forEach(function (q) { if (q !== p) { pay(s, q, p, e.amount); } });
    if (e.kind === 'payEach') active(s).forEach(function (q) { if (q !== p) { pay(s, p, q, e.amount); } });
    if (e.kind === 'repair') {
      var cost = 0;
      p.properties.forEach(function (tile) { cost += (p.hotels.indexOf(tile) >= 0 ? e.hotel : (p.houses[tile] || 0) * e.house); });
      if (cost) pay(s, p, null, cost, 'sửa chữa');
    }
    if (e.kind === 'jail') { p.pos = JAIL_POS; p.jailTurns = 1; log(s, p.name + ' vào tù'); }
    if (e.kind === 'goto') {
      var from = p.pos;
      p.pos = e.tile;
      if (e.collect) addCash(s, p, e.collect);
      if (e.tile < from) addCash(s, p, GO_BONUS);
      if (e.tile === 0 && e.collect) log(s, p.name + ' nhận ' + e.collect + 'đ');
      resolveTile(s, p, true);
    }
    if (e.kind === 'back') {
      p.pos = (p.pos - e.steps + 40) % 40;
      resolveTile(s, p, true);
    }
    if (e.kind === 'nearest') {
      var wanted = TILES.map(function (t, i) { return t.type === e.type ? i : -1; }).filter(function (i) { return i >= 0; });
      var next = wanted.filter(function (i) { return i > p.pos; })[0];
      if (next == null) next = wanted[0];
      var fromPos = p.pos;
      p.pos = next;
      if (next < fromPos) addCash(s, p, GO_BONUS);
      var rent = rentOf(s, next, s.dice ? s.dice[0] + s.dice[1] : 7) * (e.double ? 2 : 1);
      var own = ownerOf(s, next);
      if (own && own !== p) pay(s, p, own, rent, 'thuê ' + (e.double ? 'gấp đôi' : 'tiện ích'));
      else if (own === p) log(s, p.name + ' đến tài sản của mình');
    }
  }

  function resolveTile(s, p, fromCard) {
    var t = TILES[p.pos];
    var own = ownerOf(s, p.pos);
    if (t.type === 'chest' || t.type === 'chance') {
      var deck = t.type === 'chest' ? s.chest : s.chance;
      if (!deck.length) deck = shuffle((t.type === 'chest' ? CARDS.CHEST : CARDS.CHANCE).slice(), s.rng);
      applyCard(s, p, deck.shift());
    } else if (t.type === 'tax') {
      pay(s, p, null, p.pos === 4 ? 200 : 100, 'thuế');
    } else if (t.type === 'gotojail') {
      p.pos = JAIL_POS; p.jailTurns = 1; log(s, p.name + ' bị đưa vào tù');
    } else if (B.isBuyable(t)) {
      if (!own) {
        if (p.isHuman) { s.phase = 'buy'; s.pending = { tile: p.pos, price: t.price }; }
        else {
          if (aiBuy(s, p, t)) buyProperty(s, p, p.pos);
          else startAuction(s, p.pos);
        }
      } else if (own !== p) {
        var rent = rentOf(s, p.pos, s.dice ? s.dice[0] + s.dice[1] : 7);
        s.lastRent = { tile: p.pos, amount: rent, from: p.id, to: own.id };
        pay(s, p, own, rent, 'thuê ' + t.name);
      } else log(s, p.name + ' đứng trên tài sản của mình');
    } else log(s, p.name + ' đến ' + t.name);
    if (s.phase !== 'ended' && s.phase !== 'buy' && s.phase !== 'auction') s.phase = 'end';
  }

  function roll(s) {
    if (s.phase !== 'roll' || s.winner) return { ok: false };
    var p = s.players[s.current];
    var d1 = 1 + Math.floor(s.rng() * 6), d2 = 1 + Math.floor(s.rng() * 6);
    s.dice = [d1, d2];
    var sum = d1 + d2;
    log(s, p.name + ' tung xúc xắc: ' + d1 + ' + ' + d2 + ' = ' + sum);
    if (p.jailTurns > 0) {
      if (d1 === d2) {
        log(s, p.name + ' tung đôi, ra tù');
        p.jailTurns = 0;
      } else {
        p.jailTurns++;
        if (p.jailTurns >= 3) {
          if (pay(s, p, null, JAIL_FEE, 'phạt tù')) { p.jailTurns = 0; log(s, p.name + ' trả phạt và ra tù'); }
          else return { ok: true, jailed: true };
        } else return { ok: true, jailed: true };
      }
    }
    if (d1 === d2) {
      s.doubles++;
      if (s.doubles >= 3) {
        p.pos = JAIL_POS; p.jailTurns = 1; s.doubles = 0;
        log(s, 'Ba lần liên tiếp đôi — ' + p.name + ' vào tù');
        return { ok: true, jailed: true };
      }
    } else s.doubles = 0;
    move(s, p, sum);
    resolveTile(s, p, false);
    checkWin(s);
    return { ok: true, dice: [d1, d2], phase: s.phase };
  }

  function leaveJailCash(s) {
    var p = s.players[s.current];
    if (p.jailTurns <= 0) return { ok: false };
    if (p.freeJail > 0) { p.freeJail--; p.jailTurns = 0; log(s, p.name + ' dùng thẻ miễn phí ra tù'); return { ok: true }; }
    if (!pay(s, p, null, JAIL_FEE, 'phạt tù')) return { ok: true };
    p.jailTurns = 0; return { ok: true };
  }
  function useFreeJail(s) {
    var p = s.players[s.current];
    if (p.jailTurns <= 0 || p.freeJail <= 0) return { ok: false };
    p.freeJail--; p.jailTurns = 0; return { ok: true };
  }

  function canBuy(s, p, tile) {
    var t = TILES[tile];
    return B.isBuyable(t) && !ownerOf(s, tile) && p.cash >= t.price && !p.bankrupt;
  }
  function buyProperty(s, p, tile) {
    var t = TILES[tile];
    if (!canBuy(s, p, tile)) return { ok: false };
    p.cash -= t.price;
    p.properties.push(tile);
    log(s, p.name + ' mua ' + t.name + ' (' + t.price + 'đ)');
    if (s.phase === 'buy') s.phase = 'end';
    return { ok: true };
  }

  function startAuction(s, tile) {
    s.auction = { tile: tile, bids: [], current: s.players[s.current].id };
    s.phase = 'auction';
    log(s, 'Đấu giá ' + TILES[tile].name + ' — ai trả cao nhất sẽ mua');
  }
  function placeBid(s, playerIdx, amount) {
    var a = s.auction, p = s.players[playerIdx];
    if (!a || p.bankrupt || amount < 1 || amount > p.cash) return { ok: false };
    a.bids.push({ player: playerIdx, amount: amount });
    return { ok: true };
  }
  function resolveAuction(s) {
    var a = s.auction;
    if (!a) return { ok: false };
    var best = a.bids.slice().sort(function (x, y) { return y.amount - x.amount; })[0];
    if (best) {
      var p = s.players[best.player];
      p.cash -= best.amount; p.properties.push(a.tile);
      log(s, p.name + ' thắng đấu giá ' + TILES[a.tile].name + ' (' + best.amount + 'đ)');
    } else log(s, 'Không có ai mua ' + TILES[a.tile].name);
    s.auction = null; s.phase = 'end';
    return { ok: true, winner: best ? best.player : null };
  }

  function buildAllowed(s, p, tile) {
    var t = TILES[tile];
    if (!t || t.type !== 'property' || p.properties.indexOf(tile) < 0 || p.mortgaged.indexOf(tile) >= 0) return false;
    if (p.hotels.indexOf(tile) >= 0) return false;
    var houses = p.houses[tile] || 0;
    if (houses >= 4) return p.cash >= t.houseCost && groupAllowsHotel(s, p, tile);
    var group = t.color;
    var inGroup = p.properties.filter(function (i) { return TILES[i].type === 'property' && TILES[i].color === group && p.mortgaged.indexOf(i) < 0 && p.hotels.indexOf(i) < 0; });
    if (inGroup.length < 2) return false; // simplified: need at least 2 in group (classic needs full color set)
    var min = Math.min.apply(null, inGroup.map(function (i) { return p.houses[i] || 0; }));
    return (p.houses[tile] || 0) === min && p.cash >= t.houseCost;
  }
  function groupAllowsHotel(s, p, tile) {
    var t = TILES[tile];
    return p.properties.filter(function (i) { return TILES[i].type === 'property' && TILES[i].color === t.color; }).every(function (i) {
      return (p.houses[i] || 0) >= 4 && p.hotels.indexOf(i) >= 0 ? true : (p.houses[i] || 0) >= 4;
    });
  }
  function build(s, tile) {
    var p = s.players[s.current], t = TILES[tile];
    if (!buildAllowed(s, p, tile)) return { ok: false };
    if ((p.houses[tile] || 0) >= 4) { p.hotels.push(tile); log(s, p.name + ' xây KHÁCH SẠN tại ' + t.name); }
    else { p.houses[tile] = (p.houses[tile] || 0) + 1; log(s, p.name + ' xây nhà tại ' + t.name); }
    p.cash -= t.houseCost;
    return { ok: true };
  }
  function levelOf(p, tile) { return p.hotels.indexOf(tile) >= 0 ? 5 : (p.houses[tile] || 0); }
  function sameGroup(s, p, tile) {
    var t = TILES[tile];
    return p.properties.filter(function (i) {
      return TILES[i].type === 'property' && TILES[i].color === t.color && p.mortgaged.indexOf(i) < 0;
    });
  }
  function buildOptions(s, p, tile) {
    var t = TILES[tile];
    if (!t || t.type !== 'property' || p.properties.indexOf(tile) < 0) return [];
    var cur = levelOf(p, tile), out = [];
    for (var lv = cur + 1; lv <= 5; lv++) {
      var cost = (lv - cur) * (t.houseCost || 0);
      var enabled = true, reason = '';
      if (cur === 5) { enabled = false; reason = 'Đã là khách sạn'; }
      else if (lv === 5) {
        var grp = sameGroup(s, p, tile);
        if (grp.length < 2 || grp.some(function (i) { return levelOf(p, i) < 4; })) {
          enabled = false; reason = 'Cần 4 nhà ở mọi đất cùng nhóm màu';
        }
      } else {
        var group = sameGroup(s, p, tile);
        if (group.length < 2) { enabled = false; reason = 'Cần ít nhất 2 đất cùng nhóm màu'; }
        else {
          var others = group.filter(function (i) { return i !== tile; }).map(function (i) { return levelOf(p, i); });
          var maxOther = Math.max.apply(null, others.concat([0]));
          if (lv > maxOther + 1) { enabled = false; reason = 'Phải xây đều trong nhóm màu'; }
        }
      }
      if (p.cash < cost) { enabled = false; reason = 'Không đủ tiền'; }
      out.push({ level: lv, label: lv === 5 ? 'Khách sạn' : lv + ' nhà', cost: cost, enabled: enabled, reason: reason });
    }
    return out;
  }
  function buildTo(s, tile, target) {
    var p = s.players[s.current], opt = buildOptions(s, p, tile).filter(function (o) { return o.level === target; })[0];
    if (!opt || !opt.enabled) return { ok: false, reason: opt ? opt.reason : 'invalid' };
    p.cash -= opt.cost;
    if (target === 5) { p.houses[tile] = 4; if (p.hotels.indexOf(tile) < 0) p.hotels.push(tile); }
    else { p.houses[tile] = target; p.hotels = p.hotels.filter(function (i) { return i !== tile; }); }
    log(s, p.name + ' nâng ' + TILES[tile].name + ' lên ' + opt.label + ' (' + opt.cost + 'đ)');
    return { ok: true, level: target, cost: opt.cost };
  }
  function sellHouse(s, tile) {
    var p = s.players[s.current], t = TILES[tile];
    if (p.hotels.indexOf(tile) >= 0) { p.hotels = p.hotels.filter(function (i) { return i !== tile; }); p.houses[tile] = 4; }
    else if ((p.houses[tile] || 0) > 0) p.houses[tile]--;
    else return { ok: false };
    p.cash += Math.floor(t.houseCost / 2);
    log(s, p.name + ' bán nhà tại ' + t.name);
    return { ok: true };
  }
  function mortgage(s, tile) {
    var p = s.players[s.current], t = TILES[tile];
    if (p.properties.indexOf(tile) < 0 || p.mortgaged.indexOf(tile) >= 0) return { ok: false };
    if ((p.houses[tile] || 0) > 0 || p.hotels.indexOf(tile) >= 0) return { ok: false };
    p.mortgaged.push(tile); p.cash += Math.floor(t.price / 2);
    log(s, p.name + ' thế chấp ' + t.name);
    return { ok: true };
  }
  function unmortgage(s, tile) {
    var p = s.players[s.current], t = TILES[tile];
    if (p.mortgaged.indexOf(tile) < 0) return { ok: false };
    var cost = Math.ceil(t.price / 2 * 1.1);
    if (p.cash < cost) return { ok: false };
    p.cash -= cost; p.mortgaged = p.mortgaged.filter(function (i) { return i !== tile; });
    log(s, p.name + ' chuộc ' + t.name);
    return { ok: true };
  }

  function endTurn(s, extraRoll) {
    if (s.winner) return;
    if (!extraRoll && s.dice && s.dice[0] === s.dice[1] && s.doubles > 0 && s.phase !== 'ended') {
      s.phase = 'roll'; s.pending = null; s.dice = null;
      log(s, s.players[s.current].name + ' được đi thêm lượt (đôi)');
      return;
    }
    s.doubles = 0; s.pending = null; s.dice = null; s.phase = 'roll';
    if (!s.winner) nextPlayer(s);
    s.turns++;
    if (s.turns >= s.maxTurns) {
      var best = active(s).slice().sort(function (a, b) { return netWorth(s, b) - netWorth(s, a); })[0];
      if (best) { s.winner = best.id; s.phase = 'ended'; log(s, '⏰ Hết ' + s.maxTurns + ' lượt — chấm theo tài sản. ' + best.name + ' thắng!'); }
    }
  }
  function netWorth(s, p) {
    var v = p.cash;
    p.properties.forEach(function (i) {
      v += TILES[i].price;
      v += (p.houses[i] || 0) * (TILES[i].houseCost || 0);
      if (p.hotels.indexOf(i) >= 0) v += (TILES[i].houseCost || 0);
    });
    return v;
  }

  /* --------- AI heuristics --------- */
  function aiBuy(s, p, t) {
    var reserve = 120 + (p.properties.length * 20);
    if (p.cash - t.price < reserve) return false;
    if (t.type === 'railroad' || t.type === 'utility') return p.cash > t.price + 250;
    var group = t.color;
    var owned = p.properties.filter(function (i) { return TILES[i].type === 'property' && TILES[i].color === group; }).length;
    return owned >= 1 || p.cash > t.price + 500;
  }
  function aiBid(s, p, tile) {
    var t = TILES[tile];
    var max = Math.min(p.cash, Math.floor(t.price * (aiBuy(s, p, t) ? 1.1 : 0.55)));
    return max;
  }
  function aiBuild(s, p) {
    var best = -1, bestScore = 0;
    p.properties.forEach(function (tile) {
      if (!buildAllowed(s, p, tile)) return;
      var score = (p.houses[tile] || 0) + (TILES[tile].type === 'property' ? 2 : 0);
      if (score > bestScore) { bestScore = score; best = tile; }
    });
    if (best >= 0 && p.cash > TILES[best].houseCost + 80) return build(s, best);
    return null;
  }
  function aiTurn(s) {
    if (s.winner) return { ok: false };
    var p = s.players[s.current];
    var r = roll(s);
    if (!r.ok) return r;
    if (s.phase === 'auction') {
      active(s).forEach(function (q) {
        var bid = aiBid(s, q, s.auction.tile);
        if (bid >= 1) placeBid(s, s.players.indexOf(q), bid);
      });
      resolveAuction(s);
    }
    if (p.jailTurns > 0 && p.freeJail > 0) useFreeJail(s);
    aiBuild(s, p);
    endTurn(s);
    return r;
  }

  var API = {
    TILES: TILES, START_CASH: START_CASH, GO_BONUS: GO_BONUS, JAIL_FEE: JAIL_FEE,
    createGame: createGame, log: log, active: active, ownerOf: ownerOf, rentOf: rentOf,
    roll: roll, leaveJailCash: leaveJailCash, useFreeJail: useFreeJail,
    buyProperty: buyProperty, canBuy: canBuy, startAuction: startAuction, placeBid: placeBid,
    resolveAuction: resolveAuction, build: build, buildAllowed: buildAllowed, sellHouse: sellHouse,
    levelOf: levelOf, buildOptions: buildOptions, buildTo: buildTo,
    mortgage: mortgage, unmortgage: unmortgage, endTurn: endTurn,
    aiTurn: aiTurn, aiBuy: aiBuy, aiBid: aiBid, pay: pay, bankrupt: bankrupt,
    netWorth: netWorth, clone: clone
  };
  root.LOTRMonopolyEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
