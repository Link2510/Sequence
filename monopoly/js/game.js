/* game.js — Monopoly VN controller: local AI/hot-seat + Firebase rooms. */
(function () {
  'use strict';
  var E = window.LOTRMonopolyEngine, B = window.LOTRMonopolyBoard,
      CARDS = window.LOTRMonopolyCards, Net = window.LOTRNet || null;
  var $ = function (id) { return document.getElementById(id); };
  var S = {
    s: null, humanSeats: [], viewSeat: 0, net: { role: null, code: null, lastResult: null },
    selectedTile: null, modalStage: null, audio: null
  };
  function isOnline() { return !!(Net && Net.enabled && Net.isReady() && S.net.role); }
  function isHost() { return isOnline() && S.net.role === 'host'; }
  function isGuest() { return isOnline() && S.net.role === 'guest'; }
  var TOKEN_COLORS = ['#d94f4f', '#4f8cff', '#e8c84a', '#5aa86b'];

  function beep(f, d) { try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; S.audio = S.audio || new C(); var c = S.audio, o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.07, c.currentTime + .01); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d + .02); } catch (e) {} }
  function log(t) { var b = $('logList'); if (b) { b.innerHTML = S.s.log.slice(-60).map(function (x) { return '<div>' + x + '</div>'; }).join(''); b.scrollTop = b.scrollHeight; } }

  /* ---------------- board render ---------------- */
  function renderBoard() {
    var s = S.s, html = '';
    for (var i = 0; i <= 39; i++) {
      var t = B.TILES[i], pos = B.positionOf(i);
      var owner = E.ownerOf(s, i);
      var cls = 'tile ' + t.type;
      var bg = t.type === 'property' ? (B.COLORS[t.color] || '#ccc') : (B.COLORS[t.type] || '#e9dfc6');
      var tokens = s.players.filter(function (p) { return !p.bankrupt && p.pos === i; }).map(function (p) {
        return '<span class="token" style="background:' + TOKEN_COLORS[s.players.indexOf(p)] + '">' + (s.players.indexOf(p) + 1) + '</span>';
      }).join('');
      var ownerMark = owner ? '<small style="color:' + TOKEN_COLORS[s.players.indexOf(owner)] + '">●' + (s.players.indexOf(owner) + 1) + '</small>' : '';
      var houses = owner ? (owner.hotels.indexOf(i) >= 0 ? '🏨' : (owner.houses[i] || 0) ? '🏠'.repeat(owner.houses[i]) : '') : '';
      var style = 'grid-row:' + (pos.row + 1) + ';grid-column:' + (pos.col + 1) + ';background:' + bg + (owner && owner.mortgaged.indexOf(i) >= 0 ? ';opacity:.55' : '');
      html += '<div class="' + cls + '" data-tile="' + i + '" style="' + style + '"><div class="bar"></div><b>' + shortName(t.name) + '</b><small>' +
        (t.price ? t.price + 'đ' : '') + '</small>' + ownerMark + '<div>' + houses + '</div><div class="tile-tokens">' + tokens + '</div></div>';
    }
    html += '<div class="tile center"><div class="center-title">MONOPOLY</div><div class="center-sub">Phiên bản Việt Nam</div><div class="tokens">' +
      s.players.map(function (p, i) { return '<span class="token" style="background:' + TOKEN_COLORS[i] + '">' + p.name.slice(-1) + '</span>'; }).join('') + '</div></div>';
    $('board').innerHTML = html;
    Array.prototype.forEach.call($('board').querySelectorAll('[data-tile]'), function (el) {
      el.addEventListener('click', function () { S.selectedTile = Number(el.dataset.tile); renderDetail(); });
    });
  }
  function shortName(n) { return n.length > 16 ? n.slice(0, 15) + '…' : n; }

  function renderDetail() {
    var box = $('detailBox');
    if (S.selectedTile == null) { box.innerHTML = '<h4>Chọn một ô trên bàn</h4><div>Bấm vào ô đất để xem giá, tiền thuê và chủ sở hữu.</div>'; return; }
    var i = S.selectedTile, t = B.TILES[i], s = S.s, own = E.ownerOf(s, i);
    var html = '<h4>' + t.name + '</h4>';
    if (t.price) html += '<div>Giá: ' + t.price + 'đ · Chủ: ' + (own ? own.name : 'Ngân hàng') + '</div>';
    if (t.type === 'property') html += '<div>Tiền thuê: ' + t.rents.join(' / ') + 'đ · Xây nhà: ' + t.houseCost + 'đ</div>';
    if (own && own.houses[i]) html += '<div>Nhà: ' + (own.hotels.indexOf(i) >= 0 ? 'khách sạn' : own.houses[i]) + '</div>';
    if (own && own.mortgaged.indexOf(i) >= 0) html += '<div>Đang thế chấp</div>';
    box.innerHTML = html;
  }

  function renderPlayers() {
    var s = S.s;
    $('roundLabel').textContent = 'Lượt ' + s.turns + '/' + s.maxTurns;
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

  function renderAll() {
    if (!S.s) return;
    renderBoard(); renderPlayers(); renderActions(); renderDetail(); log();
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
    if (name === 'sell') return E.sellHouse(s, args);
    if (name === 'mortgage') return E.mortgage(s, args);
    if (name === 'unmortgage') return E.unmortgage(s, args);
    if (name === 'leaveJail') return E.leaveJailCash(s);
    if (name === 'freeJail') return E.useFreeJail(s);
    if (name === 'endTurn') { E.endTurn(s); return { ok: true }; }
    return { ok: false };
  }
  function sendAction(name, args) {
    if (isGuest()) {
      try { Net.sendIntent(S.net.code, { type: 'action', name: name, args: args, actor: S.s.current }); } catch (e) {}
      return;
    }
    if (name === 'decline') { showAuction(); return; }
    var r = dispatch(name, args);
    if (r && r.ok === false) { beep(180, .15); return; }
    beep(name === 'roll' ? 520 : 660, .1);
    afterAction();
  }
  function afterAction() {
    renderAll();
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
      E.aiTurn(S.s);
      afterAction();
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
        if (v) E.placeBid(s, S.viewSeat, v);
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
    S.s = sanitize(snap); S.humanSeats = [S.net.role === 'host' ? 0 : 1];
    renderAll();
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
    renderAll();
    if (!online) aiLoop();
  }

  function bind() {
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
