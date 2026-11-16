// =============================================================
// game.js — game state, the main loop and the HUD.
// =============================================================

// Everything that describes "where the game is right now".
var state = {
  cash: CONFIG.start.cash,  // coins the player has
  time: 0,                  // seconds since the game was opened (drives animations)

  bought: {},               // which pads are bought, e.g. { counter: true }
  builtAt: {},              // when each item was bought this session (for the pop-in)
  machines: {},             // per machine: { ready: drinks on the tray, timer: seconds brewed }
  carrying: [],             // drink ids the barista is holding, e.g. ['latte']
  stats: { served: 0 },     // how many customers have been served (ever)

  customers: [],            // customers in the shop right now (not saved)
  nextCustomerId: 1,
  spawnTimer: 2,            // seconds until the next customer may come in

  floaters: [],             // floating texts ("-25", "+8", "♥")
  coins: [],                // coins flying from customers to the cash display

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

// Show cash, cozy bonus and the current hint in the HUD.
// We only touch the page when something changed (cheaper on phones).
var lastHud = {};
function updateHud(coinsArrived) {
  var cashText = '☕ ' + Math.floor(state.cash);
  if (cashText !== lastHud.cash) { cashEl.textContent = cashText; lastHud.cash = cashText; }

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

  var waiting = state.customers.filter(function (c) { return c.order && !c.served; });
  if (waiting.length > 0) {
    // holding a drink someone wants? go deliver it
    for (var i = 0; i < waiting.length; i++) {
      if (state.carrying.indexOf(waiting[i].order) !== -1) {
        return 'Bring the ' + CONFIG.drinks[waiting[i].order].name + ' to the customer';
      }
    }
    return 'Walk to the ' + CONFIG.drinks[waiting[0].order].name + ' machine to grab their drink';
  }
  if (state.customers.some(function (c) { return c.step === 'ordering'; })) return 'A customer is ordering…';
  if (state.customers.length === 0) return 'Customers are on their way…';
  return '';
}

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

// Advance the game by dt seconds. Returns how many coins reached the
// cash display (for the HUD bump).
function update(dt) {
  state.time += dt;
  updateInput();
  updatePlayer(dt);
  updateMachines(state, dt);
  updateCustomers(state, dt);

  var bought = tryBuyPads(state);
  if (bought) repathCustomers(state); // nobody walks through the new item
  var picked = tryPickup(state);
  var served = tryDeliver(state);

  // save straight away after the important moments, and every few seconds
  timeSinceSave += dt;
  if (bought || picked || served || timeSinceSave >= CONFIG.save.intervalSeconds) {
    saveGame(state);
    timeSinceSave = 0;
  }

  updateFloaters(state);
  var arrived = updateCoins(state, dt);
  followCamera(state.player, dt);
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

  var arrived = update(dt);
  drawWorld(state);
  updateHud(arrived);
}

// ----- Start the game -----
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// Save when the player leaves: switching apps, locking the phone, closing the tab.
// (Phones often kill a page in the background without warning, so this matters.)
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') saveGame(state);
});
window.addEventListener('pagehide', function () { saveGame(state); });

rebuildSolids(state); // walls only, for a new game
loadGame(state);      // bring back saved progress, if any (also rebuilds solids)
onResize();
requestAnimationFrame(loop);
