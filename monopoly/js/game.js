/* game.js — Monopoly VN controller: local AI/hot-seat + Firebase rooms. */
(function () {
  'use strict';
  var E = window.LOTRMonopolyEngine, B = window.LOTRMonopolyBoard,
      CARDS = window.LOTRMonopolyCards, Net = window.LOTRNet || null;
  var $ = function (id) { return document.getElementById(id); };
  var S = {
    s: null, humanSeats: [], viewSeat: 0, net: { role: null, code: null, lastResult: null },
    selectedTile: null, modalStage: null, audio: null, rolling: false, lastSeen: null, promptKey: null,
    tokenChoice: 0, tokenMap: [], lobby: { meta: null, messages: [] },
    playerNames: ['Frodo', 'Sam', 'Merry', 'Pippin'], revealKey: null, startTime: Date.now(), lightTheme: false,
    hoverTimer: null, hoverPopupOpen: false, suppressReveal: false, mode: 'classic'
  };
  function isOnline() { return !!(Net && Net.enabled && Net.isReady() && S.net.role); }
  function isHost() { return isOnline() && S.net.role === 'host'; }
  function isGuest() { return isOnline() && S.net.role === 'guest'; }
  /* Tour mặc định sáng, nên bt-light ở tour có nghĩa là chuyển sang tối. */
  function themeIsLight() { return document.body.classList.contains('bt-light') !== (S.mode === 'tour'); }
  function updateThemeBtn() { var b = $('themeBtn'); if (b) b.textContent = themeIsLight() ? 'Tối' : 'Sáng'; }
  var TOKEN_COLORS = ['#d94f4f', '#4f8cff', '#e8c84a', '#5aa86b', '#c46fd0', '#e08b3a', '#8fd0d0', '#b08f5a'];
  var TOKEN_ICONS = ['🎩', '🐕', '🚂', '🎒', '🐱', '🚗', '🪙', '🏇'];
  function tokenIcon(idx) { return TOKEN_ICONS[S.tokenMap[idx] != null ? S.tokenMap[idx] : idx] || TOKEN_ICONS[idx % TOKEN_ICONS.length]; }
  function boardTiles() { return (S.s && S.s.board) || B.TILES; }
  function tilePos(i) { return B.positionOf(i); } /* Tour giữ nguyên vị trí 40 ô của bàn gốc */

  function beep(f, d) { try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; S.audio = S.audio || new C(); var c = S.audio, o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.07, c.currentTime + .01); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d + .02); } catch (e) {} }
  function log(t) { var b = $('logList'); if (b) { b.innerHTML = S.s.log.slice(-60).map(function (x) { return '<div>' + x + '</div>'; }).join(''); b.scrollTop = b.scrollHeight; } }
  function popTile(tileIdx) {
    var el = $('board') && $('board').querySelector('[data-tile="' + tileIdx + '"]');
    if (!el) return;
    el.classList.remove('build-pop');
    void el.offsetWidth;
    el.classList.add('build-pop');
    setTimeout(function () { el.classList.remove('build-pop'); }, 520);
  }
  function updateDayNight() {
    if (!S.s) return;
    var phase = Math.floor(S.s.turns / 30) % 3;
    document.body.classList.toggle('dusk', phase === 1);
    document.body.classList.toggle('night', phase === 2);
  }
  function toast(msg) {
    var root = $('toastRoot'); if (!root || !msg) return;
    var el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 4000);
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
  function diceEls() {
    return [$('die1'), $('die2'), $('cdie1'), $('cdie2')].filter(Boolean);
  }
  function animateDice(done) {
    var dice = diceEls();
    if (!dice.length) { done(); return; }
    S.rolling = true;
    dice.forEach(function (d) { d.classList.remove('landed'); d.classList.add('rolling'); });
    diceSound();
    var iv = setInterval(function () {
      dice.forEach(function (d) { d.textContent = 1 + Math.floor(Math.random() * 6); });
    }, 60);
    setTimeout(function () {
      clearInterval(iv);
      dice.forEach(function (d) { d.classList.remove('rolling'); d.classList.add('landed'); });
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
    var centers = tileCenters(), size = boardTiles().length;
    var steps = (to - from + size) % size;
    if (!centers[from] || !centers[to] || steps === 0 || !Element.prototype.animate) { done(); return; }
    var el = document.createElement('div');
    el.className = 'flying-token';
    el.style.background = TOKEN_COLORS[playerIdx];
    el.style.left = (centers[from].x - 13) + 'px';
    el.style.top = (centers[from].y - 13) + 'px';
    el.textContent = tokenIcon(playerIdx);
    document.body.appendChild(el);
    var frames = [], trailed = [];
    for (var k = 1; k <= steps; k++) {
      var idx = (from + k) % size, c = centers[idx];
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
    S.suppressReveal = false;
    renderAll();
    if (S.s.log.length) toast(S.s.log[S.s.log.length - 1]);
    if (S.s.winner) { showResult(); return; }
    if (isOnline()) publishNow(); else aiLoop();
    maybeShowPrompts();
  }
  function finishIfIdle() {
    var s = S.s;
    if (!s || s.winner || s.phase !== 'end') return;
    if (S.humanSeats.indexOf(s.current) < 0) return;
    var p = s.players[s.current];
    var canBuild = p.properties.some(function (i) {
      return boardTiles()[i].type === 'property' && E.buildOptions(s, p, i).some(function (o) { return o.enabled; });
    });
    if (canBuild) { maybeShowBuildModal(); return; }
    closeOverlay();
    sendAction('endTurn');
  }
  function showCannotBuy(tile) {
    var s = S.s, t = boardTiles()[tile], p = s.players[s.current];
    overlay('<div class="deny-overlay"><div class="deny-tag">KHÔNG ĐỦ TIỀN</div>' +
      '<div class="deny-title">BẠN KHÔNG ĐỦ TIỀN<br>ĐỂ MUA ĐẤT NÀY</div>' +
      '<div class="deny-sub">' + t.name + ' · Giá ' + t.price + 'đ · Bạn có ' + p.cash + 'đ</div></div>');
    setTimeout(function () { closeOverlay(); sendAction('endTurn'); }, 1800);
  }
  function maybeShowPrompts() {
    var s = S.s;
    if (!s || s.winner || S.humanSeats.indexOf(s.current) < 0) return;
    if (s.phase === 'buy' && s.pending) {
      if (s.players[s.current].cash < s.pending.price) showCannotBuy(s.pending.tile);
      else showBuyModal();
    } else if (s.phase === 'build') maybeShowBuildModal();
    else if (s.phase === 'championship') showChampionshipModal();
    else if (s.phase === 'auction' && s.auction) showAuction();
    else if (s.phase === 'end') finishIfIdle();
  }
  function showBuyModal() {
    var s = S.s, tile = s.pending.tile, t = boardTiles()[tile];
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
    var focused = (s.pending && s.pending.mode === 'build') ? [s.pending.tile] : p.properties;
    var list = focused.filter(function (i) {
      return boardTiles()[i] && boardTiles()[i].type === 'property' &&
        p.properties.indexOf(i) >= 0 && E.buildOptions(s, p, i).some(function (o) { return o.enabled; });
    });
    if (!list.length) { closeOverlay(); sendAction('endTurn'); return; }
    var key = s.turns + '-' + s.current + '-' + list.join(',') + '-' + p.cash;
    if (S.promptKey === key) return;
    S.promptKey = key;
    var html = '<div class="modal"><h2>Nâng cấp nhà / khách sạn?</h2><p>Mỗi đất chỉ hiện cấp cao nhất bạn có thể nâng tới.</p>';
    list.forEach(function (i) {
      var t = boardTiles()[i], lv = E.levelOf(p, i);
      var opts = E.buildOptions(s, p, i);
      var enabled = opts.filter(function (o) { return o.enabled; });
      html += '<h3>' + t.name + ' — hiện: cấp nhà ' + lv + '</h3><div class="pick-row">';
      if (S.mode === 'tour') {
        enabled.forEach(function (opt) {
          html += '<button class="pill" data-btile="' + i + '" data-blevel="' + opt.level + '">' +
            opt.label + ' · ' + opt.cost + 'đ</button>';
        });
        if (!enabled.length) {
          var blocked = opts.filter(function (o) { return o.reason === 'Cần đi thêm một vòng'; })[0];
          html += '<span class="muted">' + (blocked ? 'Đi thêm một vòng để lên cấp cao hơn' : 'Không đủ tiền') + '</span>';
        }
      } else {
        var pick = enabled.length ? enabled[enabled.length - 1] : opts[0];
        html += '<button class="pill' + (pick.enabled ? '' : ' disabled') + '" data-btile="' + i + '" data-blevel="' + pick.level + '"' +
          (pick.enabled ? '' : ' disabled') + '>' + pick.label + ' · ' + pick.cost + 'đ' +
          (pick.enabled ? '' : ' (' + pick.reason + ')') + '</button>';
      }
      html += '</div>';
    });
    html += '<div class="pick-row"><button class="btn" id="buildNo">Không nâng cấp</button></div></div>';
    overlay(html);
    Array.prototype.forEach.call(document.querySelectorAll('[data-btile]'), function (b) {
      b.onclick = function () {
        var o = { tile: Number(b.dataset.btile), level: Number(b.dataset.blevel) };
        closeOverlay(); sendAction('buildTo', o);
      };
    });
    $('buildNo').onclick = function () { closeOverlay(); sendAction('endTurn'); };
  }

  function showChampionshipModal() {
    var s = S.s, p = s.players[s.current];
    var mine = p.properties.filter(function (i) { return boardTiles()[i].type === 'property'; });
    if (!mine.length) { closeOverlay(); sendAction('championshipSkip'); return; }
    var html = '<div class="modal"><h2>🏆 Vô Địch Thế Giới</h2><p>Chọn một thành phố của bạn để tổ chức. Tiền thuê tăng thêm ×1 mỗi lần tổ chức ở cùng thành phố.</p><div class="pick-row">';
    mine.forEach(function (i) {
      var mult = 1 + ((s.champions || {})[i] || 0);
      html += '<button type="button" class="pill" data-champ="' + i + '">' + boardTiles()[i].name + ' (×' + mult + ')</button>';
    });
    html += '</div></div>';
    overlay(html);
    Array.prototype.forEach.call(document.querySelectorAll('[data-champ]'), function (b) {
      b.onclick = function () { closeOverlay(); sendAction('championship', Number(b.dataset.champ)); };
    });
  }
  function showWorldTourModal() {
    var s = S.s, targets = E.worldTourTargets(s);
    if (!targets.length) { toast('Không còn đất nào để đi'); return; }
    var html = '<div class="modal"><h2>🌍 Tour Thế Giới</h2><p>Trả 50đ để đi tới một đất trống hoặc đất của bạn (không gồm ô đặc biệt). Sau đó áp dụng luật ô mới.</p><div class="pick-row">';
    targets.forEach(function (i) {
      var own = E.ownerOf(s, i);
      html += '<button type="button" class="pill" data-wt="' + i + '">' + boardTiles()[i].name +
        (own ? ' · của bạn' : ' · trống') + '</button>';
    });
    html += '</div><div class="pick-row"><button type="button" class="btn" id="wtCancel">Không đi</button></div></div>';
    overlay(html);
    Array.prototype.forEach.call(document.querySelectorAll('[data-wt]'), function (b) {
      b.onclick = function () { closeOverlay(); sendAction('worldTour', Number(b.dataset.wt)); };
    });
    $('wtCancel').onclick = closeOverlay;
  }

  /* ---------------- board render ---------------- */
  function renderBoard() {
    var s = S.s, html = '';
    var tilesNow = boardTiles();
    for (var i = 0; i < tilesNow.length; i++) {
      var t = boardTiles()[i], pos = tilePos(i);
      var owner = E.ownerOf(s, i);
      var cls = 'tile ' + t.type;
      var bg = t.type === 'property' ? (B.COLORS[t.color] || '#ccc') : (B.COLORS[t.type] || '#e9dfc6');
      var tokens = s.players.filter(function (p) { return !p.bankrupt && p.pos === i; }).map(function (p) {
        return '<span class="token" style="background:' + TOKEN_COLORS[s.players.indexOf(p)] + '">' + tokenIcon(s.players.indexOf(p)) + '</span>';
      }).join('');
      var oi = owner ? s.players.indexOf(owner) : -1;
      var lv = owner ? E.levelOf(owner, i) : 0;
      var rent = owner ? E.rentOf(s, i, s.dice ? s.dice[0] + s.dice[1] : 7) : 0;
      var ownerMark = owner ? '<small class="owner-tag" style="color:' + TOKEN_COLORS[oi] + '">' + tokenIcon(oi) + ' ' + owner.name +
        (owner.mortgaged.indexOf(i) >= 0 ? ' · TC' : '') + '</small>' : '';
      var levelText = owner ? '<span class="lvl-badge' + (lv >= 4 ? ' high' : '') + '">' +
        (lv === 5 ? '<span class="house-3d">🏨</span> Cấp nhà 5' : '<span class="house-3d">🏠</span> Cấp nhà ' + lv) + '</span>' : '';
      var priceText = owner ? '<small class="rent">Thuê ' + rent + 'đ</small>' : (t.price ? '<small class="price">' + t.price + 'đ</small>' : '');
      var style = 'grid-row:' + (pos.row + 1) + ';grid-column:' + (pos.col + 1) + ';background:' + bg +
        (oi >= 0 ? ';box-shadow:inset 0 -8px 0 ' + TOKEN_COLORS[oi] : '') +
        (owner && owner.mortgaged.indexOf(i) >= 0 ? ';opacity:.62' : '');
      var cornerIcon = t.type === 'go' ? '🏁' : t.type === 'jail' ? '⛓' : t.type === 'parking' ? '🅿️' :
        t.type === 'gotojail' ? '🚔' : t.type === 'chance' ? '❓' : t.type === 'chest' ? '📦' :
        t.type === 'tax' ? '💰' : t.type === 'resort' ? '🏖' : t.type === 'championship' ? '🏆' :
        t.type === 'worldtour' ? '🌍' : '';
      var tip = t.name + (t.price ? ' · ' + t.price + 'đ' : '') + (owner ? ' · Chủ: ' + owner.name : '') +
        (owner ? ' · Cấp nhà ' + lv + (lv === 5 ? ' (Khách sạn)' : '') + ' · Thuê ' + rent + 'đ' : '');
      html += '<div class="' + cls + '" data-tile="' + i + '" style="' + style + '"><div class="bar"></div>' +
        (cornerIcon ? '<div class="corner-icon">' + cornerIcon + '</div>' : '') +
        (S.mode === 'tour' && (s.festivals || []).indexOf(i) >= 0 ? '<div class="festival-tag" title="Liên hoan: tiền thuê gấp đôi">🎊</div>' : '') +
        (S.mode === 'tour' && (s.champions || {})[i] ? '<div class="champ-tag">🏆 ×' + (1 + s.champions[i]) + '</div>' : '') +
        (S.mode === 'tour' && lv > 0 ? '<div class="tour-building">' + (lv === 5 ? '🏨' : lv >= 3 ? '🏢' : '🏠') + '</div>' : '') +
        '<b class="tile-name">' + t.name + '</b>' + priceText + ownerMark + levelText + '<div class="tile-tokens">' + tokens + '</div></div>';
    }
    html += '<div class="tile center"><div class="center-title">MONOPOLY</div><div class="center-sub">Phiên bản Việt Nam</div><div class="tokens">' +
      s.players.map(function (p, i) { return '<span class="token" style="background:' + TOKEN_COLORS[i] + '">' + tokenIcon(i) + '</span>'; }).join('') +
      '</div><div id="centerDice" class="center-dice"><div class="die" id="cdie1">–</div><div class="die" id="cdie2">–</div>' +
      '<span id="diceSum" class="dice-sum"></span></div><div id="gameTimer" class="game-timer">00:00</div>' +
      '<div id="centerActions" class="center-actions"><div id="actionBox" class="action-box"></div></div>' +
      '<div id="cardReveal"></div><div id="centerNotice"></div></div>';
    $('board').innerHTML = html;
    Array.prototype.forEach.call($('board').querySelectorAll('[data-tile]'), function (el) {
      el.addEventListener('mouseenter', function () {
        var idx = Number(el.dataset.tile), r = el.getBoundingClientRect();
        clearTimeout(S.hoverTimer); hideHoverCard();
        S.hoverTimer = setTimeout(function () {
          if (S.rolling || !S.s || S.s.phase === 'ended') return;
          S.selectedTile = idx;
          showHoverCard(idx, r);
        }, 300);
      });
      el.addEventListener('mouseleave', function () {
        clearTimeout(S.hoverTimer); hideHoverCard();
      });
    });
    var cd = $('centerDice');
    if (cd) cd.onclick = function () {
      if (S.s && S.s.phase === 'roll' && !S.rolling && S.humanSeats.indexOf(S.s.current) >= 0) sendAction('roll');
    };
  }
  function shortName(n) { return n.length > 16 ? n.slice(0, 15) + '…' : n; }

  function renderDetail() {
    var box = $('detailBox');
    if (!box) return;
    if (S.selectedTile == null) {
      box.innerHTML = '<div class="hint-card">👆 Bấm vào một ô trên bàn để xem thẻ đất: giá, chủ sở hữu, cấp nhà và tiền thuê hiện tại.</div>';
      return;
    }
    var i = S.selectedTile, t = boardTiles()[i], s = S.s, own = E.ownerOf(s, i);
    var oi = own ? s.players.indexOf(own) : -1;
    var lv = own ? E.levelOf(own, i) : 0;
    var rent = own ? E.rentOf(s, i, s.dice ? s.dice[0] + s.dice[1] : 7) : 0;
    var color = t.type === 'property' ? (B.COLORS[t.color] || '#888') : (B.COLORS[t.type] || '#d8b46a');
    var typeName = t.type === 'property' ? 'Đất' : t.type === 'railroad' ? 'Ga' : t.type === 'utility' ? 'Tiện ích' :
      t.type === 'tax' ? 'Thuế' : t.type === 'chance' ? 'Thử Thách' : t.type === 'chest' ? 'Cộng Đồng' :
      t.type === 'resort' ? 'Khu nghỉ dưỡng' : t.type === 'championship' ? 'Vô Địch Thế Giới' :
      t.type === 'worldtour' ? 'Tour Thế Giới' : t.type === 'jail' ? 'Đảo Mất Tích' : 'Ô đặc biệt';
    var html = '<div class="prop-card"><div class="prop-head" style="background:' + color + '">' +
      '<span>' + t.name + '</span><span class="prop-type">' + typeName + '</span></div><div class="prop-body">';
    html += '<div class="prop-row"><span>Chủ sở hữu</span><b style="color:' + (oi >= 0 ? TOKEN_COLORS[oi] : '#9aa69c') + '">' +
      (oi >= 0 ? tokenIcon(oi) + ' ' + own.name : 'Ngân hàng') + '</b></div>';
    if (t.price) html += '<div class="prop-row"><span>Giá</span><b>' + t.price + 'đ</b></div>';
    if (B.isBuyable(t)) {
      html += '<div class="prop-row"><span>Cấp nhà</span><b class="lvl">' + (lv === 5 ? '🏨 Cấp nhà 5 · Khách sạn' : '🏠 Cấp nhà ' + lv + (lv ? ' · ' + lv + ' nhà' : '')) + '</b></div>';
      if (own) html += '<div class="rent-big"><span>Tiền thuê hiện tại</span><strong>' + rent + 'đ</strong></div>';
    }
    if (t.type === 'property') {
      html += '<div class="rent-table-label">Bảng tiền thuê theo cấp nhà</div><div class="rent-table">' + t.rents.map(function (r, idx) {
        var label = idx === 5 ? 'Khách sạn' : 'Cấp nhà ' + idx;
        var active = own && lv === idx;
        return '<span class="' + (active ? 'active' : '') + '"><small>' + label + '</small><b>' + r + 'đ</b></span>';
      }).join('') + '</div><div class="prop-row"><span>Chi phí xây 1 cấp</span><b>' + t.houseCost + 'đ</b></div>';
    }
    if (t.type === 'railroad') html += '<div class="prop-note">Thuê: 25 / 50 / 100 / 200đ theo số ga sở hữu.</div>';
    if (t.type === 'utility') html += '<div class="prop-note">Thuê = tổng xúc xắc × 4 (1 tiện ích) hoặc ×10 (2 tiện ích).</div>';
    if (own && own.mortgaged.indexOf(i) >= 0) html += '<div class="prop-note danger">Đang thế chấp — không thu tiền thuê.</div>';
    if (!own && t.price) html += '<div class="prop-note">' + (t.type === 'resort' ? 'Resort không bị đấu giá lại.' : 'Đất trống — khi đi tới đây bạn có thể mua hoặc đấu giá.') + '</div>';
    if (S.mode === 'tour') {
      if (t.region != null) html += '<div class="prop-note">Khu vực: ' + B.REGIONS[t.region] + '</div>';
      if (t.pattern) html += '<div class="prop-note">Hoa văn ' + t.pattern + ' — chiếm đủ 3 ô cùng hoa văn để được Triple Monopoly.</div>';
      if ((s.festivals || []).indexOf(i) >= 0) html += '<div class="prop-note">🎊 Đang có liên hoan — tiền thuê gấp đôi.</div>';
      if ((s.champions || {})[i]) html += '<div class="prop-note">🏆 Vô địch thế giới — thuê ×' + (1 + s.champions[i]) + '.</div>';
      if (t.type === 'resort') html += '<div class="prop-note">Chiếm đủ 4 resort để thắng ngay.</div>';
      if (t.type === 'tax') html += '<div class="prop-note">Trả 10% tổng tài sản hiện có.</div>';
      if (t.type === 'jail') html += '<div class="prop-note">Bị giam đúng 3 lượt; tung đôi, trả phí hoặc dùng thẻ thoát tù.</div>';
    }
    html += '</div></div>';
    box.innerHTML = html;
  }

  function showHoverCard(idx, rect) {
    var box = $('hoverCard'); if (!box) return;
    var t = boardTiles()[idx], s = S.s, own = E.ownerOf(s, idx), lv = own ? E.levelOf(own, idx) : 0;
    var rent = own ? E.rentOf(s, idx, s.dice ? s.dice[0] + s.dice[1] : 7) : 0;
    var html = '<h4>' + t.name + '</h4>' +
      '<div class="hc-row"><span>Chủ</span><b>' + (own ? own.name : 'Ngân hàng') + '</b></div>' +
      (t.price ? '<div class="hc-row"><span>Giá</span><b>' + t.price + 'đ</b></div>' : '') +
      (B.isBuyable(t) ? '<div class="hc-row"><span>Cấp nhà</span><b>Cấp nhà ' + lv + '</b></div>' : '') +
      (own ? '<div class="hc-row"><span>Thuê hiện tại</span><b>' + rent + 'đ</b></div>' : '');
    if (t.type === 'property') html += '<div class="hc-rent">' + t.rents.map(function (r, i) {
      return '<span class="' + (own && lv === i ? 'active' : '') + '">' + (i === 5 ? 'KS' : 'C' + i) + ':' + r + '</span>';
    }).join('') + '</div>';
    box.innerHTML = html;
    var left = rect.right + 12, top = rect.top;
    if (left + 240 > innerWidth) left = rect.left - 248;
    if (left < 8) left = 8;
    if (top + 190 > innerHeight) top = innerHeight - 200;
    box.style.left = left + 'px'; box.style.top = Math.max(8, top) + 'px';
    box.classList.add('show');
  }
  function hideHoverCard() { var b = $('hoverCard'); if (b) b.classList.remove('show'); }
  function showPropertyModal() {
    var i = S.selectedTile, s = S.s, own = E.ownerOf(s, i);
    var html = '<div class="modal">' + $('detailBox').innerHTML;
    var canManage = own && S.humanSeats.indexOf(s.current) >= 0 && own === s.players[s.current] && boardTiles()[i].type === 'property';
    html += '<div class="pick-row">' + (canManage ? '<button class="btn btn-primary" id="propBuild" type="button">Nâng cấp nhà</button>' : '') +
      '<button class="btn" id="propClose" type="button">Đóng</button></div></div>';
    overlay(html);
    $('propClose').onclick = closeOverlay;
    if ($('propBuild')) $('propBuild').onclick = function () {
      closeOverlay(); S.promptKey = null; maybeShowBuildModal();
    };
  }
  function renderPlayers() {
    var s = S.s, listBox = $('playerList');
    if (!listBox) return;
    listBox.innerHTML = s.players.map(function (p, i) {
      return '<div class="prow' + (s.current === i && !p.bankrupt ? ' active' : '') + (p.bankrupt ? ' out' : '') + '">' +
        '<span class="dot" style="background:' + TOKEN_COLORS[i] + '"></span><span>' + p.name +
        (S.humanSeats.indexOf(i) >= 0 ? ' (bạn)' : ' (AI)') + '</span><span class="cash">' + p.cash + 'đ</span></div>';
    }).join('');
  }

  function renderActions() {
    var s = S.s, box = $('actionBox'), p = s.players[s.current];
    var humanTurn = S.humanSeats.indexOf(s.current) >= 0;
    var phaseBox = $('phaseLabel');
    if (phaseBox) phaseBox.textContent = s.phase === 'roll' ? (humanTurn ? 'Đến lượt bạn' : p.name + ' đang đi') :
      s.phase === 'buy' ? 'Mua hay đấu giá?' : s.phase === 'auction' ? 'Đấu giá' : s.phase === 'ended' ? 'Kết thúc' : 'Chọn hành động';
    if (s.dice) {
      [$('die1'), $('cdie1')].forEach(function (e) { if (e) e.textContent = s.dice[0]; });
      [$('die2'), $('cdie2')].forEach(function (e) { if (e) e.textContent = s.dice[1]; });
      $('diceSum').textContent = '= ' + (s.dice[0] + s.dice[1]);
    } else {
      diceEls().forEach(function (e) { e.textContent = '–'; });
      $('diceSum').textContent = '';
    }
    var html = '';
    if (!humanTurn || s.winner) { box.innerHTML = html; return; }
    function btn(label, name, args, primary) {
      return '<button type="button" class="btn' + (primary ? ' btn-primary' : '') + '" data-act="' + name + '"' +
        (args ? ' data-args="' + args + '"' : '') + '>' + label + '</button>';
    }
    if (s.phase === 'roll') {
      html += '<div class="roll-hint">' + (p.jailTurns > 0
        ? 'Đang bị giam (' + p.jailTurns + '/3) — nhấn vào xúc xắc, ra đôi thì được ra; không ra đôi sẽ qua lượt'
        : 'Nhấn vào xúc xắc để tung xúc xắc') + '</div>';
      if (p.jailTurns > 0) {
        if (p.freeJail > 0) html += btn('Dùng thẻ ra tù', 'freeJail');
        html += btn('Trả ' + (S.mode === 'tour' ? 200 : 50) + 'đ ra tù', 'leaveJail');
      }
      if (S.mode === 'tour' && p.worldTour) html += '<button type="button" class="btn" id="wtBtn">🌍 Tour Thế Giới</button>';
    } else if (s.phase === 'championship') {
      html += '<button type="button" class="btn btn-primary" id="champBtn">🏆 Chọn thành phố</button>';
    } else if (s.phase === 'buy' && s.pending) {
      html += btn('Mua ' + boardTiles()[s.pending.tile].name + ' (' + s.pending.price + 'đ)', 'buy', s.pending.tile, true);
      html += btn('Không mua — đấu giá', 'decline');
    } else if (s.phase === 'auction') {
      html += btn('Đấu giá', 'auction');
    } else if (s.phase === 'end') {
      html += btn('Kết thúc lượt', 'endTurn', '', true);
      if (S.selectedTile != null && E.ownerOf(s, S.selectedTile) === p) {
        var tile = boardTiles()[S.selectedTile];
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
    if ($('wtBtn')) $('wtBtn').onclick = function () { closeOverlay(); showWorldTourModal(); };
    if ($('champBtn')) $('champBtn').onclick = function () { closeOverlay(); showChampionshipModal(); };
  }

  function renderHeader() {
    var s = S.s, p = s.players[s.current], idx = s.current;
    updateDayNight();
    $('topRound').textContent = 'Lượt ' + s.turns + '/' + s.maxTurns;
    $('modeBadge').textContent = s.mode === 'tour' ? 'Business Tour' : 'Truyền thống';
    document.body.classList.toggle('mode-tour', s.mode === 'tour');
    $('topPhase').textContent = s.winner ? 'Kết thúc' :
      s.phase === 'roll' ? 'Đến lượt ' + p.name :
      s.phase === 'buy' ? 'Quyết định mua' :
      s.phase === 'auction' ? 'Đấu giá' : 'Chọn hành động';

  }
  function renderCenterNotice() {
    var box = $('centerNotice');
    if (!box || !S.s) return;
    var evs = (S.s.events || []).slice(-3).reverse();
    if (!evs.length) { box.innerHTML = '<div class="center-empty">Giao dịch sẽ hiện ở đây</div>'; return; }
    box.innerHTML = evs.map(function (e) {
      if (!e.amount) {
        var c2 = e.kind === 'jail' ? 'fail' : 'event';
        return '<div class="money-line ' + c2 + '"><span class="who">⚡ ' + e.from + '</span><small>' + e.reason + '</small></div>';
      }
      var arrow = e.kind === 'gain' ? '←' : '→';
      var cls = e.kind === 'gain' ? 'gain' : e.kind === 'fail' ? 'fail' : 'pay';
      return '<div class="money-line ' + cls + '"><span class="who">' + e.from + '</span><span class="arrow">' + arrow + '</span>' +
        '<span class="who">' + e.to + '</span><b class="amount">' + e.amount + 'đ</b><small>' + e.reason + '</small></div>';
    }).join('');
    renderCardReveal();
  }
  function renderCardReveal() {
    var box = $('cardReveal'); if (!box || S.suppressReveal) return;
    var ev = (S.s.events || []).filter(function (e) { return e.kind === 'event' || e.kind === 'jail'; }).slice(-1)[0];
    if (!ev) return;
    var key = S.s.turns + '-' + ev.reason;
    if (S.revealKey === key) return;
    S.revealKey = key;
    box.innerHTML = '<div class="reveal-card"><div class="reveal-tag">' + (ev.kind === 'jail' ? '⛓ VÀO TÙ' : '⚡ THẺ SỰ KIỆN') +
      '</div><div class="reveal-text">' + ev.reason + '</div><div class="reveal-who">' + ev.from + ' · mọi người đều thấy</div></div>';
    setTimeout(function () { if (box) box.innerHTML = ''; }, 4500);
  }
  function renderBoardHud() {
    var box = $('boardHud'); if (!box) return;
    var s = S.s;
    box.innerHTML = s.players.map(function (p, i) {
      var props = p.properties.length;
      return '<div class="hud-chip corner-' + i + (s.current === i ? ' active' : '') + (p.bankrupt ? ' out' : '') + '">' +
        '<span class="hud-token" style="background:' + TOKEN_COLORS[i] + '">' + tokenIcon(i) + '</span>' +
        '<span class="hud-name">' + p.name + '<small>' + (S.humanSeats.indexOf(i) >= 0 ? 'Bạn' : 'AI') + ' · ' + props + ' đất</small></span>' +
        '<b>' + p.cash + 'đ</b></div>';
    }).join('');
  }
  function renderAll() {
    if (!S.s) return;
    renderHeader(); renderBoard(); renderBoardHud(); renderPlayers(); renderActions(); renderDetail(); renderCenterNotice(); log();
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
    if (name === 'championship') return E.chooseChampionship(s, args);
    if (name === 'championshipSkip') { s.phase = 'end'; s.pending = null; return { ok: true }; }
    if (name === 'worldTour') return E.useWorldTour(s, args);
    if (name === 'endTurn') { E.endTurn(s); return { ok: true }; }
    return { ok: false };
  }
  function animatedHumanRoll() {
    if (S.rolling) return;
    var s = S.s, actor = s.current, from = s.players[actor].pos;
    animateDice(function () {
      S.suppressReveal = true;
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
    if (['build', 'buildTo', 'mortgage', 'unmortgage', 'sell'].indexOf(name) >= 0) {
      if (name === 'build' || name === 'buildTo') popTile(typeof args === 'object' ? args.tile : args);
      closeOverlay();
      setTimeout(function () { sendAction('endTurn'); }, 500);
      return;
    }
    beep(name === 'roll' ? 520 : 660, .1);
    afterAction();
  }
  function afterAction() {
    renderAll();
    if (S.s.log.length) toast(S.s.log[S.s.log.length - 1]);
    if (S.s.winner) { showResult(); return; }
    if (isOnline()) publishNow(); else aiLoop();
    finishIfIdle();
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
        S.suppressReveal = true;
        E.aiTurn(S.s);
        var to = S.s.players[actor].pos;
        flyToken(actor, from, to, afterVisual);
      });
    }, 1600);
  }

  function showAuction() {
    var s = S.s;
    if (!s.auction) E.startAuction(s, s.pending ? s.pending.tile : 0);
    var tile = s.auction ? s.auction.tile : 0, price = boardTiles()[tile].price;
    var bids = [0, Math.floor(price * .5), Math.floor(price * .8), price].filter(function (v, i, a) { return a.indexOf(v) === i; });
    overlay('<div class="modal"><h2>Đấu giá: ' + boardTiles()[tile].name + '</h2><p>Giá khởi điểm ' + price + 'đ. AI sẽ tự đặt giá sau bạn.</p>' +
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
    var winLine = S.s.log.filter(function (x) { return x.indexOf('thắng') >= 0; }).slice(-1)[0] || '';
    overlay('<div class="modal"><h2>🏆 ' + (w ? w.name : 'Hòa') + ' thắng!</h2><p>' + (winLine || 'Người chơi cuối còn lại hoặc tài sản cao nhất khi hết ' +
      S.s.maxTurns + ' lượt.') + '</p><div class="pick-row"><button type="button" class="btn btn-primary" id="againBtn">Chơi lại</button>' +
      '<button type="button" class="btn" id="menuBtn">Về sảnh trò chơi</button></div></div>');
    $('againBtn').addEventListener('click', function () { closeOverlay(); showTitle(); });
    $('menuBtn').addEventListener('click', function () { closeOverlay(); location.href = '../index.html'; });
  }

  /* ---------------- online ---------------- */
  function snapshot() {
    var s = S.s;
    return {
      players: s.players, current: s.current, phase: s.phase, dice: s.dice, doubles: s.doubles,
      mode: s.mode, board: s.board, chance: s.chance, chest: s.chest, bank: s.bank, log: s.log, events: s.events, winner: s.winner,
      tourChance: s.tourChance, festivals: s.festivals, champions: s.champions,
      pending: s.pending, auction: s.auction, lastCard: s.lastCard, lastRent: s.lastRent,
      turns: s.turns, maxTurns: s.maxTurns
    };
  }
  function publishNow() { if (isHost() && Net.isReady()) { try { Net.publishState(S.net.code, snapshot()); } catch (e) {} } }
  function sanitize(snap) {
    snap.players.forEach(function (p) {
      p.properties = p.properties || []; p.mortgaged = p.mortgaged || [];
      p.hotels = p.hotels || []; p.houses = p.houses || {};
      p.laps = p.laps || 0; p.builtLap = p.builtLap || {}; p.worldTour = !!p.worldTour;
    });
    snap.tourChance = snap.tourChance || []; snap.festivals = snap.festivals || []; snap.champions = snap.champions || {};
    snap.log = snap.log || []; snap.events = snap.events || []; snap.chance = snap.chance || []; snap.chest = snap.chest || [];
    if (snap.auction) snap.auction.bids = snap.auction.bids || [];
    return snap;
  }
  function applySnapshot(snap) {
    if (!snap || !snap.players) return;
    var prev = S.lastSeen;
    var snapTiles = (snap && snap.board) || B.TILES;
    var prevLevels = S.s ? S.s.players.map(function (p) {
      return snapTiles.map(function (_, i) { return E.levelOf(p, i); });
    }) : null;
    if ($('lobbyOverlay')) closeOverlay();
    if (!S.startTime) S.startTime = Date.now();
    S.mode = snap.mode || S.mode;
    updateThemeBtn();
    S.s = sanitize(snap); S.humanSeats = [S.net.role === 'host' ? 0 : 1];
    if (isGuest()) {
      if (S.lobby.meta && S.lobby.meta.hostName) S.s.players[0].name = S.lobby.meta.hostName;
      S.s.players[1].name = S.playerNames[0];
    }
    S.tokenMap = TOKEN_ICONS.map(function (_, i) { return (S.tokenChoice + i) % TOKEN_ICONS.length; });
    S.lastSeen = { dice: S.s.dice ? S.s.dice.slice() : null, pos: S.s.players.map(function (p) { return p.pos; }) };
    S.suppressReveal = true;
    renderAll();
    if (prev && S.s.dice && (!prev.dice || prev.dice.join() !== S.s.dice.join())) {
      animateDice(function () {
        var d = S.s && S.s.dice;
        if (d) {
          [$('die1'), $('cdie1')].forEach(function (e) { if (e) e.textContent = d[0]; });
          [$('die2'), $('cdie2')].forEach(function (e) { if (e) e.textContent = d[1]; });
          if ($('diceSum')) $('diceSum').textContent = '= ' + (d[0] + d[1]);
        }
      });
      S.s.players.forEach(function (p, i) {
        if (prev.pos[i] != null && prev.pos[i] !== p.pos) {
          flyToken(i, prev.pos[i], p.pos, function () { S.suppressReveal = false; renderCardReveal(); });
        }
      });
      setTimeout(function () { if (S.suppressReveal) { S.suppressReveal = false; renderCardReveal(); } }, 1500);
    } else S.suppressReveal = false;
    if (prevLevels) S.s.players.forEach(function (p, pi) {
      snapTiles.forEach(function (_, i) {
        if (prevLevels[pi] && prevLevels[pi][i] !== E.levelOf(p, i)) popTile(i);
      });
    });
    maybeShowPrompts();
    if (S.s.winner && S.net.lastResult !== S.s.winner) { S.net.lastResult = S.s.winner; showResult(); }
  }
  function randomCode() { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = 'M'; for (var i = 0; i < 5; i++) out += c[Math.floor(Math.random() * c.length)]; return out; }
  function noConfig() { overlay('<div class="modal"><h2>Chơi online</h2><p>Chưa cấu hình Firebase. Điền web config vào js/firebase-config.js.</p><div class="pick-row"><button class="btn" id="cfgBack">Quay lại</button></div></div>'); $('cfgBack').onclick = function () { closeOverlay(); showTitle(); }; }
  function showLobby(role) {
    var code = S.net.code;
    overlay('<div class="modal lobby" id="lobbyOverlay"><div class="lobby-head"><div><div class="eyebrow">PHÒNG CHƠI ONLINE</div>' +
      '<h2>MONOPOLY · ' + (role === 'host' ? 'Chủ phòng' : 'Khách') + '</h2></div><div class="room-code">' + code + '</div></div>' +
      '<div class="lobby-body"><div class="lobby-left"><div class="lobby-subtitle">NGƯỜI CHƠI</div><div id="lobbyPlayers"></div>' +
      '<div class="lobby-actions"><button class="btn btn-primary" id="lobbyStart"' + (role === 'host' ? '' : ' disabled') + '>' +
      (role === 'host' ? 'Bắt đầu chơi' : 'Chờ chủ phòng...') + '</button>' +
      '<button class="btn" id="lobbyLeave">Rời phòng</button></div></div>' +
      '<div class="lobby-right"><div class="lobby-subtitle">TRÒ CHUYỆN</div><div id="chatList" class="chat-list"></div>' +
      '<div class="chat-row"><input id="chatInput" maxlength="120" placeholder="Nhắn tin..."><button class="btn" id="chatSend">Gửi</button></div></div></div>' +
      '<p class="lobby-hint">Gửi mã <b>' + code + '</b> cho bạn bè. Họ nhập mã ở màn hình chính để vào phòng này.</p></div>');
    $('lobbyStart').onclick = function () { if (isHost()) { closeOverlay(); startLocal(S.net.count || 4, [0], true); } };
    $('lobbyLeave').onclick = function () { closeOverlay(); showTitle(); };
    $('chatSend').onclick = sendChat;
    $('chatInput').onkeydown = function (e) { if (e.key === 'Enter') sendChat(); };
    renderLobby();
  }
  function sendChat() {
    var input = $('chatInput'); if (!input || !input.value.trim()) return;
    try { Net.sendChat(S.net.code, { from: S.net.role === 'host' ? 'Chủ phòng' : 'Khách', text: input.value.trim(), ts: Date.now() }); } catch (e) {}
    input.value = '';
  }
  function renderLobby() {
    var box = $('lobbyPlayers'); if (!box) return;
    var meta = S.lobby.meta || {}, count = S.net.count || meta.playerCount || 4;
    var hostToken = tokenIcon(meta.tokenChoice != null ? meta.tokenChoice : S.tokenChoice);
    var guestToken = tokenIcon(((meta.tokenChoice != null ? meta.tokenChoice : S.tokenChoice) + 1) % TOKEN_ICONS.length);
    var slots = [
      { icon: hostToken, name: meta.hostName || 'Chủ phòng', role: 'Host', state: 'Sẵn sàng' },
      { icon: guestToken, name: meta.guestJoined ? (meta.guestName || 'Bạn bè') : 'Đang chờ...', role: 'Guest', state: meta.guestJoined ? 'Đã vào' : 'Chưa vào' }
    ];
    for (var i = 2; i < count; i++) slots.push({ icon: tokenIcon(i), name: 'AI ' + (i - 1), role: 'Bot', state: 'Tự động' });
    box.innerHTML = slots.map(function (s) {
      return '<div class="lobby-player"><span class="lp-icon">' + s.icon + '</span><span class="lp-name">' + s.name +
        '</span><span class="lp-role">' + s.role + '</span><span class="lp-state">' + s.state + '</span></div>';
    }).join('');
    var chat = $('chatList');
    if (chat) {
      chat.innerHTML = S.lobby.messages.map(function (m) { return '<div class="chat-msg"><b>' + m.from + ':</b> ' + m.text + '</div>'; }).join('');
      chat.scrollTop = chat.scrollHeight;
    }
    var start = $('lobbyStart');
    if (start && isHost() && meta.guestJoined) { start.disabled = false; start.textContent = 'Bắt đầu chơi'; }
  }
  function startHostRoom() {
    if (!Net || !Net.enabled) { noConfig(); return; }
    Net.init().then(function (ok) {
      if (!ok) { noConfig(); return; }
      var code = randomCode(), count = Number(($('onlineCount') || {}).value || 4);
      S.net.role = 'host'; S.net.code = code; S.net.lastResult = null; S.net.count = count;
      S.lobby = { meta: null, messages: [] };
      Net.createRoom(code, { created: Date.now(), playerCount: count, guestJoined: false, tokenChoice: S.tokenChoice, hostName: S.playerNames[0], mode: S.mode }).then(function () {
        Net.watchIntents(code, function (item) {
          if (!isHost() || !S.s || !item.value || item.value.type !== 'action') return;
          var acted = item.value.name;
          dispatch(acted, item.value.args);
          /* Khách đi/xây xong thì host phải kết thúc lượt, nếu không AI đứng yên. */
          if (['build', 'buildTo', 'mortgage', 'unmortgage', 'sell'].indexOf(acted) >= 0) {
            dispatch('endTurn');
          } else if (S.s.phase === 'end' && !S.s.winner) {
            var cur = S.s.players[S.s.current];
            var canBuild = cur.properties.some(function (i) {
              return boardTiles()[i] && boardTiles()[i].type === 'property' &&
                E.buildOptions(S.s, cur, i).some(function (o) { return o.enabled; });
            });
            if (!canBuild) dispatch('endTurn');
          }
          renderAll(); publishNow();
          if (S.s.winner) showResult();
          try { Net.removeIntent(code, item.key); } catch (e) {}
        });
        Net.watchChat(code, function (m) { if (m) { S.lobby.messages.push(m); renderLobby(); } });
        Net.watchMeta(code, function (meta) {
          S.lobby.meta = meta; renderLobby();
          if (meta && meta.guestJoined && !S.s) { closeOverlay(); startLocal(count, [0], true); }
        });
        showLobby('host');
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
        S.net.role = 'guest'; S.net.code = code; S.net.lastResult = null; S.net.count = meta.playerCount || 4;
        S.mode = meta.mode || 'classic';
        S.lobby = { meta: meta, messages: [] };
        S.tokenChoice = ((meta.tokenChoice || 0) + 1) % TOKEN_ICONS.length;
        try { Net.markGuest(code); Net.setGuestInfo(code, { guestName: S.playerNames[0] }); } catch (e) {}
        Net.watchChat(code, function (m) { if (m) { S.lobby.messages.push(m); renderLobby(); } });
        Net.watchMeta(code, function (m) { S.lobby.meta = m; renderLobby(); });
        Net.watchState(code, applySnapshot);
        showLobby('guest');
      });
    });
  }

  /* ---------------- title / boot ---------------- */
  function closeOverlay() { $('overlayRoot').innerHTML = ''; }
  function overlay(html) { $('overlayRoot').innerHTML = '<div class="overlay">' + html + '</div>'; }
  function readMyName() {
    var el = $('playerNameInput');
    if (el && el.value.trim()) S.playerNames[0] = el.value.trim().slice(0, 16);
    return S.playerNames[0];
  }
  function askNames(hc, count) {
    var html = '<div class="modal"><h2>Tên người chơi</h2><p>Nhập tên cho ' + hc + ' người chơi cùng máy.</p>';
    for (var i = 0; i < hc; i++) {
      html += '<div class="pick-row"><input class="code-input name-input" data-seat="' + i + '" maxlength="16" style="width:100%" value="' +
        (S.playerNames[i] || ('Người ' + (i + 1))) + '"></div>';
    }
    html += '<div class="pick-row"><button class="btn btn-primary" id="namesOk">Bắt đầu</button></div></div>';
    overlay(html);
    $('namesOk').onclick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('.name-input'), function (el) {
        var i = Number(el.dataset.seat);
        if (el.value.trim()) S.playerNames[i] = el.value.trim().slice(0, 16);
      });
      closeOverlay();
      startLocal(count, Array.from({ length: hc }, function (_, i) { return i; }), false);
    };
  }
  function showTitle() {
    S.s = null;
    updateThemeBtn();
    document.body.classList.remove('mode-tour');
    overlay('<div class="modal"><h2>MONOPOLY · Chọn cách chơi</h2>' +
      '<div class="mode-tabs"><button type="button" class="mode-tab' + (S.mode === 'classic' ? ' active' : '') + '" data-mode="classic">' +
      'Truyền thống</button><button type="button" class="mode-tab' + (S.mode === 'tour' ? ' active' : '') + '" data-mode="tour">Business Tour</button></div>' +
      '<p class="mode-note">' + (S.mode === 'tour'
        ? 'Bàn 40 ô giữ nguyên vị trí như bản gốc: 4 ga thành 4 resort, Tù thành Đảo Mất Tích, Bãi đỗ xe thành Vô Địch, Vào tù thành Tour Thế Giới; bỏ Community Chest. Xây nhà theo vòng, thẻ power-up, thuế 10%. Thắng bằng Side/Triple/Resort Monopoly. 120 lượt.'
        : 'Luật cổ điển: 40 ô, không thẻ sự kiện, 400 lượt, chấm theo tài sản.') + '</p>' +
      '<h3>Tên của bạn</h3><div class="pick-row"><input id="playerNameInput" class="code-input" maxlength="16" style="width:220px" placeholder="Nhập tên..." value="' +
      (S.playerNames[0] || 'Frodo') + '"></div>' +
      '<h3>Chọn quân cờ của bạn</h3><div class="pick-row" id="tokenPicker">' +
      TOKEN_ICONS.map(function (ic, i) {
        return '<button type="button" class="pill token-opt' + (S.tokenChoice === i ? ' active' : '') +
          '" data-token="' + i + '" title="Quân ' + (i + 1) + '">' + ic + '</button>';
      }).join('') + '</div>' +
      '<h3>Chơi với AI (local)</h3><div class="pick-row">' +
      '<button class="pill" data-local="1-3">1 bạn + 2 AI</button><button class="pill" data-local="1-4">1 bạn + 3 AI</button>' +
      '<button class="pill" data-local="2-3">2 bạn + 1 AI</button><button class="pill" data-local="2-4">2 bạn + 2 AI</button></div>' +
      '<h3>Nhiều người thật (local)</h3><div class="pick-row">' +
      '<button class="pill" data-local="2-2">2 người</button><button class="pill" data-local="3-3">3 người</button>' +
      '<button class="pill" data-local="4-4">4 người</button></div>' +
      '<h3>Chơi với bạn bè (online)</h3><div class="pick-row">' +
      '<button class="pill" id="hostRoomBtn">Tạo phòng</button>' +
      '<select id="onlineCount" class="code-input"><option value="4">4 người</option><option value="3">3 người</option></select>' +
      '<input id="roomCodeInput" class="code-input" maxlength="6" placeholder="Mã phòng (M..., thường cũng được)" style="text-transform:none">' +
      '<button class="pill" id="joinBtn">Tham gia</button></div>' +
      '<div id="openRooms" style="font-size:12px;color:#cdd3c4;margin-top:6px"></div>' +
      '<p style="font-size:12px;opacity:.7">Tài sản, thuế, tù, xây nhà/khách sạn theo luật cổ điển. Giới hạn 400 lượt: hết lượt chấm theo tổng tài sản.</p></div>');
    Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) {
      b.onclick = function () { S.mode = b.dataset.mode; showTitle(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-token]'), function (b) {
      b.onclick = function () {
        S.tokenChoice = Number(b.dataset.token);
        Array.prototype.forEach.call(document.querySelectorAll('[data-token]'), function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-local]'), function (b) {
      b.onclick = function () {
        var a = b.dataset.local.split('-'), hc = Number(a[0]), count = Number(a[1]);
        readMyName();
        if (hc <= 1) { closeOverlay(); startLocal(count, [0], false); }
        else askNames(hc, count);
      };
    });
    $('hostRoomBtn').onclick = function () { readMyName(); startHostRoom(); };
    $('joinBtn').onclick = function () { readMyName(); joinRoom($('roomCodeInput').value); };
  }
  function startLocal(count, humanSeats, online) {
    var names = S.playerNames;
    var players = [];
    S.tokenMap = [];
    var usedTokens = [];
    for (var i = 0; i < count; i++) {
      var pick;
      if (i === humanSeats[0]) pick = S.tokenChoice;
      else { pick = 0; while (usedTokens.indexOf(pick) >= 0) pick++; }
      usedTokens.push(pick); S.tokenMap[i] = pick;
      players.push({ id: 'p' + i, name: names[i], token: i, isHuman: humanSeats.indexOf(i) >= 0 });
    }
    S.humanSeats = humanSeats.slice();
    S.viewSeat = humanSeats[0];
    S.startTime = Date.now();
    updateThemeBtn();
    S.s = E.createGame({ players: players, seed: Date.now(), mode: S.mode });
    E.log(S.s, 'Bắt đầu game Monopoly ' + count + ' người');
    if (S.mode === 'tour') {
      E.log(S.s, 'Bàn 40 ô · 8 nhóm màu · 4 resort · Đảo Mất Tích');
      E.log(S.s, '🎊 Liên hoan: ' + S.s.festivals.map(function (i) { return S.s.board[i].name; }).join(', ') + ' — thuê gấp đôi cả trận');
    }
    S.lastSeen = { dice: null, pos: S.s.players.map(function (p) { return p.pos; }) };
    renderAll();
    if (online) publishNow(); /* khách vào phòng phải thấy ngay bàn cờ */
    else aiLoop();
  }

  function bind() {
    setInterval(function () {
      var el = $('gameTimer'); if (!el || !S.s) return;
      var sec = Math.floor((Date.now() - S.startTime) / 1000);
      el.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    }, 1000);
    $('themeBtn').onclick = function () {
      S.lightTheme = !S.lightTheme;
      document.body.classList.toggle('bt-light', S.lightTheme);
      updateThemeBtn();
    };
    updateThemeBtn();
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.onclick = function () { activateTab(b.dataset.tab); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('#boardControls button[data-view]'), function (b) {
      b.onclick = function () {
        var board = $('board');
        board.classList.remove('zoom');
        board.classList.add('flat');
        Array.prototype.forEach.call(document.querySelectorAll('#boardControls button'), function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      };
    });
    $('guideBtn').onclick = function () {
      var rules = S.mode === 'tour'
        ? '<p><b>Business Tour</b>: bàn 40 ô giữ nguyên khung Monopoly gốc, tên đường tiếng Việt. 4 ga → 4 resort, Tù → Đảo Mất Tích, Bãi đỗ xe → Vô Địch Thế Giới, Vào tù → Tour Thế Giới, bỏ Community Chest.</p>' +
          '<p>Đi tới đất trống là mua (resort không đấu giá). Đứng trên đất mình: ghé đầu chọn nhà cấp 1 hoặc 2; đi một vòng mới lên cấp 3; thêm một vòng lên khách sạn. Giá và thuê tăng dần theo chiều kim đồng hồ.</p>' +
          '<p>🎊 Liên hoan đầu trận: 2 thành phố thuê gấp đôi. 🏖 Resort không bị mua lại. ❓ Thử Thách cho power-up (thêm lượt, động đất, thoát tù, tour thế giới…). 🏆 Vô địch tăng thuê; 🌍 Tour thế giới trả 50đ để chọn đất; 💰 Thuế 10% tài sản; ⛓ Đảo Mất Tích giam 3 lượt.</p>' +
          '<p>Thắng ngay khi: chiếm đủ 2 nhóm màu trên một cạnh (Side), đủ 3 nhóm màu bất kỳ (mỗi nhóm 2 hoặc 3 đất), hoặc 4 resort. Ngoài ra thắng khi đối thủ phá sản hoặc hết 120 lượt thì ai nhiều tài sản nhất thắng.</p>'
        : '<p>Tung 2 xúc xắc, đi số ô tương ứng. Qua ô KHỞI ĐẦU nhận 200đ. Đôi liên tiếp 3 lần → vào tù.</p>' +
          '<p>Đất trống: mua hoặc đấu giá. Đất có chủ: trả tiền thuê. Đường sắt thuê theo số ga, tiện ích theo xúc xắc. Không có thẻ sự kiện.</p>' +
          '<p>Có đủ nhóm màu thì xây nhà rồi khách sạn, thuê tăng dần. Thế chấp lấy nửa giá. Không trả được tiền → phá sản.</p>' +
          '<p>Thắng khi còn là người chơi cuối cùng, hoặc khi hết 400 lượt thì ai nhiều tài sản nhất thắng.</p>';
      overlay('<div class="modal"><h2>Luật chơi (tóm tắt)</h2>' + rules +
        '<p>Không telemetry, không tài khoản. Chế độ online dùng Firebase project của bạn.</p>' +
        '<div class="pick-row"><button class="btn" id="guideClose">Đóng</button></div></div>');
      $('guideClose').onclick = function () { closeOverlay(); if (S.s) renderAll(); else showTitle(); };
    };
    $('homeBtn').onclick = function () { location.href = '../index.html'; };
  }
  bind(); showTitle();
})();
