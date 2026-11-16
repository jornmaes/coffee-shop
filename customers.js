// =============================================================
// customers.js — customers coming in, ordering, sitting, being
// served, paying and leaving. Plus the coin effect.
//
// A customer's visit, step by step (c.step):
//   'toQueue'  walking from the door to their place in line
//   'queue'    standing in line
//   'ordering' at the front of the line, thinking (shows "...")
//   'toSeat'   order placed (shows what they want), walking to their seat
//   'waiting'  sitting, waiting for their order
//   'drinking' everything served! enjoying it
//   'leaving'  walking back out the door, then they disappear
// An order is one or two items (a drink and a treat). Each item is paid
// for when it's handed over.
// Customers never get angry or leave without their order: no fail states.
// =============================================================

// Pick a random number between min and max.
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Pick a random item from a list.
function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Where the person at position `index` in line stands (0 = front, ordering).
function queueSpot(index) {
  var cc = CONFIG.customers;
  return { x: cc.orderSpot.x + cc.queueStep.x * index, y: cc.orderSpot.y + cc.queueStep.y * index };
}

// Customers who are in line (walking to it, waiting, or ordering).
function getQueue(state) {
  return state.customers.filter(function (c) {
    return c.step === 'toQueue' || c.step === 'queue' || c.step === 'ordering';
  });
}

// Pick one item from a list, using each item's popularity as its chance.
function pickByPopularity(items) {
  var total = 0;
  items.forEach(function (id) { total += CONFIG.menu[id].popularity; });
  var roll = Math.random() * total;
  for (var i = 0; i < items.length; i++) {
    roll -= CONFIG.menu[items[i]].popularity;
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

// Decide what a customer orders: one item, and sometimes a second one of
// the other kind (a treat with their drink, or a drink with their treat).
function pickOrder(state) {
  var menu = getAvailableMenu(state);
  var first = pickByPopularity(menu);
  var order = [first];
  var otherKind = menu.filter(function (id) { return CONFIG.menu[id].kind !== CONFIG.menu[first].kind; });
  if (otherKind.length > 0 && Math.random() < CONFIG.customers.comboChance) {
    order.push(pickByPopularity(otherKind));
  }
  // drinks first, so the bubble always reads "drink + treat"
  order.sort(function (a, b) { return CONFIG.menu[a].kind === 'drink' ? -1 : CONFIG.menu[b].kind === 'drink' ? 1 : 0; });
  return order;
}

// Send a customer walking toward a target point.
function walkTo(c, x, y) {
  c.target = { x: x, y: y };
  // if there's no route (shouldn't happen), just walk straight there
  c.path = findPath(c.x, c.y, x, y) || [{ x: x, y: y }];
}

// Recalculate every walking customer's route. Called after something new is
// built, so nobody walks through a brand-new table.
function repathCustomers(state) {
  state.customers.forEach(function (c) {
    if (c.target && c.path.length > 0) walkTo(c, c.target.x, c.target.y);
  });
}

// Can a new customer come in right now? Only when there's something to sell,
// a free seat to claim, and room in the line.
function canSpawnCustomer(state) {
  return getAvailableMenu(state).length > 0 &&
         getFreeSeats(state).length > 0 &&
         getQueue(state).length < CONFIG.customers.maxQueue;
}

// Seconds until the next customer may come in. More seats = busier café.
function nextSpawnDelay(state) {
  var cc = CONFIG.customers;
  var faster = 1 + getSeats(state).length * cc.spawnFasterPerSeat;
  return randomBetween(cc.spawnSecondsMin, cc.spawnSecondsMax) / faster;
}

// Make a new customer at the door, with a random look and a claimed seat.
function spawnCustomer(state) {
  var cc = CONFIG.customers;
  var col = CONFIG.colors;
  var seat = randomFrom(getFreeSeats(state));
  var c = {
    id: state.nextCustomerId++,
    x: cc.spawnX, y: cc.spawnY, radius: cc.radius,
    step: 'toQueue',
    queueIndex: getQueue(state).length, // go to the back of the line
    seatKey: seat.key,
    vip: Math.random() < cc.vipChance, // ★ special guest who pays extra
    ordered: [],          // everything they ordered (for drawing what they enjoy)
    orders: [],           // items still to be handed over
    served: false,        // true once they got everything
    timer: 0,             // used for ordering / drinking time
    path: [], target: null,
    faceX: 0, faceY: -1, moving: false, walkTime: 0,
    look: {
      shirt: randomFrom(col.customerShirts),
      skin: randomFrom(col.customerSkins),
      hair: randomFrom(col.customerHair),
      hairStyle: randomFrom(['short', 'bun', 'long', 'cap']),
    },
  };
  var spot = queueSpot(c.queueIndex);
  walkTo(c, spot.x, spot.y);
  state.customers.push(c);
  return c;
}

// Move a customer along their path. Returns true once they've arrived.
function followPath(c, dt) {
  var stepLeft = CONFIG.customers.speed * dt;
  c.moving = false;
  while (c.path.length > 0 && stepLeft > 0) {
    var p = c.path[0];
    var dx = p.x - c.x, dy = p.y - c.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= stepLeft) {
      c.x = p.x; c.y = p.y;
      stepLeft -= dist;
      c.path.shift();
    } else {
      c.x += dx / dist * stepLeft;
      c.y += dy / dist * stepLeft;
      c.faceX = dx / dist; c.faceY = dy / dist;
      stepLeft = 0;
    }
    c.moving = true;
  }
  if (c.moving) c.walkTime += dt;
  return c.path.length === 0;
}

// The front customer finished ordering: everyone behind moves up one place.
function moveQueueUp(state) {
  getQueue(state).forEach(function (c) {
    if (c.queueIndex > 0) {
      c.queueIndex -= 1;
      var spot = queueSpot(c.queueIndex);
      c.step = 'toQueue';
      walkTo(c, spot.x, spot.y);
    }
  });
}

// Find the seat a customer claimed.
function getSeatOf(state, c) {
  var seats = getSeats(state);
  for (var i = 0; i < seats.length; i++) {
    if (seats[i].key === c.seatKey) return seats[i];
  }
  return null;
}

// Update one customer for this frame.
function updateCustomer(state, c, dt) {
  var cc = CONFIG.customers;

  if (c.step === 'toQueue') {
    if (followPath(c, dt)) { c.step = 'queue'; c.faceX = 0; c.faceY = -1; }

  } else if (c.step === 'queue') {
    if (c.queueIndex === 0) { c.step = 'ordering'; c.timer = cc.orderSeconds; }

  } else if (c.step === 'ordering') {
    c.timer -= dt;
    if (c.timer <= 0) {
      c.ordered = pickOrder(state);
      c.orders = c.ordered.slice();
      c.step = 'toSeat';
      c.queueIndex = -1;
      var seat = getSeatOf(state, c);
      walkTo(c, seat.x, seat.y);
      moveQueueUp(state);
    }

  } else if (c.step === 'toSeat') {
    if (followPath(c, dt)) {
      var s = getSeatOf(state, c);
      c.faceX = s.faceX; c.faceY = s.faceY;
      if (c.served) startDrinking(c);
      else c.step = 'waiting';
    }

  } else if (c.step === 'drinking') {
    c.timer -= dt;
    // now and then a little heart floats up
    if (Math.random() < dt * 0.6) addFloater(state, '♥', c.x, c.y - 0.8, CONFIG.colors.heart);
    if (c.timer <= 0) {
      c.step = 'leaving';
      c.seatKey = null; // the seat is free for the next customer
      walkTo(c, cc.spawnX, cc.spawnY);
    }

  } else if (c.step === 'leaving') {
    if (followPath(c, dt)) c.gone = true;
  }
}

// Start enjoying the order.
function startDrinking(c) {
  c.step = 'drinking';
  c.timer = randomBetween(CONFIG.customers.drinkSecondsMin, CONFIG.customers.drinkSecondsMax);
}

// Update all customers, and let new ones in now and then.
function updateCustomers(state, dt) {
  // new customers
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && canSpawnCustomer(state)) {
    spawnCustomer(state);
    state.spawnTimer = nextSpawnDelay(state);
  }

  state.customers.forEach(function (c) { updateCustomer(state, c, dt); });
  state.customers = state.customers.filter(function (c) { return !c.gone; });
}

// Hand over an item when the barista walks up to a customer who ordered it.
// Wrong items are simply not handed over: nothing bad happens.
// Returns the customer who received something, or null.
function tryDeliver(state) {
  var p = state.player;
  for (var i = 0; i < state.customers.length; i++) {
    var c = state.customers[i];
    if (c.orders.length === 0) continue;
    var dx = c.x - p.x, dy = c.y - p.y;
    var near = p.radius + c.radius + CONFIG.player.reach;
    if (dx * dx + dy * dy > near * near) continue;

    // find something in our hands that this customer still wants
    var item = null;
    for (var j = 0; j < c.orders.length; j++) {
      if (state.carrying.indexOf(c.orders[j]) !== -1) { item = c.orders[j]; break; }
    }
    if (item === null) continue; // the barista doesn't have anything they want

    state.carrying.splice(state.carrying.indexOf(item), 1);
    c.orders.splice(c.orders.indexOf(item), 1);
    if (c.orders.length === 0) {
      c.served = true;
      if (c.step === 'waiting') startDrinking(c);
    }

    // pay up!
    var amount = getItemPayment(state, item, c.vip);
    state.cash += amount;
    if (c.served) state.stats.served += 1;
    addFloater(state, (c.vip ? '★ +' : '+') + formatNumber(amount), c.x, c.y - 1, CONFIG.colors.earn);
    if (c.served) addFloater(state, '♥', c.x + 0.5, c.y - 0.6, CONFIG.colors.heart);
    spawnCoinBurst(state, c.x, c.y - 0.4, amount, c.vip);
    return c;
  }
  return null;
}

// ---------- Coin effect ----------

// Coins pop out of the customer, then fly to the cash counter in the corner.
// More coins for bigger payments (up to CONFIG.effects.maxCoins, doubled for VIPs).
function spawnCoinBurst(state, x, y, amount, vip) {
  var max = CONFIG.effects.maxCoins * (vip ? 2 : 1);
  var count = Math.min(max, 3 + Math.floor(Math.log(amount + 1) * 1.5));
  for (var i = 0; i < count; i++) {
    var angle = -Math.PI / 2 + randomBetween(-1.1, 1.1); // mostly upward
    var speed = randomBetween(2.5, 4.5);
    state.coins.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      born: state.time + i * 0.03, // tiny stagger so they don't move as one blob
      screenStart: null,           // set by render.js when the fly-to-cash part starts
    });
  }
}

// Move coins during their "pop out" part, and remove finished ones.
// Returns how many coins reached the cash display this frame.
function updateCoins(state, dt) {
  var fx = CONFIG.effects;
  var arrived = 0;
  state.coins = state.coins.filter(function (coin) {
    var age = state.time - coin.born;
    if (age < 0) return true;
    if (age < fx.coinBurstTime) {
      coin.vy += 14 * dt; // gravity pulls them back down a bit
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      coin.vx *= 0.96;
    }
    if (age >= fx.coinBurstTime + fx.coinFlyTime) { arrived++; return false; }
    return true;
  });
  return arrived;
}
