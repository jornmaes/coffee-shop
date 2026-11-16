// Checks the shop layout in config.js: overlaps, build order, labels, areas, reachability.
var ctx = require('./load-game.js')(process.argv[2]);
var C = ctx.CONFIG, PR = C.player.radius, CR = C.customers.radius;
var fails = 0, passes = 0;
function check(name, ok) { if (!ok) { console.log('FAIL ' + name); fails++; } else passes++; }
function overlap(a, b) { return a.x < b.x + b.w - 1e-9 && a.x + a.w > b.x + 1e-9 && a.y < b.y + b.h - 1e-9 && a.y + a.h > b.y + 1e-9; }
function insideRect(a, r) { return a.x >= r.x - 1e-9 && a.y >= r.y - 1e-9 && a.x + a.w <= r.x + r.w + 1e-9 && a.y + a.h <= r.y + r.h + 1e-9; }
function areaOf(a) { for (var i = 0; i < C.areas.length; i++) if (insideRect(a, C.areas[i])) return C.areas[i]; return null; }
function box(x, y, r) { return { x: x - r, y: y - r, w: 2 * r, h: 2 * r }; }
function fresh() { return { cash: 0, time: 0, bought: {}, builtAt: {}, machines: {}, carrying: [], stats: { served: 0 },
  customers: [], nextCustomerId: 1, spawnTimer: 0, floaters: [], coins: [],
  player: { x: C.player.startX, y: C.player.startY, radius: PR } }; }
// pads that put something on the floor (expansions open an area, upgrades improve things)
var isItem = function (p) { return p.builds.type !== 'expansion' && p.builds.type !== 'upgrade'; };
// approximate label box above a pad (font 0.45 tiles, ~0.26 tiles per character)
function labelBox(p) {
  var text = p.name + (p.builds.cozy ? '  ♥+' + p.builds.cozy + '%' : '');
  var w = text.length * 0.25 + 0.5, h = 0.65;
  return { x: p.pad.x + p.pad.w / 2 - w / 2, y: p.pad.y - h - 0.15, w: w, h: h };
}

var byId = {};
C.pads.forEach(function (p) { check('unique id ' + p.id, !byId[p.id]); byId[p.id] = p; });

// ---- build order ----
// every pad that must be bought before p shows up (requires can be a list).
// Returns null if a required pad is missing or the requires form a loop.
function ancestors(p) {
  var list = [], seen = {}, ok = true;
  function visit(q, path) {
    ctx.getRequires(q).forEach(function (id) {
      if (!byId[id] || path[id]) { ok = false; return; }
      if (seen[id]) return;
      seen[id] = 1; list.push(id);
      var next = Object.create(path); next[id] = 1;
      visit(byId[id], next);
    });
  }
  var start = {}; start[p.id] = 1;
  visit(p, start);
  return ok ? list : null;
}
C.pads.forEach(function (p) {
  check(p.id + ': requires exists', ctx.getRequires(p).every(function (id) { return !!byId[id]; }));
  check(p.id + ': no loop in requires', ancestors(p) !== null);
});
check('exactly one starting pad', C.pads.filter(function (p) { return p.requires === null; }).length === 1);
function canBeVisibleTogether(a, b) {
  return ancestors(a).indexOf(b.id) === -1 && ancestors(b).indexOf(a.id) === -1;
}
function stateWith(ids) { var s = fresh(); ids.forEach(function (id) { s.bought[id] = true; }); return s; }

// ---- areas ----
C.areas.forEach(function (a) {
  check('area ' + a.id + ': opener exists', a.opensWith === null || (byId[a.opensWith] && byId[a.opensWith].builds.area === a.id));
  check('area ' + a.id + ': inside world', a.x >= 1 && a.y >= 1 && a.x + a.w <= C.world.width - 1 && a.y + a.h <= C.world.height - 1);
  C.areas.forEach(function (b) { if (a.id < b.id) check('areas ' + a.id + '/' + b.id + ' do not overlap', !overlap(a, b)); });
});

// ---- menu ----
C.pads.forEach(function (p) {
  if (p.builds.makes) check(p.id + ': menu item exists', !!C.menu[p.builds.makes]);
  if (p.builds.type === 'expansion') check(p.id + ': opens a real area', !!ctx.getArea(p.builds.area));
  if (p.builds.machine) {
    var m = byId[p.builds.machine];
    check(p.id + ': levels up a real machine', !!m && !!m.builds.makes);
    check(p.id + ': only shows once its machine is built', !!m && ancestors(p).indexOf(m.id) !== -1);
    check(p.id + ': sits in the same area as its machine', !!m && areaOf(p.pad) === areaOf(m.builds));
  }
});
Object.keys(C.menu).forEach(function (id) {
  var d = C.menu[id];
  check(id + ': has price/brew/popularity/look/kind', d.price > 0 && d.brewSeconds > 0 && d.popularity > 0 && d.look && d.machineColor && (d.kind === 'drink' || d.kind === 'treat'));
  check(id + ': has a machine', C.pads.some(function (p) { return p.builds.makes === id; }));
});

// ---- positions ----
var items = C.pads.filter(isItem);
var standing = items.filter(function (p) { return !p.builds.floor && !p.builds.onWall; }); // things on the floor you could cover a pad with
C.pads.forEach(function (p) {
  // the pad must be in an area that is open whenever the pad is visible
  var pa = areaOf(p.pad);
  check(p.id + ': pad inside an area', !!pa);
  if (pa) check(p.id + ': pad\'s area (' + pa.id + ') is open when the pad shows', ctx.isAreaOpen(stateWith(ancestors(p)), pa));
  if (isItem(p)) {
    var ia = areaOf(p.builds);
    check(p.id + ': item inside an area', p.builds.onWall || !!ia);
    if (ia) check(p.id + ': item\'s area is open once bought', ctx.isAreaOpen(stateWith(ancestors(p).concat([p.id])), ia));
    var cx = p.pad.x + p.pad.w / 2, cy = p.pad.y + p.pad.h / 2;
    check(p.id + ': its item does not appear on a player standing on its pad', !p.builds.solid || !overlap(box(cx, cy, PR), p.builds));
    check(p.id + ': item not on the player start spot', !p.builds.solid || !overlap(box(C.player.startX, C.player.startY, PR), p.builds));
  }
  standing.forEach(function (q) {
    if (q !== p) check(p.id + ' pad vs ' + q.id + ' item', !overlap(p.pad, q.builds));
    if (q !== p && p.builds.solid && q.builds.solid && p.id < q.id) check(p.id + ' item vs ' + q.id + ' item', !overlap(p.builds, q.builds));
  });
  C.pads.forEach(function (q) {
    if (q.id > p.id && canBeVisibleTogether(p, q)) {
      check(p.id + ' pad vs ' + q.id + ' pad (can show together)', !overlap(p.pad, q.pad));
      check(p.id + ' label vs ' + q.id + ' label', !overlap(labelBox(p), labelBox(q)));
    }
    if (q !== p && canBeVisibleTogether(p, q)) check(p.id + ' label vs ' + q.id + ' pad', !overlap(labelBox(p), q.pad));
  });
});

// everything built
var all = fresh();
C.pads.forEach(function (p) { all.bought[p.id] = true; });
ctx.rebuildSolids(all);
var seats = ctx.getSeats(all);
var queue = []; for (var i = 0; i < C.customers.maxQueue; i++) queue.push(ctx.queueSpot(i));
console.log('     pads: ' + C.pads.length + ', seats: ' + seats.length + ', machines: ' + ctx.getBuiltMachines(all).length + ', cozy total: +' + ctx.getCozyBonus(all) + '%');

seats.forEach(function (s) {
  check('seat ' + s.key + ' not blocked', !ctx.isBlocked(s.x, s.y, CR));
  check('seat ' + s.key + ' inside an area', !!areaOf(box(s.x, s.y, CR)));
  C.pads.forEach(function (p) { check('seat ' + s.key + ' not on pad ' + p.id, !overlap(box(s.x, s.y, CR), p.pad)); });
  seats.forEach(function (t) { if (t.key > s.key) check('seats ' + s.key + '/' + t.key + ' apart', !overlap(box(s.x, s.y, CR), box(t.x, t.y, CR))); });
});
queue.forEach(function (q, i) {
  check('queue spot ' + i + ' not blocked', !ctx.isBlocked(q.x, q.y, CR));
  C.pads.forEach(function (p) {
    // the counter pad is only there before anyone can queue
    if (p.id !== 'counter') check('queue spot ' + i + ' not on pad ' + p.id, !overlap(box(q.x, q.y, CR), p.pad));
  });
  seats.forEach(function (s) { check('queue spot ' + i + ' not on seat ' + s.key, !overlap(box(q.x, q.y, CR), box(s.x, s.y, CR))); });
});

// ---- customers can walk everywhere they need to ----
function checkPaths(label, state) {
  ctx.rebuildSolids(state);
  var sp = { x: C.customers.spawnX, y: C.customers.spawnY };
  var points = [{ n: 'door', p: sp }].concat(queue.map(function (q, i) { return { n: 'queue' + i, p: q }; }));
  ctx.getSeats(state).forEach(function (s) { points.push({ n: 'seat ' + s.key, p: s }); });
  points.forEach(function (a) {
    var path = ctx.findPath(sp.x, sp.y, a.p.x, a.p.y);
    check(label + ': door -> ' + a.n, !!path);
    if (path && path.length > 1) {
      var from = sp, ok = true;
      path.slice(0, -1).forEach(function (pt) { if (!ctx.hasClearLine(from, pt)) ok = false; from = pt; });
      check(label + ': door -> ' + a.n + ' path is clear', ok);
    }
    check(label + ': ' + a.n + ' -> door', !!ctx.findPath(a.p.x, a.p.y, sp.x, sp.y));
  });
}
checkPaths('all built', all);
checkPaths('minimal', stateWith(['counter', 'espresso1', 'table1']));
// each area right after it opens, with only its first table
['btable1', 'ptable1', 'lchairs1'].forEach(function (id) { checkPaths('stage ' + id, stateWith(ancestors(byId[id]).concat([id]))); });

// ---- the barista can reach things (flood fill from the start spot) ----
function floodFrom(state) {
  ctx.rebuildSolids(state);
  var step = 0.25, cols = Math.ceil(C.world.width / step), rows = Math.ceil(C.world.height / step);
  // blocked cells for the barista, by stamping each solid rect (fast)
  var blocked = new Uint8Array(cols * rows);
  ctx.solidRects.forEach(function (rect) {
    var c0 = Math.max(0, Math.floor((rect.x - PR) / step - 1)), c1 = Math.min(cols - 1, Math.ceil((rect.x + rect.w + PR) / step));
    var r0 = Math.max(0, Math.floor((rect.y - PR) / step - 1)), r1 = Math.min(rows - 1, Math.ceil((rect.y + rect.h + PR) / step));
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
      if (ctx.overlapsRect((c + 0.5) * step, (r + 0.5) * step, PR, rect)) blocked[r * cols + c] = 1;
    }
  });
  var reach = new Uint8Array(cols * rows), list = [], q = [];
  var sc = Math.floor(C.player.startX / step), sr = Math.floor(C.player.startY / step);
  reach[sr * cols + sc] = 1; q.push(sr * cols + sc);
  while (q.length) {
    var id = q.pop(), cc = id % cols, rr = (id - cc) / cols;
    list.push({ x: (cc + 0.5) * step, y: (rr + 0.5) * step });
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < 4; k++) {
      var c = cc + nb[k][0], r = rr + nb[k][1];
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      var n = r * cols + c;
      if (reach[n] || blocked[n]) continue;
      reach[n] = 1; q.push(n);
    }
  }
  return function (test) { return list.some(function (p) { return test(p.x, p.y); }); };
}
var reachable = floodFrom(all);
ctx.getBuiltMachines(all).forEach(function (m) {
  check('barista can reach machine ' + m.id, reachable(function (x, y) { return ctx.overlapsRect(x, y, PR + C.player.reach, m.builds); }));
});
seats.forEach(function (s) {
  var near = PR + CR + C.player.reach;
  check('barista can hand over to seat ' + s.key, reachable(function (x, y) { return (x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) < near * near; }));
});
// every pad, at the moment it appears (only its ancestors built) AND with everything else built
C.pads.forEach(function (p) {
  var onPad = function (x, y) { return ctx.overlapsRect(x, y, PR * 0.5, p.pad); };
  check('barista can reach pad ' + p.id + ' when it appears', floodFrom(stateWith(ancestors(p)))(onPad));
  var others = fresh(); C.pads.forEach(function (q) { if (q !== p) others.bought[q.id] = true; });
  check('barista can reach pad ' + p.id + ' with everything else built', floodFrom(others)(onPad));
});

console.log(passes + ' layout checks passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
