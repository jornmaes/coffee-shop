// =============================================================
// render.js — draws the game world onto the canvas.
// Everything is positioned in "world units" (tiles) and converted
// to screen pixels by the camera.
// =============================================================

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

// The camera: which world point is in the middle of the screen,
// and how many pixels one tile takes up.
var camera = {
  x: 0,       // world x at the screen center
  y: 0,       // world y at the screen center
  scale: 1,   // pixels per tile (in CSS pixels)
};

// Make the canvas match the screen size.
// We multiply by devicePixelRatio so drawings stay sharp on phones,
// then scale the context back so we can keep thinking in CSS pixels.
function resizeCanvas() {
  var dpr = window.devicePixelRatio || 1;
  var w = window.innerWidth;
  var h = window.innerHeight;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Zoom: fit a fixed number of tiles from top to bottom.
  camera.scale = h / CONFIG.view.tilesVisibleY;
}

// Keep a camera position from showing anything past the world's edges.
// If the whole world fits on screen in one direction, just center it.
function clampCamera(x, y) {
  var halfW = window.innerWidth / 2 / camera.scale;  // half the screen, in tiles
  var halfH = window.innerHeight / 2 / camera.scale;
  var w = CONFIG.world;

  x = w.width <= halfW * 2 ? w.width / 2 : Math.max(halfW, Math.min(w.width - halfW, x));
  y = w.height <= halfH * 2 ? w.height / 2 : Math.max(halfH, Math.min(w.height - halfH, y));
  return { x: x, y: y };
}

// Jump the camera straight to a target (used at start and after resizing).
function snapCamera(target) {
  var c = clampCamera(target.x, target.y);
  camera.x = c.x;
  camera.y = c.y;
}

// Glide the camera smoothly toward a target, a little bit each frame.
function followCamera(target, dt) {
  var c = clampCamera(target.x, target.y);
  // move a fraction of the remaining distance; the fraction grows with dt
  // so the glide feels the same at any frame rate
  var t = 1 - Math.exp(-CONFIG.view.followSpeed * dt);
  camera.x += (c.x - camera.x) * t;
  camera.y += (c.y - camera.y) * t;
}

// Convert a world position (tiles) to a screen position (CSS pixels).
function worldToScreen(wx, wy) {
  return {
    x: (wx - camera.x) * camera.scale + window.innerWidth / 2,
    y: (wy - camera.y) * camera.scale + window.innerHeight / 2,
  };
}

// Fill a rectangle given in world units.
function fillWorldRect(wx, wy, ww, wh, color) {
  var s = worldToScreen(wx, wy);
  ctx.fillStyle = color;
  // +0.5px overlap hides hairline gaps between neighbouring tiles
  ctx.fillRect(s.x, s.y, ww * camera.scale + 0.5, wh * camera.scale + 0.5);
}

// Draw a checkerboard of tiles over an area (used for grass and floor).
function drawCheckerboard(x, y, width, height, colorA, colorB) {
  for (var ty = 0; ty < height; ty++) {
    for (var tx = 0; tx < width; tx++) {
      var color = (tx + ty) % 2 === 0 ? colorA : colorB;
      fillWorldRect(x + tx, y + ty, 1, 1, color);
    }
  }
}

// Draw the shop walls. The rectangles come from world.js, so what you
// see is exactly what you bump into.
function drawWalls() {
  for (var i = 0; i < solidRects.length; i++) {
    var r = solidRects[i];
    fillWorldRect(r.x, r.y, r.w, r.h, CONFIG.colors.wall);
  }
}

// Draw the barista: a soft shadow, a green apron body, a head,
// and two little eyes looking the way they walk.
function drawPlayer(player) {
  var s = worldToScreen(player.x, player.y);
  var r = player.radius * camera.scale;
  var col = CONFIG.colors;

  // a small bounce while walking
  var bob = player.moving ? Math.abs(Math.sin(player.walkTime * 12)) * r * 0.15 : 0;

  ctx.save();

  // shadow on the floor (doesn't bounce)
  ctx.fillStyle = col.shadow;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + r * 0.7, r * 1.0, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // body (apron)
  ctx.fillStyle = col.playerApron;
  ctx.beginPath();
  ctx.arc(s.x, s.y - bob, r, 0, Math.PI * 2);
  ctx.fill();

  // head, nudged a little in the facing direction
  var hx = s.x + player.faceX * r * 0.2;
  var hy = s.y - bob - r * 0.35 + player.faceY * r * 0.15;
  ctx.fillStyle = col.playerBody;
  ctx.beginPath();
  ctx.arc(hx, hy, r * 0.62, 0, Math.PI * 2);
  ctx.fill();

  // eyes (only when facing somewhat toward the screen or sideways)
  if (player.faceY > -0.5) {
    ctx.fillStyle = '#3b2a20';
    var ex = player.faceX * r * 0.22;
    var ey = player.faceY * r * 0.12;
    ctx.beginPath();
    ctx.arc(hx - r * 0.22 + ex, hy + ey, r * 0.08, 0, Math.PI * 2);
    ctx.arc(hx + r * 0.22 + ex, hy + ey, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Draw the joystick (only while a finger is on the screen).
// This is in screen pixels, not world units: it doesn't move with the camera.
function drawJoystick() {
  var s = input.stick;
  if (!s.active) return;

  ctx.save();
  // base
  ctx.fillStyle = 'rgba(255, 246, 232, 0.25)';
  ctx.strokeStyle = 'rgba(255, 246, 232, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(s.baseX, s.baseY, CONFIG.joystick.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // knob
  ctx.fillStyle = 'rgba(255, 246, 232, 0.85)';
  ctx.beginPath();
  ctx.arc(s.knobX, s.knobY, CONFIG.joystick.knobRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Draw a dashed outline showing where things will be built later.
function drawBuildArea() {
  var p = CONFIG.plot;
  var margin = 1.5; // tiles of space between the walls and the outline
  var s = worldToScreen(p.x + margin, p.y + margin);

  ctx.save();
  ctx.strokeStyle = CONFIG.colors.buildArea;
  ctx.lineWidth = Math.max(2, camera.scale * 0.08);
  ctx.setLineDash([camera.scale * 0.4, camera.scale * 0.25]);
  ctx.strokeRect(s.x, s.y,
    (p.width - margin * 2) * camera.scale,
    (p.height - margin * 2) * camera.scale);

  // a friendly label in the middle
  var mid = worldToScreen(p.x + p.width / 2, p.y + p.height / 2);
  ctx.fillStyle = CONFIG.colors.buildArea;
  ctx.font = '600 ' + Math.round(camera.scale * 0.6) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Your café starts here', mid.x, mid.y);
  ctx.restore();
}

// Draw the whole world for one frame.
function drawWorld(state) {
  var w = CONFIG.world;
  var p = CONFIG.plot;
  var col = CONFIG.colors;

  // clear to the grass color (covers areas outside the world, too)
  ctx.fillStyle = col.grass;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  drawCheckerboard(0, 0, w.width, w.height, col.grass, col.grassDark);
  drawCheckerboard(p.x, p.y, p.width, p.height, col.floor, col.floorDark);
  drawWalls();
  drawBuildArea();
  drawPlayer(state.player);
  drawJoystick(); // last, so it sits on top of everything
}
