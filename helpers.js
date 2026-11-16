// =============================================================
// helpers.js — helper baristas who serve customers on their own.
//
// You hire a helper with a "Hire a Helper" pad (type 'helper' in
// config.js). Each helper lives at a home spot in their area and
// repeats a simple job, step by step (h.step):
//   'idle'        nothing to do: look for a job now and then, or walk home
//   'toMachine'   walking to a machine to pick up an item someone ordered
//   'toCustomer'  carrying the item to a customer who wants it
// Helpers carry one item at a time and walk a bit slower than you.
// The barista always comes first: helpers never block your pickups; if
// you grab or deliver something first, the helper just finds a new job.
// Helpers aren't saved: they come back from the bought pads on reload,
// empty-handed.
// =============================================================

// All bought helper pads, in config order.
function getHelperPads(state) {
  return getBoughtPads(state).filter(function (pad) { return pad.builds.type === 'helper'; });
}

// Make sure there is one helper for every helper pad that's been bought.
// New helpers appear at their home spot.
function syncHelpers(state) {
  if (!state.helpers) state.helpers = [];
  var pads = getHelperPads(state);
  if (state.helpers.length === pads.length) return;
  pads.forEach(function (pad) {
    var exists = state.helpers.some(function (h) { return h.id === pad.id; });
    if (exists) return;
    var b = pad.builds;
    state.helpers.push({
      id: pad.id,
      x: b.x, y: b.y, radius: CONFIG.helpers.radius,
      home: { x: b.x, y: b.y },
      step: 'idle',
      carrying: null,     // the item in their hands (one at most)
      machineId: null,    // 'toMachine': the machine pad they're walking to
      customerId: null,   // 'toCustomer': who they're bringing it to
      thinkTimer: 0,      // seconds until they look for a new job
      path: [], target: null,
      faceX: 0, faceY: 1, moving: false, walkTime: 0,
      look: { shirt: CONFIG.colors.helperShirt, skin: b.skin, hair: b.hair, hairStyle: 'cap' },
    });
  });
}

// Find a customer by id (or null if they've left).
function findCustomer(state, id) {
  for (var i = 0; i < state.customers.length; i++) {
    if (state.customers[i].id === id) return state.customers[i];
  }
  return null;
}

// Distance between two points (anything with x and y).
function distance(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Where a helper stands to reach a machine: just in front of it.
// (All machines stand against a back wall, so "in front" is below.)
function machineFrontSpot(machinePad) {
  var b = machinePad.builds;
  return { x: b.x + b.w / 2, y: b.y + b.h + CONFIG.helpers.radius + 0.05 };
}

// How many more of this item still need someone to fetch them: wanted by
// customers, minus what the barista and helpers hold, minus helpers already
// on their way to pick one up (not counting `except`, the helper asking).
function openNeed(state, itemId, except) {
  var heading = state.helpers.filter(function (h) {
    return h !== except && h.step === 'toMachine' && getPad(h.machineId).builds.makes === itemId;
  }).length;
  return countWanted(state, itemId) - countCarried(state, itemId) - heading;
}

// Pick the closest machine that has an item ready that someone still needs.
// Returns the machine pad, or null when there's nothing to do.
function findPickupJob(state, h) {
  var best = null, bestDist = Infinity;
  getBuiltMachines(state).forEach(function (m) {
    var ms = getMachineState(state, m.id);
    // other helpers already walking to this machine will take those items
    var taken = state.helpers.filter(function (o) { return o !== h && o.step === 'toMachine' && o.machineId === m.id; }).length;
    if (ms.ready - taken <= 0) return;
    if (openNeed(state, m.builds.makes, h) <= 0) return;
    var d = distance(h, machineFrontSpot(m));
    if (d < bestDist) { bestDist = d; best = m; }
  });
  return best;
}

// Pick the closest customer who still wants this item and isn't already
// getting it from another helper. Returns the customer, or null.
function findCustomerFor(state, h, itemId) {
  var best = null, bestDist = Infinity;
  state.customers.forEach(function (c) {
    var wants = c.orders.filter(function (o) { return o === itemId; }).length;
    if (wants === 0) return;
    var coming = state.helpers.filter(function (o) {
      return o !== h && o.step === 'toCustomer' && o.customerId === c.id && o.carrying === itemId;
    }).length;
    if (wants - coming <= 0) return;
    var d = distance(h, c);
    if (d < bestDist) { bestDist = d; best = c; }
  });
  return best;
}

// Can this helper hand something to this customer from where they stand?
function helperCanReachCustomer(h, c) {
  return distance(h, c) <= h.radius + c.radius + CONFIG.player.reach;
}

// Head toward a customer: to their seat (where they'll sit), since they
// may still be walking there.
function walkToCustomer(state, h, c) {
  var seat = getSeatOf(state, c);
  var spot = seat || c;
  walkTo(h, spot.x, spot.y);
}

// An idle helper looks for a job: deliver what they hold, or fetch an item.
function helperThink(state, h) {
  if (h.carrying) {
    var c = findCustomerFor(state, h, h.carrying);
    if (c) {
      h.step = 'toCustomer';
      h.customerId = c.id;
      walkToCustomer(state, h, c);
    }
    // nobody wants it right now: keep holding it until someone orders one
    return;
  }
  var m = findPickupJob(state, h);
  if (m) {
    h.step = 'toMachine';
    h.machineId = m.id;
    var spot = machineFrontSpot(m);
    walkTo(h, spot.x, spot.y);
    return;
  }
  // nothing to do: stroll back home (if not there yet)
  if (h.path.length === 0 && distance(h, h.home) > 0.3) walkTo(h, h.home.x, h.home.y);
}

// Update one helper for this frame.
function updateHelper(state, h, dt) {
  var speed = getHelperSpeed(state);

  if (h.step === 'idle') {
    followPath(h, dt, speed); // (walking home, if they are)
    h.thinkTimer -= dt;
    if (h.thinkTimer <= 0) {
      h.thinkTimer = CONFIG.helpers.thinkSeconds;
      helperThink(state, h);
    }

  } else if (h.step === 'toMachine') {
    var m = getPad(h.machineId);
    var arrived = followPath(h, dt, speed);
    var reach = h.radius + CONFIG.player.reach;
    if (arrived || overlapsRect(h.x, h.y, reach, m.builds)) {
      var ms = getMachineState(state, m.id);
      // still ready and still needed? (the barista may have been quicker)
      if (ms.ready > 0 && openNeed(state, m.builds.makes, h) > 0) {
        ms.ready -= 1;
        h.carrying = m.builds.makes;
      }
      h.machineId = null;
      h.path = []; h.target = null;
      h.step = 'idle';
      h.thinkTimer = 0; // decide right away who to bring it to
    }

  } else if (h.step === 'toCustomer') {
    var c = findCustomer(state, h.customerId);
    if (!c || c.orders.indexOf(h.carrying) === -1) {
      // they got it from someone else (or left): find someone else
      h.step = 'idle'; h.customerId = null; h.path = []; h.target = null; h.thinkTimer = 0;
      return;
    }
    if (helperCanReachCustomer(h, c)) {
      var item = h.carrying;
      h.carrying = null;
      var amount = handOver(state, c, item);
      state.stats.helperEarned = (state.stats.helperEarned || 0) + amount;
      h.step = 'idle'; h.customerId = null; h.path = []; h.target = null; h.thinkTimer = 0;
      return;
    }
    // walked all the way but they're not there yet: wait at their seat
    // (they're on their way), or follow them if they have no seat
    if (followPath(h, dt, speed)) {
      var seat = getSeatOf(state, c);
      if (!seat || distance(h, seat) > 0.5) walkToCustomer(state, h, c);
    }
  }
}

// Update all helpers (hiring new ones as their pads get bought).
function updateHelpers(state, dt) {
  syncHelpers(state);
  state.helpers.forEach(function (h) { updateHelper(state, h, dt); });
}
