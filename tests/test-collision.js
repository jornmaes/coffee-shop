// Checks walking and collision against the walls of the café (and the area doors).
var ctx = require('./load-game.js')(process.argv[2]);
var C = ctx.CONFIG, move = ctx.moveWithCollision, P = C.areas[0], T = C.wallThickness, R = C.player.radius;
var fails = 0;
function check(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fails++; }
function walk(ent, vx, vy, seconds) { // simulate 60fps
  for (var t = 0; t < seconds; t += 1 / 60) move(ent, vx * C.player.speed / 60, vy * C.player.speed / 60);
  return ent;
}
function p(x, y) { return { x: x, y: y, radius: R }; }
var st = { bought: {}, builtAt: {}, customers: [] };
ctx.rebuildSolids(st); // a new game: just the café walls

var inX = P.x + 4, inY = P.y + 5; // a spot inside the café, away from doors
var a = walk(p(C.player.startX, C.player.startY), 0, -1, 5);
check('top wall stops player (y=' + a.y.toFixed(3) + ')', Math.abs(a.y - (P.y + R)) < 1e-9);
var b = walk(p(inX, inY), -1, 0, 5);
check('left wall stops player', Math.abs(b.x - (P.x + R)) < 1e-9);
var c = walk(p(inX, inY), 1, 0, 10);
check('right wall stops player', Math.abs(c.x - (P.x + P.w - R)) < 1e-9);
var d = walk(p(inX, inY), 0, 1, 5);
check('bottom wall (away from door) stops player', Math.abs(d.y - (P.y + P.h - R)) < 1e-9);
var e = walk(p(C.player.startX, C.player.startY), 0, 1, 5);
check('player walks out through the door (y=' + e.y.toFixed(2) + ')', e.y > P.y + P.h + T);
check('world bottom edge holds', Math.abs(e.y - (C.world.height - R)) < 1e-9);
var f = walk(p(inX, inY), -Math.SQRT1_2, Math.SQRT1_2, 5);
check('diagonal into corner stops in corner', Math.abs(f.x - (P.x + R)) < 1e-9 && Math.abs(f.y - (P.y + P.h - R)) < 1e-9);
var g = walk(p(P.x + 2, inY), -Math.SQRT1_2, 0.3, 0.5);
check('slides along left wall while moving diagonally', g.y > inY);
var h = walk(p(1, 1), -1, -1, 2);
check('world top-left edge holds', h.x === R && h.y === R);
var i = walk(p(P.x + 2, P.y + P.h + 3), 0, -1, 5);
check('outside: bottom wall blocks from below', i.y >= P.y + P.h + T + R - 1e-9);

// area doors: closed until the area is bought, then you can walk through
var door = C.areas[1].openings[0]; // bakery door in the café's left wall
var doorY = door.y + door.h / 2;
var j = walk(p(inX, doorY), -1, 0, 5);
check('bakery door is a wall before opening', Math.abs(j.x - (P.x + R)) < 1e-9);
st.bought.openBakery = true; ctx.rebuildSolids(st);
var k = walk(p(inX, doorY), -1, 0, 6);
check('walk into the bakery once it is open (x=' + k.x.toFixed(2) + ')', k.x < P.x - 1);
check('bakery left wall stops the player', Math.abs(k.x - (C.areas[1].x + R)) < 1e-9);
process.exit(fails ? 1 : 0);
