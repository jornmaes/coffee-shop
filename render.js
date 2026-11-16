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

// Trace a rounded rectangle path (in screen pixels). Call fill/stroke after.
function roundRectPath(x, y, w, h, radius) {
  ctx.beginPath();
  if (w <= 0 || h <= 0) return; // nothing to draw (e.g. first frame of a pop-in)
  // corner size can't be negative or bigger than half the box
  var r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Set the canvas font, sized in tiles so text scales with the zoom.
function setFont(sizeInTiles, weight) {
  ctx.font = (weight || 600) + ' ' + Math.round(sizeInTiles * camera.scale) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

// Draw every pad that is currently on the floor.
// Affordable pads glow and pulse; pads you can't afford yet are muted.
function drawPads(state) {
  var col = CONFIG.colors;
  var pads = getVisiblePads(state);

  for (var i = 0; i < pads.length; i++) {
    var pad = pads[i];
    var r = pad.pad;
    var affordable = state.cash >= pad.price;
    var s = worldToScreen(r.x, r.y);
    var w = r.w * camera.scale;
    var h = r.h * camera.scale;

    ctx.save();

    // soft pulsing glow around affordable pads
    if (affordable) {
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      ctx.shadowColor = col.pad;
      ctx.shadowBlur = camera.scale * (0.3 + 0.4 * pulse);
    }

    // the pad itself
    ctx.fillStyle = affordable ? col.pad : col.padTooPricey;
    roundRectPath(s.x, s.y, w, h, camera.scale * 0.25);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(2, camera.scale * 0.07);
    ctx.stroke();

    // price on the pad
    ctx.fillStyle = col.padText;
    setFont(0.55, 700);
    ctx.fillText('☕ ' + pad.price, s.x + w / 2, s.y + h / 2);

    // name in a little label above the pad
    setFont(0.45, 600);
    var labelW = ctx.measureText(pad.name).width + camera.scale * 0.5;
    var labelH = camera.scale * 0.65;
    var lx = s.x + w / 2 - labelW / 2;
    var ly = s.y - labelH - camera.scale * 0.15;
    ctx.fillStyle = 'rgba(255, 246, 232, 0.9)';
    roundRectPath(lx, ly, labelW, labelH, labelH / 2);
    ctx.fill();
    ctx.fillStyle = col.padText;
    ctx.fillText(pad.name, s.x + w / 2, ly + labelH / 2);

    ctx.restore();
  }
}

// How "popped in" a freshly built item is: 0 = just bought, 1 = done.
// Overshoots slightly past 1 for a bouncy feel.
function popScale(state, padId) {
  var builtAt = state.builtAt[padId];
  if (builtAt === undefined) return 1; // built long ago (e.g. loaded from a save)
  var t = Math.min(1, (state.time - builtAt) / CONFIG.effects.buildPopTime);
  // "ease out back" curve: goes a bit past 1, then settles
  var c = 1.7;
  var scale = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  // At t = 0 this should be exactly 0, but rounding makes it a tiny
  // negative number, and negative sizes crash canvas drawing. Clamp it.
  return Math.max(0, scale);
}

// Draw one built item. (x, y, w, h) is its box in screen pixels.
function drawItemShape(type, x, y, w, h) {
  var col = CONFIG.colors;
  var u = camera.scale; // one tile in pixels, handy for small details

  if (type === 'counter') {
    // wooden counter: darker front, lighter top
    ctx.fillStyle = col.wood;
    roundRectPath(x, y, w, h, u * 0.15);
    ctx.fill();
    ctx.fillStyle = col.woodLight;
    roundRectPath(x, y, w, h * 0.55, u * 0.15);
    ctx.fill();

  } else if (type === 'espresso') {
    // metal machine with a dark panel, a red light and a little cup
    ctx.fillStyle = col.metal;
    roundRectPath(x, y, w, h, u * 0.15);
    ctx.fill();
    ctx.fillStyle = col.metalDark;
    roundRectPath(x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.38, u * 0.08);
    ctx.fill();
    ctx.fillStyle = '#e0604f';
    ctx.beginPath();
    ctx.arc(x + w * 0.8, y + h * 0.75, u * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath();
    ctx.arc(x + w * 0.4, y + h * 0.75, u * 0.16, 0, Math.PI * 2);
    ctx.fill();

  } else if (type === 'table') {
    // round table with a chair on each side
    var cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = col.wood;
    ctx.beginPath();
    ctx.arc(x + w * 0.1, cy, u * 0.22, 0, Math.PI * 2);
    ctx.arc(x + w * 0.9, cy, u * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.woodLight;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath();
    ctx.arc(cx, cy, u * 0.1, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // unknown type: a plain box so mistakes in config are easy to spot
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x, y, w, h);
  }
}

// Draw every item that has been bought, popping in new ones.
function drawBuiltItems(state) {
  for (var i = 0; i < CONFIG.pads.length; i++) {
    var pad = CONFIG.pads[i];
    if (!state.bought[pad.id]) continue;

    var b = pad.builds;
    var scale = popScale(state, pad.id);
    var w = b.w * camera.scale * scale;
    var h = b.h * camera.scale * scale;
    // grow from the item's center
    var center = worldToScreen(b.x + b.w / 2, b.y + b.h / 2);

    ctx.save();
    // soft shadow underneath
    ctx.fillStyle = CONFIG.colors.shadow;
    roundRectPath(center.x - w / 2 + camera.scale * 0.08, center.y - h / 2 + camera.scale * 0.12, w, h, camera.scale * 0.15);
    ctx.fill();
    drawItemShape(b.type, center.x - w / 2, center.y - h / 2, w, h);
    ctx.restore();
  }
}

// Draw the "-25" texts that float up and fade after buying something.
function drawFloaters(state) {
  var life = CONFIG.effects.floatTextTime;
  ctx.save();
  setFont(0.6, 800);
  for (var i = 0; i < state.floaters.length; i++) {
    var f = state.floaters[i];
    var t = (state.time - f.born) / life; // 0 -> 1 over its lifetime
    var s = worldToScreen(f.x, f.y - t * 1.2); // rise 1.2 tiles
    ctx.globalAlpha = 1 - t;
    ctx.lineWidth = camera.scale * 0.12;
    ctx.strokeStyle = '#fff6e8';
    ctx.strokeText(f.text, s.x, s.y);
    ctx.fillStyle = '#b5523b';
    ctx.fillText(f.text, s.x, s.y);
  }
  ctx.restore();
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

  // a friendly label near the top (the middle is where the first pad sits)
  var mid = worldToScreen(p.x + p.width / 2, p.y + margin + 1.2);
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
  // show the "starts here" hint only while the shop is still empty
  if (Object.keys(state.bought).length === 0) drawBuildArea();
  drawPads(state);
  drawBuiltItems(state);
  drawPlayer(state.player);
  drawFloaters(state);
  drawJoystick(); // last, so it sits on top of everything
}
