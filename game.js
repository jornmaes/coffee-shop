// =============================================================
// game.js — game state and the main loop.
// =============================================================

// Everything that describes "where the game is right now".
var state = {
  cash: CONFIG.start.cash,  // coins the player has
  register: 0,              // coins waiting in the register to be collected
  brewTimers: {},           // per machine: seconds since its last brew
  time: 0,                // seconds since the game was opened (drives animations)

  bought: {},               // which pads are bought, e.g. { counter: true }
  builtAt: {},              // when each item was bought this session (for the pop-in)
  floaters: [],             // floating "-25" texts currently on screen

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

// HUD elements we update every frame
var cashEl = document.getElementById('cash');
var incomeEl = document.getElementById('income');

// Show the current cash and income in the HUD.
function updateHud() {
  cashEl.textContent = '☕ ' + Math.floor(state.cash);
  // show whole numbers as "3", others with one decimal, like "3.5"
  var income = getIncomePerSecond(state);
  incomeEl.textContent = '+' + (Math.round(income * 10) / 10) + '/s';
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

// Advance the game by dt seconds.
function update(dt) {
  state.time += dt;
  updateInput();
  updatePlayer(dt);
  tryBuyPads(state);
  updateMachines(state, dt);
  tryCollect(state);
  updateFloaters(state);
  followCamera(state.player, dt);
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

  update(dt);
  drawWorld(state);
  updateHud();
}

// ----- Start the game -----
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
rebuildSolids(state); // make already-bought items solid (matters once saving exists)
onResize();
requestAnimationFrame(loop);
