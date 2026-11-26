/* game.js — Monopoly VN controller: local AI/hot-seat + Firebase rooms. */
(function () {
  'use strict';
  var E = window.LOTRMonopolyEngine, B = window.LOTRMonopolyBoard,
      CARDS = window.LOTRMonopolyCards, Net = window.LOTRNet || null;
  var $ = function (id) { return document.getElementById(id); };
  var S = {
    s: null, humanSeats: [], viewSeat: 0, net: { role: null, code: null, lastResult: null },
    selectedTile: null, modalStage: null, audio: null, rolling: false, lastSeen: null, promptKey: null
  };
  function isOnline() { return !!(Net && Net.enabled && Net.isReady() && S.net.role); }
  function isHost() { return isOnline() && S.net.role === 'host'; }
  function isGuest() { return isOnline() && S.net.role === 'guest'; }
  var TOKEN_COLORS = ['#d94f4f', '#4f8cff', '#e8c84a', '#5aa86b'];
  var TOKEN_ICONS = ['🎩', '🐕', '🚂', '🎒'];

  function beep(f, d) { try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; S.audio = S.audio || new C(); var c = S.audio, o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.07, c.currentTime + .01); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d + .02); } catch (e) {} }
  function log(t) { var b = $('logList'); if (b) { b.innerHTML = S.s.log.slice(-60).map(function (x) { return '<div>' + x + '</div>'; }).join(''); b.scrollTop = b.scrollHeight; } }
  function toast(msg) {
    var root = $('toastRoot'); if (!root || !msg) return;
    var el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 2600);
  }
  function activateTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    ['detail', 'players', 'log'].forEach(function (n) {
      var el = $(n === 'detail' ? 'detailBox' : n === 'players' ? 'playerList' : 'logList');
      if (el) el.classList.toggle('active', n === name);
    });
  }

  /* ---------------- animations ---------------- */
  function diceSound() {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      S.audio = S.audio || new C(); var c = S.audio;
      for (var i = 0; i < 5; i++) {
        var t = c.currentTime + i * .075, o = c.createOscillator(), g = c.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(160 + Math.random() * 240, t);
        o.frequency.exponentialRampToValueAtTime(70, t + .06);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.045, t + .01);
        g.gain.exponentialRampToValueAtTime(.0001, t + .07);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .08);
      }
    } catch (e) {}
  }
  function animateDice(done) {
    var d1 = $('die1'), d2 = $('die2');
    if (!d1 || !d2) { done(); return; }
    S.rolling = true;
    d1.classList.remove('landed'); d2.classList.remove('landed');
    d1.classList.add('rolling'); d2.classList.add('rolling');
    diceSound();
    var iv = setInterval(function () {
      d1.textContent = 1 + Math.floor(Math.random() * 6);
      d2.textContent = 1 + Math.floor(Math.random() * 6);
    }, 60);
    setTimeout(function () {
      clearInterval(iv);
      d1.classList.remove('rolling'); d2.classList.remove('rolling');
      d1.classList.add('landed'); d2.classList.add('landed');
      $('board').classList.add('shake');
      setTimeout(function () { $('board').classList.remove('shake'); }, 360);
      S.rolling = false; done();
    }, 620);
  }
  function tileCenters() {
    var out = {};
    Array.prototype.forEach.call($('board').querySelectorAll('[data-tile]'), function (el) {
      var r = el.getBoundingClientRect();
      out[el.dataset.tile] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    return out;
  }
  function flyToken(playerIdx, from, to, done) {
    var centers = tileCenters();
    var steps = (to - from + 40) % 40;
    if (!centers[from] || !centers[to] || steps === 0 || !Element.prototype.animate) { done(); return; }
    var el = document.createElement('div');
    el.className = 'flying-token';
    el.style.background = TOKEN_COLORS[playerIdx];
    el.style.left = (centers[from].x - 13) + 'px';
    el.style.top = (centers[from].y - 13) + 'px';
    el.textContent = TOKEN_ICONS[playerIdx];
    document.body.appendChild(el);
    var frames = [], trailed = [];
    for (var k = 1; k <= steps; k++) {
      var idx = (from + k) % 40, c = centers[idx];
      frames.push({ transform: 'translate(' + (c.x - centers[from].x) + 'px,' + (c.y - centers[from].y) + 'px)', offset: k / steps });
      var tt = $('board').querySelector('[data-tile="' + idx + '"]');
      if (tt) { tt.classList.add('trail'); trailed.push(tt); }
    }
    var anim = el.animate(frames, { duration: Math.min(2600, steps * 130), easing: 'ease-in-out' });
    anim.onfinish = function () {
      trailed.forEach(function (t) { t.classList.remove('trail'); });
      el.remove();
      var tile = $('board').querySelector('[data-tile="' + to + '"]');
      if (tile) { tile.classList.add('pulse'); setTimeout(function () { tile.classList.remove('pulse'); }, 520); }
      beep(760, .12);
      done();
    };
  }
  function afterVisual() {
    renderAll();
    if (S.s.log.length) toast(S.s.log[S.s.log.length - 1]);
    if (S.s.winner) { showResult(); return; }
    if (isOnline()) publishNow(); else aiLoop();
    maybeShowPrompts();
  }
  function maybeShowPrompts() {
    var s = S.s;
    if (!s || s.winner || S.humanSeats.indexOf(s.current) < 0) return;
    if (s.phase === 'buy' && s.pending) showBuyModal();
    else if (s.phase === 'auction' && s.auction) showAuction();
    else if (s.phase === 'end') maybeShowBuildModal();
  }
  function showBuyModal() {
    var s = S.s, tile = s.pending.tile, t = B.TILES[tile];
    overlay('<div class="modal"><h2>' + t.name + '</h2><p>Đất đang trống. Giá <b>' + t.price + 'đ</b>. Bạn có tiền: ' +
      s.players[s.current].cash + 'đ.</p>' +
      (t.type === 'property' ? '<p>Tiền thuê: ' + t.rents.join(' / ') + 'đ (chưa nhà → 4 nhà → khách sạn).</p>' : '') +
      '<div class="pick-row"><button class="btn btn-primary" id="buyYes">Mua ngay</button>' +
      '<button class="btn" id="buyNo">Không mua — đấu giá</button></div></div>');
    $('buyYes').onclick = function () { closeOverlay(); sendAction('buy', tile); };
    $('buyNo').onclick = function () { closeOverlay(); showAuction(); };
  }
  function maybeShowBuildModal() {
    var s = S.s, p = s.players[s.current];
    var list = p.properties.filter(function (i) {
      return B.TILES[i].type === 'property' && E.buildOptions(s, p, i).length > 0;
    });
    if (!list.length) return;
    var key = s.turns + '-' + s.current + '-' + list.join(',') + '-' + p.cash;
    if (S.promptKey === key) return;
    S.promptKey = key;
    var html = '<div class="modal"><h2>Nâng cấp nhà / khách sạn?</h2><p>Chọn cấp muốn nâng. Cấp bị mờ do thiếu tiền hoặc chưa xây đều trong nhóm màu.</p>';
    list.forEach(function (i) {
      var t = B.TILES[i], lv = E.levelOf(p, i);
      html += '<h3>' + t.name + ' — hiện: ' + (lv === 5 ? 'khách sạn' : 'cấp ' + lv) + '</h3><div class="pick-row">' +
        E.buildOptions(s, p, i).map(function (o) {
          return '<button class="pill' + (o.enabled ? '' : ' disabled') + '" data-btile="' + i + '" data-blevel="' + o.level + '"' +
            (o.enabled ? '' : ' disabled') + '>' + o.label + ' · ' + o.cost + 'đ' +
            (o.enabled ? '' : ' (' + o.reason + ')') + '</button>';
        }).join('') + '</div>';
    });
    html += '<div class="pick-row"><button class="btn" id="buildNo">Không nâng cấp</button></div></div>';
    overlay(html);
    Array.prototype.forEach.call(document.querySelectorAll('[data-btile]'), function (b) {
      b.onclick = function () {
        var o = { tile: Number(b.dataset.btile), level: Number(b.dataset.blevel) };
        closeOverlay(); sendAction('buildTo', o);
      };
    });
    $('buildNo').onclick = closeOverlay;
  }

  /* ---------------- board render ---------------- */
  function renderBoard() {
    var s = S.s, html = '';
    for (var i = 0; i <= 39; i++) {
      var t = B.TILES[i], pos = B.positionOf(i);
      var owner = E.ownerOf(s, i);
      var cls = 'tile ' + t.type;
      var bg = t.type === 'property' ? (B.COLORS[t.color] || '#ccc') : (B.COLORS[t.type] || '#e9dfc6');
      var tokens = s.players.filter(function (p) { return !p.bankrupt && p.pos === i; }).map(function (p) {
        return '<span class="token" style="background:' + TOKEN_COLORS[s.players.indexOf(p)] + '" title="' + p.name + '">' + TOKEN_ICONS[s.players.indexOf(p)] + '</span>';
      }).join('');
      var oi = owner ? s.players.indexOf(owner) : -1;
      var lv = owner ? E.levelOf(owner, i) : 0;
      var rent = owner ? E.rentOf(s, i, s.dice ? s.dice[0] + s.dice[1] : 7) : 0;
      var ownerMark = owner ? '<small class="owner-tag" style="color:' + TOKEN_COLORS[oi] + '">' + TOKEN_ICONS[oi] + ' ' + owner.name +
        (owner.mortgaged.indexOf(i) >= 0 ? ' · TC' : '') + '</small>' : '';
      var levelText = owner ? '<span class="lvl-badge' + (lv >= 4 ? ' high' : '') + '">' +
        (lv === 5 ? '🏨 Cấp 5' : lv ? '🏠' + lv + ' · Cấp ' + lv : '🏠 Cấp 0') + '</span>' : '';
      var priceText = owner ? '<small class="rent">Thuê ' + rent + 'đ</small>' : (t.price ? '<small class="price">' + t.price + 'đ</small>' : '');
      var style = 'grid-row:' + (pos.row + 1) + ';grid-column:' + (pos.col + 1) + ';background:' + bg +
        (oi >= 0 ? ';box-shadow:inset 0 -8px 0 ' + TOKEN_COLORS[oi] : '') +
        (owner && owner.mortgaged.indexOf(i) >= 0 ? ';opacity:.62' : '');
      var cornerIcon = t.type === 'go' ? '🏁' : t.type === 'jail' ? '⛓' : t.type === 'parking' ? '🅿️' : t.type === 'gotojail' ? '🚔' : t.type === 'chance' ? '❓' : t.type === 'chest' ? '📦' : t.type === 'tax' ? '💰' : '';
      var tip = t.name + (t.price ? ' · ' + t.price + 'đ' : '') + (owner ? ' · Chủ: ' + owner.name : '') +
        (owner ? ' · ' + (lv === 5 ? 'Khách sạn' : 'Cấp ' + lv) + ' · Thuê ' + rent + 'đ' : '');
      html += '<div class="' + cls + '" data-tile="' + i + '" title="' + tip + '" style="' + style + '"><div class="bar"></div>' +
        (cornerIcon ? '<div class="corner-icon">' + cornerIcon + '</div>' : '') +
        '<b>' + shortName(t.name) + '</b>' + priceText + ownerMark + levelText + '<div class="tile-tokens">' + tokens + '</div></div>';
    }
    html += '<div class="tile center"><div class="center-title">MONOPOLY</div><div class="center-sub">Phiên bản Việt Nam</div><div class="tokens">' +
      s.players.map(function (p, i) { return '<span class="token" style="background:' + TOKEN_COLORS[i] + '" title="' + p.name + '">' + TOKEN_ICONS[i] + '</span>'; }).join('') + '</div></div>';
    $('board').innerHTML = html;
    Array.prototype.forEach.call($('board').querySelectorAll('[data-tile]'), function (el) {
      el.addEventListener('click', function () { S.selectedTile = Number(el.dataset.tile); activateTab('detail'); renderDetail(); });
    });
  }
  function shortName(n) { return n.length > 16 ? n.slice(0, 15) + '…' : n; }

  function renderDetail() {
    var box = $('detailBox');
    if (S.selectedTile == null) {
      box.innerHTML = '<div class="hint-card">👆 Bấm vào một ô trên bàn để xem thẻ đất: giá, chủ sở hữu, cấp nhà và tiền thuê hiện tại.</div>';
      return;
    }
    var i = S.selectedTile, t = B.TILES[i], s = S.s, own = E.ownerOf(s, i);
    var oi = own ? s.players.indexOf(own) : -1;
    var lv = own ? E.levelOf(own, i) : 0;
    var rent = own ? E.rentOf(s, i, s.dice ? s.dice[0] + s.dice[1] : 7) : 0;
    var color = t.type === 'property' ? (B.COLORS[t.color] || '#888') : (B.COLORS[t.type] || '#d8b46a');
    var typeName = t.type === 'property' ? 'Đất' : t.type === 'railroad' ? 'Ga' : t.type === 'utility' ? 'Tiện ích' : t.type === 'tax' ? 'Thuế' : t.type === 'chance' ? 'Thử Thách' : t.type === 'chest' ? 'Cộng Đồng' : 'Ô đặc biệt';
    var html = '<div class="prop-card"><div class="prop-head" style="background:' + color + '">' +
      '<span>' + t.name + '</span><span class="prop-type">' + typeName + '</span></div><div class="prop-body">';
    html += '<div class="prop-row"><span>Chủ sở hữu</span><b style="color:' + (oi >= 0 ? TOKEN_COLORS[oi] : '#9aa69c') + '">' +
      (oi >= 0 ? TOKEN_ICONS[oi] + ' ' + own.name : 'Ngân hàng') + '</b></div>';
    if (t.price) html += '<div class="prop-row"><span>Giá</span><b>' + t.price + 'đ</b></div>';
    if (own) {
      html += '<div class="prop-row"><span>Cấp nhà</span><b class="lvl">' + (lv === 5 ? '🏨 Khách sạn (Cấp 5)' : '🏠 Cấp ' + lv + (lv ? ' · ' + lv + ' nhà' : '')) + '</b></div>';
      html += '<div class="rent-big"><span>Tiền thuê hiện tại</span><strong>' + rent + 'đ</strong></div>';
    }
    if (t.type === 'property') {
      html += '<div class="rent-table-label">Bảng tiền thuê</div><div class="rent-table">' + t.rents.map(function (r, idx) {
        var label = idx === 5 ? 'KS' : idx === 0 ? '0' : idx;
        var active = own && lv === idx;
        return '<span class="' + (active ? 'active' : '') + '">' + label + ': ' + r + '</span>';
      }).join('') + '</div><div class="prop-row"><span>Chi phí xây 1 cấp</span><b>' + t.houseCost + 'đ</b></div>';
    }
    if (t.type === 'railroad') html += '<div class="prop-note">Thuê: 25 / 50 / 100 / 200đ theo số ga sở hữu.</div>';
    if (t.type === 'utility') html += '<div class="prop-note">Thuê = tổng xúc xắc × 4 (1 tiện ích) hoặc ×10 (2 tiện ích).</div>';
    if (own && own.mortgaged.indexOf(i) >= 0) html += '<div class="prop-note danger">Đang thế chấp — không thu tiền thuê.</div>';
    if (!own && t.price) html += '<div class="prop-note">Đất trống — khi đi tới đây bạn có thể mua hoặc đấu giá.</div>';
    html += '</div></div>';
    box.innerHTML = html;
  }

  function renderPlayers() {
    var s = S.s;
    $('playerList').innerHTML = s.players.map(function (p, i) {
      return '<div class="prow' + (s.current === i && !p.bankrupt ? ' active' : '') + (p.bankrupt ? ' out' : '') + '">' +
        '<span class="dot" style="background:' + TOKEN_COLORS[i] + '"></span><span>' + p.name +
        (S.humanSeats.indexOf(i) >= 0 ? ' (bạn)' : ' (AI)') + '</span><span class="cash">' + p.cash + 'đ</span></div>';
    }).join('');
  }

  function renderActions() {
    var s = S.s, box = $('actionBox'), p = s.players[s.current];
    var humanTurn = S.humanSeats.indexOf(s.current) >= 0;
    $('phaseLabel').textContent = s.phase === 'roll' ? (humanTurn ? 'Đến lượt bạn' : p.name + ' đang đi') :
      s.phase === 'buy' ? 'Mua hay đấu giá?' : s.phase === 'auction' ? 'Đấu giá' : s.phase === 'ended' ? 'Kết thúc' : 'Chọn hành động';
    if (s.dice) { $('die1').textContent = s.dice[0]; $('die2').textContent = s.dice[1]; $('diceSum').textContent = '= ' + (s.dice[0] + s.dice[1]); }
    else { $('die1').textContent = '–'; $('die2').textContent = '–'; $('diceSum').textContent = ''; }
    var html = '';
    if (!humanTurn || s.winner) { box.innerHTML = html; return; }
    function btn(label, name, args, primary) {
      return '<button type="button" class="btn' + (primary ? ' btn-primary' : '') + '" data-act="' + name + '"' +
        (args ? ' data-args="' + args + '"' : '') + '>' + label + '</button>';
    }
    if (s.phase === 'roll') {
      if (p.jailTurns > 0) {
        html += btn('Tung xúc xắc (đôi để ra tù)', 'roll', '', true);
        if (p.freeJail > 0) html += btn('Dùng thẻ ra tù', 'freeJail');
        html += btn('Trả 50đ ra tù', 'leaveJail');
      } else html += btn('🎲 Tung xúc xắc', 'roll', '', true);
    } else if (s.phase === 'buy' && s.pending) {
      html += btn('Mua ' + B.TILES[s.pending.tile].name + ' (' + s.pending.price + 'đ)', 'buy', s.pending.tile, true);
      html += btn('Không mua — đấu giá', 'decline');
    } else if (s.phase === 'auction') {
      html += btn('Đấu giá', 'auction');
    } else if (s.phase === 'end') {
      html += btn('Kết thúc lượt', 'endTurn', '', true);
      if (S.selectedTile != null && E.ownerOf(s, S.selectedTile) === p) {
        var tile = B.TILES[S.selectedTile];
        if (E.buildAllowed(s, p, S.selectedTile)) html += btn('Xây nhà/khách sạn', 'build', S.selectedTile);
        if ((p.houses[S.selectedTile] || 0) > 0 || p.hotels.indexOf(S.selectedTile) >= 0) html += btn('Bán nhà', 'sell', S.selectedTile);
        if (p.mortgaged.indexOf(S.selectedTile) < 0 && (p.houses[S.selectedTile] || 0) === 0) html += btn('Thế chấp', 'mortgage', S.selectedTile);
        if (p.mortgaged.indexOf(S.selectedTile) >= 0) html += btn('Chuộc', 'unmortgage', S.selectedTile);
      }
    }
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll('[data-act]'), function (b) {
      b.addEventListener('click', function () {
        var name = b.dataset.act, args = b.dataset.args;
        sendAction(name, args != null ? Number(args) : null);
      });
    });
  }

  function renderHeader() {
    var s = S.s, p = s.players[s.current], idx = s.current;
    $('topRound').textContent = 'Lượt ' + s.turns + '/' + s.maxTurns;
    $('topPhase').textContent = s.winner ? 'Kết thúc' :
      s.phase === 'roll' ? 'Đến lượt ' + p.name :
      s.phase === 'buy' ? 'Quyết định mua' :
      s.phase === 'auction' ? 'Đấu giá' : 'Chọn hành động';
    $('turnCard').innerHTML = '<div class="turn-head"><div class="turn-avatar" style="background:' + TOKEN_COLORS[idx] + '">' + TOKEN_ICONS[idx] + '</div>' +
      '<div><div class="turn-name">' + p.name + '</div><div class="turn-kind">' +
      (S.humanSeats.indexOf(idx) >= 0 ? 'Người chơi' : 'AI') + ' · ' + (B.TILES[p.pos].name) + '</div></div>' +
      '<div class="turn-cash">Tiền<b>' + p.cash + 'đ</b></div></div>';
  }
  function renderAll() {
    if (!S.s) return;
    renderHeader(); renderBoard(); renderPlayers(); renderActions(); renderDetail(); log();
  }

  /* ---------------- actions ---------------- */
  function dispatch(name, args) {
    var s = S.s, p = s.players[s.current];
    if (name === 'roll') return E.roll(s);
    if (name === 'buy') return E.buyProperty(s, p, args);
    if (name === 'decline') { E.startAuction(s, s.pending.tile); return { ok: true }; }
    if (name === 'bid') return E.placeBid(s, s.current, args);
    if (name === 'resolveAuction') return E.resolveAuction(s);
    if (name === 'build') return E.build(s, args);
    if (name === 'buildTo') return E.buildTo(s, args.tile, args.level);
    if (name === 'sell') return E.sellHouse(s, args);
    if (name === 'mortgage') return E.mortgage(s, args);
    if (name === 'unmortgage') return E.unmortgage(s, args);
    if (name === 'leaveJail') return E.leaveJailCash(s);
    if (name === 'freeJail') return E.useFreeJail(s);
    if (name === 'endTurn') { E.endTurn(s); return { ok: true }; }
    return { ok: false };
  }
  function animatedHumanRoll() {
    if (S.rolling) return;
    var s = S.s, actor = s.current, from = s.players[actor].pos;
    animateDice(function () {
      E.roll(s);
      var to = s.players[actor].pos;
      flyToken(actor, from, to, afterVisual);
    });
  }
  function sendAction(name, args) {
    if (isGuest()) {
      try { Net.sendIntent(S.net.code, { type: 'action', name: name, args: args, actor: S.s.current }); } catch (e) {}
      return;
    }
    if (name === 'roll') { animatedHumanRoll(); return; }
    if (name === 'decline') { showAuction(); return; }
    var r = dispatch(name, args);
    if (r && r.ok === false) { beep(180, .15); return; }
    beep(name === 'roll' ? 520 : 660, .1);
    afterAction();
  }
  function afterAction() {
    renderAll();
    if (S.s.log.length) toast(S.s.log[S.s.log.length - 1]);
    if (S.s.winner) { showResult(); return; }
    if (isOnline()) { publishNow(); return; }
    aiLoop();
  }
  function aiLoop() {
    var s = S.s;
    if (!s || s.winner) return;
    if (S.humanSeats.indexOf(s.current) >= 0) { renderAll(); return; }
    if (s.phase === 'auction') {
      E.active(s).forEach(function (q) {
        if (S.humanSeats.indexOf(s.players.indexOf(q)) >= 0) return;
        var bid = E.aiBid(s, q, s.auction.tile);
        if (bid >= 1) E.placeBid(s, s.players.indexOf(q), bid);
      });
      E.resolveAuction(s);
      afterAction();
      return;
    }
    setTimeout(function () {
      if (!S.s || S.s.winner) return;
      if (S.humanSeats.indexOf(S.s.current) >= 0) return;
      var actor = S.s.current, from = S.s.players[actor].pos;
      animateDice(function () {
        if (!S.s || S.s.winner) return;
        E.aiTurn(S.s);
        var to = S.s.players[actor].pos;
        flyToken(actor, from, to, afterVisual);
      });
    }, 700);
  }

  function showAuction() {
    var s = S.s, tile = s.pending ? s.pending.tile : (s.auction ? s.auction.tile : 0), price = B.TILES[tile].price;
    var bids = [0, Math.floor(price * .5), Math.floor(price * .8), price].filter(function (v, i, a) { return a.indexOf(v) === i; });
    overlay('<div class="modal"><h2>Đấu giá: ' + B.TILES[tile].name + '</h2><p>Giá khởi điểm ' + price + 'đ. AI sẽ tự đặt giá sau bạn.</p>' +
      '<div class="pick-row">' + bids.map(function (v) { return '<button type="button" class="pill" data-bid="' + v + '">' + (v ? v + 'đ' : 'Không mua') + '</button>'; }).join('') + '</div></div>');
    Array.prototype.forEach.call(document.querySelectorAll('[data-bid]'), function (b) {
      b.addEventListener('click', function () {
        var v = Number(b.dataset.bid);
        if (isGuest()) {
          if (v) sendAction('bid', v);
          sendAction('resolveAuction');
          closeOverlay();
          return;
        }
        if (v) E.placeBid(s, s.current, v);
        E.active(s).forEach(function (q) {
          if (S.humanSeats.indexOf(s.players.indexOf(q)) >= 0) return;
          var bid = E.aiBid(s, q, tile);
          if (bid >= 1) E.placeBid(s, s.players.indexOf(q), bid);
        });
        E.resolveAuction(s);
        closeOverlay(); afterAction();
      });
    });
  }

  function showResult() {
    var w = S.s.players.filter(function (p) { return p.id === S.s.winner; })[0];
    overlay('<div class="modal"><h2>🏆 ' + (w ? w.name : 'Hòa') + ' thắng!</h2><p>Giải thưởng theo luật: người chơi cuối còn lại hoặc tài sản cao nhất khi hết ' +
      S.s.maxTurns + ' lượt.</p><div class="pick-row"><button type="button" class="btn btn-primary" id="againBtn">Chơi lại</button>' +
      '<button type="button" class="btn" id="menuBtn">Về sảnh trò chơi</button></div></div>');
    $('againBtn').addEventListener('click', function () { closeOverlay(); showTitle(); });
    $('menuBtn').addEventListener('click', function () { closeOverlay(); location.href = '../index.html'; });
  }

  /* ---------------- online ---------------- */
  function snapshot() {
    var s = S.s;
    return {
      players: s.players, current: s.current, phase: s.phase, dice: s.dice, doubles: s.doubles,
      chance: s.chance, chest: s.chest, bank: s.bank, log: s.log, winner: s.winner,
      pending: s.pending, auction: s.auction, lastCard: s.lastCard, lastRent: s.lastRent,
      turns: s.turns, maxTurns: s.maxTurns
    };
  }
  function publishNow() { if (isHost() && Net.isReady()) { try { Net.publishState(S.net.code, snapshot()); } catch (e) {} } }
  function sanitize(snap) {
    snap.players.forEach(function (p) {
      p.properties = p.properties || []; p.mortgaged = p.mortgaged || [];
      p.hotels = p.hotels || []; p.houses = p.houses || {};
    });
    snap.log = snap.log || []; snap.chance = snap.chance || []; snap.chest = snap.chest || [];
    if (snap.auction) snap.auction.bids = snap.auction.bids || [];
    return snap;
  }
  function applySnapshot(snap) {
    if (!snap || !snap.players) return;
    var prev = S.lastSeen;
    S.s = sanitize(snap); S.humanSeats = [S.net.role === 'host' ? 0 : 1];
    S.lastSeen = { dice: S.s.dice ? S.s.dice.slice() : null, pos: S.s.players.map(function (p) { return p.pos; }) };
    renderAll();
    if (prev && S.s.dice && (!prev.dice || prev.dice.join() !== S.s.dice.join())) {
      animateDice(function () {});
      S.s.players.forEach(function (p, i) {
        if (prev.pos[i] != null && prev.pos[i] !== p.pos) flyToken(i, prev.pos[i], p.pos, function () {});
      });
    }
    maybeShowPrompts();
    if (S.s.winner && S.net.lastResult !== S.s.winner) { S.net.lastResult = S.s.winner; showResult(); }
  }
  function randomCode() { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = 'M'; for (var i = 0; i < 5; i++) out += c[Math.floor(Math.random() * c.length)]; return out; }
  function noConfig() { overlay('<div class="modal"><h2>Chơi online</h2><p>Chưa cấu hình Firebase. Điền web config vào js/firebase-config.js.</p><div class="pick-row"><button class="btn" id="cfgBack">Quay lại</button></div></div>'); $('cfgBack').onclick = function () { closeOverlay(); showTitle(); }; }
  function startHostRoom() {
    if (!Net || !Net.enabled) { noConfig(); return; }
    Net.init().then(function (ok) {
      if (!ok) { noConfig(); return; }
      var code = randomCode(), count = Number(($('onlineCount') || {}).value || 4);
      S.net.role = 'host'; S.net.code = code; S.net.lastResult = null;
      Net.createRoom(code, { created: Date.now(), playerCount: count, guestJoined: false }).then(function () {
        Net.watchIntents(code, function (item) {
          if (!isHost() || !S.s || !item.value || item.value.type !== 'action') return;
          dispatch(item.value.name, item.value.args);
          renderAll(); publishNow();
          if (S.s.winner) showResult();
          try { Net.removeIntent(code, item.key); } catch (e) {}
        });
        Net.watchMeta(code, function (meta) {
          var t = $('hostWaitText'); if (meta && meta.guestJoined && t) t.textContent = 'Bạn bè đã vào — đang bắt đầu...';
          if (meta && meta.guestJoined && !S.s) { closeOverlay(); startLocal(count, [0], true); }
        });
        overlay('<div class="modal"><h2>Mã phòng: ' + code + '</h2><p>Gửi mã này cho bạn bè. Khi bạn bè vào, game tự bắt đầu.</p>' +
          '<p id="hostWaitText">Đang chờ bạn bè tham gia...</p><div class="pick-row"><button class="btn btn-primary" id="hostGo">Bắt đầu ngay</button></div></div>');
        $('hostGo').onclick = function () { closeOverlay(); startLocal(count, [0], true); };
      });
    });
  }
  function joinRoom(code) {
    code = (code || '').trim().toUpperCase();
    if (code.charAt(0) !== 'M' || code.length !== 6) { noConfig(); return; }
    if (!Net || !Net.enabled) { noConfig(); return; }
    Net.init().then(function (ok) {
      if (!ok) { noConfig(); return; }
      Net.joinRoom(code).then(function (meta) {
        if (!meta) { noConfig(); return; }
        S.net.role = 'guest'; S.net.code = code; S.net.lastResult = null;
        try { Net.markGuest(code); } catch (e) {}
        closeOverlay();
        Net.watchState(code, applySnapshot);
        overlay('<div class="modal"><h2>Đã vào phòng ' + code + '</h2><p>Đang chờ chủ phòng bắt đầu...</p></div>');
      });
    });
  }

  /* ---------------- title / boot ---------------- */
  function closeOverlay() { $('overlayRoot').innerHTML = ''; }
  function overlay(html) { $('overlayRoot').innerHTML = '<div class="overlay">' + html + '</div>'; }
  function showTitle() {
    S.s = null;
    overlay('<div class="modal"><h2>MONOPOLY · Chọn cách chơi</h2>' +
      '<h3>Chơi với AI (local)</h3><div class="pick-row">' +
      '<button class="pill" data-local="1-3">1 bạn + 2 AI</button><button class="pill" data-local="1-4">1 bạn + 3 AI</button>' +
      '<button class="pill" data-local="2-3">2 bạn + 1 AI</button><button class="pill" data-local="2-4">2 bạn + 2 AI</button></div>' +
      '<h3>Nhiều người thật (local)</h3><div class="pick-row">' +
      '<button class="pill" data-local="2-2">2 người</button><button class="pill" data-local="3-3">3 người</button>' +
      '<button class="pill" data-local="4-4">4 người</button></div>' +
      '<h3>Chơi với bạn bè (online)</h3><div class="pick-row">' +
      '<button class="pill" id="hostRoomBtn">Tạo phòng</button>' +
      '<select id="onlineCount" class="code-input"><option value="4">4 người</option><option value="3">3 người</option></select>' +
      '<input id="roomCodeInput" class="code-input" maxlength="6" placeholder="Mã phòng (M...)">' +
      '<button class="pill" id="joinBtn">Tham gia</button></div>' +
      '<div id="openRooms" style="font-size:12px;color:#cdd3c4;margin-top:6px"></div>' +
      '<p style="font-size:12px;opacity:.7">Tài sản, thuế, tù, xây nhà/khách sạn theo luật cổ điển. Giới hạn 400 lượt: hết lượt chấm theo tổng tài sản.</p></div>');
    Array.prototype.forEach.call(document.querySelectorAll('[data-local]'), function (b) {
      b.onclick = function () {
        var a = b.dataset.local.split('-'), hc = Number(a[0]);
        closeOverlay();
        startLocal(Number(a[1]), Array.from({ length: hc }, function (_, i) { return i; }), false);
      };
    });
    $('hostRoomBtn').onclick = startHostRoom;
    $('joinBtn').onclick = function () { joinRoom($('roomCodeInput').value); };
  }
  function startLocal(count, humanSeats, online) {
    var names = ['Frodo', 'Sam', 'Merry', 'Pippin'];
    var players = [];
    for (var i = 0; i < count; i++) players.push({ id: 'p' + i, name: names[i], token: i, isHuman: humanSeats.indexOf(i) >= 0 });
    S.humanSeats = humanSeats.slice();
    S.viewSeat = humanSeats[0];
    S.s = E.createGame({ players: players, seed: Date.now(), maxTurns: 400 });
    E.log(S.s, 'Bắt đầu game Monopoly ' + count + ' người');
    S.lastSeen = { dice: null, pos: S.s.players.map(function (p) { return p.pos; }) };
    renderAll();
    if (!online) aiLoop();
  }

  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.onclick = function () { activateTab(b.dataset.tab); };
    });
    $('guideBtn').onclick = function () {
      overlay('<div class="modal"><h2>Luật chơi (tóm tắt)</h2>' +
        '<p>Tung 2 xúc xắc, đi số ô tương ứng. Qua ô KHỞI ĐẦU nhận 200đ. Đôi liên tiếp 3 lần → vào tù.</p>' +
        '<p>Đất trống: mua hoặc đấu giá. Đất có chủ: trả tiền thuê. Đường sắt thuê theo số ga, tiện ích theo xúc xắc.</p>' +
        '<p>Có đủ nhóm màu thì xây nhà rồi khách sạn, thuê tăng dần. Thế chấp lấy nửa giá. Không trả được tiền → phá sản.</p>' +
        '<p>Thắng khi còn là người chơi cuối cùng, hoặc khi hết 400 lượt thì ai nhiều tài sản nhất thắng.</p>' +
        '<p>Không telemetry, không tài khoản. Chế độ online dùng Firebase project của bạn.</p>' +
        '<div class="pick-row"><button class="btn" id="guideClose">Đóng</button></div></div>');
      $('guideClose').onclick = function () { closeOverlay(); if (S.s) renderAll(); else showTitle(); };
    };
    $('homeBtn').onclick = function () { location.href = '../index.html'; };
  }
  bind(); showTitle();
})();
