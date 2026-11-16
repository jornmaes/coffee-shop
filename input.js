// =============================================================
// input.js — turns touches and keys into a movement direction.
// The rest of the game only reads input.moveX / input.moveY,
// which are each between -1 and 1.
// =============================================================

var input = {
  moveX: 0,   // -1 = left, 1 = right
  moveY: 0,   // -1 = up,   1 = down

  // Joystick state (screen pixels). It appears wherever you touch.
  stick: {
    active: false,
    pointerId: null,
    baseX: 0, baseY: 0,   // where the touch started (center of the base)
    knobX: 0, knobY: 0,   // where the knob is drawn right now
  },
};

// Which movement keys are held down right now
var keysDown = {};

// ---------- Joystick (touch, pen or mouse) ----------

// Start the joystick where the finger goes down.
function onPointerDown(e) {
  if (input.stick.active) return; // already steering with another finger
  var s = input.stick;
  s.active = true;
  s.pointerId = e.pointerId;
  s.baseX = s.knobX = e.clientX;
  s.baseY = s.knobY = e.clientY;
  canvas.setPointerCapture(e.pointerId); // keep getting moves even off the canvas
  e.preventDefault();
}

// Drag the knob, but keep it inside the base circle.
function onPointerMove(e) {
  var s = input.stick;
  if (!s.active || e.pointerId !== s.pointerId) return;

  var max = CONFIG.joystick.radius;
  var dx = e.clientX - s.baseX;
  var dy = e.clientY - s.baseY;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > max) {
    dx = dx / dist * max;
    dy = dy / dist * max;
  }
  s.knobX = s.baseX + dx;
  s.knobY = s.baseY + dy;
  e.preventDefault();
}

// Let go: hide the joystick.
function onPointerUp(e) {
  var s = input.stick;
  if (e.pointerId !== s.pointerId) return;
  s.active = false;
  s.pointerId = null;
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);

// ---------- Keyboard (for testing on a computer) ----------

// Map each key to a direction name
var KEY_DIRECTIONS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

window.addEventListener('keydown', function (e) {
  var dir = KEY_DIRECTIONS[e.code];
  if (dir) { keysDown[dir] = true; e.preventDefault(); }
});

window.addEventListener('keyup', function (e) {
  var dir = KEY_DIRECTIONS[e.code];
  if (dir) keysDown[dir] = false;
});

// If the window loses focus, forget held keys so the player doesn't keep walking.
window.addEventListener('blur', function () { keysDown = {}; });

// ---------- Combine both into one direction ----------

// Work out input.moveX / moveY for this frame.
function updateInput() {
  var x = 0, y = 0;
  var s = input.stick;

  if (s.active) {
    // joystick: how far the knob is pulled, from 0 to 1
    var max = CONFIG.joystick.radius;
    x = (s.knobX - s.baseX) / max;
    y = (s.knobY - s.baseY) / max;
    var amount = Math.sqrt(x * x + y * y);
    if (amount < CONFIG.joystick.deadZone) { x = 0; y = 0; }
  } else {
    // keyboard: full speed in the pressed direction
    if (keysDown.left) x -= 1;
    if (keysDown.right) x += 1;
    if (keysDown.up) y -= 1;
    if (keysDown.down) y += 1;
    // walking diagonally shouldn't be faster than straight
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
  }

  input.moveX = x;
  input.moveY = y;
}
