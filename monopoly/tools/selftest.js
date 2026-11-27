/* selftest.js — node tools/selftest.js */
const path = require('path');
const ROOT = path.join(__dirname, '..');
const B = require(path.join(ROOT, 'js/board.js'));
const CARDS = require(path.join(ROOT, 'js/cards.js'));
const E = require(path.join(ROOT, 'js/engine.js'));

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) pass++; else { fail++; console.log('FAIL: ' + l); } };

console.log('=== data ===');
ok(B.TILES.length === 40, '40 tiles');
ok(B.TILES.filter(t => t.type === 'property').length === 22, '22 properties');
ok(B.TILES.filter(t => t.type === 'railroad').length === 4, '4 railroads');
ok(B.TILES.filter(t => t.type === 'utility').length === 2, '2 utilities');
ok(CARDS.CHANCE.length === 16 && CARDS.CHEST.length === 16, '16+16 cards');
B.TILES.forEach(t => ok(t.id != null && t.name && t.type, 'tile ' + (t.id || '?') + ' complete'));

console.log('=== build options ===');
{
  const s = E.createGame({ seed: 42, players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] });
  const p = s.players[0];
  p.cash = 1000; p.properties = [1, 3];
  const opts = E.buildOptions(s, p, 1);
  ok(opts.length === 5, '5 target levels offered');
  ok(opts[0].level === 1 && opts[4].level === 5, 'levels 1..5');
  ok(opts.every(o => o.cost > 0), 'all costs positive');
  ok(opts[1].enabled === false && opts[1].reason === 'Phải xây đều trong nhóm màu', 'uneven level disabled');
  ok(E.buildTo(s, 1, 1).ok, 'build to level 1');
  ok(E.levelOf(p, 1) === 1, 'level updated');
  p.cash = 0;
  ok(E.buildOptions(s, p, 1).every(o => !o.enabled && o.reason === 'Không đủ tiền'), 'all disabled when broke');
}

console.log('=== tour board ===');
{
  ok(B.TOUR_TILES.length === 32, '32 tour tiles');
  ok(B.TOUR_TILES.filter(t => t.type === 'jail').length === 1, 'exactly one jail tile');
  ok(B.TOUR_TILES.filter(t => t.type === 'gotojail').length === 0, 'no go-to-jail tile');
  ok(E.createGame({ mode: 'classic', players: [] }).eventChance === 0, 'classic has no events');
  const s = E.createGame({ mode: 'tour', seed: 5, players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] });
  ok(s.board === B.TOUR_TILES, 'tour board selected');
  ok(s.maxTurns === 120 && s.eventChance === 0.5, 'tour fast rules');
  ok(s.festivals.length === 2, 'two festival cities');
  B.REGIONS.forEach((_, r) => ok(B.TOUR_TILES.filter(t => t.region === r).length === 8, 'region ' + r + ' has 8 tiles'));
  ok(B.TOUR_TILES.filter(t => t.type === 'resort').length === 4, 'four resorts');
  ok(B.TOUR_TILES.filter(t => t.type === 'chance').length === 4, 'four chance tiles');
  ok(B.TOUR_TILES.filter(t => t.type === 'championship').length === 1 &&
     B.TOUR_TILES.filter(t => t.type === 'worldtour').length === 1, 'championship and world tour tiles');
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(p =>
    ok(B.TOUR_TILES.filter(t => t.pattern === p).length === 3, 'triplet ' + p));
  /* lên nhà theo vòng */
  const p = s.players[0];
  p.properties = [1]; p.pos = 25; p.current = 0; s.current = 0; s.phase = 'roll'; s.rng = () => 0.5;
  const r = E.roll(s);
  ok(r.ok && s.phase === 'build' && s.pending.tile === 1, 'landing on own tile opens build phase');
  p.laps = 0; /* mô phỏng lần ghé đầu tiên */
  let opts = E.buildOptions(s, p, 1);
  ok(opts.filter(o => o.enabled && o.level === 1).length === 1 &&
     opts.filter(o => o.enabled && o.level === 2).length === 1 &&
     !opts.filter(o => o.enabled && o.level === 3).length, 'first visit: choose house 1 or 2');
  E.buildTo(s, 1, 2);
  ok(!E.buildOptions(s, p, 1).filter(o => o.enabled && o.level === 3).length, 'level 3 locked before a lap');
  p.laps = 1;
  ok(E.buildOptions(s, p, 1).filter(o => o.enabled && o.level === 3).length === 1, 'level 3 after another lap');
  s.phase = 'roll'; p.worldTour = true; p.cash = 500;
  ok(E.worldTourTargets(s).length > 0, 'world tour has targets');
  ok(E.useWorldTour(s, 3).ok && !p.worldTour, 'world tour moves and clears card');
}

console.log('=== simulation (200 games, 4 AI) ===');
let wins = {};
for (let n = 0; n < 200; n++) {
  const s = E.createGame({
    seed: 7000 + n * 7919,
    players: [
      { id: 'p1', name: 'Người 1', token: 0 },
      { id: 'p2', name: 'Người 2', token: 1 },
      { id: 'p3', name: 'Người 3', token: 2 },
      { id: 'p4', name: 'Người 4', token: 3 }
    ]
  });
  let guard = 0;
  while (!s.winner && guard++ < 4000) E.aiTurn(s);
  ok(!!s.winner, 'game terminates seed ' + n);
  ok(s.players.every(p => p.cash >= 0), 'no negative cash');
  ok(s.players.every(p => p.pos >= 0 && p.pos < 40), 'positions in range');
  wins[s.winner] = (wins[s.winner] || 0) + 1;
}
console.log('winners:', JSON.stringify(wins));

console.log('\n=== result ===');
console.log('PASS ' + pass + ' / FAIL ' + fail);
if (fail) process.exitCode = 1;
