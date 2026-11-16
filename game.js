// =============================================================
// game.js — game state, the main loop, the HUD, celebrations
// and the settings panel.
// =============================================================

// Everything that describes "where the game is right now".
var state = {
  cash: CONFIG.start.cash,  // coins the player has
  time: 0,                  // seconds since the game was opened (drives animations)

  bought: {},               // which pads are bought, e.g. { counter: true }
  builtAt: {},              // when each item was bought this session (for the pop-in)
  machines: {},             // per machine: { ready: items on the tray, timer: seconds brewed }
  carrying: [],             // item ids the barista is holding, e.g. ['latte']
  stats: { served: 0 },     // how many customers have been served (ever)

  customers: [],            // customers in the shop right now (not saved)
  nextCustomerId: 1,
  spawnTimer: 2,            // seconds until the next customer may come in

  floaters: [],             // floating texts ("-25", "+8", "♥")
  coins: [],                // coins flying from customers to the cash display
  confetti: [],             // confetti from opening a new area
  cameraFocus: null,        // { x, y, until }: the camera visits a new area for a moment
  paused: false,            // true while the settings panel is open

  // the barista you walk around with
  player: {
    x: CONFIG.player.startX,   // position, in tiles
    y: CONFIG.player.startY,
    radius: CONFIG.player.radius,
    faceX: 0,                  // which way they look (-1..1), used for drawing
    faceY: 1,                  // start looking down, toward the screen
    moving: false,             // true while walking (makes them bounce)
    walkTime: 0,               // seconds spent walking, drives the bounce
  },
};

// HUD elements
var moneyEl = document.getElementById('money');
var cashEl = document.getElementById('cash');
var cozyEl = document.getElementById('cozy');
var hintEl = document.getElementById('hint');
var bannerEl = document.getElementById('banner');
var bannerTitleEl = document.getElementById('banner-title');
var bannerTextEl = document.getElementById('banner-text');

// Cash as text: exact up to 100,000 (with commas), then short (123K, 1.2M).
function cashText(n) {
  n = Math.floor(n);
  return n < 100000 ? n.toLocaleString('en-US') : formatNumber(n);
}

// Show cash, cozy bonus and the current hint in the HUD.
// We only touch the page when something changed (cheaper on phones).
var lastHud = {};
function updateHud(coinsArrived) {
  var text = '☕ ' + cashText(state.cash);
  if (text !== lastHud.cash) { cashEl.textContent = text; lastHud.cash = text; }

  var cozy = getCozyBonus(state);
  var cozyText = cozy > 0 ? '♥ Cozy +' + cozy + '%' : '';
  if (cozyText !== lastHud.cozy) { cozyEl.textContent = cozyText; lastHud.cozy = cozyText; }

  var hint = getHint(state);
  if (hint !== lastHud.hint) {
    hintEl.textContent = hint;
    hintEl.classList.toggle('show', hint !== '');
    lastHud.hint = hint;
  }

  // a little bump on the cash display when coins land in it
  if (coinsArrived > 0) {
    moneyEl.classList.remove('bump');
    void moneyEl.offsetWidth; // forces the browser to restart the animation
    moneyEl.classList.add('bump');
  }
}

// A short "what to do next" tip for new players. Disappears after
// serving a few customers (CONFIG.hints.untilServed).
function getHint(state) {
  if (state.stats.served >= CONFIG.hints.untilServed) return '';
  if (!state.bought.counter) return 'Walk onto the glowing pad to build your counter';
  if (getBuiltMachines(state).length === 0) return 'Buy an espresso machine';
  if (getSeats(state).length === 0) return 'Buy a table so customers have somewhere to sit';

  var waiting = state.customers.filter(function (c) { return c.orders.length > 0; });
  if (waiting.length > 0) {
    // holding something someone wants? go deliver it
    for (var i = 0; i < waiting.length; i++) {
      for (var j = 0; j < waiting[i].orders.length; j++) {
        if (state.carrying.indexOf(waiting[i].orders[j]) !== -1) {
          return 'Bring the ' + CONFIG.menu[waiting[i].orders[j]].name + ' to the customer';
        }
      }
    }
    var item = waiting[0].orders[0];
    return 'Walk to the ' + getMachineFor(state, item).name + ' to grab their ' + CONFIG.menu[item].name;
  }
  if (state.customers.some(function (c) { return c.step === 'ordering'; })) return 'A customer is ordering…';
  if (state.customers.length === 0) return 'Customers are on their way…';
  return '';
}

// ---------- Celebrations ----------

// Banners wait in line so two at once don't overwrite each other.
var bannerQueue = [];
var bannerUntil = 0;

// Queue a big friendly banner, e.g. "Bakery Corner is open!".
function showBanner(title, text) {
  bannerQueue.push({ title: title, text: text || '' });
}

// Show the next banner when the current one is done.
function updateBanner() {
  var now = performance.now() / 1000;
  if (now < bannerUntil) return;
  if (bannerQueue.length === 0) { bannerEl.classList.remove('show'); return; }
  var b = bannerQueue.shift();
  bannerTitleEl.textContent = b.title;
  bannerTextEl.textContent = b.text;
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth; // restart the pop-in animation
  bannerEl.classList.add('show');
  bannerUntil = now + CONFIG.effects.bannerSeconds;
}

// Throw confetti around a world position.
function spawnConfetti(state, x, y, count) {
  var colors = CONFIG.colors.confetti;
  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 2 + Math.random() * 6;
    state.confetti.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
      spin: (Math.random() - 0.5) * 12,
      color: colors[i % colors.length],
      born: state.time + Math.random() * 0.15,
    });
  }
}

// Move confetti (it slows down and drifts "down" the screen) and remove old pieces.
function updateConfetti(state, dt) {
  var life = CONFIG.effects.confettiTime;
  state.confetti = state.confetti.filter(function (p) {
    if (state.time < p.born) return true;
    p.vx *= 0.93; p.vy = p.vy * 0.93 + 4 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    return state.time - p.born < life;
  });
}

// The area a pad belongs to (the area its pad sits in), or null.
function getPadArea(pad) {
  for (var i = 0; i < CONFIG.areas.length; i++) {
    var a = CONFIG.areas[i];
    var cx = pad.pad.x + pad.pad.w / 2, cy = pad.pad.y + pad.pad.h / 2;
    if (cx >= a.x && cx <= a.x + a.w && cy >= a.y && cy <= a.y + a.h) return a;
  }
  return null;
}

// Is everything in this area built? (expansion pads don't count:
// they belong to the area they open)
function isAreaComplete(state, area) {
  return CONFIG.pads.every(function (pad) {
    return pad.builds.type === 'expansion' || getPadArea(pad) !== area || state.bought[pad.id];
  });
}

// Something was just bought: celebrate the special moments.
function celebratePurchase(state, pad) {
  var b = pad.builds;
  if (b.type === 'expansion') {
    // a whole new area! confetti, a banner, and the camera pays it a visit
    var area = getArea(b.area);
    var door = area.openings[0];
    spawnConfetti(state, door.x + door.w / 2, door.y + door.h / 2, CONFIG.effects.confettiCount);
    spawnConfetti(state, area.x + area.w / 2, area.y + area.h / 2, CONFIG.effects.confettiCount);
    showBanner('🎉 ' + area.name + ' is open!', area.tagline);
    state.cameraFocus = { x: area.x + area.w / 2, y: area.y + area.h / 2,
                          until: state.time + CONFIG.view.showAreaSeconds };
  } else if (b.makes) {
    showBanner('New on the menu!', CONFIG.menu[b.makes].name + ' · ☕ ' + CONFIG.menu[b.makes].price);
    spawnConfetti(state, b.x + b.w / 2, b.y + b.h / 2, 18);
  }
  // finished an area?
  var home = getPadArea(pad);
  if (b.type !== 'expansion' && home && isAreaComplete(state, home)) {
    showBanner('✨ ' + home.name + ' complete!', 'Every piece is built. It looks wonderful.');
  }
  if (getVisiblePads(state).length === 0) {
    showBanner('☕ Your café is finished!', 'Thank you for building it with so much love.');
  }
}

// ---------- Settings panel ----------

var settingsEl = document.getElementById('settings');
var statsEl = document.getElementById('stats');
var resetAskEl = document.getElementById('reset-ask');
var resetConfirmEl = document.getElementById('reset-confirm');
var resetting = false; // true while starting over, so nothing saves on the way out

// Open the settings: pause the game and show a few stats.
function openSettings() {
  state.paused = true;
  var built = getBoughtPads(state).length;
  var areas = CONFIG.areas.filter(function (a) { return isAreaOpen(state, a); }).length;
  statsEl.innerHTML = '';
  [['Customers served', cashText(state.stats.served)],
   ['Areas open', areas + ' / ' + CONFIG.areas.length],
   ['Pieces built', built + ' / ' + CONFIG.pads.length],
   ['Cozy bonus', '+' + getCozyBonus(state) + '%']].forEach(function (row) {
    var li = document.createElement('li');
    var name = document.createElement('span'); name.textContent = row[0];
    var value = document.createElement('b'); value.textContent = row[1];
    li.appendChild(name); li.appendChild(value);
    statsEl.appendChild(li);
  });
  resetAskEl.hidden = false;
  resetConfirmEl.hidden = true;
  settingsEl.hidden = false;
}

// Close the settings and carry on playing.
function closeSettings() {
  settingsEl.hidden = true;
  state.paused = false;
}

// Start over: delete the save and reload the page.
function resetProgress() {
  resetting = true;
  deleteSave();
  location.reload();
}

document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('reset-btn').addEventListener('click', function () {
  // ask first: this can't be undone
  resetAskEl.hidden = true;
  resetConfirmEl.hidden = false;
});
document.getElementById('reset-no').addEventListener('click', function () {
  resetAskEl.hidden = false;
  resetConfirmEl.hidden = true;
});
document.getElementById('reset-yes').addEventListener('click', resetProgress);

// ---------- The main loop ----------

// Called whenever the screen size or orientation changes.
function onResize() {
  resizeCanvas();
  snapCamera(state.player); // the zoom changed, so re-aim the camera instantly
  drawWorld(state);         // redraw right away so there is no blank flash
}

// Walk the player in the direction the joystick/keys point.
function updatePlayer(dt) {
  var p = state.player;
  var speed = CONFIG.player.speed;

  p.moving = input.moveX !== 0 || input.moveY !== 0;
  if (!p.moving) return;

  moveWithCollision(p, input.moveX * speed * dt, input.moveY * speed * dt);

  // remember the facing direction (normalized) for drawing
  var len = Math.sqrt(input.moveX * input.moveX + input.moveY * input.moveY);
  p.faceX = input.moveX / len;
  p.faceY = input.moveY / len;
  p.walkTime += dt;
}

// Seconds since the last automatic save
var timeSinceSave = 0;

// Save, unless we're in the middle of starting over.
function save() {
  if (!resetting) saveGame(state);
}

// Advance the game by dt seconds. Returns how many coins reached the
// cash display (for the HUD bump).
function update(dt) {
  state.time += dt;
  updateInput();
  updatePlayer(dt);
  updateMachines(state, dt);
  updateCustomers(state, dt);

  var bought = tryBuyPads(state);
  if (bought) {
    repathCustomers(state); // nobody walks through the new item
    celebratePurchase(state, bought);
  }
  var picked = tryPickup(state);
  var served = tryDeliver(state);

  // save straight away after the important moments, and every few seconds
  timeSinceSave += dt;
  if (bought || picked || served || timeSinceSave >= CONFIG.save.intervalSeconds) {
    save();
    timeSinceSave = 0;
  }

  updateFloaters(state);
  updateConfetti(state, dt);
  var arrived = updateCoins(state, dt);

  // the camera follows the barista, or visits a newly opened area for a moment
  var focus = state.cameraFocus && state.time < state.cameraFocus.until ? state.cameraFocus : state.player;
  followCamera(focus, dt);
  return arrived;
}

// The main loop: runs once per screen refresh (~60 times a second).
var lastTime = performance.now();
function loop(now) {
  // Ask for the next frame FIRST. If something below ever throws an error,
  // the game keeps running (the error still shows in the console)
  // instead of freezing on a half-drawn frame.
  requestAnimationFrame(loop);

  // dt = seconds since last frame. Capped so a sleeping tab
  // doesn't cause one giant jump when it wakes up.
  var dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  var arrived = state.paused ? 0 : update(dt);
  drawWorld(state);
  updateHud(arrived);
  updateBanner();
}

// ----- Start the game -----
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// Save when the player leaves: switching apps, locking the phone, closing the tab.
// (Phones often kill a page in the background without warning, so this matters.)
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('pagehide', save);

rebuildSolids(state); // walls only, for a new game
loadGame(state);      // bring back saved progress, if any (also rebuilds solids)
onResize();
requestAnimationFrame(loop);
