/* game.js — DOM controller for Duel for Middle-Earth. */
(function () {
  'use strict';
  var E = window.LOTRDuelEngine, C = window.LOTRDuelCards, I = window.LOTRDuelI18n,
      Net = window.LOTRNet || null;
  var $ = function (id) { return document.getElementById(id); };
  var S = { lang: 'vi', g: null, side: 'fellowship', selected: null, coach: null, logs: [], tutorialDone: false, audio: null, guideVisible: true,
    net: { role: null, code: null, hostSide: null, lastPublish: 0, autoStarted: false, lastResultKey: null } };
  function isOnline() { return !!(Net && Net.enabled && Net.isReady() && S.net.role); }
  function isHost() { return isOnline() && S.net.role === 'host'; }
  function isGuest() { return isOnline() && S.net.role === 'guest'; }
  function otherSide(s) { return s === 'fellowship' ? 'sauron' : 'fellowship'; }

  function T(k) { return I.t(S.lang, k); }
  function L(o) { return I.L(S.lang, o); }
  function sideName(id) { return T(id === 'fellowship' ? 'fellowship' : 'sauron'); }
  function regionName(r) { return L(C.REGION_INFO[r]); }

  function beep(f, d, type) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      S.audio = S.audio || new Ctx(); var c = S.audio, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.07, c.currentTime + .01);
      g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d + .02);
    } catch (e) {}
  }
  function log(msg, side) { S.logs.push({ msg: msg, side: side }); if (S.logs.length > 80) S.logs.shift(); var b = $('logList'); if (b) b.innerHTML = S.logs.map(function (e) { return '<div class="' + (e.side || '') + '">' + e.msg + '</div>'; }).join(''); }

  /* ---------------- online snapshot & rooms ---------------- */
  function snapshot() {
    var g = S.g;
    return {
      chapter: g.chapter, turn: g.turn, phase: g.phase, winner: g.winner, bank: g.bank,
      display: g.display, discard: g.discard, landmarks: g.landmarks,
      allianceStacks: g.allianceStacks, log: g.log,
      players: {
        fellowship: snapPlayer(g.players.fellowship),
        sauron: snapPlayer(g.players.sauron)
      }
    };
  }
  function snapPlayer(p) {
    return {
      id: p.id, coins: p.coins, quest: p.quest, played: p.played.map(function (c) { return c.id; }),
      skillsUsed: p.skillsUsed.slice(), units: p.units, forts: p.forts.slice(),
      races: p.races.slice(), tokens: p.tokens.slice(), extraRace: p.extraRace
    };
  }
  function rebuild(s) {
    var g = {
      chapter: s.chapter, turn: s.turn, phase: s.phase, winner: s.winner, bank: s.bank,
      display: s.display || [], discard: s.discard || [], landmarks: s.landmarks || [],
      landmarkDeck: [], allianceStacks: s.allianceStacks || {}, log: s.log || [],
      players: {
        fellowship: loadPlayer(s.players.fellowship),
        sauron: loadPlayer(s.players.sauron)
      }
    };
    return g;
  }
  function loadPlayer(p) {
    return {
      id: p.id, coins: p.coins, quest: p.quest,
      played: (p.played || []).map(function (id) { return E.cardById(id); }).filter(Boolean),
      skillsUsed: p.skillsUsed || [], units: p.units || {}, forts: p.forts || [],
      races: p.races || [], tokens: p.tokens || [], extraRace: !!p.extraRace
    };
  }
  function publish() {
    if (!isHost() || !S.g || !Net.isReady()) return;
    try { Net.publishState(S.net.code, snapshot()); } catch (e) {}
  }
  function applySnapshot(s) {
    if (!s || !s.players) return;
    S.g = rebuild(s);
    if ($('waitOverlay')) closeOverlay();
    S.logs = s.log || [];
    var b = $('logList');
    if (b) b.innerHTML = S.logs.map(function (e) { return '<div class="' + (e.side || '') + '">' + e.msg + '</div>'; }).join('');
    renderAll();
    if (S.g.phase === 'ended') {
      var key = S.net.code + '-' + S.chapterKey();
      if (S.net.lastResultKey !== key) { S.net.lastResultKey = key; showResult(); }
    }
  }
  S.chapterKey = function () { return S.g ? (S.g.chapter + '-' + S.g.turn + '-' + S.g.players.fellowship.quest + '-' + S.g.players.sauron.quest) : ''; };

  function randomDCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = 'D';
    for (var i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }
  function noConfig() {
    overlay('<div class="modal"><h2>' + T('onlineMode') + '</h2><p>' + T('onlineNoConfig') + '</p>' +
      '<div class="actions"><button type="button" class="btn" id="cfgClose">' + T('back') + '</button></div></div>');
    $('cfgClose').addEventListener('click', function () { closeOverlay(); showTitle(); });
  }
  function startHostRoom() {
    if (!Net || !Net.enabled) { noConfig(); return; }
    Net.init().then(function (ok) {
      if (!ok) { noConfig(); return; }
      var code = randomDCode();
      S.net.role = 'host'; S.net.code = code; S.net.hostSide = S.side;
      S.net.autoStarted = false; S.net.lastResultKey = null;
      Net.createRoom(code, { created: Date.now(), playerCount: 2, hostSide: S.side, guestJoined: false }).then(function () {
        Net.watchIntents(code, handleIntent);
        Net.watchMeta(code, function (meta) {
          if (meta && meta.guestJoined) {
            var wt = $('hostWaitText'); if (wt) wt.textContent = T('guestJoined');
            if (!S.net.autoStarted) {
              S.net.autoStarted = true;
              if (!S.g) startGame(S.net.hostSide); else { closeOverlay(); renderAll(); }
            }
          }
        });
        overlay('<div class="modal"><div class="eyebrow">' + T('host') + '</div><h2>' + T('shareCode').replace('{code}', code) + '</h2>' +
          '<p>' + T('onlineNote') + '</p><p id="hostWaitText">' + T('waitingGuest') + '</p>' +
          '<div class="actions"><button type="button" class="btn btn-primary" id="hostGo">' + T('start') + '</button></div></div>');
        $('hostGo').addEventListener('click', function () {
          S.net.autoStarted = true; closeOverlay(); startGame(S.net.hostSide);
        });
      });
    });
  }
  function joinGuestRoom(code) {
    code = (code || '').trim().toUpperCase();
    if (code.charAt(0) !== 'D' || code.length !== 6) { noConfig(); return; }
    if (!Net || !Net.enabled) { noConfig(); return; }
    Net.init().then(function (ok) {
      if (!ok) { noConfig(); return; }
      Net.joinRoom(code).then(function (meta) {
        if (!meta) { noConfig(); return; }
        S.net.role = 'guest'; S.net.code = code; S.net.hostSide = meta.hostSide || 'fellowship';
        S.side = otherSide(S.net.hostSide); S.net.lastResultKey = null;
        try { Net.markGuest(code); } catch (e) {}
        closeOverlay();
        Net.watchState(code, applySnapshot);
        overlay('<div class="modal" id="waitOverlay"><div class="eyebrow">' + T('guest') + '</div>' +
          '<h2>' + T('joinedRoom').replace('{code}', code) + '</h2><p>' + T('waitingForHost') + '</p>' +
          '<div class="actions"><button type="button" class="btn" id="waitClose">' + T('back') + '</button></div></div>');
        $('waitClose').addEventListener('click', closeOverlay);
      });
    });
  }
  function handleIntent(item) {
    if (!isHost() || !S.g) return;
    var it = item.value || {};
    if (it.side !== otherSide(S.net.hostSide)) { try { Net.removeIntent(S.net.code, item.key); } catch (e) {} return; }
    if (S.g.phase === 'playing' && S.g.turn === it.side) {
      if (it.type === 'takeCard') {
        var r = E.takeChapter(S.g, it.col, it.mode, it.region);
        if (r.ok) log(sideName(it.side) + ' ' + (it.mode === 'discard' ? T('discardCard') : T('playCard')) + ': ' + L(r.card.name), it.side);
      }
      if (it.type === 'takeLandmark') {
        var t = E.takeLandmark(S.g, it.index);
        if (t.ok) log(sideName(it.side) + ' ' + T('takeLandmark') + ': ' + L(t.tile.name), it.side);
      }
      renderAll();
      if (S.g.phase === 'ended') showResult();
    }
    try { Net.removeIntent(S.net.code, item.key); } catch (e) {}
  }

  /* ---------------- render ---------------- */
  function renderAll() {
    if (!S.g) return;
    var g = S.g;
    $('chapterLabel').textContent = T('chapter') + ' ' + g.chapter + ' / 3';
    $('turnLabel').textContent = g.phase === 'ended' ? '' :
      (g.turn === S.side ? T('yourTurn') : T('aiThinking'));
    $('scoreLine').textContent = sideName('fellowship') + ' ' + E.regionCount(g.players.fellowship) + '/7 · ' +
      sideName('sauron') + ' ' + E.regionCount(g.players.sauron) + '/7';
    renderQuest(); renderRegions(); renderPlayer(); renderFoe(); renderDisplay(); renderLandmarks();
    renderTopLabels();
    publish();
  }
  function renderTopLabels() {
    $('questLabel').textContent = T('quest'); $('regionLabel').textContent = T('regions');
    $('youLabel').textContent = T('you'); $('foeLabel').textContent = T('foe');
    $('displayLabel').textContent = T('display'); $('landmarkLabel').textContent = T('landmarks');
    var l = $('logLabel'); if (l) l.textContent = T('log');
    $('playedLabel').textContent = T('played');
    $('langBtn').textContent = T('language'); $('tutorialBtn').textContent = T('tutorialTitle');
    $('guideBtn').textContent = T('guide'); $('homeBtn').textContent = T('home');
    $('stepGuideLabel').textContent = T('tutorialTitle');
    $('guideToggleBtn').textContent = S.guideVisible ? T('hideGuide') : T('showGuide');
    $('stepGuide').classList.toggle('collapsed', !S.guideVisible);
    $('stepList').innerHTML = ['step1', 'step2', 'step3', 'step4', 'step5'].map(function (k, i) {
      return '<li><b>' + (i + 1) + '.</b> ' + T(k) + '</li>';
    }).join('');
  }

  function renderQuest() {
    var g = S.g, html = '';
    for (var i = 0; i <= E.QUEST_END; i++) {
      var b = C.BONUS[i];
      html += '<div class="qspace' + (b ? ' bonus' : '') + (i === E.QUEST_END ? ' final' : '') + '">' + i +
        (i === g.players.fellowship.quest ? '<span class="marker f"></span>' : '') +
        (i === g.players.sauron.quest ? '<span class="marker s"></span>' : '') + '</div>';
    }
    $('questTrack').innerHTML = html;
  }
  function renderRegions() {
    var g = S.g;
    $('regionBoard').innerHTML = C.REGIONS.map(function (r) {
      var f = g.players.fellowship.units[r], s = g.players.sauron.units[r];
      var ff = g.players.fellowship.forts.indexOf(r) >= 0, sf = g.players.sauron.forts.indexOf(r) >= 0;
      return '<div class="region"><b>' + regionName(r) + '</b><div class="units">' +
        (f ? '<span class="f">F:' + f + '</span>' : '') + (s ? '<span class="s">S:' + s + '</span>' : '') +
        '</div><div class="fort">' + (ff ? '◆F ' : '') + (sf ? '◆S' : '') + '</div></div>';
    }).join('');
  }
  function statHtml(p) {
    var skills = E.skillsOf(p), used = p.skillsUsed;
    return '<div class="stat">' + T('coins') + ': <b>' + p.coins + '</b></div>' +
      '<div class="stat">' + T('quest') + ': <b>' + p.quest + '</b></div>' +
      '<div class="stat">' + T('races') + ': <b>' + (p.races.length + (p.extraRace ? 1 : 0)) + '</b></div>' +
      '<div class="stat">' + T('regions') + ': <b>' + E.regionCount(p) + '</b></div>' +
      '<div class="skill-list">' + skills.map(function (s) {
        return '<span class="skill-chip' + (used.indexOf(s) >= 0 ? ' used' : '') + '">' +
          C.SKILL_INFO[s].sym + ' ' + L(C.SKILL_INFO[s]) + '</span>';
      }).join('') + '</div>';
  }
  function renderPlayer() {
    var p = S.g.players[S.side];
    $('playerStats').innerHTML = statHtml(p);
    $('playedCards').innerHTML = p.played.map(function (c) {
      var info = C.TYPE_INFO[c.type];
      return '<div class="mini-card type-' + c.type + '" title="' + L(c.name) + '">' +
        '<span>' + info.sym + '</span><span class="sym">' + (c.chain ? '★' : info.sym) + '</span>' +
        '<span class="nm">' + L(c.name) + '</span></div>';
    }).join('');
  }
  function renderFoe() { $('foeStats').innerHTML = statHtml(S.g.players[S.side === 'fellowship' ? 'sauron' : 'fellowship']); }

  function chainSym(ch) {
    if (C.SKILL_INFO[ch]) return C.SKILL_INFO[ch].sym;
    if (ch === 'coin') return '●';
    if (ch === 'quest') return '▬';
    return '★';
  }
  function cardHtml(card, available, covered) {
    var info = C.TYPE_INFO[card.type], cost = card.cost || {};
    var costText = (cost.skills || []).map(function (s) { return C.SKILL_INFO[s].sym; }).join('') + (cost.coins ? ' ●' + cost.coins : '');
    return '<div class="webcard' + (covered ? ' covered' : available ? ' available' : '') +
      '" style="background:linear-gradient(155deg,#f3ecd8,' + info.color + ')" data-card="' + card.id + '">' +
      '<div class="top"><span>' + info.sym + '</span><span>' + (card.chain ? '★' + chainSym(card.chain) : '') + '</span></div>' +
      '<div class="sym">' + info.sym + '</div><div class="nm">' + L(card.name) + '</div>' +
      '<div class="cost">' + (costText || T('free')) + '</div></div>';
  }
  function renderDisplay() {
    var g = S.g;
    $('deckCount').textContent = (g.discard.length + ' →');
    $('displayCards').innerHTML = g.display.map(function (col) {
      return '<div class="card-col">' + col.stack.map(function (entry, i) {
        var top = i === col.stack.length - 1;
        var card = E.cardById(entry.id);
        if (!card) return '';
        return entry.faceup ? cardHtml(card, top && g.turn === S.side && g.phase === 'playing', !top) :
          '<div class="webcard back' + (top ? ' available' : ' covered') + '" data-col="' + col.col + '"></div>';
      }).join('') + '</div>';
    }).join('');
    Array.prototype.forEach.call($('displayCards').querySelectorAll('.webcard'), function (el) {
      el.addEventListener('click', function () {
        if (el.classList.contains('covered') || !el.classList.contains('available')) return;
        var col = null;
        g.display.forEach(function (c) {
          if (c.stack.length) {
            var top = c.stack[c.stack.length - 1];
            var card = E.cardById(top.id);
            if (card && card.id === el.dataset.card) col = c.col;
          }
        });
        if (col == null && el.dataset.col != null) col = Number(el.dataset.col);
        if (col != null) showCardChoice(col);
      });
    });
  }
  function renderLandmarks() {
    var g = S.g;
    $('landmarkCount').textContent = (g.landmarkDeck ? g.landmarkDeck.length : '?') + ' ↓';
    $('landmarkCards').innerHTML = g.landmarks.map(function (t, i) {
      return '<div class="tile" data-land="' + i + '"><b>' + L(t.name) + '</b> · ' + regionName(t.region) +
        '<small>' + L(t.text) + '</small></div>';
    }).join('');
    Array.prototype.forEach.call($('landmarkCards').querySelectorAll('.tile'), function (el) {
      el.addEventListener('click', function () {
        if (S.g.turn !== S.side || S.g.phase !== 'playing') return;
        var idx = Number(el.dataset.land);
        if (isGuest()) {
          try { Net.sendIntent(S.net.code, { type: 'takeLandmark', index: idx, side: S.side }); } catch (e) {}
          return;
        }
        var r = E.takeLandmark(S.g, idx);
        if (!r.ok) { beep(200, .2, 'sawtooth'); return; }
        log(sideName(S.side) + ' ' + T('takeLandmark') + ': ' + L(r.tile.name), S.side);
        beep(700, .12, 'triangle'); finishTurn();
      });
    });
  }

  /* ---------------- actions ---------------- */
  function showCardChoice(col) {
    var g = S.g, card = E.availableCards(g).filter(function (a) { return a.col === col; })[0].card;
    var p = g.players[S.side], cost = E.costToPlay(g, p, card);
    var regions = card.effect.regions || [];
    overlay('<div class="modal"><h2>' + L(card.name) + '</h2><p>' + L(C.TYPE_INFO[card.type]) +
      ' · ' + T('cost') + ': ' + (cost.free ? T('free') : cost.coins) + '</p>' +
      '<div class="actions">' +
      '<button type="button" class="btn btn-primary" id="doPlay"' + (p.coins < cost.coins && !cost.free ? ' disabled' : '') + '>' + T('playCard') + '</button>' +
      '<button type="button" class="btn" id="doDiscard">' + T('discardCard') + ' +' + g.chapter + '</button>' +
      '<button type="button" class="btn" id="doCancel">' + T('back') + '</button></div></div>');
    $('doDiscard').addEventListener('click', function () { closeOverlay(); doTake(col, 'discard', null); });
    $('doCancel').addEventListener('click', closeOverlay);
    $('doPlay').addEventListener('click', function () {
      if (!regions.length) { closeOverlay(); doTake(col, 'play', null); return; }
      overlay('<div class="modal"><h2>' + T('chooseRegion') + '</h2><div class="pick-row">' +
        regions.map(function (r) { return '<button type="button" class="pill" data-reg="' + r + '">' + regionName(r) + '</button>'; }).join('') +
        '</div></div>');
      Array.prototype.forEach.call(document.querySelectorAll('[data-reg]'), function (b) {
        b.addEventListener('click', function () { closeOverlay(); doTake(col, 'play', b.dataset.reg); });
      });
    });
  }
  function doTake(col, mode, region) {
    if (isGuest()) {
      try { Net.sendIntent(S.net.code, { type: 'takeCard', col: col, mode: mode, region: region, side: S.side }); } catch (e) {}
      return;
    }
    var r = E.takeChapter(S.g, col, mode, region);
    if (!r.ok) { beep(200, .2, 'sawtooth'); return; }
    log(sideName(S.side) + ' ' + (mode === 'discard' ? T('discardCard') : T('playCard')) + ': ' + L(r.card.name), S.side);
    beep(650, .12, 'triangle'); finishTurn();
  }
  function finishTurn() {
    renderAll();
    if (S.g.phase === 'ended') { showResult(); return; }
    scheduleAI();
  }
  function scheduleAI() {
    if (isOnline()) return;
    if (S.g.phase !== 'playing' || S.g.turn === S.side) return;
    setTimeout(function () {
      if (!S.g || S.g.phase !== 'playing' || S.g.turn === S.side) return;
      var side = S.g.turn;
      var r = E.playAI(S.g);
      if (!r.ok) return;
      log(sideName(side) + ' ' + (r.action === 'discard' ? T('discardCard') : r.action === 'landmark' ? T('takeLandmark') : T('playCard')) +
        ': ' + L((r.card || r.tile).name), side);
      beep(420, .1, 'triangle'); finishTurn();
    }, 900);
  }

  function showResult() {
    var g = S.g, title = g.winner === 'fellowship' ? T('winFellowship') : g.winner === 'sauron' ? T('winSauron') : T('winDraw');
    var reason = '';
    if (g.winner === 'fellowship') reason = g.players.fellowship.quest >= E.QUEST_END ? T('winQuest') : T('regions');
    if (g.winner === 'sauron') reason = g.players.sauron.quest >= g.players.fellowship.quest ? T('winCatch') : T('regions');
    overlay('<div class="modal"><h2>' + title + '</h2><p>' + (reason || '') + '</p>' +
      (isGuest() ? '<p>' + T('waitingForHost') + '</p>' : '') + '<div class="actions">' +
      (!isGuest() ? '<button type="button" class="btn btn-primary" id="againBtn">' + T('newGame') + '</button>' : '') +
      '<button type="button" class="btn" id="menuBtn">' + T('menu') + '</button></div></div>');
    if ($('againBtn')) $('againBtn').addEventListener('click', function () { closeOverlay(); startGame(S.side); });
    $('menuBtn').addEventListener('click', function () { closeOverlay(); S.g = null; showTitle(); });
  }

  /* ---------------- overlays / boot ---------------- */
  function closeOverlay() { $('overlayRoot').innerHTML = ''; }
  function overlay(html, cls) { $('overlayRoot').innerHTML = '<div class="overlay ' + (cls || '') + '">' + html + '</div>'; }
  function showTitle() {
    overlay('<div class="modal title-screen"><div class="hero"><h1>' + T('appTitle') + '</h1></div>' +
      '<p>' + T('guideIntro') + '</p>' +
      '<h3>' + T('onlineMode') + '</h3><div class="pick-row">' +
      '<button type="button" class="pill" id="hostRoomBtn">' + T('createRoom') + '</button>' +
      '<input id="roomCodeInput" class="code-input" maxlength="6" placeholder="' + T('roomCode') + '">' +
      '<button type="button" class="pill" id="joinBtn">' + T('joinRoom') + '</button></div>' +
      '<div id="openRooms" style="font-size:12px;color:#cdd3c4;margin:6px 0 0"></div>' +
      '<p style="font-size:12px;opacity:.7">' + T('onlineNote') + '</p>' +
      '<h3>' + (S.lang === 'vi' ? 'Chơi với AI (local)' : 'Play vs AI (local)') + '</h3>' +
      '<h3>' + T('chooseSide') + '</h3><div class="pick-row">' +
      '<button type="button" class="pill' + (S.side === 'fellowship' ? ' active' : '') + '" id="pickF">' + T('playAsFellowship') + '</button>' +
      '<button type="button" class="pill' + (S.side === 'sauron' ? ' active' : '') + '" id="pickS">' + T('playAsSauron') + '</button></div>' +
      '<div class="actions"><button type="button" class="btn btn-primary" id="startBtn"' + (S.side ? '' : ' disabled') + '>' + T('start') + '</button>' +
      '<button type="button" class="btn" id="guideBtn2">' + T('guide') + '</button></div></div>');
    $('hostRoomBtn').addEventListener('click', startHostRoom);
    $('joinBtn').addEventListener('click', function () { joinGuestRoom($('roomCodeInput').value); });
    $('pickF').addEventListener('click', function () { S.side = 'fellowship'; pick(); });
    $('pickS').addEventListener('click', function () { S.side = 'sauron'; pick(); });
    function pick() {
      Array.prototype.forEach.call(document.querySelectorAll('.pill'), function (x) { x.classList.remove('active'); });
      (S.side === 'fellowship' ? $('pickF') : $('pickS')).classList.add('active');
      $('startBtn').disabled = false;
    }
    $('startBtn').addEventListener('click', function () { closeOverlay(); startGame(S.side); });
    $('guideBtn2').addEventListener('click', showGuide);
  }
  function startGame(side) {
    S.side = side; S.logs = [];
    S.g = E.createGame(Date.now());
    E.setupChapter(S.g, 1);
    renderAll();
    log(T('chapter') + ' 1 — ' + T('start'), null);
    if (!S.tutorialDone && !isOnline()) startTutorial(I.tutorial.map(function (t) { return t.id; }), function () { scheduleAI(); });
    else scheduleAI();
  }
  function showGuide() {
    overlay('<div class="modal wide"><h2>' + T('guideTitle') + '</h2><div class="guide-grid"><div>' +
      '<h3>1</h3><p>' + T('guideIntro') + '</p><h3>2</h3><p>' + T('guideCards') + '</p><h3>3</h3><p>' + T('guideCost') + '</p>' +
      '</div><div><h3>4</h3><p>' + T('guideAllies') + '</p><h3>5</h3><p>' + T('guideMap') + '</p>' +
      '<h3>6</h3><p>' + T('guideScope') + '</p><h3>7</h3><p>' + T('guidePrivacy') + '</p></div></div>' +
      '<div class="actions"><button type="button" class="btn btn-primary" id="guideClose">' + T('back') + '</button></div></div>');
    $('guideClose').addEventListener('click', function () { closeOverlay(); if (S.g) renderAll(); else showTitle(); });
  }
  function startTutorial(ids, onDone) { S.coach = { ids: ids, index: 0, onDone: onDone || null }; renderCoach(); }
  function renderCoach() {
    var root = $('coachRoot'); root.innerHTML = '';
    if (!S.coach) return;
    var step = I.tutorial.filter(function (t) { return t.id === S.coach.ids[S.coach.index]; })[0];
    if (!step) { endCoach(); return; }
    var txt = L(step), el = document.querySelector(step.target);
    var hole = document.createElement('div'); hole.className = 'coach-hole';
    if (el) { var r = el.getBoundingClientRect(), p = 6; hole.style.left = (r.left-p)+'px'; hole.style.top = (r.top-p)+'px'; hole.style.width = (r.width+p*2)+'px'; hole.style.height = (r.height+p*2)+'px'; }
    var tip = document.createElement('div'); tip.className = 'coach-tip';
    tip.innerHTML = '<h3>' + txt.title + '</h3><p>' + txt.body + '</p><div class="coach-actions">' +
      '<button type="button" class="coach-skip">' + T('skip') + '</button><button type="button" class="btn btn-primary coach-next">' + T('next') + '</button></div>';
    root.appendChild(hole); root.appendChild(tip);
    var tw = tip.offsetWidth || 340, th = tip.offsetHeight || 120, left, top;
    if (el) { var rr = el.getBoundingClientRect(); left = Math.min(Math.max(10, rr.left), innerWidth - tw - 10); top = rr.bottom + 12 + th < innerHeight - 8 ? rr.bottom + 12 : Math.max(8, rr.top - th - 12); }
    else { left = (innerWidth - tw) / 2; top = innerHeight * .4; }
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
    tip.querySelector('.coach-next').addEventListener('click', function () { S.coach.index++; if (S.coach.index >= S.coach.ids.length) endCoach(); else renderCoach(); });
    tip.querySelector('.coach-skip').addEventListener('click', endCoach);
  }
  function endCoach() { var d = S.coach && S.coach.onDone; S.coach = null; $('coachRoot').innerHTML = ''; if (d) d(); }

  function bind() {
    $('langBtn').addEventListener('click', function () {
      S.lang = S.lang === 'vi' ? 'en' : 'vi';
      if (S.coach) { S.coach = null; $('coachRoot').innerHTML = ''; }
      renderAll();
      if (document.querySelector('#overlayRoot .title-screen')) showTitle();
      else if (document.querySelector('#overlayRoot .modal') && !document.querySelector('#overlayRoot .coach-tip')) {
        if (S.g && S.g.phase === 'ended') showResult();
      }
    });
    $('guideBtn').addEventListener('click', showGuide);
    $('guideToggleBtn').addEventListener('click', function () { S.guideVisible = !S.guideVisible; renderAll(); });
    $('tutorialBtn').addEventListener('click', function () { if (S.g) startTutorial(I.tutorial.map(function (t) { return t.id; }), function () { renderAll(); scheduleAI(); }); });
    $('homeBtn').addEventListener('click', function () { location.href = '../index.html'; });
    window.addEventListener('resize', function () { if (S.coach) renderCoach(); });
  }
  bind(); renderAll(); showTitle();
})();
