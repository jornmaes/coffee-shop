// =============================================================
// save.js — saving and loading progress with localStorage.
//
// localStorage is a small storage box in the browser that keeps text
// even after the page is closed. We turn the important parts of the
// game state into JSON text and store it under one key.
// =============================================================

var SAVE_KEY = 'coffeeShopSave';

// Bump this when the save format changes in a way that needs converting.
// loadGame() fills in anything missing, so adding new fields doesn't need a bump.
var SAVE_VERSION = 1;

// Turn the game state into a plain object with only what needs saving.
// (Things like animations and floating texts are not worth saving.)
function makeSaveData(state) {
  return {
    saveVersion: SAVE_VERSION,
    cash: state.cash,
    register: state.register,
    bought: state.bought,
    brewTimers: state.brewTimers,
    player: { x: state.player.x, y: state.player.y },
    lastSeen: Date.now(), // when we last saved; used for offline earnings later
  };
}

// Save the game. Never crashes: if storage is full or blocked
// (e.g. some private-browsing modes), we just skip saving.
function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(makeSaveData(state)));
    return true;
  } catch (e) {
    console.warn('Could not save the game:', e);
    return false;
  }
}

// Is this a normal number we can trust (not NaN, not Infinity, not text)?
function isGoodNumber(n) {
  return typeof n === 'number' && isFinite(n);
}

// Load a saved game into `state`, if there is one.
// Every field is checked separately, so a damaged or old save still loads
// whatever is usable and keeps the defaults for the rest.
// Returns the saved data (or null if there was no usable save).
function loadGame(state) {
  var data;
  try {
    var text = localStorage.getItem(SAVE_KEY);
    if (!text) return null; // first time playing
    data = JSON.parse(text);
  } catch (e) {
    console.warn('Could not read the save, starting fresh:', e);
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  // money (never negative)
  if (isGoodNumber(data.cash)) state.cash = Math.max(0, data.cash);
  if (isGoodNumber(data.register)) {
    state.register = Math.max(0, Math.min(CONFIG.register.cap, data.register));
  }

  // bought pads: only keep ids that still exist in config.js
  // (so removing a pad from the config can't break old saves)
  if (data.bought && typeof data.bought === 'object') {
    CONFIG.pads.forEach(function (pad) {
      if (data.bought[pad.id] === true) state.bought[pad.id] = true;
    });
  }

  // machine timers (only for machines that exist)
  if (data.brewTimers && typeof data.brewTimers === 'object') {
    CONFIG.pads.forEach(function (pad) {
      var t = data.brewTimers[pad.id];
      if (pad.builds.brew && isGoodNumber(t) && t >= 0) {
        state.brewTimers[pad.id] = Math.min(t, pad.builds.brew.seconds);
      }
    });
  }

  // bought items must be solid before we check the player's position
  rebuildSolids(state);

  // player position: only use it if it's a valid spot (inside the world
  // and not inside a wall or item, which can happen if the layout changed)
  if (data.player && isGoodNumber(data.player.x) && isGoodNumber(data.player.y)) {
    var p = state.player;
    var x = data.player.x, y = data.player.y;
    var insideWorld = x >= p.radius && y >= p.radius &&
      x <= CONFIG.world.width - p.radius && y <= CONFIG.world.height - p.radius;
    var blocked = solidRects.some(function (r) { return overlapsRect(x, y, p.radius, r); });
    if (insideWorld && !blocked) {
      p.x = x;
      p.y = y;
    }
  }

  return data;
}

// Delete the save (used by the reset button in a later part).
function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to do */ }
}
