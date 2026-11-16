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
//   1: Part 5 (coins collected from a register)
//   2: Part 6 (customers pay directly; machines make drinks)
var SAVE_VERSION = 2;

// Turn the game state into a plain object with only what needs saving.
// Customers, animations and floating texts are not saved: a reloaded
// shop simply starts with no customers inside.
function makeSaveData(state) {
  return {
    saveVersion: SAVE_VERSION,
    cash: state.cash,
    bought: state.bought,
    machines: state.machines,
    carrying: state.carrying,
    stats: state.stats,
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
  // Old saves (version 1) had coins waiting in a register. The register is
  // gone now, so those coins go straight into your cash: nothing is lost.
  if (isGoodNumber(data.register) && data.register > 0) state.cash += data.register;

  // bought pads: only keep ids that still exist in config.js
  // (so removing a pad from the config can't break old saves)
  if (data.bought && typeof data.bought === 'object') {
    CONFIG.pads.forEach(function (pad) {
      if (data.bought[pad.id] === true) state.bought[pad.id] = true;
    });
  }

  // machines: drinks waiting on the tray and brewing progress
  // (only for machines that are bought, with sensible numbers)
  if (data.machines && typeof data.machines === 'object') {
    CONFIG.pads.forEach(function (pad) {
      var m = data.machines[pad.id];
      if (pad.builds.type !== 'machine' || !state.bought[pad.id] || !m || typeof m !== 'object') return;
      var brewTime = CONFIG.drinks[pad.builds.drink].brewSeconds;
      state.machines[pad.id] = {
        ready: isGoodNumber(m.ready) ? Math.max(0, Math.min(CONFIG.machine.holds, Math.floor(m.ready))) : 0,
        timer: isGoodNumber(m.timer) ? Math.max(0, Math.min(brewTime, m.timer)) : 0,
      };
    });
  }

  // drinks in the barista's hands (only real drinks, never more than they can carry)
  if (Array.isArray(data.carrying)) {
    state.carrying = data.carrying.filter(function (d) {
      return typeof d === 'string' && CONFIG.drinks.hasOwnProperty(d);
    }).slice(0, CONFIG.player.carry);
  }

  // stats
  if (data.stats && isGoodNumber(data.stats.served)) {
    state.stats.served = Math.max(0, Math.floor(data.stats.served));
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
    if (insideWorld && !isBlocked(x, y, p.radius)) {
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
