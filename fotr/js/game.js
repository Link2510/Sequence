/* game.js — DOM controller: official-style round setup, character goals, AI, tutorial, local save. */
(function () {
  'use strict';

  var E = window.LOTREngine, CHAPTERS = window.LOTRChapters,
      CHARS = window.LOTRCharacters, I = window.LOTRI18n,
      Net = window.LOTRNet || null;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'lotr-fotr-trick-taking-v1';
  var AI_DELAY = 850;

  var S = {
    lang: 'vi',
    progress: { unlocked: 1, completed: [], lang: 'vi', sound: true, playerCount: 4, humanCount: 1, tutorialDone: false },
    chapterIndex: 0,
    round: null,
    viewHuman: 0,
    pendingChoices: [],
    roundNo: 1,
    longCompleted: [],
    selected: null,
    lastPlays: null,
    lastResult: null,
    logs: [],
    coach: null,
    audio: null,
    pendingRing: null,
    lastOutcome: null,
    net: { role: null, code: null, seat: 0, needChoice: null, shownChoice: null, lastOutcomeKey: null, lastPublish: 0, ready: false }
  };
  function isOnline() { return !!(Net && Net.enabled && Net.isReady() && S.net.role); }
  function isHost() { return isOnline() && S.net.role === 'host'; }
  function isGuest() { return isOnline() && S.net.role === 'guest'; }

  function T(k) { return I.t(S.lang, k); }
  function L(o) { return I.L(S.lang, o); }
  function suitName(s) { return L(E.SUIT_INFO[s].name); }
  function suitSym(s) { return E.SUIT_INFO[s].symbol; }
  function chapter() { return CHAPTERS[S.chapterIndex]; }
  function humanLabel(i) {
    if (!S.round) return S.lang === 'vi' ? 'Bạn' : 'You';
    var order = S.round.humanIndices.indexOf(i);
    return order === 1 ? T('you2') : T('you1');
  }
  function playerName(i) {
    var id = S.round.players[i].characterId;
    return CHARS[id] ? L(CHARS[id].name) : ('P' + (i + 1));
  }

  /* ---------------- persistence ---------------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return;
      S.progress.unlocked = Math.min(18, Math.max(1, p.unlocked || 1));
      S.progress.completed = Array.isArray(p.completed) ? p.completed : [];
      S.progress.sound = p.sound !== false;
      S.progress.playerCount = p.playerCount === 3 ? 3 : 4;
      S.progress.humanCount = p.humanCount === 2 ? 2 : 1;
      S.progress.tutorialDone = !!p.tutorialDone;
      S.lang = p.lang === 'en' ? 'en' : 'vi';
    } catch (e) { /* storage unavailable */ }
  }
  function save() {
    try {
      S.progress.lang = S.lang;
      localStorage.setItem(KEY, JSON.stringify(S.progress));
    } catch (e) { /* ignore */ }
  }

  /* ---------------- sound ---------------- */
  function beep(freq, dur, type) {
    if (!S.progress.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      S.audio = S.audio || new Ctx();
      var c = S.audio, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur + 0.03);
    } catch (e) { /* optional */ }
  }

  /* ---------------- card html ---------------- */
  function cardHTML(card, mini) {
    var info = E.SUIT_INFO[card.suit];
    var cls = 'card ' + info.css + (card.isOneRing ? ' is-one-ring' : '') + (mini ? ' mini-card' : '');
    var title = card.isOneRing ? T('oneRing') : suitName(card.suit);
    return '<div class="' + cls + '" title="' + title + '">' +
      '<span class="corner">' + card.rank + '</span>' +
      '<span class="suit-big">' + info.symbol + '</span>' +
      '<span class="corner-br">' + card.rank + '</span>' +
      '<span class="card-name">' + title + '</span></div>';
  }
  function cardText(card) { return card.rank + suitSym(card.suit); }

  /* ---------------- online snapshot (host authoritative) ---------------- */
  function snapshot() {
    var r = S.round;
    return {
      chapterIndex: S.chapterIndex, roundNo: S.roundNo, longCompleted: S.longCompleted.slice(),
      logs: S.logs.slice(), needChoice: S.net.needChoice,
      outcome: S.lastOutcome, outcomeKey: S.net.lastOutcomeKey,
      playerCount: r.playerCount, totalTricks: r.totalTricks,
      humanIndices: r.humanIndices.slice(), oneRingHolder: r.oneRingHolder,
      ringLocked: r.ringLocked, ledSuit: r.ledSuit, plays: r.plays,
      trick: r.trick, phase: r.phase, turnIndex: r.turnIndex, leaderIndex: r.leaderIndex,
      trickHistory: r.trickHistory, lostCard: r.lostCard,
      players: r.players.map(function (p) {
        return { hand: p.hand, wonCards: p.wonCards, tricksWon: p.tricksWon,
          characterId: p.characterId, threat: p.threat, isHuman: p.isHuman };
      })
    };
  }
  function publish() {
    if (!isHost() || !S.round || !Net.isReady()) return;
    S.net.lastPublish = Date.now();
    try { Net.publishState(S.net.code, snapshot()); } catch (e) { /* offline again */ }
  }
  function rebuild(s) {
    return {
      playerCount: s.playerCount, totalTricks: s.totalTricks,
      humanIndices: s.humanIndices || [0, 1], oneRingHolder: s.oneRingHolder,
      ringLocked: s.ringLocked, ledSuit: s.ledSuit, plays: s.plays || [],
      trick: s.trick, phase: s.phase, turnIndex: s.turnIndex, leaderIndex: s.leaderIndex,
      trickHistory: s.trickHistory || [], lostCard: s.lostCard,
      players: s.players.map(function (p) {
        return { hand: p.hand || [], wonCards: p.wonCards || [], tricksWon: p.tricksWon || 0,
          characterId: p.characterId, threat: p.threat, isHuman: p.isHuman };
      })
    };
  }
  function applySnapshot(s) {
    if (!s || !s.players) return;
    S.round = rebuild(s);
    S.chapterIndex = s.chapterIndex || 0;
    S.roundNo = s.roundNo || 1;
    S.longCompleted = s.longCompleted || [];
    S.logs = s.logs || [];
    S.lastOutcome = s.outcome;
    S.viewHuman = S.net.seat;
    S.pendingChoices = s.needChoice != null ? [s.needChoice] : [];
    var box = $('logList');
    if (box) box.innerHTML = S.logs.map(function (e) { return '<div class="' + e.cls + '">' + e.msg + '</div>'; }).join('');
    if ((s.phase === 'playing' || s.needChoice != null) && $('waitOverlay')) closeOverlay();
    renderAll();
    handleGuestUI(s);
  }
  function handleGuestUI(s) {
    if (!isGuest()) return;
    if (s.needChoice === S.net.seat && S.net.shownChoice !== S.net.code + '-' + S.roundNo + '-' + s.needChoice) {
      S.net.shownChoice = S.net.code + '-' + S.roundNo + '-' + s.needChoice;
      nextCharacterChoice();
    }
    var key = S.net.code + '-' + S.chapterIndex + '-' + S.roundNo + '-' + (s.phase || '');
    if (s.phase === 'roundOver' && S.net.lastOutcomeKey !== key) {
      S.net.lastOutcomeKey = key;
      showRoundResult();
    }
  }

  /* ---------------- log ---------------- */
  function log(msg, cls) {
    S.logs.push({ msg: msg, cls: cls || '' });
    if (S.logs.length > 60) S.logs.shift();
    var box = $('logList');
    if (box) {
      box.innerHTML = S.logs.map(function (e) { return '<div class="' + e.cls + '">' + e.msg + '</div>'; }).join('');
      box.parentElement.scrollTop = box.parentElement.scrollHeight;
    }
  }

  /* ---------------- top / banner ---------------- */
  function renderTop() {
    $('brandTitle').textContent = T('appTitle');
    $('brandSubtitle').textContent = T('appSubtitle');
    $('langBtn').textContent = T('language');
    $('tutorialBtn').textContent = T('tutorial');
    $('guideBtn').textContent = T('guide');
    $('resetBtn').textContent = T('reset');
    $('playButton').textContent = T('play');
    $('statusLabel').textContent = S.lang === 'vi' ? 'Mục tiêu & Nhật ký' : 'Goals & Log';
    $('lostLabel').textContent = T('lostCard');
    $('ringLabel').textContent = T('oneRing');
    $('handLabel').textContent = T('yourHand');
    $('logLabel').textContent = S.lang === 'vi' ? 'Nhật ký' : 'Log';
    $('soundBtn').textContent = S.progress.sound ? '🔊' : '🔇';

    var dots = $('chapterDots');
    dots.innerHTML = '';
    CHAPTERS.forEach(function (ch, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'dot'; b.textContent = ch.id;
      b.title = L(ch.title);
      if (S.round && i === S.chapterIndex) b.classList.add('current');
      else if (S.progress.completed.indexOf(ch.id) >= 0) b.classList.add('done');
      if (ch.id <= S.progress.unlocked) {
        b.classList.add('unlocked');
        b.addEventListener('click', function () { if (isGuest()) return; closeOverlay(); startChapter(i); });
      } else b.classList.add('locked');
      dots.appendChild(b);
    });
  }

  function renderBanner() {
    var ch = chapter();
    $('bannerArt').style.backgroundImage = 'url("assets/' + ch.art + '.svg")';
    $('chapterLabel').textContent = T('chapter') + ' ' + ch.id + ' / 18 · ' +
      (ch.victory === 'long' ? T('victoryLong') : T('victoryShort'));
    $('chapterTitle').textContent = L(ch.title);
    $('chapterStory').textContent = L(ch.story);
    $('chapterTip').textContent = '✦ ' + L(ch.note);
  }

  /* ---------------- round setup ---------------- */
  function avatarFor(id) {
    if (!id) return 'frodo';
    if (['frodo', 'sam', 'merry', 'pippin'].indexOf(id) >= 0) return id;
    var h = 0, k;
    for (k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) % 4;
    return ['frodo', 'sam', 'merry', 'pippin'][h];
  }

  function startChapter(index) {
    S.chapterIndex = Math.max(0, Math.min(17, index));
    S.longCompleted = [];
    S.roundNo = 1;
    log((S.lang === 'vi' ? 'Bắt đầu ' : 'Begin ') + ' ' + chapter().id + ' — ' + L(chapter().title), 'log-gold');
    renderTop(); renderBanner();
    showIntro();
  }

  function startRound() {
    var humanCount = Math.min(S.progress.humanCount, S.progress.playerCount);
    var humanIndices = [];
    for (var hi = 0; hi < humanCount; hi++) humanIndices.push(hi);
    var r = E.createRound({
      chapter: chapter(), playerCount: S.progress.playerCount,
      humanIndices: humanIndices, threat: chapter().threat,
      seed: Date.now() + S.chapterIndex * 7919 + S.roundNo * 104729
    });
    S.round = r;
    S.viewHuman = humanIndices[0];
    S.pendingChoices = [];
    S.selected = null; S.lastPlays = null; S.lastResult = null; S.pendingRing = null;
    $('trickResult').style.display = 'none';
    log(T('round') + ' ' + S.roundNo + ' — ' + T('lostCard') + ': ' + cardText(r.lostCard), 'log-gold');
    S.pendingChoices = assignCharacters();
    if (!S.pendingChoices.length) {
      applySetupActions();
      renderAll();
      showSetupSummary();
    } else {
      renderAll();
      nextCharacterChoice();
    }
  }

  function assignCharacters() {
    var r = S.round, ch = chapter(), used = {};
    r.players.forEach(function (p) { p.characterId = null; p.threat = null; });
    var holder = r.oneRingHolder;
    if (ch.characters.indexOf('frodo') >= 0 && holder >= 0) {
      r.players[holder].characterId = 'frodo';
      used.frodo = true;
      log(playerName(holder) + ' ' + (S.lang === 'vi' ? 'nhận Nhẫn Vàng và làm Frodo' : 'takes the One Ring as Frodo'), 'log-gold');
    }
    var isAI = function (i) { return r.humanIndices.indexOf(i) < 0; };
    // Required characters and filler characters go to AI seats; humans choose for themselves.
    ch.required.concat(ch.characters.filter(function (id) { return ch.required.indexOf(id) < 0; })).forEach(function (id) {
      if (used[id]) return;
      var idx = -1;
      for (var i = 0; i < r.players.length; i++) if (isAI(i) && !r.players[i].characterId) { idx = i; break; }
      if (idx >= 0) { r.players[idx].characterId = id; used[id] = true; }
    });
    r.players.forEach(function (p, i) {
      if (p.characterId || !isAI(i)) return;
      var pick = ch.characters.filter(function (id) { return !used[id]; })[0] || ch.characters[0];
      p.characterId = pick; used[pick] = true;
    });
    return r.humanIndices.filter(function (i) { return !r.players[i].characterId; });
  }

  function nextCharacterChoice() {
    if (!S.pendingChoices.length) {
      if (isGuest()) { renderAll(); return; }   // host drives setup
      applySetupActions();
      renderAll();
      showSetupSummary();
      return;
    }
    var idx = S.pendingChoices[0];
    if (isHost() && idx === 1) { S.net.needChoice = 1; publish(); return; }
    if (isGuest() && idx !== S.net.seat) return;
    if (!isOnline() && r_humans() > 1 && idx !== S.viewHuman) showHandoff(idx, function () { showCharacterChoice(idx); });
    else showCharacterChoice(idx);
  }
  function r_humans() { return S.round ? S.round.humanIndices.length : 1; }

  function showHandoff(idx, onDone) {
    var label = humanLabel(idx);
    overlay('<div class="modal"><div class="modal-body"><div class="eyebrow">' + T('handoffTitle').replace('{name}', label) + '</div>' +
      '<h2>' + label + '</h2><p>' + T('handoffBody').replace('{name}', label) + '</p>' +
      '<div class="actions"><button type="button" class="btn btn-primary" id="handoffGo">' + T('handoffBtn').replace('{name}', label) + '</button></div>' +
      '</div></div>');
    $('handoffGo').addEventListener('click', function () {
      S.viewHuman = idx;
      closeOverlay(); renderAll();
      if (onDone) onDone();
    });
  }

  function showCharacterChoice(idx) {
    var r = S.round, ch = chapter();
    var taken = {};
    r.players.forEach(function (p, i) { if (i !== idx && p.characterId) taken[p.characterId] = true; });
    var options = ch.characters.filter(function (id) { return !taken[id]; });
    if (!options.length) options = ch.characters.slice();
    options.sort(function (a, b) {
      return (ch.required.indexOf(b) >= 0 ? 1 : 0) - (ch.required.indexOf(a) >= 0 ? 1 : 0);
    });
    overlay('<div class="modal"><div class="modal-body"><div class="eyebrow">' + humanLabel(idx) + '</div>' +
      '<h2>' + T('chooseCharacters') + '</h2><p>' + T('chooseBody') + '</p><div class="char-grid">' +
      options.map(function (id) {
        var c = CHARS[id];
        return '<button type="button" class="char-cell" data-char="' + id + '"><strong>' + L(c.name) +
          '</strong> <span class="tag">' + L(c.title) + '</span>' +
          (ch.required.indexOf(id) >= 0 ? ' <span class="tag">★</span>' : '') +
          '<small>' + L(c.goal) + '</small>' +
          (c.exact ? '' : '<small>' + T('approx') + '</small>') + '</button>';
      }).join('') + '</div><div class="actions"><button id="charOk" class="btn btn-primary" type="button">' + T('continue') + '</button></div>' +
      '</div></div>'
    );
    var chosen = null;
    Array.prototype.forEach.call(document.querySelectorAll('.char-cell'), function (b) {
      b.addEventListener('click', function () {
        chosen = b.dataset.char;
        Array.prototype.forEach.call(document.querySelectorAll('.char-cell'), function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        beep(600, 0.06, 'triangle');
      });
    });
    $('charOk').addEventListener('click', function () {
      if (!chosen) chosen = options[0];
      if (isGuest()) {
        closeOverlay();
        try { Net.sendIntent(S.net.code, { type: 'chooseChar', charId: chosen, seat: S.net.seat }); } catch (e) {}
        return;
      }
      r.players[idx].characterId = chosen;
      S.pendingChoices.shift();
      closeOverlay();
      log(humanLabel(idx) + ' ' + (S.lang === 'vi' ? 'chọn ' : 'chose ') + L(CHARS[chosen].name), 'log-gold');
      nextCharacterChoice();
    });
  }

  function applySetupActions() {
    var r = S.round;
    var needsThreat = { sam: 1, sam_burdened: 1, merry: 1, merry_burdened: 1, farmer_maggot: 1, strider: 1, aragorn: 1, aragorn_burdened: 1 };
    r.players.forEach(function (p) {
      if (!p.characterId || !needsThreat[p.characterId]) return;
      var t = E.drawThreat(r);
      if (t == null) t = 1 + Math.floor(r.rng() * (chapter().threat === 'number' ? 7 : 4));
      p.threat = t;
      log(L(CHARS[p.characterId].name) + ' ' + (S.lang === 'vi' ? 'rút Threat' : 'draws Threat') + ': ' + t, 'log-gold');
    });
    // Gandalf takes the lost card.
    r.players.forEach(function (p) {
      if (p.characterId === 'gandalf' && r.lostCard) {
        p.hand.push(r.lostCard);
        log(L(CHARS.gandalf.name) + ' ' + (S.lang === 'vi' ? 'lấy lá bài bị rơi' : 'takes the lost card') + ': ' + cardText(r.lostCard));
      }
    });
    // Fatty gives one card to each other character; Bill passes to Frodo and Sam.
    r.players.forEach(function (p, i) {
      if (p.characterId === 'fatty') {
        r.players.forEach(function (q, j) {
          if (j === i || !q.hand.length) return;
          var give = p.hand.reduce(function (a, b) { return a.rank <= b.rank ? a : b; });
          p.hand = p.hand.filter(function (c) { return c.id !== give.id; });
          q.hand.push(give);
          log(L(CHARS.fatty.name) + ' → ' + playerName(j) + ': ' + cardText(give));
        });
      }
      if (p.characterId === 'bill') {
        [0, 1].forEach(function (off) {
          var target = r.players[(i + off) % r.players.length];
          if (!p.hand.length || !target) return;
          var give = p.hand.reduce(function (a, b) { return a.rank <= b.rank ? a : b; });
          p.hand = p.hand.filter(function (c) { return c.id !== give.id; });
          target.hand.push(give);
          log(L(CHARS.bill.name) + ' → ' + playerName(r.players.indexOf(target)) + ': ' + cardText(give));
        });
      }
    });
    // Automated exchanges for characters whose printed setup says "Exchange".
    var exchangeIds = { gandalf: 1, pippin: 1, pippin_burdened: 1, sam: 1, sam_burdened: 1, merry: 1, merry_burdened: 1 };
    var pairs = {};
    r.players.forEach(function (p, i) {
      if (!p.characterId || !exchangeIds[p.characterId] || !p.hand.length) return;
      var target = -1, k;
      for (k = 0; k < r.players.length; k++) {
        var tid = r.players[k].characterId;
        if (k !== i && r.players[k].hand.length &&
            (tid === 'frodo' || tid === 'sam' || tid === 'merry' || tid === 'pippin') &&
            !pairs[i + '-' + k]) { target = k; break; }
      }
      if (target < 0) for (k = 0; k < r.players.length; k++) if (k !== i && r.players[k].hand.length && !pairs[i + '-' + k]) { target = k; break; }
      if (target < 0) return;
      pairs[i + '-' + target] = true; pairs[target + '-' + i] = true;
      var give = p.hand.reduce(function (a, b) { return a.rank <= b.rank ? a : b; });
      var q = r.players[target];
      var get = q.hand.reduce(function (a, b) { return a.rank <= b.rank ? a : b; });
      p.hand = p.hand.filter(function (c) { return c.id !== give.id; });
      q.hand = q.hand.filter(function (c) { return c.id !== get.id; });
      p.hand.push(get); q.hand.push(give);
      log(playerName(i) + ' ⇄ ' + playerName(target) + ' ' + (S.lang === 'vi' ? 'đổi bài' : 'exchange') + ': ' + cardText(give) + ' / ' + cardText(get));
    });
    r.players.forEach(function (p) {
      p.hand.sort(function (a, b) {
        if (a.suit === b.suit) return a.rank - b.rank;
        return E.SUITS.indexOf(a.suit) - E.SUITS.indexOf(b.suit);
      });
    });
  }

  /* ---------------- rendering ---------------- */
  function renderAll() {
    renderTop(); renderBanner();
    if (!S.round) return;
    renderTable(); renderGoals(); renderHand(); renderHint();
    publish();
  }

  function renderTable() {
    var r = S.round;
    $('trickLabel').textContent = T('trick') + ' ' + r.trick + ' / ' + r.totalTricks;
    var turn = r.players[r.turnIndex];
    if (r.phase !== 'playing') $('turnLabel').textContent = T('roundOver');
    else if (isGuest() && r.turnIndex !== S.net.seat) {
      $('turnLabel').textContent = turn.isHuman
        ? T('guestTurn').replace('{name}', humanLabel(r.turnIndex))
        : T('aiThinking').replace('{name}', playerName(r.turnIndex));
    } else if (isHost() && r.turnIndex === 1) {
      $('turnLabel').textContent = T('guestTurn').replace('{name}', humanLabel(1));
    } else {
      $('turnLabel').textContent = turn.isHuman ? T('yourTurn') : T('aiThinking').replace('{name}', playerName(r.turnIndex));
    }
    $('lostCard').innerHTML = cardHTML(r.lostCard, true);
    var tok = $('ringToken');
    tok.textContent = r.ringLocked ? '🔒 ' + T('ringLocked') : '🔓 ' + T('ringBroken');
    tok.classList.toggle('open', !r.ringLocked);
    $('threatBox').innerHTML = r.players.filter(function (p) { return p.threat != null; })
      .map(function (p) { return playerName(r.players.indexOf(p)) + ' ' + T('threat') + ': ' + p.threat; }).join('<br>');

    var displayed = (r.plays.length === 0 && S.lastPlays) ? S.lastPlays : r.plays;
    var winner = S.lastResult && S.lastResult.complete ? S.lastResult.winner : null;
    var slots = document.querySelectorAll('.play-slot');
    for (var i = 0; i < slots.length; i++) {
      slots[i].style.display = i < r.playerCount ? 'flex' : 'none';
      if (i >= r.playerCount) continue;
      var play = displayed.filter(function (x) { return x.playerIndex === i; })[0];
      var html = '<div class="slot-name"><img class="slot-avatar" src="assets/portrait-' + avatarFor(r.players[i].characterId) + '.svg" alt="">' +
        playerName(i) + (r.players[i].isHuman ? ' · ' + humanLabel(i) : '') + '</div>';
      html += play ? cardHTML(play.card, true) : '<div class="slot-empty">✦</div>';
      slots[i].innerHTML = html;
      slots[i].classList.toggle('winner', winner === i);
    }
    var res = $('trickResult');
    if (S.lastResult && S.lastResult.complete) {
      var rr = S.lastResult;
      res.innerHTML = T('trickWin').replace('{name}', playerName(rr.winner)).replace('{n}', rr.trick) +
        (rr.usedRingPower ? '<small>' + T('oneRing') + '</small>' : '');
      res.style.display = 'block';
    } else res.style.display = 'none';
  }

  function goalProgress(i) {
    var r = S.round, p = r.players[i], id = p.characterId, c = CHARS[id];
    var won = p.wonCards;
    var bits = [];
    if (id === 'frodo') bits.push(T('ringCards') + ': ' + E.countSuit(won, 'ring') + '/' + (r.playerCount === 3 ? 4 : 2));
    else bits.push(T('tricks') + ': ' + p.tricksWon);
    if (p.threat != null) bits.push(T('threat') + ': ' + p.threat);
    return bits.join(' · ');
  }

  function renderGoals() {
    var r = S.round;
    var box = $('goalList');
    box.innerHTML = r.players.map(function (p, i) {
      var c = CHARS[p.characterId];
      if (!c) return '<div class="goal-row"><div class="goal-top"><span>' + humanLabel(i) + '</span><span class="mark">…</span></div><div class="goal-text">' + T('chooseCharacters') + '</div></div>';
      var done = E.checkGoal(p.characterId, { state: r, playerIndex: i, threat: p.threat });
      var cls = r.phase === 'roundOver' ? (done ? 'done' : 'fail') : (done ? 'done' : '');
      return '<div class="goal-row ' + cls + '"><div class="goal-top"><span>' +
        L(c.name) + ' · ' + L(c.title) + '</span><span class="mark">' +
        (r.phase === 'roundOver' ? (done ? '✓' : '✗') : (done ? '✓' : '…')) + '</span></div>' +
        '<div class="goal-text">' + L(c.goal) + '</div>' +
        '<div class="goal-extra">' + goalProgress(i) + (c.exact ? '' : ' · ' + T('approx')) + '</div></div>';
    }).join('');
  }

  function renderHand() {
    var r = S.round, box = $('handCards');
    if (!r) { box.innerHTML = ''; return; }
    var who = S.viewHuman;
    var legal = E.legalCards(r, who).map(function (c) { return c.id; });
    var hand = r.players[who].hand;
    if (!hand.length) { box.innerHTML = '<div class="empty-hand">—</div>'; }
    else {
      box.innerHTML = hand.map(function (c) {
        var info = E.SUIT_INFO[c.suit];
        var dis = legal.indexOf(c.id) < 0;
        var cls = 'card ' + info.css + (c.isOneRing ? ' is-one-ring' : '') +
          (S.selected === c.id ? ' selected' : '') + (dis ? ' disabled' : '');
        return '<button type="button" class="' + cls + '" data-id="' + c.id + '"' + (dis ? ' disabled' : '') + '>' +
          '<span class="corner">' + c.rank + '</span><span class="suit-big">' + info.symbol + '</span>' +
          '<span class="corner-br">' + c.rank + '</span><span class="card-name">' +
          (c.isOneRing ? T('oneRing') : suitName(c.suit)) + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(box.querySelectorAll('.card'), function (btn) {
        btn.addEventListener('click', function () {
          if (btn.disabled) return;
          S.selected = S.selected === btn.dataset.id ? null : btn.dataset.id;
          beep(520, 0.05, 'triangle'); renderHand();
        });
      });
    }
    $('playButton').disabled = !(r.phase === 'playing' && r.turnIndex === who && S.selected);
  }

  function renderHint() {
    var r = S.round, el = $('hintLine');
    if (!r) return;
    if (r.phase !== 'playing') { el.textContent = ''; return; }
    if (r.turnIndex !== S.viewHuman) { el.textContent = T('aiThinking').replace('{name}', playerName(r.turnIndex)); return; }
    if (r.ledSuit === null) { el.textContent = T('selectHint'); return; }
    var hand = r.players[S.viewHuman].hand;
    var has = hand.some(function (c) { return c.suit === r.ledSuit; });
    el.textContent = has ? T('followHint').replace('{suit}', suitSym(r.ledSuit) + ' ' + suitName(r.ledSuit)) : T('freeHint');
  }

  /* ---------------- play flow ---------------- */
  function tryPlayHuman() {
    var r = S.round, who = S.viewHuman;
    if (!r || r.phase !== 'playing' || r.turnIndex !== who || !S.selected || S.coach) return;
    var legal = E.legalCards(r, who);
    var card = legal.filter(function (c) { return c.id === S.selected; })[0];
    if (!card) return;
    if (card.isOneRing && r.ledSuit === null && r.ringLocked &&
        r.players[who].hand.some(function (c) { return c.suit !== 'ring'; })) return;
    if (isGuest()) {
      var send = function (use) {
        closeOverlay();
        try { Net.sendIntent(S.net.code, { type: 'play', cardId: card.id, useRingPower: use, seat: S.net.seat }); } catch (e) {}
      };
      if (card.isOneRing) {
        overlay('<div class="modal"><div class="modal-body"><h2>' + T('ringPowerTitle') + '</h2>' +
          '<p>' + T('ringPowerBody') + '</p><div class="actions">' +
          '<button type="button" class="btn btn-primary" id="ringYes">' + T('useIt') + '</button>' +
          '<button type="button" class="btn" id="ringNo">' + T('useAsNormal') + '</button></div></div></div>');
        $('ringYes').addEventListener('click', function () { send(true); });
        $('ringNo').addEventListener('click', function () { send(false); });
        return;
      }
      send(false); return;
    }
    if (card.isOneRing) {
      S.pendingRing = card.id;
      overlay('<div class="modal"><div class="modal-body"><h2>' + T('ringPowerTitle') + '</h2>' +
        '<p>' + T('ringPowerBody') + '</p><div class="actions">' +
        '<button type="button" class="btn btn-primary" id="ringYes">' + T('useIt') + '</button>' +
        '<button type="button" class="btn" id="ringNo">' + T('useAsNormal') + '</button></div></div></div>');
      $('ringYes').addEventListener('click', function () { closeOverlay(); doPlay(who, S.pendingRing, true); S.pendingRing = null; scheduleAI(); });
      $('ringNo').addEventListener('click', function () { closeOverlay(); doPlay(who, S.pendingRing, false); S.pendingRing = null; scheduleAI(); });
      return;
    }
    doPlay(who, card.id, false);
    scheduleAI();
  }

  function doPlay(idx, cardId, useRingPower) {
    var r = S.round;
    var card = r.players[idx].hand.filter(function (c) { return c.id === cardId; })[0];
    if (!card) return;
    var before = r.plays.slice();
    var isHuman = r.humanIndices.indexOf(idx) >= 0;
    log(T('played').replace('{name}', playerName(idx)).replace('{card}', cardText(card)), isHuman ? 'log-gold' : '');
    beep(isHuman ? 620 : 430, 0.07, 'triangle');
    S.selected = null;
    var res = E.playCard(r, idx, cardId, useRingPower);
    if (!res.ok) return;
    if (res.complete) {
      S.lastPlays = before.concat([{ playerIndex: idx, card: card, useRingPower: useRingPower }]);
      S.lastResult = res;
      if (useRingPower) log(T('oneRing') + ' — ' + (S.lang === 'vi' ? 'thắng lượt này' : 'wins this trick'), 'log-gold');
    }
    renderAll();
    if (res.complete) onTrickComplete(res);
  }

  function onTrickComplete(res) {
    log(T('trickWin').replace('{name}', playerName(res.winner)).replace('{n}', res.trick), 'log-gold');
    beep(res.usedRingPower ? 780 : 600, 0.18, 'sine');
    var finish = function () { finishTrick(); };
    if (!S.progress.tutorialDone && S.round.trick === 2 && !isOnline()) {
      S.progress.tutorialDone = true; save();
      startTutorial(['table', 'progress'], finish);
    } else setTimeout(finish, 1400);
  }

  function finishTrick() {
    S.lastPlays = null; S.lastResult = null;
    var r = S.round;
    renderAll();
    if (r.phase === 'roundOver') { showRoundResult(); return; }
    scheduleAI();
  }

  function scheduleAI() {
    var r = S.round;
    if (!r || r.phase !== 'playing') return;
    if (isGuest()) return;                       // host drives the AI
    if (S.coach || overlayOpen() || (S.lastResult && S.lastResult.complete)) return;
    var idx = r.turnIndex;
    if (r.players[idx].isHuman) {
      if (isHost() && idx === 1) { publish(); return; }   // wait for remote player
      if (idx !== S.viewHuman) showHandoff(idx, function () { renderAll(); scheduleAI(); });
      return;
    }
    setTimeout(function () {
      if (!S.round || S.round !== r || r.phase !== 'playing') return;
      if (S.coach || overlayOpen()) { scheduleAI(); return; }
      if (r.turnIndex === idx) {
        var choice = E.chooseAICard(r, idx);
        if (choice) doPlay(idx, choice.card.id, choice.useRingPower);
      }
      scheduleAI();
    }, AI_DELAY);
  }

  function showRoundResult() {
    var r = S.round, ch = chapter();
    var results = E.evaluateRound(r);
    var allOk = results.every(function (x) { return x.complete; });
    if (allOk) {
      var newly = results.map(function (x) { return x.characterId; }).filter(function (id) {
        if (S.longCompleted.indexOf(id) < 0) { S.longCompleted.push(id); return true; }
        return false;
      });
      var rosterDone = ch.victory === 'short' || ch.characters.every(function (id) {
        return S.longCompleted.indexOf(id) >= 0 || id === 'bill';
      });
      if (rosterDone) S.progress.completed.indexOf(ch.id) < 0 && S.progress.completed.push(ch.id);
      S.progress.unlocked = Math.max(S.progress.unlocked, Math.min(18, ch.id + (rosterDone ? 1 : 0)));
      save();
    }
    S.lastOutcome = allOk;
    if (isHost()) S.net.lastOutcomeKey = S.net.code + '-' + S.chapterIndex + '-' + S.roundNo + '-roundOver';
    renderTop();
    var title = allOk ? (rosterDone(ch) ? (ch.id === 18 ? T('journeyDone') : T('chapterDone')) : T('roundWin')) : T('roundFail');
    var body = allOk ? (rosterDone(ch) ? (ch.id === 18 ? T('finalBody') : T('roundWinBody')) : T('roundWinBody')) : T('roundFailBody');
    overlay('<div class="modal" id="resultModal"><div class="modal-art" style="background-image:url(\'assets/' + (ch.art) + '.svg\')"></div>' +
      '<div class="modal-body"><div class="eyebrow">' + T('chapter') + ' ' + ch.id + ' · ' + T('round') + ' ' + S.roundNo + '</div>' +
      '<h2>' + title + '</h2><p>' + body + '</p>' +
      '<div class="goal-result">' + results.map(function (x) {
        return '<div class="' + (x.complete ? 'ok' : 'no') + '">' + L(CHARS[x.characterId].name) + ' — ' + L(CHARS[x.characterId].goal) + ' ' + (x.complete ? '✓' : '✗') + '</div>';
      }).join('') + '</div>' +
      (isGuest() ? '<p>' + T('waitingGuest') + '</p>' : '') +
      '<div class="actions">' +
      (!isGuest() && allOk && !rosterDone(ch) ? '<button type="button" class="btn btn-primary" id="resNextRound">' + T('nextRound') + '</button>' : '') +
      (!isGuest() && allOk && rosterDone(ch) && ch.id < 18 ? '<button type="button" class="btn btn-primary" id="resNext">' + T('continue') + '</button>' : '') +
      (!isGuest() && !allOk ? '<button type="button" class="btn btn-primary" id="resRetry">' + T('retry') + '</button>' : '') +
      '<button type="button" class="btn" id="resMenu">' + T('menu') + '</button></div></div></div>');
    if ($('resNextRound')) $('resNextRound').addEventListener('click', function () { closeOverlay(); S.roundNo++; startRound(); });
    if ($('resNext')) $('resNext').addEventListener('click', function () { closeOverlay(); startChapter(S.chapterIndex + 1); });
    if ($('resRetry')) $('resRetry').addEventListener('click', function () { closeOverlay(); startRound(); });
    $('resMenu').addEventListener('click', function () { closeOverlay(); S.round = null; renderTop(); showTitle(); });
    publish();
  }

  /* ---------------- overlays ---------------- */
  function closeOverlay() { $('overlayRoot').innerHTML = ''; }
  function overlay(html, cls) { $('overlayRoot').innerHTML = '<div class="overlay ' + (cls || '') + '">' + html + '</div>'; }
  function overlayOpen() { return !!document.querySelector('#overlayRoot .overlay'); }

  /* ---------------- online room flow ---------------- */
  function randomCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    for (var i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }
  function noConfig() {
    overlay('<div class="modal"><div class="modal-body"><h2>' + T('onlineMode') + '</h2><p>' +
      T('onlineNoConfig') + '</p><div class="actions"><button type="button" class="btn" id="cfgClose">' + T('close') + '</button></div></div></div>');
    $('cfgClose').addEventListener('click', function () { closeOverlay(); showTitle(); });
  }
  function startHost() {
    if (!Net || !Net.enabled) { noConfig(); return; }
    Net.init().then(function (ok) {
      if (!ok) { noConfig(); return; }
      S.net.role = 'host'; S.net.code = randomCode(); S.net.seat = 0;
      S.progress.humanCount = 2; save();
      S.net.needChoice = null; S.net.shownChoice = null; S.net.lastOutcomeKey = null;
      S.net.autoStarted = false;
      Net.createRoom(S.net.code, { playerCount: S.progress.playerCount, humanCount: 2, created: Date.now(), guestJoined: false })
        .then(function () {
          Net.watchIntents(S.net.code, handleIntent);
          Net.watchMeta(S.net.code, function (meta) {
            if (meta && meta.guestJoined) {
              var wt = $('hostWaitText');
              if (wt) wt.textContent = T('guestJoined');
              if (!S.net.autoStarted) {
                S.net.autoStarted = true;
                if (!S.round) startChapter(0); else closeOverlay();
              }
            }
          });
          overlay('<div class="modal"><div class="modal-body"><div class="eyebrow">' + T('host') + '</div>' +
            '<h2>' + T('shareCode').replace('{code}', S.net.code) + '</h2><p>' + T('onlineNote') + '</p>' +
            '<p id="hostWaitText">' + T('waitingGuest') + '</p><div class="actions"><button type="button" class="btn btn-primary" id="hostStart">' + T('start') + '</button></div></div></div>');
          $('hostStart').addEventListener('click', function () {
            S.net.autoStarted = true;
            closeOverlay(); startChapter(0);
          });
        });
    });
  }
  function joinGuest(code) {
    code = (code || '').trim().toUpperCase();
    if (code.length !== 6) { noConfig(); return; }
    if (!Net || !Net.enabled) { noConfig(); return; }
    Net.init().then(function (ok) {
      if (!ok) { noConfig(); return; }
      Net.joinRoom(code).then(function (meta) {
        if (!meta) { noConfig(); return; }
        S.net.role = 'guest'; S.net.code = code; S.net.seat = 1;
        S.net.needChoice = null; S.net.shownChoice = null; S.net.lastOutcomeKey = null;
        S.progress.playerCount = meta.playerCount || 4;
        S.progress.humanCount = 2;
        try { Net.markGuest(code); } catch (e) {}
        closeOverlay();
        Net.watchState(code, applySnapshot);
        overlay('<div class="modal" id="waitOverlay"><div class="modal-body"><div class="eyebrow">' + T('guest') + '</div>' +
          '<h2>' + T('joinedRoom').replace('{code}', code) + '</h2><p>' + T('waitingGuest') + '</p>' +
          '<div class="actions"><button type="button" class="btn" id="guestWaitClose">' + T('close') + '</button></div></div></div>');
        $('guestWaitClose').addEventListener('click', function () { closeOverlay(); });
      });
    });
  }
  function handleIntent(item) {
    if (!isHost() || !S.round) return;
    var it = item.value || {};
    if (it.seat === 1) {
      if (it.type === 'play' && S.round.phase === 'playing' && S.round.turnIndex === 1) {
        if (S.round.players[1].hand.some(function (c) { return c.id === it.cardId; })) {
          doPlay(1, it.cardId, !!it.useRingPower);
          scheduleAI();
        }
      }
      if (it.type === 'chooseChar' && !S.round.players[1].characterId && CHARS[it.charId]) {
        S.round.players[1].characterId = it.charId;
        var pos = S.pendingChoices.indexOf(1);
        if (pos >= 0) S.pendingChoices.splice(pos, 1);
        S.net.needChoice = null;
        log(humanLabel(1) + ' ' + (S.lang === 'vi' ? 'chọn ' : 'chose ') + L(CHARS[it.charId].name), 'log-gold');
        nextCharacterChoice();
      }
    }
    try { Net.removeIntent(S.net.code, item.key); } catch (e) {}
  }

  function showTitle() {
    var resume = S.progress.unlocked;
    overlay('<div class="modal title-screen"><div class="title-hero" style="background-image:url(\'assets/hero.svg\')">' +
      '<div class="title-hero-text"><h1>' + T('appTitle') + '</h1><p>' + T('appSubtitle') + '</p></div></div>' +
      '<div class="modal-body"><p>' + T('guideIntro') + '</p>' +
      '<h3>' + T('players') + '</h3><div class="pick-row">' +
      '<button type="button" class="pill' + (S.progress.playerCount === 3 ? ' active' : '') + '" data-count="3">' + T('players3') + '</button>' +
      '<button type="button" class="pill' + (S.progress.playerCount === 4 ? ' active' : '') + '" data-count="4">' + T('players4') + '</button></div>' +
      '<h3>' + T('humanCount') + '</h3><div class="pick-row">' +
      '<button type="button" class="pill' + (S.progress.humanCount === 1 ? ' active' : '') + '" data-humans="1">' + T('humans1') + '</button>' +
      '<button type="button" class="pill' + (S.progress.humanCount === 2 ? ' active' : '') + '" data-humans="2">' + T('humans2') + '</button></div>' +
      '<h3>' + T('onlineMode') + '</h3><div class="pick-row">' +
      '<button type="button" class="pill" id="hostBtn">' + T('createRoom') + '</button>' +
      '<input id="roomCodeInput" class="code-input" maxlength="6" placeholder="' + T('roomCode') + '">' +
      '<button type="button" class="pill" id="joinBtn">' + T('joinRoom') + '</button></div>' +
      '<p style="font-size:12px;opacity:.7">' + T('onlineNote') + '</p>' +
      '<h3>18 ' + (S.lang === 'vi' ? 'chương' : 'chapters') + '</h3><div class="stage-grid">' +
      CHAPTERS.map(function (ch, i) {
        var un = ch.id <= S.progress.unlocked;
        return '<button type="button" class="stage-cell' + (S.progress.completed.indexOf(ch.id) >= 0 ? ' active' : '') +
          '" data-stage="' + i + '"' + (un ? '' : ' disabled') + ' title="' + L(ch.title) + '">' + ch.id + '</button>';
      }).join('') + '</div>' +
      '<div class="actions"><button type="button" class="btn btn-primary" id="titleStart">' +
      (S.progress.completed.length ? T('resume').replace('{n}', resume) : T('start')) + '</button>' +
      '<button type="button" class="btn" id="titleGuide">' + T('guide') + '</button>' +
      '<button type="button" class="btn" id="titleTutorial">' + T('tutorial') + '</button></div>' +
      '<p style="font-size:12px;line-height:1.55;opacity:.7;margin-top:16px">' + T('savedNote') + ' ' + T('artNote') + '</p>' +
      '</div></div>');
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (b) {
      b.addEventListener('click', function () {
        S.progress.playerCount = Number(b.dataset.count); save();
        Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (x) { x.classList.remove('active'); });
        b.classList.add('active'); beep(600, 0.06, 'triangle');
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-humans]'), function (b) {
      b.addEventListener('click', function () {
        S.progress.humanCount = Number(b.dataset.humans); save();
        Array.prototype.forEach.call(document.querySelectorAll('[data-humans]'), function (x) { x.classList.remove('active'); });
        b.classList.add('active'); beep(600, 0.06, 'triangle');
      });
    });
    $('hostBtn').addEventListener('click', startHost);
    $('joinBtn').addEventListener('click', function () { joinGuest($('roomCodeInput').value); });
    Array.prototype.forEach.call(document.querySelectorAll('.stage-cell'), function (b) {
      b.addEventListener('click', function () { closeOverlay(); startChapter(Number(b.dataset.stage)); });
    });
    $('titleStart').addEventListener('click', function () { closeOverlay(); startChapter(resume - 1); });
    $('titleGuide').addEventListener('click', function () { showGuide('title'); });
    $('titleTutorial').addEventListener('click', function () {
      closeOverlay();
      startTutorial(I.tutorial.map(function (t) { return t.id; }), function () { showTitle(); });
    });
  }

  function showIntro() {
    var ch = chapter();
    overlay('<div class="modal"><div class="modal-art" style="background-image:url(\'assets/' + ch.art + '.svg\')">' +
      '<button type="button" class="btn btn-ghost modal-close" id="introClose">' + T('close') + '</button></div>' +
      '<div class="modal-body"><div class="eyebrow">' + T('chapter') + ' ' + ch.id + ' / 18</div>' +
      '<h2>' + L(ch.title) + '</h2><p>' + L(ch.story) + '</p>' +
      '<div class="kv"><span>' + (ch.victory === 'long' ? T('victoryLong') : T('victoryShort')) + '</span>' +
      '<span>' + T('threat') + ': ' + (ch.threat === 'black' ? 'Black Rider 1–4' : ch.threat === 'number' ? '1–7' : '—') + '</span>' +
      '<span>' + T('players') + ': ' + S.progress.playerCount + '</span></div>' +
      '<h3>' + (S.lang === 'vi' ? 'Nhân vật chương này' : 'Characters in this chapter') + '</h3>' +
      '<p>' + ch.characters.map(function (id) {
        return L(CHARS[id].name) + (ch.required.indexOf(id) >= 0 ? ' ★' : '');
      }).join(' · ') + '</p>' +
      '<h3>' + (S.lang === 'vi' ? 'Lưu ý đặc biệt' : 'Special note') + '</h3><p>' + L(ch.note) + '</p>' +
      '<div class="actions"><button type="button" class="btn btn-primary" id="introStart">' + T('startRound') + '</button></div>' +
      '</div></div>');
    $('introClose').addEventListener('click', function () { closeOverlay(); showTitle(); });
    $('introStart').addEventListener('click', function () { closeOverlay(); startRound(); });
  }

  function showSetupSummary() {
    var r = S.round;
    overlay('<div class="modal"><div class="modal-body"><h2>' + T('chooseCharacters') + '</h2>' +
      '<p>' + T('setupDone') + '</p>' +
      '<div class="goal-result">' + r.players.map(function (p, i) {
        return '<div><strong>' + (p.isHuman ? humanLabel(i) + ' — ' : '') + L(CHARS[p.characterId].name) +
          '</strong> · ' + L(CHARS[p.characterId].title) +
          (p.threat != null ? ' · ' + T('threat') + ' ' + p.threat : '') +
          '<br><small>' + L(CHARS[p.characterId].goal) + '</small></div>';
      }).join('') + '</div>' +
      '<div class="actions"><button type="button" class="btn btn-primary" id="setupGo">' + T('startRound') + '</button></div>' +
      '</div></div>');
    $('setupGo').addEventListener('click', function () {
      closeOverlay();
      E.startRound(r);
      renderAll();
      var go = function () {
        log((S.lang === 'vi' ? 'Lượt 1 bắt đầu' : 'Trick 1 begins'), 'log-gold');
        renderAll(); scheduleAI();
      };
      if (!S.progress.tutorialDone && S.chapterIndex === 0 && !isOnline()) {
        startTutorial(['welcome', 'lost', 'goals', 'ring', 'hand', 'follow', 'play'], go);
      } else go();
    });
  }

  function showGuide(from) {
    overlay('<div class="modal wide"><button type="button" class="btn btn-ghost modal-close" id="guideClose">' + T('close') + '</button>' +
      '<div class="modal-body"><h2>' + T('guideTitle') + '</h2><div class="guide-grid"><div>' +
      '<h3>1 · ' + (S.lang === 'vi' ? 'Tổng quan' : 'Overview') + '</h3><p>' + T('guideIntro') + '</p>' +
      '<h3>2 · ' + (S.lang === 'vi' ? 'Bộ bài' : 'The deck') + '</h3><p>' + T('guideDeck') + '</p>' +
      '<h3>3 · ' + (S.lang === 'vi' ? 'Một lượt bài' : 'A trick') + '</h3><p>' + T('guideTrick') + '</p>' +
      '</div><div>' +
      '<h3>4 · ' + (S.lang === 'vi' ? 'Chất Nhẫn' : 'The Rings suit') + '</h3><p>' + T('guideRings') + '</p>' +
      '<h3>5 · ' + (S.lang === 'vi' ? 'Mục tiêu' : 'Goals') + '</h3><p>' + T('guideGoals') + '</p>' +
      '<h3>6 · ' + (S.lang === 'vi' ? '18 chương' : '18 chapters') + '</h3><p>' + T('guideChapter') + '</p>' +
      '<h3>7 · ' + (S.lang === 'vi' ? 'Chơi đơn' : 'Solo') + '</h3><p>' + T('guideSolo') + '</p>' +
      '<h3>8 · ' + (S.lang === 'vi' ? 'Phạm vi tái tạo' : 'Scope') + '</h3><p>' + T('guideApprox') + '</p>' +
      '<h3>9 · ' + (S.lang === 'vi' ? 'Quyền riêng tư' : 'Privacy') + '</h3><p>' + T('guidePrivacy') + '</p>' +
      '</div></div><div class="actions"><button type="button" class="btn btn-primary" id="guideTut">' + T('restartTutorial') + '</button></div>' +
      '</div></div>');
    $('guideClose').addEventListener('click', function () { closeOverlay(); if (from === 'title') showTitle(); });
    $('guideTut').addEventListener('click', function () {
      closeOverlay();
      startTutorial(I.tutorial.map(function (t) { return t.id; }), function () { if (from === 'title') showTitle(); else renderAll(); });
    });
  }

  /* ---------------- coach marks ---------------- */
  function startTutorial(ids, onDone) { S.coach = { ids: ids, index: 0, onDone: onDone || null }; renderCoach(); }
  function renderCoach() {
    var root = $('coachRoot');
    root.innerHTML = '';
    if (!S.coach) return;
    var step = I.tutorial.filter(function (t) { return t.id === S.coach.ids[S.coach.index]; })[0];
    if (!step) { endCoach(); return; }
    var txt = L(step), el = document.querySelector(step.target);
    var hole = document.createElement('div');
    hole.className = 'coach-hole';
    if (el) {
      var r = el.getBoundingClientRect(), pad = 7;
      hole.style.left = (r.left - pad) + 'px'; hole.style.top = (r.top - pad) + 'px';
      hole.style.width = (r.width + pad * 2) + 'px'; hole.style.height = (r.height + pad * 2) + 'px';
    } else { hole.style.left = '50%'; hole.style.top = '40%'; hole.style.width = '10px'; hole.style.height = '10px'; }
    var tip = document.createElement('div');
    tip.className = 'coach-tip';
    tip.innerHTML = '<h3>' + txt.title + '</h3><p>' + txt.body + '</p><div class="coach-actions">' +
      '<button type="button" class="coach-skip">' + T('skip') + '</button>' +
      '<span style="display:flex;align-items:center;gap:12px"><span class="coach-counter">' +
      (S.coach.index + 1) + '/' + S.coach.ids.length + '</span>' +
      '<button type="button" class="btn btn-primary coach-next">' + T('next') + '</button></span></div>';
    root.appendChild(hole); root.appendChild(tip);
    var tw = tip.offsetWidth || 360, th = tip.offsetHeight || 160, left, top;
    if (el) {
      var rr = el.getBoundingClientRect();
      left = Math.min(Math.max(12, rr.left), window.innerWidth - tw - 12);
      top = rr.bottom + 16 + th < window.innerHeight - 10 ? rr.bottom + 16 : Math.max(10, rr.top - th - 16);
    } else { left = (window.innerWidth - tw) / 2; top = window.innerHeight * 0.42; }
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
    tip.querySelector('.coach-next').addEventListener('click', function () {
      S.coach.index++;
      if (S.coach.index >= S.coach.ids.length) endCoach(); else renderCoach();
    });
    tip.querySelector('.coach-skip').addEventListener('click', endCoach);
  }
  function endCoach() {
    var done = S.coach && S.coach.onDone;
    S.coach = null; $('coachRoot').innerHTML = '';
    if (done) done();
  }

  /* ---------------- events ---------------- */
  function bind() {
    $('playButton').addEventListener('click', tryPlayHuman);
    $('langBtn').addEventListener('click', function () {
      S.lang = S.lang === 'vi' ? 'en' : 'vi'; save();
      var which = null;
      if (document.querySelector('#overlayRoot .title-screen')) which = 'title';
      else if (document.querySelector('#overlayRoot #introStart')) which = 'intro';
      else if (document.querySelector('#overlayRoot #resultModal')) which = 'result';
      else if (document.querySelector('#overlayRoot #setupGo')) which = 'setup';
      closeOverlay();
      if (which === 'title') showTitle();
      else if (which === 'intro') showIntro();
      else if (which === 'result') showRoundResult();
      else if (which === 'setup') showSetupSummary();
      if (S.coach) renderCoach();
      renderAll();
    });
    $('guideBtn').addEventListener('click', function () { showGuide(null); });
    $('tutorialBtn').addEventListener('click', function () {
      if (S.coach) return;
      startTutorial(I.tutorial.map(function (t) { return t.id; }), function () { renderAll(); scheduleAI(); });
    });
    $('soundBtn').addEventListener('click', function () { S.progress.sound = !S.progress.sound; save(); renderTop(); beep(700, 0.08, 'sine'); });
    $('resetBtn').addEventListener('click', function () {
      if (!window.confirm(S.lang === 'vi' ? 'Xóa toàn bộ tiến trình và bắt đầu lại?' : 'Clear all progress and start over?')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      S.progress = { unlocked: 1, completed: [], lang: S.lang, sound: true, playerCount: 4, humanCount: 1, tutorialDone: false };
      S.round = null; S.coach = null; $('coachRoot').innerHTML = '';
      closeOverlay(); showTitle();
    });
    window.addEventListener('resize', function () { if (S.coach) renderCoach(); });
  }

  load(); bind(); renderAll(); showTitle();
})();
