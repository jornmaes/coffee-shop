// =============================================================
// game.js — game state and the main loop.
// =============================================================

// Everything that describes "where the game is right now".
var state = {
  cash: CONFIG.start.cash,  // coins the player has
  income: 0,                // coins earned per second (machines come later)
};

// HUD elements we update every frame
var cashEl = document.getElementById('cash');
var incomeEl = document.getElementById('income');

// Show the current cash and income in the HUD.
function updateHud() {
  cashEl.textContent = '☕ ' + Math.floor(state.cash);
  incomeEl.textContent = '+' + state.income + '/s';
}

// Called whenever the screen size or orientation changes.
function onResize() {
  resizeCanvas();
  drawWorld(state); // redraw right away so there is no blank flash
}

// Advance the game by dt seconds. Empty for now; later parts add
// movement, earning and buying here.
function update(dt) {
}

// The main loop: runs once per screen refresh (~60 times a second).
var lastTime = performance.now();
function loop(now) {
  // dt = seconds since last frame. Capped so a sleeping tab
  // doesn't cause one giant jump when it wakes up.
  var dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  update(dt);
  drawWorld(state);
  updateHud();

  requestAnimationFrame(loop);
}

// ----- Start the game -----
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
centerCameraOnPlot();
onResize();
requestAnimationFrame(loop);
