/* engine.js — classic Monopoly rules core. Pure logic, Node-testable. */
(function (root) {
  'use strict';
  var B = root.LOTRMonopolyBoard, CARDS = root.LOTRMonopolyCards;
  var TILES = B.TILES, START_CASH = 1500, GO_BONUS = 200, JAIL_POS = 10, JAIL_FEE = 50;
  function tiles(s) { return B.tiles(s); }
  function jailPos(s) { return 10; } /* Đảo Mất Tích nằm đúng ô Tù cũ */
  function jailFee(s) { return s.mode === 'tour' ? 200 : JAIL_FEE; }

  function makeRng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, rng) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function createGame(config) {
    var rng = makeRng(config.seed || Date.now());
    var tour = config.mode === 'tour';
    var players = config.players.map(function (p, i) {
      return {
        id: p.id || ('p' + i), name: p.name, token: p.token || i, isHuman: !!p.isHuman,
        cash: START_CASH, pos: 0, jailTurns: 0, freeJail: 0, laps: 0, builtLap: {}, worldTour: false,
        properties: [], houses: {}, hotels: [], mortgaged: [], bankrupt: false
      };
    });
    var board = tour ? B.TOUR_TILES : B.TILES;
    var festivals = [];
    if (tour) {
      var props = board.map(function (t, i) { return t.type === 'property' ? i : -1; }).filter(function (i) { return i >= 0; });
      shuffle(props, rng);
      festivals = props.slice(0, 2);
    }
    return {
      mode: tour ? 'tour' : 'classic',
      board: board,
      eventChance: tour ? 0.5 : 0,
      rng: rng, players: players, current: 0, phase: 'roll', dice: null, doubles: 0,
      chance: shuffle(CARDS.CHANCE.slice(), rng), chest: shuffle(CARDS.CHEST.slice(), rng),
      eventDeck: shuffle(CARDS.EVENTS.slice(), rng), lastEvent: null, extraTurn: false,
      tourChance: shuffle(CARDS.TOUR_CHANCE.slice(), rng),
      festivals: festivals, champions: {},
      bank: 100000, log: [], events: [], winner: null, pending: null, auction: null,
      lastCard: null, lastRent: null, turns: 0,
      maxTurns: config.maxTurns || (tour ? 120 : 400)
    };
  }
  function log(s, text) { s.log.push(text); if (s.log.length > 120) s.log.shift(); }
  function emit(s, ev) {
    s.events.push(ev);
    if (s.events.length > 20) s.events.shift();
  }
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
    if (a.length === 1) { s.winner = a[0].id; s.phase = 'ended'; log(s, '🏆 ' + a[0].name + ' thắng!'); return; }
    if (s.mode === 'tour') checkTourWin(s);
  }
  /* Business Tour win conditions: side / triple / resort monopoly. */
  function checkTourWin(s) {
    var board = tiles(s);
    a: for (var pi = 0; pi < s.players.length; pi++) {
      var p = s.players[pi];
      if (p.bankrupt) continue;
      var owned = p.properties;
      /* Side monopoly — chiếm mọi đất có thể mua trong một khu vực. */
      for (var r = 0; r < B.REGIONS.length; r++) {
        var inRegion = board.map(function (t, i) { return t.region === r && t.type === 'property' ? i : -1; }).filter(function (i) { return i >= 0; });
        if (inRegion.length && inRegion.every(function (i) { return owned.indexOf(i) >= 0; })) {
          declareTourWin(s, p, 'Side Monopoly · ' + B.REGIONS[r]); break a;
        }
      }
      /* Triple monopoly — đủ 3 nhóm hoa văn (mỗi nhóm 3 ô). */
      var patterns = {}, tripleCount = 0;
      owned.forEach(function (i) { var pat = board[i].pattern; if (pat) patterns[pat] = (patterns[pat] || 0) + 1; });
      Object.keys(patterns).forEach(function (k) {
        var full = board.filter(function (t) { return t.pattern === k; }).length;
        if (full >= 2 && patterns[k] >= full) tripleCount++;
      });
      if (tripleCount >= 3) { declareTourWin(s, p, 'Triple Monopoly · 3 triplet'); break a; }
      /* Resort monopoly — đủ 4 resort. */
      var resorts = board.map(function (t, i) { return t.type === 'resort' ? i : -1; }).filter(function (i) { return i >= 0; });
      if (resorts.length && resorts.every(function (i) { return owned.indexOf(i) >= 0; })) {
        declareTourWin(s, p, 'Resort Monopoly · 4 khu nghỉ dưỡng'); break a;
      }
    }
  }
  function declareTourWin(s, p, reason) {
    s.winner = p.id; s.phase = 'ended';
    log(s, '🏆 ' + p.name + ' thắng bằng ' + reason + '!');
    emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: reason, kind: 'event' });
  }

  function move(s, p, steps, collectGo) {
    var from = p.pos;
    var size = tiles(s).length;
    p.pos = (p.pos + steps + size) % size;
    if (collectGo !== false && (p.pos < from || (steps > 0 && from + steps >= size))) {
      p.laps = (p.laps || 0) + 1;
      addCash(s, p, GO_BONUS); emit(s, { from: 'Ngân hàng', to: p.name, amount: GO_BONUS, reason: 'Qua KHỞI ĐẦU', kind: 'gain' });
      log(s, p.name + ' đi qua KHỞI ĐẦU, nhận ' + GO_BONUS + 'đ' + (s.mode === 'tour' ? ' · vòng ' + p.laps : ''));
    }
  }

  function rentOf(s, tile, diceSum) {
    var t = tiles(s)[tile], owner = ownerOf(s, tile);
    if (!owner || owner.mortgaged.indexOf(tile) >= 0) return 0;
    if (t.type === 'railroad' || t.type === 'resort') {
      var n = owner.properties.filter(function (i) {
        return tiles(s)[i].type === t.type;
      }).length;
      return [0, 25, 50, 100, 200][n] || 25;
    }
    if (t.type === 'utility') {
      var u = owner.properties.filter(function (i) { return tiles(s)[i].type === 'utility'; }).length;
      return (diceSum || 7) * (u >= 2 ? 10 : 4);
    }
    var houses = owner.houses[tile] || 0;
    var hotel = owner.hotels.indexOf(tile) >= 0;
    var rent = t.rents[hotel ? 5 : houses] || t.rents[0];
    if (s.mode === 'tour') {
      if ((s.festivals || []).indexOf(tile) >= 0) rent *= 2; /* Liên hoan: thuê gấp đôi */
      var champ = (s.champions || {})[tile] || 0; /* Vô địch thế giới: tăng dần */
      if (champ) rent *= (1 + champ);
    }
    return rent;
  }

  function pay(s, from, to, amount, reason) {
    if (amount <= 0) return true;
    if (from.cash < amount) {
      var had = from.cash; from.cash = 0;
      if (to) to.cash += had;
      emit(s, { from: from.name, to: to ? to.name : 'Ngân hàng', amount: had, reason: reason || 'phá sản', kind: 'fail' });
      bankrupt(s, from, to);
      return false;
    }
    from.cash -= amount;
    if (to) to.cash += amount; else s.bank += amount;
    emit(s, { from: from.name, to: to ? to.name : 'Ngân hàng', amount: amount, reason: reason || 'thanh toán', kind: 'pay' });
    log(s, from.name + ' trả ' + amount + 'đ' + (to ? ' cho ' + to.name : '') + (reason ? ' (' + reason + ')' : ''));
    return true;
  }

  function bankrupt(s, p, creditor) {
    p.bankrupt = true;
    p.properties.forEach(function (tile) {
      /* Resort không thể bị mua lại — trở về ngân hàng khi chủ phá sản. */
      if (creditor && !(s.mode === 'tour' && tiles(s)[tile].type === 'resort')) creditor.properties.push(tile);
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
    emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: (card.id.indexOf('ch') === 0 ? 'THỬ THÁCH' : 'KHỐI CỘNG ĐỒNG') + ' · ' + card.text, kind: 'event' });
    var e = card.effect;
    if (e.kind === 'cash') {
      if (e.amount >= 0) { addCash(s, p, e.amount); emit(s, { from: 'Ngân hàng', to: p.name, amount: e.amount, reason: 'Thẻ bài', kind: 'gain' }); }
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
    if (e.kind === 'jail') {
      p.pos = jailPos(s); p.jailTurns = 1;
      emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'ĐẢO MẤT TÍCH · ' + p.name + ' bị giam 3 lượt', kind: 'jail' });
      log(s, p.name + ' vào Đảo Mất Tích');
    }
    if (e.kind === 'extraTurn') { s.extraTurn = true; log(s, p.name + ' nhận thêm một lượt đi'); }
    if (e.kind === 'worldTour') { p.worldTour = true; log(s, p.name + ' có thẻ Tour Thế Giới — dùng ở đầu lượt sau'); }
    if (e.kind === 'earthquake') {
      var victim = active(s).filter(function (q) { return q !== p; }).sort(function (x, y) {
        return Object.keys(y.houses).length - Object.keys(x.houses).length;
      })[0];
      if (victim) {
        /* Khách sạn miễn nhiễm động đất theo luật Business Tour. */
        var target = victim.properties.filter(function (i) {
          return (victim.houses[i] || 0) > 0 && victim.hotels.indexOf(i) < 0;
        }).sort(function (x, y) { return (victim.houses[y] || 0) - (victim.houses[x] || 0); })[0];
        if (target != null) {
          victim.houses[target] = Math.max(0, (victim.houses[target] || 0) - 1);
          log(s, '🌊 ' + p.name + ' gây động đất, công trình tại ' + tiles(s)[target].name + ' của ' + victim.name + ' bị phá');
          emit(s, { from: p.name, to: victim.name, amount: 0, reason: 'ĐỘNG ĐẤT · ' + tiles(s)[target].name, kind: 'event' });
        } else log(s, '🌊 Động đất không tìm thấy công trình để phá');
      }
    }
    if (e.kind === 'goto') {
      var from = p.pos;
      var target = e.tile < tiles(s).length ? e.tile : 0;
      p.pos = target;
      if (e.collect) addCash(s, p, e.collect);
      if (target < from) addCash(s, p, GO_BONUS);
      if (target === 0 && e.collect) log(s, p.name + ' nhận ' + e.collect + 'đ');
      resolveTile(s, p, true);
    }
    if (e.kind === 'back') {
      p.pos = (p.pos - e.steps + tiles(s).length) % tiles(s).length;
      resolveTile(s, p, true);
    }
    if (e.kind === 'nearest') {
      var wanted = tiles(s).map(function (t, i) { return t.type === e.type ? i : -1; }).filter(function (i) { return i >= 0; });
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

  function applyEvent(s, p, card) {
    s.lastEvent = card;
    log(s, '⚡ ' + p.name + ': ' + card.text);
    emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'THẺ SỰ KIỆN · ' + card.text, kind: 'event', card: card });
    var e = card.effect;
    if (e.kind === 'cash') {
      if (e.amount >= 0) { addCash(s, p, e.amount); emit(s, { from: 'Ngân hàng', to: p.name, amount: e.amount, reason: 'Thẻ sự kiện', kind: 'gain' }); }
      else pay(s, p, null, -e.amount, 'thẻ sự kiện');
    }
    if (e.kind === 'move') {
      if (e.steps > 0) move(s, p, e.steps);
      else p.pos = (p.pos + e.steps + tiles(s).length) % tiles(s).length;
      resolveTile(s, p, true);
    }
    if (e.kind === 'collectEach') active(s).forEach(function (q) { if (q !== p) pay(s, q, p, e.amount, 'thẻ sự kiện'); });
    if (e.kind === 'payEach') active(s).forEach(function (q) { if (q !== p) pay(s, p, q, e.amount, 'thẻ sự kiện'); });
    if (e.kind === 'steal') {
      var rich = active(s).filter(function (q) { return q !== p; }).sort(function (a, b) { return b.cash - a.cash; })[0];
      if (rich) pay(s, rich, p, Math.min(e.amount, rich.cash), 'bị trộm tiền');
    }
    if (e.kind === 'freeHouse') {
      var tile = p.properties.filter(function (i) { return tiles(s)[i].type === 'property' && p.hotels.indexOf(i) < 0 && buildAllowed(s, p, i); })[0];
      if (tile != null) { build(s, tile); log(s, p.name + ' được tặng nhà miễn phí tại ' + tiles(s)[tile].name); }
    }
    if (e.kind === 'extraTurn') { s.extraTurn = true; log(s, p.name + ' được đi thêm lượt'); }
  }
  function maybeEvent(s, p) {
    var chance = s.eventChance != null ? s.eventChance : 0.32;
    if (chance <= 0 || s.rng() >= chance) return;
    if (s.mode === 'tour') {
      if (!s.tourChance || !s.tourChance.length) s.tourChance = shuffle(CARDS.TOUR_CHANCE.slice(), s.rng);
      applyCard(s, p, s.tourChance.shift());
    } else {
      if (!s.eventDeck.length) s.eventDeck = shuffle(CARDS.EVENTS.slice(), s.rng);
      applyEvent(s, p, s.eventDeck.shift());
    }
  }

  function resolveTile(s, p, fromCard) {
    var t = tiles(s)[p.pos];
    var own = ownerOf(s, p.pos);
    if (t.type === 'chest' || t.type === 'chance') {
      var isTourChance = s.mode === 'tour' && t.type === 'chance';
      var deck = t.type === 'chest' ? s.chest : (isTourChance ? s.tourChance : s.chance);
      var source = t.type === 'chest' ? CARDS.CHEST : (isTourChance ? CARDS.TOUR_CHANCE : CARDS.CHANCE);
      if (!deck || !deck.length) {
        deck = shuffle(source.slice(), s.rng);
        if (t.type === 'chest') s.chest = deck; else if (isTourChance) s.tourChance = deck; else s.chance = deck;
      }
      applyCard(s, p, deck.shift());
    } else if (t.type === 'jail') {
      p.jailTurns = Math.max(1, p.jailTurns);
      emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: (s.mode === 'tour' ? 'ĐẢO MẤT TÍCH · ' : 'VÀO TÙ · ') + p.name + ' bị giam', kind: 'jail' });
      log(s, p.name + (s.mode === 'tour' ? ' bị giam ở Đảo Mất Tích 3 lượt' : ' bị giam trong tù'));
    } else if (t.type === 'tax') {
      if (s.mode === 'tour') {
        var due = Math.floor(netWorth(s, p) * 0.1);
        pay(s, p, null, due, 'thuế 10% tổng tài sản');
      } else pay(s, p, null, p.pos === 4 ? 200 : 100, 'thuế');
    } else if (t.type === 'championship' && s.mode === 'tour') {
      s.phase = 'championship'; s.pending = { mode: 'championship', tile: p.pos };
      log(s, p.name + ' tổ chức Vô Địch Thế Giới — chọn một thành phố');
    } else if (t.type === 'worldtour' && s.mode === 'tour') {
      p.worldTour = true;
      log(s, p.name + ' nhận thẻ Tour Thế Giới — dùng ở đầu lượt sau');
      emit(s, { from: 'Tất cả', to: p.name, amount: 0, reason: 'TOUR THẾ GIỚI · ' + p.name + ' có quyền chọn đất', kind: 'event' });
    } else if (t.type === 'gotojail') {
      p.pos = jailPos(s); p.jailTurns = 1;
      emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'VÀO TÙ · Đi thẳng từ ô VÀO TÙ', kind: 'jail' });
      log(s, p.name + ' bị đưa vào tù');
    } else if (B.isBuyable(t)) {
      if (!own) {
        var noAuction = t.type === 'resort'; /* Resort không bị đấu giá lại */
        if (p.isHuman) { s.phase = 'buy'; s.pending = { tile: p.pos, price: t.price, resort: noAuction }; }
        else if (aiBuy(s, p, t)) buyProperty(s, p, p.pos);
        else if (!noAuction) startAuction(s, p.pos);
        else log(s, t.name + ' không có ai mua — resort vẫn thuộc ngân hàng');
      } else if (own !== p) {
        var rent = rentOf(s, p.pos, s.dice ? s.dice[0] + s.dice[1] : 7);
        s.lastRent = { tile: p.pos, amount: rent, from: p.id, to: own.id };
        pay(s, p, own, rent, 'thuê ' + t.name);
      } else if (t.type === 'property' && s.mode === 'tour') {
        s.phase = 'build'; s.pending = { tile: p.pos, mode: 'build', price: 0 };
        log(s, p.name + ' đứng trên đất của mình — có thể xây ngay');
      } else log(s, p.name + ' đứng trên tài sản của mình');
    } else log(s, p.name + ' đến ' + t.name);
    if (['ended', 'buy', 'auction', 'build', 'championship'].indexOf(s.phase) < 0) s.phase = 'end';
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
        emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'ĐÔI XÚC XẮC · ' + p.name + ' ra tù và đi tiếp', kind: 'event' });
        p.jailTurns = 0;
      } else {
        /* Không ra đôi → ở thêm một lượt và QUA LƯỢT cho người sau. */
        p.jailTurns++;
        if (p.jailTurns <= 3) {
          log(s, p.name + ' không ra đôi — ở lại ' + (s.mode === 'tour' ? 'Đảo Mất Tích' : 'tù') + ' (' + p.jailTurns + '/3)');
          emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'Vẫn bị giam · lượt ' + p.jailTurns + '/3', kind: 'jail' });
          s.doubles = 0; s.extraTurn = false;
          endTurn(s);
          return { ok: true, jailed: true, passed: true };
        }
        /* Hết 3 lượt không ra đôi → bắt buộc trả tiền để ra tù. */
        var fee = jailFee(s);
        if (!pay(s, p, null, fee, 'phạt ra tù')) return { ok: true, jailed: true };
        p.jailTurns = 0;
        log(s, p.name + ' hết 3 lượt, trả ' + fee + 'đ để ra tù');
        emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'TRẢ ' + fee + 'Đ · ' + p.name + ' ra tù', kind: 'event' });
      }
    }
    if (d1 === d2) {
      s.doubles++;
      if (s.doubles < 3) {
        emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'ĐÔI XÚC XẮC · ' + p.name + ' được đi thêm lượt', kind: 'event' });
      }
      if (s.doubles >= 3) {
        p.pos = jailPos(s); p.jailTurns = 1; s.doubles = 0;
        emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: (s.mode === 'tour' ? 'ĐẢO MẤT TÍCH' : 'VÀO TÙ') + ' · 3 lần đôi liên tiếp', kind: 'jail' });
        log(s, 'Ba lần liên tiếp đôi — ' + p.name + ' vào tù');
        endTurn(s);
        return { ok: true, jailed: true, passed: true };
      }
    } else s.doubles = 0;
    move(s, p, sum);
    resolveTile(s, p, false);
    if (!s.winner && s.phase === 'end') maybeEvent(s, p);
    checkWin(s);
    return { ok: true, dice: [d1, d2], phase: s.phase };
  }

  function leaveJailCash(s) {
    var p = s.players[s.current];
    if (p.jailTurns <= 0) return { ok: false };
    if (p.freeJail > 0) { p.freeJail--; p.jailTurns = 0; log(s, p.name + ' dùng thẻ miễn phí ra tù'); return { ok: true }; }
    if (!pay(s, p, null, jailFee(s), 'phạt tù')) return { ok: true };
    p.jailTurns = 0; return { ok: true };
  }
  function useFreeJail(s) {
    var p = s.players[s.current];
    if (p.jailTurns <= 0 || p.freeJail <= 0) return { ok: false };
    p.freeJail--; p.jailTurns = 0; return { ok: true };
  }
  /* Vô Địch Thế Giới: chọn một thành phố của mình, hệ số thuê tăng dần. */
  function chooseChampionship(s, tile) {
    var p = s.players[s.current], t = tiles(s)[tile];
    if (s.phase !== 'championship' || !t || t.type !== 'property' || p.properties.indexOf(tile) < 0) return { ok: false };
    s.champions = s.champions || {};
    s.champions[tile] = (s.champions[tile] || 0) + 1;
    s.phase = 'end'; s.pending = null;
    log(s, p.name + ' tổ chức Vô Địch tại ' + t.name + ' — thuê tăng lên ×' + (1 + s.champions[tile]));
    emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'VÔ ĐỊCH THẾ GIỚI · ' + t.name + ' ×' + (1 + s.champions[tile]), kind: 'event' });
    return { ok: true };
  }
  /* Tour Thế Giới: tới một đất trống hoặc đất của mình, trả phí 50đ. */
  function worldTourTargets(s) {
    var p = s.players[s.current];
    return tiles(s).map(function (t, i) {
      var ok = B.isBuyable(t) && (!ownerOf(s, i) || ownerOf(s, i) === p);
      return ok ? i : -1;
    }).filter(function (i) { return i >= 0; });
  }
  function useWorldTour(s, tile) {
    var p = s.players[s.current];
    if (!p.worldTour || s.phase !== 'roll' || worldTourTargets(s).indexOf(tile) < 0 || p.cash < 50) return { ok: false };
    pay(s, p, null, 50, 'phí Tour Thế Giới');
    p.worldTour = false; p.pos = tile;
    log(s, p.name + ' dùng Tour Thế Giới tới ' + tiles(s)[tile].name + ' (phí 50đ)');
    emit(s, { from: p.name, to: 'Tất cả', amount: 0, reason: 'TOUR THẾ GIỚI · ' + tiles(s)[tile].name, kind: 'event' });
    resolveTile(s, p, true);
    return { ok: true };
  }

  function canBuy(s, p, tile) {
    var t = tiles(s)[tile];
    return B.isBuyable(t) && !ownerOf(s, tile) && p.cash >= t.price && !p.bankrupt;
  }
  function buyProperty(s, p, tile) {
    var t = tiles(s)[tile];
    if (!canBuy(s, p, tile)) return { ok: false };
    p.cash -= t.price;
    emit(s, { from: p.name, to: 'Ngân hàng', amount: t.price, reason: 'Mua ' + t.name, kind: 'buy' });
    p.properties.push(tile);
    log(s, p.name + ' mua ' + t.name + ' (' + t.price + 'đ)');
    if (s.phase === 'buy') s.phase = 'end';
    return { ok: true };
  }

  function startAuction(s, tile) {
    s.auction = { tile: tile, bids: [], current: s.players[s.current].id };
    s.phase = 'auction';
    log(s, 'Đấu giá ' + tiles(s)[tile].name + ' — ai trả cao nhất sẽ mua');
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
      emit(s, { from: p.name, to: 'Ngân hàng', amount: best.amount, reason: 'Đấu giá ' + tiles(s)[a.tile].name, kind: 'buy' });
      log(s, p.name + ' thắng đấu giá ' + tiles(s)[a.tile].name + ' (' + best.amount + 'đ)');
    } else log(s, 'Không có ai mua ' + tiles(s)[a.tile].name);
    s.auction = null; s.phase = 'end';
    return { ok: true, winner: best ? best.player : null };
  }

  /* Business Tour: lên cấp theo số vòng đi được, không cần chiếm cả nhóm màu. */
  function tourBuildOptions(s, p, tile) {
    var t = tiles(s)[tile];
    if (!t || t.type !== 'property' || p.properties.indexOf(tile) < 0 || p.mortgaged.indexOf(tile) >= 0) return [];
    var cur = levelOf(p, tile), laps = p.laps || 0, last = (p.builtLap || {})[tile] || 0, out = [];
    function add(lv, label, cost, enabled, reason) { out.push({ level: lv, label: label, cost: cost, enabled: !!enabled, reason: reason || '' }); }
    if (cur === 5) { add(5, 'Đã là khách sạn', 0, false, 'Đã là khách sạn'); return out; }
    for (var lv = cur + 1; lv <= 3; lv++) {
      var cost = (lv - cur) * t.houseCost;
      var needLap = lv >= 3 && laps <= last;
      add(lv, lv === 3 ? 'Cấp 3 · Nhà cao cấp' : 'Cấp ' + lv, cost,
        p.cash >= cost && !needLap, needLap ? 'Cần đi thêm một vòng' : (p.cash < cost ? 'Không đủ tiền' : ''));
    }
    if (cur >= 3) {
      var hCost = t.houseCost, hLap = laps <= last;
      add(5, 'Khách sạn', hCost, cur === 3 && !hLap && p.cash >= hCost,
        cur < 3 ? 'Cần lên cấp 3 trước' : (hLap ? 'Cần đi thêm một vòng' : (p.cash < hCost ? 'Không đủ tiền' : '')));
    }
    return out;
  }
  function buildAllowed(s, p, tile) {
    if (s.mode === 'tour') return tourBuildOptions(s, p, tile).some(function (o) { return o.enabled; });
    var t = tiles(s)[tile];
    if (!t || t.type !== 'property' || p.properties.indexOf(tile) < 0 || p.mortgaged.indexOf(tile) >= 0) return false;
    if (p.hotels.indexOf(tile) >= 0) return false;
    var houses = p.houses[tile] || 0;
    if (houses >= 4) return p.cash >= t.houseCost && groupAllowsHotel(s, p, tile);
    var group = t.color;
    var full = tiles(s).filter(function (x) { return x.type === 'property' && x.color === group; }).length;
    var inGroup = p.properties.filter(function (i) { return tiles(s)[i].type === 'property' && tiles(s)[i].color === group && p.mortgaged.indexOf(i) < 0 && p.hotels.indexOf(i) < 0; });
    if (inGroup.length < full) return false; /* luật cổ điển: phải chiếm đủ cả nhóm màu */
    var min = Math.min.apply(null, inGroup.map(function (i) { return p.houses[i] || 0; }));
    return (p.houses[tile] || 0) === min && p.cash >= t.houseCost;
  }
  function groupAllowsHotel(s, p, tile) {
    var t = tiles(s)[tile];
    var group = p.properties.filter(function (i) { return tiles(s)[i].type === 'property' && tiles(s)[i].color === t.color; });
    var full = tiles(s).filter(function (x) { return x.type === 'property' && x.color === t.color; }).length;
    if (group.length < full) return false;
    return group.every(function (i) { return (p.houses[i] || 0) >= 4; });
  }
  function build(s, tile) {
    var p = s.players[s.current], t = tiles(s)[tile];
    if (!buildAllowed(s, p, tile)) return { ok: false };
    if ((p.houses[tile] || 0) >= 4) { p.hotels.push(tile); log(s, p.name + ' xây KHÁCH SẠN tại ' + t.name); }
    else { p.houses[tile] = (p.houses[tile] || 0) + 1; log(s, p.name + ' xây nhà tại ' + t.name); }
    p.cash -= t.houseCost;
    emit(s, { from: p.name, to: 'Ngân hàng', amount: t.houseCost, reason: 'Xây nhà ' + t.name, kind: 'build' });
    return { ok: true };
  }
  function levelOf(p, tile) { return p.hotels.indexOf(tile) >= 0 ? 5 : (p.houses[tile] || 0); }
  function sameGroup(s, p, tile) {
    var t = tiles(s)[tile];
    return p.properties.filter(function (i) {
      return tiles(s)[i].type === 'property' && tiles(s)[i].color === t.color && p.mortgaged.indexOf(i) < 0;
    });
  }
  function buildOptions(s, p, tile) {
    if (s.mode === 'tour') return tourBuildOptions(s, p, tile);
    var t = tiles(s)[tile];
    if (!t || t.type !== 'property' || p.properties.indexOf(tile) < 0) return [];
    var cur = levelOf(p, tile), out = [];
    var full = tiles(s).filter(function (x) { return x.type === 'property' && x.color === t.color; }).length;
    for (var lv = cur + 1; lv <= 5; lv++) {
      var cost = (lv - cur) * (t.houseCost || 0);
      var enabled = true, reason = '';
      if (cur === 5) { enabled = false; reason = 'Đã là khách sạn'; }
      else if (lv === 5) {
        var grp = sameGroup(s, p, tile);
        if (grp.length < full) { enabled = false; reason = 'Cần chiếm đủ nhóm màu'; }
        else if (grp.some(function (i) { return levelOf(p, i) < 4; })) {
          enabled = false; reason = 'Cần 4 nhà ở mọi đất cùng nhóm màu';
        }
      } else {
        var group = sameGroup(s, p, tile);
        if (group.length < full) { enabled = false; reason = 'Cần chiếm đủ nhóm màu'; }
        else {
          var others = group.filter(function (i) { return i !== tile; }).map(function (i) { return levelOf(p, i); });
          var maxOther = Math.max.apply(null, others.concat([0]));
          if (lv > maxOther + 1) { enabled = false; reason = 'Phải xây đều trong nhóm màu'; }
        }
      }
      if (p.cash < cost) { enabled = false; reason = 'Không đủ tiền'; }
      out.push({ level: lv, label: lv === 5 ? 'Cấp nhà 5 · Khách sạn' : 'Cấp nhà ' + lv, cost: cost, enabled: enabled, reason: reason });
    }
    return out;
  }
  function buildTo(s, tile, target) {
    var p = s.players[s.current], opt = buildOptions(s, p, tile).filter(function (o) { return o.level === target; })[0];
    if (!opt || !opt.enabled) return { ok: false, reason: opt ? opt.reason : 'invalid' };
    p.cash -= opt.cost;
    emit(s, { from: p.name, to: 'Ngân hàng', amount: opt.cost, reason: 'Nâng ' + tiles(s)[tile].name + ' lên ' + opt.label, kind: 'build' });
    if (target === 5) { p.houses[tile] = 4; if (p.hotels.indexOf(tile) < 0) p.hotels.push(tile); }
    else { p.houses[tile] = target; p.hotels = p.hotels.filter(function (i) { return i !== tile; }); }
    log(s, p.name + ' nâng ' + tiles(s)[tile].name + ' lên ' + opt.label + ' (' + opt.cost + 'đ)');
    if (s.mode === 'tour') { p.builtLap = p.builtLap || {}; p.builtLap[tile] = p.laps || 0; }
    checkTourWin(s);
    return { ok: true, level: target, cost: opt.cost };
  }
  function sellHouse(s, tile) {
    var p = s.players[s.current], t = tiles(s)[tile];
    if (p.hotels.indexOf(tile) >= 0) { p.hotels = p.hotels.filter(function (i) { return i !== tile; }); p.houses[tile] = 4; }
    else if ((p.houses[tile] || 0) > 0) p.houses[tile]--;
    else return { ok: false };
    p.cash += Math.floor(t.houseCost / 2);
    log(s, p.name + ' bán nhà tại ' + t.name);
    return { ok: true };
  }
  function mortgage(s, tile) {
    var p = s.players[s.current], t = tiles(s)[tile];
    if (p.properties.indexOf(tile) < 0 || p.mortgaged.indexOf(tile) >= 0) return { ok: false };
    if ((p.houses[tile] || 0) > 0 || p.hotels.indexOf(tile) >= 0) return { ok: false };
    p.mortgaged.push(tile); p.cash += Math.floor(t.price / 2);
    emit(s, { from: 'Ngân hàng', to: p.name, amount: Math.floor(t.price / 2), reason: 'Thế chấp ' + t.name, kind: 'gain' });
    log(s, p.name + ' thế chấp ' + t.name);
    return { ok: true };
  }
  function unmortgage(s, tile) {
    var p = s.players[s.current], t = tiles(s)[tile];
    if (p.mortgaged.indexOf(tile) < 0) return { ok: false };
    var cost = Math.ceil(t.price / 2 * 1.1);
    if (p.cash < cost) return { ok: false };
    p.cash -= cost; p.mortgaged = p.mortgaged.filter(function (i) { return i !== tile; });
    emit(s, { from: p.name, to: 'Ngân hàng', amount: cost, reason: 'Chuộc ' + t.name, kind: 'pay' });
    log(s, p.name + ' chuộc ' + t.name);
    return { ok: true };
  }

  function endTurn(s, extraRoll) {
    if (s.winner) return;
    var extra = !!s.extraTurn || (!extraRoll && s.dice && s.dice[0] === s.dice[1] && s.doubles > 0 && s.phase !== 'ended');
    s.extraTurn = false;
    if (extra && s.phase !== 'ended') {
      s.phase = 'roll'; s.pending = null; s.dice = null;
      log(s, s.players[s.current].name + ' được đi thêm lượt');
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
      v += tiles(s)[i].price;
      v += (p.houses[i] || 0) * (tiles(s)[i].houseCost || 0);
      if (p.hotels.indexOf(i) >= 0) v += (tiles(s)[i].houseCost || 0);
    });
    return v;
  }

  /* --------- AI heuristics --------- */
  function aiBuy(s, p, t) {
    var reserve = 120 + (p.properties.length * 20);
    if (p.cash - t.price < reserve) return false;
    if (t.type === 'railroad' || t.type === 'utility' || t.type === 'resort') return p.cash > t.price + 250;
    var group = t.color;
    var owned = p.properties.filter(function (i) { return tiles(s)[i].type === 'property' && tiles(s)[i].color === group; }).length;
    return owned >= 1 || p.cash > t.price + 500;
  }
  function aiBid(s, p, tile) {
    var t = tiles(s)[tile];
    var max = Math.min(p.cash, Math.floor(t.price * (aiBuy(s, p, t) ? 1.1 : 0.55)));
    return max;
  }
  function aiBuild(s, p) {
    var best = -1, bestScore = 0;
    p.properties.forEach(function (tile) {
      if (!buildAllowed(s, p, tile)) return;
      var score = (p.houses[tile] || 0) + (tiles(s)[tile].type === 'property' ? 2 : 0);
      if (score > bestScore) { bestScore = score; best = tile; }
    });
    if (best >= 0 && p.cash > tiles(s)[best].houseCost + 80) return build(s, best);
    return null;
  }
  function aiTurn(s) {
    if (s.winner) return { ok: false };
    var p = s.players[s.current];
    var r = roll(s);
    if (!r.ok) return r;
    if (r.passed) return r; /* đã qua lượt trong lúc ở tù */
    if (s.phase === 'auction') {
      active(s).forEach(function (q) {
        var bid = aiBid(s, q, s.auction.tile);
        if (bid >= 1) placeBid(s, s.players.indexOf(q), bid);
      });
      resolveAuction(s);
    }
    if (p.jailTurns > 0 && p.freeJail > 0) useFreeJail(s);
    if (s.phase === 'championship') {
      var mine = p.properties.filter(function (i) { return tiles(s)[i].type === 'property'; });
      if (mine.length) chooseChampionship(s, mine[0]); else { s.phase = 'end'; s.pending = null; }
    }
    if (p.worldTour && s.phase === 'roll') {
      var targets = worldTourTargets(s);
      if (targets.length && p.cash >= 50) useWorldTour(s, targets[Math.floor(s.rng() * targets.length)]);
    }
    aiBuild(s, p);
    endTurn(s);
    return r;
  }

  var API = {
    TILES: TILES, START_CASH: START_CASH, GO_BONUS: GO_BONUS, JAIL_FEE: JAIL_FEE,
    createGame: createGame, log: log, active: active, ownerOf: ownerOf, rentOf: rentOf,
    roll: roll, leaveJailCash: leaveJailCash, useFreeJail: useFreeJail,
    chooseChampionship: chooseChampionship, worldTourTargets: worldTourTargets, useWorldTour: useWorldTour,
    checkTourWin: checkTourWin,
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
