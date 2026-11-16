// Tests save.js with a fake localStorage.
var store = {}, broken = false;
var fakeStorage = {
  getItem: function (k) { if (broken) throw new Error('SecurityError'); return k in store ? store[k] : null; },
  setItem: function (k, v) { if (broken) throw new Error('QuotaExceededError'); store[k] = String(v); },
  removeItem: function (k) { delete store[k]; },
};
var ctx = require('./load-game.js')(process.argv[2], { localStorage: fakeStorage });
var C = ctx.CONFIG, R = C.player.radius;
var fails = 0, passes = 0;
function check(name, ok) { if (!ok) { console.log('FAIL ' + name); fails++; } else passes++; }
function fresh() {
  return { cash: C.start.cash, time: 0, bought: {}, builtAt: {}, machines: {}, carrying: [], stats: { served: 0, helperEarned: 0 },
           customers: [], nextCustomerId: 1, spawnTimer: 2, floaters: [], coins: [],
           player: { x: C.player.startX, y: C.player.startY, radius: R, faceX: 0, faceY: 1 } };
}
function load(obj) {
  store = {}; if (obj !== undefined) store.coffeeShopSave = typeof obj === 'string' ? obj : JSON.stringify(obj);
  var s = fresh(); ctx.rebuildSolids(s); var r = ctx.loadGame(s); return { s: s, r: r };
}

// --- round trip ---
var a = fresh();
a.cash = 321.5; a.bought = { counter: true, espresso1: true, table1: true };
a.machines = { espresso1: { ready: 1, timer: 0 } }; a.carrying = ['espresso']; a.stats.served = 7;
a.player.x = 20; a.player.y = 11;
a.customers.push({ id: 1 }); a.floaters.push({}); a.coins.push({});
check('saveGame returns true', ctx.saveGame(a) === true);
var saved = JSON.parse(store.coffeeShopSave);
check('save has version 3 + lastSeen', saved.saveVersion === 3 && typeof saved.lastSeen === 'number');
check('customers/effects not saved', !('customers' in saved) && !('floaters' in saved) && !('coins' in saved) && !('builtAt' in saved));
var b = fresh(); ctx.rebuildSolids(b); ctx.loadGame(b);
check('cash restored', b.cash === 321.5);
check('bought restored', b.bought.counter && b.bought.espresso1 && b.bought.table1 && !b.bought.table2);
check('machine restored', b.machines.espresso1.ready === 1);
check('carrying restored', b.carrying.length === 1 && b.carrying[0] === 'espresso');
check('served count restored', b.stats.served === 7);
check('player position restored', b.player.x === 20 && b.player.y === 11);
check('loaded items are solid', ctx.solidRects.length === ctx.wallRects.length + 3);
check('no customers after loading', b.customers.length === 0);
check('helper earnings restored', b.stats.helperEarned === 0 && load({ stats: { served: 1, helperEarned: 1234.5 } }).s.stats.helperEarned === 1234.5);
check('bad helper earnings ignored', load({ stats: { served: 1, helperEarned: -5 } }).s.stats.helperEarned === 0 &&
  load({ stats: { served: 1, helperEarned: 'lots' } }).s.stats.helperEarned === 0);

// --- your Part 5 save (version 1) still loads ---
var v1 = load({ saveVersion: 1, cash: 40, register: 27, bought: { counter: true, espresso1: true, espresso2: true, table1: true },
  brewTimers: { espresso1: 1.5 }, player: { x: 18, y: 6.6 }, lastSeen: 123 });
check('v1: register coins moved into cash (40 + 27)', v1.s.cash === 67);
check('v1: removed pad (espresso2) dropped, others kept', v1.s.bought.counter && v1.s.bought.espresso1 && v1.s.bought.table1 && !('espresso2' in v1.s.bought));
check('v1: old brewTimers ignored, machines start fresh', Object.keys(v1.s.machines).length === 0);

// --- no save / bad saves ---
var n = load(undefined);
check('no save: returns null, defaults kept', n.r === null && n.s.cash === C.start.cash);
var c = load('{not json!!');
check('corrupt JSON: defaults kept', c.r === null && c.s.cash === C.start.cash && Object.keys(c.s.bought).length === 0);
check('JSON null / number: ignored', load('null').r === null && load('42').r === null);
var junk = load({ cash: 'lots', bought: 'yes', machines: [1], carrying: 'latte', stats: { served: 'x' }, player: { x: 'a' } });
check('junk values ignored', junk.s.cash === C.start.cash && Object.keys(junk.s.bought).length === 0 &&
  junk.s.carrying.length === 0 && junk.s.stats.served === 0 && junk.s.player.x === C.player.startX);
var neg = load({ cash: -50, register: -10 });
check('negative cash -> 0, negative register ignored', neg.s.cash === 0);
var mach = load({ bought: { counter: true, espresso1: true }, machines: {
  espresso1: { ready: 99, timer: 1e9 }, latte: { ready: 1, timer: 0 }, counter: { ready: 1 } } });
check('machine values clamped', mach.s.machines.espresso1.ready === C.machine.holds && mach.s.machines.espresso1.timer === C.menu.espresso.brewSeconds);
check('unbought machine / non-machine ignored', !('latte' in mach.s.machines) && !('counter' in mach.s.machines));
var carry = load({ carrying: ['latte', 'poison', 42, 'espresso', 'mocha'] });
check('carrying: only real drinks, max carry', carry.s.carrying.join() === 'latte,espresso');
var counter = ctx.getPad('counter').builds;
var inWall = load({ saveVersion: 3, bought: { counter: true }, player: { x: counter.x + 1, y: counter.y + 0.5 } });
check('player inside an item -> start position', inWall.s.player.x === C.player.startX);
var grass = load({ saveVersion: 3, player: { x: 3, y: 18 } });
check('player on the grass outside is kept', grass.s.player.x === 3 && grass.s.player.y === 18);

var oldMap = load({ saveVersion: 2, cash: 50, player: { x: 16, y: 13 } });
check('v2 save (old map): position dropped, barista at the door', oldMap.s.player.x === C.player.startX && oldMap.s.player.y === C.player.startY && oldMap.s.cash === 50);

// --- storage blocked/full ---
broken = true;
try { check('save with broken storage returns false', ctx.saveGame(fresh()) === false); }
catch (e) { check('save with broken storage does not throw', false); }
try { check('load with broken storage returns null', ctx.loadGame(fresh()) === null); }
catch (e) { check('load with broken storage does not throw', false); }
broken = false;
store.coffeeShopSave = 'x'; ctx.deleteSave();
check('deleteSave removes the save', !('coffeeShopSave' in store));

console.log(passes + ' save checks passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
