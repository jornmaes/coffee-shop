// =============================================================
// world.js — walls, collision, buy pads, machines, seats and
// the cozy bonus. (Customers live in customers.js.)
// =============================================================

// ---------- Walls and collision ----------

// Build the list of wall rectangles from the plot settings.
// Each wall is { x, y, w, h }. The bottom wall has a gap for the door.
function getWallRects() {
  var p = CONFIG.plot;
  var t = p.wallThickness;
  var doorLeft = p.x + (p.width - p.doorWidth) / 2;
  var doorRight = doorLeft + p.doorWidth;

  return [
    { x: p.x - t,        y: p.y - t,        w: p.width + t * 2,               h: t },            // top
    { x: p.x - t,        y: p.y,            w: t,                             h: p.height + t }, // left
    { x: p.x + p.width,  y: p.y,            w: t,                             h: p.height + t }, // right
    { x: p.x - t,        y: p.y + p.height, w: doorLeft - (p.x - t),          h: t },            // bottom-left
    { x: doorRight,      y: p.y + p.height, w: p.x + p.width + t - doorRight, h: t },            // bottom-right
  ];
}

// Just the walls (never change). render.js draws these.
var wallRects = getWallRects();

// All solid rectangles nobody can walk through: the walls plus every
// solid item that has been built. Rebuilt whenever something is bought.
var solidRects = wallRects.slice();

// Recalculate solidRects from the walls and the bought items.
// Also rebuilds the customers' walking map (path.js), since it depends on this.
function rebuildSolids(state) {
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

// Is this pad on the floor right now? (not bought yet, and the pad it
// depends on has been bought)
function isPadVisible(state, pad) {
  if (state.bought[pad.id]) return false;
  return pad.requires === null || !!state.bought[pad.requires];
}

// List of pads currently on the floor.
function getVisiblePads(state) {
  return CONFIG.pads.filter(function (pad) { return isPadVisible(state, pad); });
}

// Check if the player is standing on a pad they can afford, and buy it.
// Returns the pad that was bought, or null.
function tryBuyPads(state) {
  var player = state.player;
  // the player counts as "on" a pad once their middle half overlaps it
  var reach = player.radius * 0.5;
  var pads = getVisiblePads(state);

  for (var i = 0; i < pads.length; i++) {
    var pad = pads[i];
    if (!overlapsRect(player.x, player.y, reach, pad.pad)) continue;
    if (state.cash < pad.price) continue; // not enough yet: nothing happens, no penalty

    state.cash -= pad.price;
    state.bought[pad.id] = true;
    state.builtAt[pad.id] = state.time; // remembered for the pop-in animation
    rebuildSolids(state);

    // a little floating "-25" above the pad (nothing for free pads)
    if (pad.price > 0) {
      addFloater(state, '-' + pad.price, pad.pad.x + pad.pad.w / 2, pad.pad.y, CONFIG.colors.spend);
    }
    return pad;
  }
  return null;
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

// ---------- Machines and drinks ----------

// All built machines.
function getBuiltMachines(state) {
  return getBoughtPads(state).filter(function (pad) { return pad.builds.type === 'machine'; });
}

// The drinks customers can order right now (one per built machine).
function getAvailableDrinks(state) {
  var drinks = [];
  getBuiltMachines(state).forEach(function (pad) {
    if (drinks.indexOf(pad.builds.drink) === -1) drinks.push(pad.builds.drink);
  });
  return drinks;
}

// A machine's live status: { ready: drinks waiting on the tray, timer: seconds brewed }
function getMachineState(state, padId) {
  if (!state.machines[padId]) state.machines[padId] = { ready: 0, timer: 0 };
  return state.machines[padId];
}

// Let every machine brew. A machine works on one drink at a time and
// stops once its tray is full (CONFIG.machine.holds).
function updateMachines(state, dt) {
  getBuiltMachines(state).forEach(function (pad) {
    var ms = getMachineState(state, pad.id);
    if (ms.ready >= CONFIG.machine.holds) { ms.timer = 0; return; }
    ms.timer += dt;
    var brewTime = CONFIG.drinks[pad.builds.drink].brewSeconds;
    if (ms.timer >= brewTime) {
      ms.timer = 0;
      ms.ready += 1;
    }
  });
}

// How many customers are waiting for this drink (ordered, not served yet)?
function countWanted(state, drinkId) {
  return state.customers.filter(function (c) {
    return c.order === drinkId && !c.served;
  }).length;
}

// How many of this drink is the barista holding?
function countCarried(state, drinkId) {
  return state.carrying.filter(function (d) { return d === drinkId; }).length;
}

// Is the player close enough to touch this rectangle?
function playerCanReach(state, rect) {
  var p = state.player;
  return overlapsRect(p.x, p.y, p.radius + CONFIG.player.reach, rect);
}

// Pick up a finished drink when the barista walks up to a machine.
// Only picks up drinks that someone ordered and that the barista isn't
// already bringing, so walking past machines never fills your hands
// with drinks nobody wants. Returns the drink id, or null.
function tryPickup(state) {
  if (state.carrying.length >= CONFIG.player.carry) return null;
  var machines = getBuiltMachines(state);

  for (var i = 0; i < machines.length; i++) {
    var pad = machines[i];
    var drink = pad.builds.drink;
    var ms = getMachineState(state, pad.id);
    if (ms.ready <= 0 || !playerCanReach(state, pad.builds)) continue;
    if (countWanted(state, drink) <= countCarried(state, drink)) continue;

    ms.ready -= 1;
    state.carrying.push(drink);
    return drink;
  }
  return null;
}

// ---------- Seats ----------

// All seats at built tables. A table with 2 seats has a chair on its
// left and right side. Each seat: { key, x, y, faceX } (faceX = which
// way the sitter looks: 1 = right, toward the table on their right).
function getSeats(state) {
  var seats = [];
  var off = CONFIG.customers.seatOffset;
  getBoughtPads(state).forEach(function (pad) {
    var b = pad.builds;
    if (b.type !== 'table') return;
    var cy = b.y + b.h / 2;
    seats.push({ key: pad.id + ':L', x: b.x - off, y: cy, faceX: 1 });
    if (b.seats >= 2) seats.push({ key: pad.id + ':R', x: b.x + b.w + off, y: cy, faceX: -1 });
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

// What a customer pays for a drink, including the cozy bonus.
function getDrinkPayment(state, drinkId) {
  return Math.round(CONFIG.drinks[drinkId].price * (1 + getCozyBonus(state) / 100));
}
