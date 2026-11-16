// =============================================================
// world.js — areas and walls, collision, buy pads, machines,
// seats and the cozy bonus. (Customers live in customers.js.)
// =============================================================

// ---------- Small helpers ----------

// Short, friendly numbers: 950, 1.2K, 12K, 3.4M.
function formatNumber(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  var units = [[1e6, 'M'], [1e3, 'K']];
  for (var i = 0; i < units.length; i++) {
    if (n >= units[i][0]) {
      var v = n / units[i][0];
      // one decimal for small values (1.2K), none for bigger ones (12K)
      var text = v < 10 ? (Math.floor(v * 10) / 10).toString() : String(Math.floor(v));
      return text + units[i][1];
    }
  }
  return String(n);
}

// ---------- Areas ----------

// Find an area's config by its id.
function getArea(id) {
  for (var i = 0; i < CONFIG.areas.length; i++) {
    if (CONFIG.areas[i].id === id) return CONFIG.areas[i];
  }
  return null;
}

// Is this area open? (the café always is; the others once their pad is bought)
function isAreaOpen(state, area) {
  return area.opensWith === null || !!state.bought[area.opensWith];
}

// ---------- Walls and collision ----------

// The wall rectangles of one area, one per side listed in area.walls.
// Corners overlap a little, which is fine.
function getAreaWalls(area) {
  var t = CONFIG.wallThickness;
  var sides = {
    top:    { x: area.x - t,      y: area.y - t,      w: area.w + t * 2, h: t },
    bottom: { x: area.x - t,      y: area.y + area.h, w: area.w + t * 2, h: t },
    left:   { x: area.x - t,      y: area.y - t,      w: t,              h: area.h + t * 2 },
    right:  { x: area.x + area.w, y: area.y - t,      w: t,              h: area.h + t * 2 },
  };
  return area.walls.map(function (side) {
    var r = sides[side];
    return { x: r.x, y: r.y, w: r.w, h: r.h, style: area.wallStyle };
  });
}

// Cut a door-sized gap out of a wall. Returns the 0, 1 or 2 pieces left.
// Walls are long and thin, so we only cut along their long side.
function cutWall(wall, gap) {
  var e = TOUCH_TOLERANCE;
  var touches = gap.x < wall.x + wall.w - e && gap.x + gap.w > wall.x + e &&
                gap.y < wall.y + wall.h - e && gap.y + gap.h > wall.y + e;
  if (!touches) return [wall];
  var pieces = [];
  if (wall.w >= wall.h) {
    // horizontal wall: keep the parts left and right of the gap
    if (gap.x > wall.x) pieces.push({ x: wall.x, y: wall.y, w: gap.x - wall.x, h: wall.h, style: wall.style });
    var right = gap.x + gap.w;
    if (right < wall.x + wall.w) pieces.push({ x: right, y: wall.y, w: wall.x + wall.w - right, h: wall.h, style: wall.style });
  } else {
    // vertical wall: keep the parts above and below the gap
    if (gap.y > wall.y) pieces.push({ x: wall.x, y: wall.y, w: wall.w, h: gap.y - wall.y, style: wall.style });
    var bottom = gap.y + gap.h;
    if (bottom < wall.y + wall.h) pieces.push({ x: wall.x, y: bottom, w: wall.w, h: wall.y + wall.h - bottom, style: wall.style });
  }
  return pieces;
}

// All walls right now: the walls of every open area, with the doors of
// every open area cut out of them.
function getWallRects(state) {
  var walls = [], gaps = [];
  CONFIG.areas.forEach(function (area) {
    if (!isAreaOpen(state, area)) return;
    walls = walls.concat(getAreaWalls(area));
    gaps = gaps.concat(area.openings || []);
  });
  gaps.forEach(function (gap) {
    var cut = [];
    walls.forEach(function (w) { cut = cut.concat(cutWall(w, gap)); });
    walls = cut;
  });
  return walls;
}

// Just the walls (render.js draws these). Rebuilt when an area opens.
var wallRects = [];

// All solid rectangles nobody can walk through: the walls plus every
// solid item that has been built.
var solidRects = [];

// Recalculate the walls and solidRects from what has been bought.
// Also rebuilds the customers' walking map (path.js), since it depends on this.
function rebuildSolids(state) {
  wallRects = getWallRects(state);
  solidRects = wallRects.slice(); // .slice() makes a copy, so wallRects stays walls-only
  getBoughtPads(state).forEach(function (pad) {
    var b = pad.builds;
    if (b.solid) solidRects.push({ x: b.x, y: b.y, w: b.w, h: b.h });
  });
  buildNavGrid();
}

// Tiny tolerance for rounding errors. Computers can't store numbers like
// 0.35 exactly, so "just touching" a wall can look like overlapping it by
// 0.0000000000000004. Overlaps smaller than this don't count.
var TOUCH_TOLERANCE = 1e-6;

// Does a square of half-size r centered at (x, y) overlap the rectangle?
function overlapsRect(x, y, r, rect) {
  var e = TOUCH_TOLERANCE;
  return x + r > rect.x + e && x - r < rect.x + rect.w - e &&
         y + r > rect.y + e && y - r < rect.y + rect.h - e;
}

// Is a square of half-size r at (x, y) touching any solid thing?
function isBlocked(x, y, r) {
  for (var i = 0; i < solidRects.length; i++) {
    if (overlapsRect(x, y, r, solidRects[i])) return true;
  }
  return false;
}

// Move an entity (anything with x, y, radius) by dx, dy tiles,
// stopping it at walls and items and at the edge of the world.
// We move one axis at a time; that way you slide along walls
// instead of getting stuck when walking into them diagonally.
function moveWithCollision(ent, dx, dy) {
  var r = ent.radius;
  var i, rect;

  // --- horizontal (only if we're actually moving sideways) ---
  if (dx !== 0) {
    ent.x += dx;
    for (i = 0; i < solidRects.length; i++) {
      rect = solidRects[i];
      if (overlapsRect(ent.x, ent.y, r, rect)) {
        // push back out on the side we came from
        ent.x = dx > 0 ? rect.x - r : rect.x + rect.w + r;
      }
    }
  }

  // --- vertical (only if we're actually moving up/down) ---
  if (dy !== 0) {
    ent.y += dy;
    for (i = 0; i < solidRects.length; i++) {
      rect = solidRects[i];
      if (overlapsRect(ent.x, ent.y, r, rect)) {
        ent.y = dy > 0 ? rect.y - r : rect.y + rect.h + r;
      }
    }
  }

  // --- stay inside the world ---
  ent.x = Math.max(r, Math.min(CONFIG.world.width - r, ent.x));
  ent.y = Math.max(r, Math.min(CONFIG.world.height - r, ent.y));
}

// ---------- Buy pads ----------

// All pads that have been bought, in config order.
function getBoughtPads(state) {
  return CONFIG.pads.filter(function (pad) { return state.bought[pad.id]; });
}

// Find a pad's config by its id.
function getPad(id) {
  for (var i = 0; i < CONFIG.pads.length; i++) {
    if (CONFIG.pads[i].id === id) return CONFIG.pads[i];
  }
  return null;
}

// The ids of the pads this pad needs, as a list. In config, "requires" is
// null (nothing), one id ('latte') or a list of ids (['latte', 'cafeUp4']).
function getRequires(pad) {
  if (pad.requires === null) return [];
  if (Array.isArray(pad.requires)) return pad.requires;
  return [pad.requires];
}

// Is this pad on the floor right now? (not bought yet, and every pad it
// depends on has been bought)
function isPadVisible(state, pad) {
  if (state.bought[pad.id]) return false;
  return getRequires(pad).every(function (id) { return !!state.bought[id]; });
}

// List of pads currently on the floor.
function getVisiblePads(state) {
  return CONFIG.pads.filter(function (pad) { return isPadVisible(state, pad); });
}

// Check if the player is standing on a pad they can afford, and buy it
// once they've stood there for CONFIG.buy.holdSeconds (a ring fills up
// around the pad meanwhile; see state.padHold). Returns the pad that was
// bought, or null.
function tryBuyPads(state, dt) {
  var player = state.player;
  // the player counts as "on" a pad once their middle half overlaps it
  var reach = player.radius * 0.5;
  var pads = getVisiblePads(state);
  // Pads that popped up right under the barista's feet (the next upgrade on
  // the same spot) wait until the barista steps off them once. Otherwise
  // standing still would buy a whole chain of upgrades in a row.
  if (!state.padsUnderFeet) state.padsUnderFeet = {};

  // find the pad the barista is standing on and can buy right now
  var target = null;
  for (var i = 0; i < pads.length; i++) {
    var pad = pads[i];
    if (!overlapsRect(player.x, player.y, reach, pad.pad)) {
      delete state.padsUnderFeet[pad.id]; // stepped off: it can be bought next time
      continue;
    }
    if (state.padsUnderFeet[pad.id]) continue;
    if (state.cash < pad.price) continue; // not enough yet: nothing happens, no penalty
    target = pad;
    break;
  }

  // nothing to buy: the ring empties
  if (!target) { state.padHold = null; return null; }

  // keep standing on the same pad to fill the ring; a different pad starts over
  if (!state.padHold || state.padHold.id !== target.id) state.padHold = { id: target.id, seconds: 0 };
  state.padHold.seconds += dt;
  if (state.padHold.seconds < CONFIG.buy.holdSeconds) return null;

  // bought!
  state.padHold = null;
  state.cash -= target.price;
  state.bought[target.id] = true;
  state.builtAt[target.id] = state.time; // remembered for the pop-in animation
  rebuildSolids(state);
  // remember the new pads that just appeared under the barista
  getVisiblePads(state).forEach(function (next) {
    if (overlapsRect(player.x, player.y, reach, next.pad)) state.padsUnderFeet[next.id] = true;
  });

  // a little floating "-25" above the pad (nothing for free pads)
  if (target.price > 0) {
    addFloater(state, '-' + formatNumber(target.price), target.pad.x + target.pad.w / 2, target.pad.y, CONFIG.colors.spend);
  }
  return target;
}

// How full the "buying" ring around a pad is: 0 (empty) to 1 (bought).
function getPadHoldProgress(state, pad) {
  if (!state.padHold || state.padHold.id !== pad.id) return 0;
  return Math.min(1, state.padHold.seconds / CONFIG.buy.holdSeconds);
}

// ---------- Floating texts ----------

// Add a floating text (like "-25", "+8" or "♥") at a world position.
function addFloater(state, text, x, y, color) {
  state.floaters.push({ text: text, x: x, y: y, color: color, born: state.time });
}

// Remove floating texts that have finished their animation.
function updateFloaters(state) {
  var life = CONFIG.effects.floatTextTime;
  state.floaters = state.floaters.filter(function (f) {
    return state.time - f.born < life;
  });
}

// ---------- Machines and the menu ----------

// All built machines (and ovens, blenders...: anything that makes an item).
function getBuiltMachines(state) {
  return getBoughtPads(state).filter(function (pad) { return !!pad.builds.makes; });
}

// The built machine that makes this item (or null).
function getMachineFor(state, itemId) {
  var list = getBuiltMachines(state);
  for (var i = 0; i < list.length; i++) {
    if (list[i].builds.makes === itemId) return list[i];
  }
  return null;
}

// The items customers can order right now (one per built machine).
function getAvailableMenu(state) {
  var items = [];
  getBuiltMachines(state).forEach(function (pad) {
    if (items.indexOf(pad.builds.makes) === -1) items.push(pad.builds.makes);
  });
  return items;
}

// A machine's live status: { ready: items waiting on the tray, timer: seconds brewed }
function getMachineState(state, padId) {
  if (!state.machines[padId]) state.machines[padId] = { ready: 0, timer: 0 };
  return state.machines[padId];
}

// Let every machine brew. A machine works on one item at a time and
// stops once its tray is full (see getTrayHolds).
function updateMachines(state, dt) {
  var holds = getTrayHolds(state);
  var levelUps = getLevelUps(state);
  getBuiltMachines(state).forEach(function (pad) {
    var ms = getMachineState(state, pad.id);
    if (ms.ready >= holds) { ms.timer = 0; return; }
    ms.timer += dt;
    var brewTime = getBrewSeconds(state, pad, levelUps);
    if (ms.timer >= brewTime) {
      ms.timer = 0;
      ms.ready += 1;
    }
  });
}

// How many of this item are customers still waiting for?
// (c.orders holds the items a customer ordered but hasn't received yet)
function countWanted(state, itemId) {
  var n = 0;
  state.customers.forEach(function (c) {
    c.orders.forEach(function (o) { if (o === itemId) n++; });
  });
  return n;
}

// How many of this item are the barista and the helpers holding?
function countCarried(state, itemId) {
  var n = state.carrying.filter(function (d) { return d === itemId; }).length;
  (state.helpers || []).forEach(function (h) {
    if (h.carrying === itemId) n++;
  });
  return n;
}

// Is the player close enough to touch this rectangle?
function playerCanReach(state, rect) {
  var p = state.player;
  return overlapsRect(p.x, p.y, p.radius + CONFIG.player.reach, rect);
}

// Pick up a finished item when the barista walks up to a machine.
// Only picks up items that someone ordered and that the barista isn't
// already bringing, so walking past machines never fills your hands
// with things nobody wants. Returns the item id, or null.
function tryPickup(state) {
  if (state.carrying.length >= getCarryLimit(state)) return null;
  var machines = getBuiltMachines(state);

  for (var i = 0; i < machines.length; i++) {
    var pad = machines[i];
    var item = pad.builds.makes;
    var ms = getMachineState(state, pad.id);
    if (ms.ready <= 0 || !playerCanReach(state, pad.builds)) continue;
    if (countWanted(state, item) <= countCarried(state, item)) continue;

    ms.ready -= 1;
    state.carrying.push(item);
    return item;
  }
  return null;
}

// ---------- Seats ----------

// All seats at built tables (anything with "seats" in its config).
// 2 seats = a chair left and right; 4 seats = also one above and below.
// Each seat: { key, x, y, faceX, faceY } (face = which way the sitter looks).
function getSeats(state) {
  var seats = [];
  var off = CONFIG.customers.seatOffset;
  getBoughtPads(state).forEach(function (pad) {
    var b = pad.builds;
    if (!b.seats) return;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    seats.push({ key: pad.id + ':L', x: b.x - off, y: cy, faceX: 1, faceY: 0 });
    seats.push({ key: pad.id + ':R', x: b.x + b.w + off, y: cy, faceX: -1, faceY: 0 });
    if (b.seats >= 4) {
      seats.push({ key: pad.id + ':T', x: cx, y: b.y - off, faceX: 0, faceY: 1 });
      seats.push({ key: pad.id + ':B', x: cx, y: b.y + b.h + off, faceX: 0, faceY: -1 });
    }
  });
  return seats;
}

// Seats that nobody has claimed yet (customers claim one when they walk in).
function getFreeSeats(state) {
  var taken = {};
  state.customers.forEach(function (c) { if (c.seatKey) taken[c.seatKey] = true; });
  return getSeats(state).filter(function (s) { return !taken[s.key]; });
}

// ---------- Cozy bonus ----------

// Total cozy bonus in percent from all bought decorations.
function getCozyBonus(state) {
  return getBoughtPads(state).reduce(function (sum, pad) {
    return sum + (pad.builds.cozy || 0);
  }, 0);
}

// ---------- Upgrades ----------
// Upgrade pads don't build anything you can see on the floor: their effect
// is added up from the bought pads, just like the cozy bonus. That way the
// list of bought pads (already in the save) is all we need to remember.

// Add up one number field (like carryPlus) over all bought upgrade pads.
function sumUpgrades(state, field) {
  return getBoughtPads(state).reduce(function (sum, pad) {
    return sum + (pad.builds.type === 'upgrade' ? (pad.builds[field] || 0) : 0);
  }, 0);
}

// Level-up counts for all machines in one go: { espresso1: 2, latte: 1, ... }
// (only machines with at least one level-up are listed).
function getLevelUps(state) {
  var ups = {};
  getBoughtPads(state).forEach(function (pad) {
    var m = pad.builds.machine;
    if (pad.builds.type === 'upgrade' && m) ups[m] = (ups[m] || 0) + 1;
  });
  return ups;
}

// A machine's level: 1 when built, +1 for every level-up pad bought for it.
function getMachineLevel(state, machinePadId) {
  return 1 + (getLevelUps(state)[machinePadId] || 0);
}

// Seconds this machine needs to make one item. Each level above 1 makes it
// CONFIG.upgrades.levelBrewMinus percent faster.
// (levelUps is optional: pass getLevelUps(state) when looping over machines.)
function getBrewSeconds(state, machinePad, levelUps) {
  var ups = (levelUps || getLevelUps(state))[machinePad.id] || 0;
  var factor = Math.pow(1 - CONFIG.upgrades.levelBrewMinus / 100, ups);
  return CONFIG.menu[machinePad.builds.makes].brewSeconds * factor;
}

// The price of one item (before cozy bonus and VIPs). Each level of the
// machine that makes it adds CONFIG.upgrades.levelPricePlus percent.
function getItemPrice(state, itemId) {
  var machine = getMachineFor(state, itemId);
  var level = machine ? getMachineLevel(state, machine.id) : 1;
  return CONFIG.menu[itemId].price * (1 + CONFIG.upgrades.levelPricePlus * (level - 1) / 100);
}

// How many items the barista can hold at once.
function getCarryLimit(state) {
  return CONFIG.player.carry + sumUpgrades(state, 'carryPlus');
}

// The barista's walking speed, in tiles per second.
function getPlayerSpeed(state) {
  return CONFIG.player.speed * (1 + sumUpgrades(state, 'speedPlus') / 100);
}

// A helper's walking speed, in tiles per second (faster with helper shoes).
function getHelperSpeed(state) {
  return CONFIG.helpers.speed * (1 + sumUpgrades(state, 'helperSpeedPlus') / 100);
}

// How many finished items each machine keeps ready on its tray.
function getTrayHolds(state) {
  return CONFIG.machine.holds + sumUpgrades(state, 'trayPlus');
}

// What a customer pays for one item, including machine levels, the cozy
// bonus (and the VIP multiplier for ★ customers).
function getItemPayment(state, itemId, vip) {
  var pay = getItemPrice(state, itemId) * (1 + getCozyBonus(state) / 100);
  if (vip) pay *= CONFIG.customers.vipPayMultiplier;
  return Math.round(pay);
}
