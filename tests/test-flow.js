// Plays the whole game with a simple bot and checks the rules hold every frame.
// The bot "walks" by teleporting after waiting the time the walk would take.
// seeded random so runs are repeatable
var seed = Number(process.argv[3] || 1);
var seededMath = Object.create(Math);
seededMath.random = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
var ctx = require('./load-game.js')(process.argv[2], { Math: seededMath });
var C = ctx.CONFIG, PR = C.player.radius, CR = C.customers.radius;
var fails = 0, passes = 0;
var failed = {};
function check(name, ok) { if (!ok) { if (!failed[name]) console.log('FAIL ' + name); failed[name] = 1; fails++; } else passes++; }
var quiet = process.argv[4] === 'quiet';


function freshState(cash) {
  return { cash: cash, time: 0, bought: {}, builtAt: {}, machines: {}, carrying: [], stats: { served: 0 },
    customers: [], helpers: [], nextCustomerId: 1, spawnTimer: 2, floaters: [], coins: [],
    player: { x: C.player.startX, y: C.player.startY, radius: PR, faceX: 0, faceY: 1 } };
}
var s = freshState(C.start.cash);
ctx.rebuildSolids(s);

var bot = { busyUntil: 0, plan: null };
function travelTime(x, y) {
  var path = ctx.findPath(s.player.x, s.player.y, x, y);
  if (!path) return 1e9;
  var d = 0, from = s.player;
  path.forEach(function (p) { d += Math.hypot(p.x - from.x, p.y - from.y); from = p; });
  return d / ctx.getPlayerSpeed(s);
}
function go(x, y, what) { bot.busyUntil = s.time + travelTime(x, y); bot.plan = { x: x, y: y, what: what }; }
function wantsSomethingIHave(c) { return c.orders.some(function (o) { return s.carrying.indexOf(o) !== -1; }); }

function botThink() {
  if (s.time < bot.busyUntil) return;
  if (s.padHold) return; // standing on a pad we can buy: wait for the ring to fill
  if (bot.plan) {
    // arrive
    if (bot.plan.what && bot.plan.what.customer) {
      var c = bot.plan.what.customer;
      s.player.x = c.x + 0.6; s.player.y = c.y; // stand next to them (they may have moved)
    } else { s.player.x = bot.plan.x; s.player.y = bot.plan.y; }
    bot.plan = null;
    return;
  }
  // 1. deliver something I'm holding (nearest customer first)
  var wanted = s.customers.filter(wantsSomethingIHave);
  if (wanted.length) { go(wanted[0].x + 0.6, wanted[0].y, { customer: wanted[0] }); return; }
  // 2. buy the cheapest affordable pad (real players buy as soon as they can)
  var pads = ctx.getVisiblePads(s).filter(function (p) { return p.price <= s.cash; })
    .sort(function (a, b) { return a.price - b.price; });
  if (pads.length) {
    // a pad that appeared under our feet needs a step off first (like a real player)
    if (s.padsUnderFeet && s.padsUnderFeet[pads[0].id]) { go(C.player.startX, C.player.startY, null); return; }
    go(pads[0].pad.x + pads[0].pad.w / 2, pads[0].pad.y + pads[0].pad.h / 2, null); return;
  }
  // 3. fetch an item someone ordered
  if (s.carrying.length >= ctx.getCarryLimit(s)) return;
  var orders = [];
  s.customers.forEach(function (c) { c.orders.forEach(function (o) { orders.push(o); }); });
  for (var i = 0; i < orders.length; i++) {
    var item = orders[i];
    if (ctx.countCarried(s, item) >= ctx.countWanted(s, item)) continue;
    var m = ctx.getMachineFor(s, item);
    if (ctx.getMachineState(s, m.id).ready > 0) { go(m.builds.x + m.builds.w / 2, m.builds.y + m.builds.h + PR + 0.05, null); return; }
  }
}

var dt = 1 / 30, log = [], maxTime = 14 * 3600, firstServe = null, milestones = {};
var lastBuyAt = 0, maxGap = 0, maxGapPad = '';
var maxCustomers = 0, vips = 0, combos = 0, seenIds = {};
while (s.time < maxTime && ctx.getVisiblePads(s).length > 0) {
  s.time += dt;
  ctx.updateMachines(s, dt);
  ctx.updateCustomers(s, dt);
  ctx.updateHelpers(s, dt);
  botThink();
  var bought = ctx.tryBuyPads(s, dt);
  if (bought) {
    ctx.repathCustomers(s);
    log.push(bought.id + '@' + (s.time / 60).toFixed(0));
    // the longest wait between two purchases ("always a next pad within a few minutes")
    if (s.time - lastBuyAt > maxGap) { maxGap = s.time - lastBuyAt; maxGapPad = bought.id; }
    lastBuyAt = s.time;
    if (bought.builds.type === 'expansion') milestones[bought.id] = s.time;
  }
  ctx.tryPickup(s);
  var served = ctx.tryDeliver(s);
  if (served && firstServe === null) firstServe = s.time;
  ctx.updateFloaters(s);
  ctx.updateCoins(s, dt);

  // ---- rules that must hold every frame ----
  var seatsNow = ctx.getSeats(s).length;
  maxCustomers = Math.max(maxCustomers, s.customers.length);
  var seated = s.customers.filter(function (c) { return c.seatKey; }).length;
  if (seated > seatsNow) check('never more seat-holding customers than seats', false);
  var claimed = {};
  s.customers.forEach(function (c) {
    if (!seenIds[c.id] && c.ordered.length) { seenIds[c.id] = 1; if (c.vip) vips++; if (c.ordered.length > 1) combos++; }
    if (c.seatKey) { if (claimed[c.seatKey]) check('two customers on one seat', false); claimed[c.seatKey] = 1; }
    if (c.step !== 'leaving' && !c.seatKey) check('customer without a seat before leaving', false);
    c.orders.forEach(function (o) { if (C.menu[o] === undefined) check('ordered an item that does not exist', false); });
    if (c.ordered.length > 2) check('orders are 1 or 2 items', false);
    if (c.ordered.length === 2 && C.menu[c.ordered[0]].kind === C.menu[c.ordered[1]].kind) check('a 2-item order is one drink + one treat', false);
  });
  var q = ctx.getQueue(s).map(function (c) { return c.queueIndex; }).sort();
  q.forEach(function (v, i) { if (v !== i) check('queue places are 0,1,2... (got ' + q.join(',') + ')', false); });
  if (q.length > C.customers.maxQueue) check('queue never longer than maxQueue', false);
  if (s.carrying.length > ctx.getCarryLimit(s)) check('never carry more than allowed', false);
  if (s.cash < 0) check('cash never negative', false);
  s.helpers.forEach(function (h) {
    if (h.carrying !== null && !C.menu[h.carrying]) check('helpers only carry real items', false);
    // a helper never stays busy without moving for long (no getting stuck)
    if (h.step !== 'idle') {
      if (!h.watch || Math.hypot(h.x - h.watch.x, h.y - h.watch.y) > 0.05) h.watch = { x: h.x, y: h.y, t: s.time };
      else if (s.time - h.watch.t > 20) check('helper ' + h.id + ' stuck in ' + h.step + ' at ' + h.x.toFixed(1) + ',' + h.y.toFixed(1), false);
    } else h.watch = null;
  });
  var holdsNow = ctx.getTrayHolds(s);
  Object.keys(s.machines).forEach(function (id) { if (s.machines[id].ready > holdsNow) check('machine tray overfull', false); });
}
var minutes = (s.time / 60).toFixed(0);
var totalEarned = s.cash - C.start.cash + ctx.getBoughtPads(s).reduce(function (sum, p) { return sum + p.price; }, 0);
var helperShare = Math.round(100 * (s.stats.helperEarned || 0) / Math.max(1, totalEarned));
function at(id) { return milestones[id] ? (milestones[id] / 60).toFixed(0) + 'm' : 'never'; }
if (!quiet) console.log('     build timeline (minutes): ' + log.join(' '));
console.log('     seed ' + process.argv[3] + ': bakery ' + at('openBakery') + ', patio ' + at('openPatio') + ', lounge ' + at('openLounge') +
  ', all ' + C.pads.length + ' pads ' + minutes + 'm, longest wait ' + (maxGap / 60).toFixed(1) + 'm | helpers earned ' + helperShare + '% | served ' + s.stats.served + ', first at ' + (firstServe || 0).toFixed(0) +
  's, VIPs ' + vips + ', combos ' + combos + ', max customers ' + maxCustomers);
check('every pad bought (no getting stuck)', ctx.getVisiblePads(s).length === 0);
check('first customer served within 60s', firstServe !== null && firstServe < 60);
check('café part takes 30-90 min (bakery opens at ' + at('openBakery') + ')', milestones.openBakery > 30 * 60 && milestones.openBakery < 90 * 60);
check('whole build takes 8-12 hours for the bot (got ' + minutes + 'm)', s.time > 480 * 60 && s.time < 720 * 60);
check('never more than 10 min between purchases (longest ' + (maxGap / 60).toFixed(1) + 'm, before ' + maxGapPad + ')', maxGap <= 10 * 60);
check('some VIPs and combos happened', vips > 0 && combos > 0);
check('helpers earned part of the money (' + helperShare + '%)', helperShare > 3);

// ---- specific rules, tested directly ----
function fresh() { var t = freshState(0); t.bought = { counter: true, espresso1: true, table1: true }; t.spawnTimer = 0; t.player = { x: 32, y: 22, radius: PR }; return t; }

// no tables -> no customers
var t = fresh(); t.bought = { counter: true, espresso1: true }; ctx.rebuildSolids(t);
for (var k = 0; k < 600; k++) { t.time += 0.05; ctx.updateCustomers(t, 0.05); }
check('no seats: no customers come in', t.customers.length === 0);
// no machine -> no customers
t = fresh(); t.bought = { counter: true, table1: true }; ctx.rebuildSolids(t);
for (k = 0; k < 600; k++) { t.time += 0.05; ctx.updateCustomers(t, 0.05); }
check('no machine: no customers come in', t.customers.length === 0);
// all seats taken -> nobody else enters
t = fresh(); ctx.rebuildSolids(t);
for (k = 0; k < 2400; k++) { t.time += 0.05; ctx.updateMachines(t, 0.05); ctx.updateCustomers(t, 0.05); }
check('2 seats: exactly 2 customers come in and wait (got ' + t.customers.length + ')', t.customers.length === 2);
check('both are seated and waiting', t.customers.every(function (c) { return c.step === 'waiting'; }));
check('they ordered espresso only (only item available, no combos)', t.customers.every(function (c) { return c.orders.join() === 'espresso'; }));
// wrong item is not handed over
var w = t.customers[0]; w.vip = false;
t.player.x = w.x + 0.6; t.player.y = w.y; t.carrying = ['latte'];
check('wrong item: nothing happens', ctx.tryDeliver(t) === null && t.carrying.length === 1 && !w.served && t.cash === 0);
// pickup only what's wanted
t.carrying = [];
var esp = ctx.getPad('espresso1');
t.player.x = esp.builds.x + 0.75; t.player.y = esp.builds.y + esp.builds.h + PR;
t.machines.espresso1.ready = 1;
check('pickup wanted item', ctx.tryPickup(t) === 'espresso' && t.machines.espresso1.ready === 0);
t.machines.espresso1.ready = 1;
check('pickup second (2 wanted)', ctx.tryPickup(t) === 'espresso');
t.machines.espresso1.ready = 1;
check('no pickup beyond what is wanted / carry limit', ctx.tryPickup(t) === null && t.machines.espresso1.ready === 1);
// right item: paid, coins, drinking
t.player.x = w.x + 0.6; t.player.y = w.y;
var cash0 = t.cash;
check('right item is handed over', ctx.tryDeliver(t) === w);
check('customer pays the price', t.cash - cash0 === C.menu.espresso.price);
check('customer starts drinking', w.step === 'drinking' && w.served);
check('coin burst created', t.coins.length >= 3);
check('served count went up', t.stats.served === 1);
// cozy bonus and VIP
t.bought.flowers = true; t.bought.bookshelf = true;
check('cozy bonus raises the price', ctx.getItemPayment(t, 'espresso', false) === Math.round(C.menu.espresso.price * 1.15));
check('VIPs pay more', ctx.getItemPayment(t, 'latte', true) === Math.round(C.menu.latte.price * 1.15 * C.customers.vipPayMultiplier));
delete t.bought.flowers; delete t.bought.bookshelf;
// drinking -> leaving -> gone, seat freed
for (k = 0; k < 800; k++) { t.time += 0.05; ctx.updateMachines(t, 0.05); ctx.updateCustomers(t, 0.05); ctx.updateCoins(t, 0.05); }
check('served customer left and a new one took the seat', t.customers.indexOf(w) === -1 && t.customers.length === 2);
check('coins finished flying', t.coins.length === 0);

// combo order: each item is paid when handed over; served after the last one
var u = fresh(); u.bought.openBakery = true; u.bought.iced = true; u.bought.oven1 = true; ctx.rebuildSolids(u);
var cu = { id: 99, x: 30, y: 21, radius: CR, step: 'waiting', seatKey: 'table1:L', vip: false,
  ordered: ['espresso', 'croissant'], orders: ['espresso', 'croissant'], served: false, timer: 0, path: [], target: null, faceX: 1, faceY: 0 };
u.customers = [cu];
u.player.x = 30.6; u.player.y = 21; u.carrying = ['croissant'];
var cash1 = u.cash;
check('combo: first item handed over and paid', ctx.tryDeliver(u) === cu && u.cash - cash1 === C.menu.croissant.price && !cu.served && cu.orders.join() === 'espresso');
check('combo: still waiting for the drink', cu.step === 'waiting' && u.stats.served === 0);
u.carrying = ['espresso'];
check('combo: second item completes the order', ctx.tryDeliver(u) === cu && cu.served && cu.step === 'drinking' && u.stats.served === 1);
// pickOrder makes combos once treats exist, never two of a kind
var kinds = {}, n2 = 0;
for (k = 0; k < 400; k++) { var o = ctx.pickOrder(u); if (o.length === 2) { n2++; kinds[C.menu[o[0]].kind + '+' + C.menu[o[1]].kind] = 1; } }
check('combos happen roughly comboChance of the time (' + n2 + '/400)', n2 > 400 * C.customers.comboChance * 0.6 && n2 < 400 * C.customers.comboChance * 1.4);
check('combos are always drink + treat', Object.keys(kinds).join() === 'drink+treat');
// opening an area removes the wall between
var v = fresh(); ctx.rebuildSolids(v);
var gap = C.areas[1].openings[0];
check('bakery door is a wall before opening', ctx.isBlocked(gap.x + gap.w / 2, gap.y + gap.h / 2, 0.2));
v.bought.openBakery = true; ctx.rebuildSolids(v);
check('bakery door is open after buying it', !ctx.isBlocked(gap.x + gap.w / 2, gap.y + gap.h / 2, 0.2));
check('bakery walls appear once open', ctx.isBlocked(5.8, 18, 0.1));

// ---- upgrades ----
var up = fresh(); ctx.rebuildSolids(up);
var espPad = ctx.getPad('espresso1'), lvl = C.upgrades;
check('a new machine is level 1', ctx.getMachineLevel(up, 'espresso1') === 1);
up.bought.espressoLv2 = true; up.bought.espressoLv3 = true;
check('two level-ups make it level 3', ctx.getMachineLevel(up, 'espresso1') === 3);
check('levels raise the price', Math.abs(ctx.getItemPrice(up, 'espresso') - C.menu.espresso.price * (1 + 2 * lvl.levelPricePlus / 100)) < 1e-9);
check('levels raise the payment', ctx.getItemPayment(up, 'espresso', false) === Math.round(C.menu.espresso.price * (1 + 2 * lvl.levelPricePlus / 100)));
check('levels make brewing faster', Math.abs(ctx.getBrewSeconds(up, espPad) - C.menu.espresso.brewSeconds * Math.pow(1 - lvl.levelBrewMinus / 100, 2)) < 1e-9);
check('other machines keep their level', ctx.getMachineLevel(up, 'cappuccino') === 1);
// a level-3 machine really brews faster in the game loop
up.machines.espresso1 = { ready: 0, timer: 0 };
ctx.updateMachines(up, ctx.getBrewSeconds(up, espPad) + 0.001);
check('updateMachines uses the faster brew time', up.machines.espresso1.ready === 1);
// barista upgrades
check('base carry / speed / trays', ctx.getCarryLimit(up) === C.player.carry && ctx.getPlayerSpeed(up) === C.player.speed && ctx.getTrayHolds(up) === C.machine.holds);
up.bought.carry3 = true; up.bought.shoes1 = true; up.bought.trays2 = true;
check('carry upgrade: one more item', ctx.getCarryLimit(up) === C.player.carry + 1);
check('shoes: walk 10% faster', Math.abs(ctx.getPlayerSpeed(up) - C.player.speed * 1.1) < 1e-9);
check('bigger trays: one more ready', ctx.getTrayHolds(up) === C.machine.holds + 1);
up.machines.espresso1 = { ready: 0, timer: 0 };
for (k = 0; k < 400; k++) ctx.updateMachines(up, 0.1);
check('machine fills the bigger tray, then stops', up.machines.espresso1.ready === C.machine.holds + 1);
// carrying 3 with the upgrade
up.customers = [];
for (k = 0; k < 3; k++) up.customers.push({ id: 50 + k, x: 30, y: 21, radius: CR, step: 'waiting', seatKey: 'x' + k, vip: false,
  ordered: ['espresso'], orders: ['espresso'], served: false, timer: 0, path: [], target: null });
up.carrying = []; up.machines.espresso1.ready = 3;
up.player.x = espPad.builds.x + 0.75; up.player.y = espPad.builds.y + espPad.builds.h + PR;
var picked = 0; for (k = 0; k < 5; k++) if (ctx.tryPickup(up)) picked++;
check('carry upgrade: picks up 3 (got ' + picked + ')', picked === 3);
// requires lists: a level-up only shows once its machine AND the previous upgrade are bought
var rq = fresh(); rq.bought.cappuccino = true; rq.bought.espressoLv2 = true; rq.bought.espressoLv3 = true;
rq.bought.cappuccinoLv2 = true; rq.bought.espressoLv4 = true; rq.bought.cappuccinoLv3 = true; rq.bought.helperCafe = true;
var latteUp = ctx.getPad('latteLv2');
check('Latte ★2 hidden without the latte machine', !ctx.isPadVisible(rq, latteUp));
rq.bought.latte = true;
check('Latte ★2 shows once the latte machine is built', ctx.isPadVisible(rq, latteUp));

// one step on an upgrade spot buys ONE upgrade, even when the next one appears under your feet
var ch = fresh(); ch.bought.cappuccino = true; ch.cash = 1e6; ctx.rebuildSolids(ch);
var spot = ctx.getPad('espressoLv2').pad;
ch.player.x = spot.x + spot.w / 2; ch.player.y = spot.y + spot.h / 2;
var hold = C.buy.holdSeconds;
ctx.tryBuyPads(ch, hold * 0.5);
check('half the hold time: not bought yet, ring half full', !ch.bought.espressoLv2 && Math.abs(ctx.getPadHoldProgress(ch, ctx.getPad('espressoLv2')) - 0.5) < 1e-9);
ctx.tryBuyPads(ch, hold * 0.6);
check('full hold time: bought', ch.bought.espressoLv2 && !ch.padHold);
for (k = 0; k < 100; k++) ctx.tryBuyPads(ch, hold);
check('one step buys one upgrade, not the whole chain', ch.bought.espressoLv2 && !ch.bought.espressoLv3);
ch.player.y += 3; ctx.tryBuyPads(ch, 0.1); // step off...
ch.player.y -= 3;                          // ...and back on
ctx.tryBuyPads(ch, hold * 0.9);
ch.player.y += 3; ctx.tryBuyPads(ch, 0.1); // stepping off before the ring is full...
ch.player.y -= 3;
check('...empties the ring', !ch.padHold && !ch.bought.espressoLv3);
ctx.tryBuyPads(ch, hold * 0.6);
check('ring starts over after stepping off', !ch.bought.espressoLv3);
ctx.tryBuyPads(ch, hold * 0.6);
check('stepping off and on again buys the next one', ch.bought.espressoLv3 && !ch.bought.cappuccinoLv2);
var broke = fresh(); broke.bought.cappuccino = true; broke.cash = 0; ctx.rebuildSolids(broke);
broke.player.x = spot.x + spot.w / 2; broke.player.y = spot.y + spot.h / 2;
ctx.tryBuyPads(broke, hold * 2);
check('too poor: the ring does not fill', !broke.padHold && !broke.bought.espressoLv2);

// ---- helpers ----
function withHelper() {
  var t = fresh(); t.bought.cappuccino = true; t.bought.helperCafe = true; t.spawnTimer = 1e9;
  ctx.rebuildSolids(t); ctx.syncHelpers(t);
  return t;
}
var hs = withHelper();
check('buying the hire pad makes one helper at home', hs.helpers.length === 1 && hs.helpers[0].x === ctx.getPad('helperCafe').builds.x);
ctx.syncHelpers(hs);
check('no duplicate helpers', hs.helpers.length === 1);
// a waiting customer + a ready espresso: the helper fetches and serves it
var seatsH = ctx.getSeats(hs);
// a brand-new seated customer who wants one espresso
function waitingCustomer() {
  return { id: 7, x: seatsH[0].x, y: seatsH[0].y, radius: CR, step: 'waiting', seatKey: seatsH[0].key, vip: false,
    ordered: ['espresso'], orders: ['espresso'], served: false, timer: 0, path: [], target: null, faceX: 1, faceY: 0 };
}
var hc = waitingCustomer();
hs.customers = [hc];
hs.machines.espresso1 = { ready: 1, timer: 0 }; hs.machines.cappuccino = { ready: 1, timer: 0 };
hs.player.x = 40; hs.player.y = 22; // the barista stays out of it
var cashH = hs.cash, wrongPicked = false;
for (k = 0; k < 30 * 40 && !hc.served; k++) {
  hs.time += 1 / 30; ctx.updateHelpers(hs, 1 / 30);
  if (hs.helpers[0].carrying && hs.helpers[0].carrying !== 'espresso') wrongPicked = true;
}
check('helper serves a waiting customer on their own', hc.served && hs.cash - cashH === C.menu.espresso.price);
check('helper only picks up what was ordered (not the cappuccino)', !wrongPicked && hs.machines.cappuccino.ready === 1);
check('helper earnings are counted', hs.stats.helperEarned === C.menu.espresso.price);
check('helper is empty-handed afterwards', hs.helpers[0].carrying === null);
// barista first: if the barista already holds the item, the helper doesn't fetch another
var hb = withHelper(); hb.player.x = 40; hb.player.y = 22;
var hc2 = waitingCustomer(); hb.customers = [hc2];
hb.machines.espresso1 = { ready: 1, timer: 0 }; hb.carrying = ['espresso'];
for (k = 0; k < 30 * 10; k++) { hb.time += 1 / 30; ctx.updateHelpers(hb, 1 / 30); }
check('no double fetching when the barista already has it', hb.machines.espresso1.ready === 1 && hb.helpers[0].carrying === null && hc2.orders.length === 1);
// helper holding an item nobody wants any more keeps it, and serves the next customer who orders it
var hk = withHelper(); hk.player.x = 40; hk.player.y = 22; hk.helpers[0].carrying = 'espresso';
for (k = 0; k < 30 * 3; k++) { hk.time += 1 / 30; ctx.updateHelpers(hk, 1 / 30); }
check('an unwanted item is kept, not thrown away', hk.helpers[0].carrying === 'espresso');
hk.customers = [waitingCustomer()];
for (k = 0; k < 30 * 40 && !hk.customers[0].served; k++) { hk.time += 1 / 30; ctx.updateHelpers(hk, 1 / 30); }
check('...and handed to the next customer who orders it', hk.customers[0].served);
// two helpers never fetch the same single order
var h2 = withHelper(); h2.bought.openBakery = true; h2.bought.oven1 = true; h2.bought.btable1 = true;
h2.bought.croissantLv2 = true; h2.bought.helperBakery = true; ctx.rebuildSolids(h2); ctx.syncHelpers(h2);
h2.player.x = 40; h2.player.y = 22;
h2.customers = [waitingCustomer()]; h2.machines.espresso1 = { ready: 2, timer: 0 };
var maxHeld = 0;
for (k = 0; k < 30 * 40; k++) {
  h2.time += 1 / 30; ctx.updateHelpers(h2, 1 / 30);
  var held = h2.helpers.filter(function (h) { return h.carrying === 'espresso'; }).length;
  maxHeld = Math.max(maxHeld, held);
}
check('two helpers: only one fetches a single order', h2.helpers.length === 2 && maxHeld === 1 && h2.machines.espresso1.ready >= 1);
// helper speed upgrade
var hsp = withHelper();
check('helper base speed', ctx.getHelperSpeed(hsp) === C.helpers.speed);
hsp.bought.helperShoes1 = true;
check('helper sneakers: 25% faster', Math.abs(ctx.getHelperSpeed(hsp) - C.helpers.speed * 1.25) < 1e-9);

console.log(passes + ' flow checks passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
