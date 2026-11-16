// =============================================================
// world.js — the solid parts of the world and collision.
// Later parts add buy pads, buildings and the register here.
// =============================================================

// Build the list of wall rectangles (in tiles) from the plot settings.
// Each wall is { x, y, w, h }. The bottom wall has a gap for the door.
function getWallRects() {
  var p = CONFIG.plot;
  var t = p.wallThickness;
  var doorLeft = p.x + (p.width - p.doorWidth) / 2;
  var doorRight = doorLeft + p.doorWidth;

  return [
    { x: p.x - t,        y: p.y - t,        w: p.width + t * 2,             h: t },            // top
    { x: p.x - t,        y: p.y,            w: t,                           h: p.height + t }, // left
    { x: p.x + p.width,  y: p.y,            w: t,                           h: p.height + t }, // right
    { x: p.x - t,        y: p.y + p.height, w: doorLeft - (p.x - t),        h: t },            // bottom-left
    { x: doorRight,      y: p.y + p.height, w: p.x + p.width + t - doorRight, h: t },          // bottom-right
  ];
}

// Just the walls (never change). render.js draws these.
var wallRects = getWallRects();

// All solid rectangles the player can't walk through: the walls plus
// every solid item that has been built. Rebuilt whenever something is bought.
// (Only for collision; items are drawn by drawBuiltItems, not as walls.)
var solidRects = wallRects.slice();

// Recalculate solidRects from the walls and the bought items.
function rebuildSolids(state) {
  solidRects = wallRects.slice(); // .slice() makes a copy, so wallRects stays walls-only
  for (var i = 0; i < CONFIG.pads.length; i++) {
    var pad = CONFIG.pads[i];
    var b = pad.builds;
    if (state.bought[pad.id] && b.solid) {
      solidRects.push({ x: b.x, y: b.y, w: b.w, h: b.h });
    }
  }
}

// ---------- Buy pads ----------

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

// Add a floating text (like "-25" or "+3") at a world position.
function addFloater(state, text, x, y, color) {
  state.floaters.push({ text: text, x: x, y: y, color: color, born: state.time });
}

// ---------- Machines and the register ----------

// Has the register appeared yet? (it comes with the counter)
function isRegisterBuilt(state) {
  return !!state.bought[CONFIG.register.requires];
}

// All built machines (items that have a "brew" setting).
function getBuiltMachines(state) {
  return CONFIG.pads.filter(function (pad) {
    return state.bought[pad.id] && pad.builds.brew;
  });
}

// Total coins per second from all built machines (shown in the HUD).
function getIncomePerSecond(state) {
  return getBuiltMachines(state).reduce(function (sum, pad) {
    return sum + pad.builds.brew.coins / pad.builds.brew.seconds;
  }, 0);
}

// Let every machine brew. Each one has its own timer; when the timer
// reaches its brew time, its coins go into the register.
function updateMachines(state, dt) {
  if (!isRegisterBuilt(state)) return;
  var cap = CONFIG.register.cap;
  var machines = getBuiltMachines(state);

  for (var i = 0; i < machines.length; i++) {
    var pad = machines[i];
    var brew = pad.builds.brew;

    // a full register pauses the machines (nothing is wasted)
    if (state.register >= cap) return;

    var timer = (state.brewTimers[pad.id] || 0) + dt;
    // "while" instead of "if", in case a long frame covers several brews
    while (timer >= brew.seconds && state.register < cap) {
      timer -= brew.seconds;
      state.register = Math.min(cap, state.register + brew.coins);
      addFloater(state, '+' + brew.coins,
        pad.builds.x + pad.builds.w / 2, pad.builds.y, CONFIG.colors.earn);
    }
    state.brewTimers[pad.id] = timer;
  }
}

// If the player is standing on the golden mat, move the register's
// coins into their cash. Returns how many coins were collected.
function tryCollect(state) {
  if (!isRegisterBuilt(state) || state.register <= 0) return 0;
  var player = state.player;
  if (!overlapsRect(player.x, player.y, player.radius * 0.5, CONFIG.register.mat)) return 0;

  var amount = state.register;
  state.cash += amount;
  state.register = 0;
  var mat = CONFIG.register.mat;
  addFloater(state, '+' + amount, mat.x + mat.w / 2, mat.y, CONFIG.colors.earn);
  return amount;
}

// Remove floating texts that have finished their animation.
function updateFloaters(state) {
  var life = CONFIG.effects.floatTextTime;
  state.floaters = state.floaters.filter(function (f) {
    return state.time - f.born < life;
  });
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

// Move an entity (anything with x, y, radius) by dx, dy tiles,
// stopping it at walls and at the edge of the world.
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
