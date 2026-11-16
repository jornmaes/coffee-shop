// =============================================================
// render.js — the camera, and drawing each frame in the right
// order. What things look like lives in art.js.
// Everything is positioned in tiles and converted to screen
// pixels by the camera.
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

// Draw the shop walls. (wallRects, not solidRects: solidRects also
// holds bought items, which would show up as brown squares.)
function drawWalls() {
  for (var i = 0; i < wallRects.length; i++) {
    var r = wallRects[i];
    fillWorldRect(r.x, r.y, r.w, r.h, CONFIG.colors.wall);
  }
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
    ctx.fillText(pad.price === 0 ? 'FREE' : '☕ ' + pad.price, s.x + w / 2, s.y + h / 2);

    // name in a little label above the pad, plus the cozy bonus for decorations
    var label = pad.name + (pad.builds.cozy ? '  ♥+' + pad.builds.cozy + '%' : '');
    setFont(0.45, 600);
    var labelW = ctx.measureText(label).width + camera.scale * 0.5;
    var labelH = camera.scale * 0.65;
    var lx = s.x + w / 2 - labelW / 2;
    var ly = s.y - labelH - camera.scale * 0.15;
    ctx.fillStyle = 'rgba(255, 246, 232, 0.92)';
    roundRectPath(lx, ly, labelW, labelH, labelH / 2);
    ctx.fill();
    ctx.fillStyle = col.padText;
    ctx.fillText(label, s.x + w / 2, ly + labelH / 2);

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

// Item types that get a soft square shadow underneath.
var SHADOWED_TYPES = { counter: true, machine: true, bookshelf: true, chalkboard: true };

// Draw bought items. onlyFloor = true draws just the flat floor items
// (rugs), false draws everything else.
function drawBuiltItems(state, onlyFloor) {
  getBoughtPads(state).forEach(function (pad) {
    var b = pad.builds;
    if (!!b.floor !== onlyFloor) return;

    var scale = popScale(state, pad.id);
    if (scale <= 0) return;
    var k = camera.scale * scale;
    var w = b.w * k, h = b.h * k;
    // grow from the item's center
    var center = worldToScreen(b.x + b.w / 2, b.y + b.h / 2);
    var x = center.x - w / 2, y = center.y - h / 2;

    ctx.save();
    if (SHADOWED_TYPES[b.type]) {
      fillRoundRect(x + k * 0.08, y + k * 0.12, w, h, k * 0.3, CONFIG.colors.shadow);
    }
    drawItem(pad, x, y, w, h, k, state);
    ctx.restore();
  });
}

// Draw the barista and all customers, back to front (lower on screen =
// drawn later, so it overlaps things behind it).
function drawCharacters(state) {
  var list = state.customers.slice();
  list.push(state.player);
  list.sort(function (a, b) { return a.y - b.y; });

  list.forEach(function (ch) {
    var s = worldToScreen(ch.x, ch.y);
    var r = ch.radius * camera.scale;
    var bob = ch.moving ? Math.abs(Math.sin(ch.walkTime * 12)) * r * 0.15 : 0;
    if (ch === state.player) {
      var col = CONFIG.colors;
      drawCharacter(s.x, s.y, r,
        { shirt: col.playerApron, skin: col.playerBody, hair: col.playerHair, hairStyle: 'short' },
        { faceX: ch.faceX, faceY: ch.faceY, bob: bob, apron: true });
    } else {
      drawCharacter(s.x, s.y, r, ch.look, { faceX: ch.faceX, faceY: ch.faceY, bob: bob });
      // sipping: a little cup in front of them
      if (ch.step === 'drinking') {
        drawDrink(ch.order, s.x + ch.faceX * r * 0.7, s.y - r * 0.1, camera.scale * 0.42);
      }
    }
  });
}

// Speech bubbles over customers, and the drinks the barista is holding.
// Drawn after all characters so nothing covers them.
function drawBubblesAndCarried(state) {
  var k = camera.scale;
  state.customers.forEach(function (c) {
    var s = worldToScreen(c.x, c.y);
    var top = s.y - c.radius * k * 1.4;
    if (c.step === 'ordering') {
      // thinking "..." with dots that light up one by one
      drawBubble(s.x, top, k, false, function (cx, cy, size) {
        var lit = Math.floor(state.time * 3) % 3;
        for (var i = 0; i < 3; i++) {
          fillCircle(cx + (i - 1) * size * 0.28, cy, size * 0.09, i === lit ? '#3b2a20' : '#c9b9a3');
        }
      });
    } else if (c.order && !c.served) {
      // the drink they want; glows green if the barista is holding it
      var hasIt = state.carrying.indexOf(c.order) !== -1;
      var bounce = c.step === 'waiting' ? Math.abs(Math.sin(state.time * 3 + c.id)) * k * 0.08 : 0;
      drawBubble(s.x, top - bounce, k, hasIt, function (cx, cy, size) {
        drawDrink(c.order, cx, cy, size * 0.95);
      });
    }
  });

  // the barista's drinks, floating in a row above their head
  var p = state.player;
  var ps = worldToScreen(p.x, p.y);
  var n = state.carrying.length;
  state.carrying.forEach(function (drink, i) {
    var dx = (i - (n - 1) / 2) * k * 0.6;
    var dy = ps.y - p.radius * k * 2.1 + Math.sin(state.time * 5 + i) * k * 0.04;
    fillCircle(ps.x + dx, dy, k * 0.3, 'rgba(255, 250, 242, 0.85)');
    drawDrink(drink, ps.x + dx, dy, k * 0.5);
  });
}

// Coins: first they pop out of the customer (moving in the world), then
// they fly to the cash counter in the top-left corner of the screen.
function drawCoins(state) {
  var fx = CONFIG.effects;
  var cashEl = document.getElementById('cash');
  var rect = cashEl.getBoundingClientRect();
  var target = { x: rect.left + 18, y: rect.top + rect.height / 2 };
  var k = camera.scale;

  state.coins.forEach(function (coin) {
    var age = state.time - coin.born;
    if (age < 0) return;
    var pos;
    if (age < fx.coinBurstTime) {
      pos = worldToScreen(coin.x, coin.y);
    } else {
      if (!coin.screenStart) coin.screenStart = worldToScreen(coin.x, coin.y);
      var t = Math.min(1, (age - fx.coinBurstTime) / fx.coinFlyTime);
      var ease = t * t; // speeds up toward the end
      pos = {
        x: coin.screenStart.x + (target.x - coin.screenStart.x) * ease,
        y: coin.screenStart.y + (target.y - coin.screenStart.y) * ease,
      };
    }
    var r = k * 0.17;
    fillCircle(pos.x, pos.y, r, CONFIG.colors.coinDark);
    fillCircle(pos.x, pos.y, r * 0.78, CONFIG.colors.coin);
    fillCircle(pos.x - r * 0.25, pos.y - r * 0.25, r * 0.22, '#fff3c4'); // shine
  });
}

// Draw the floating texts ("-25", "+8", "♥") that rise and fade.
function drawFloaters(state) {
  var life = CONFIG.effects.floatTextTime;
  ctx.save();
  setFont(0.6, 800);
  for (var i = 0; i < state.floaters.length; i++) {
    var f = state.floaters[i];
    var t = (state.time - f.born) / life; // 0 -> 1 over its lifetime
    var s = worldToScreen(f.x, f.y - t * 1.2); // rise 1.2 tiles
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.lineWidth = camera.scale * 0.12;
    ctx.strokeStyle = '#fff6e8';
    ctx.strokeText(f.text, s.x, s.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, s.x, s.y);
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
  setFont(0.6, 600);
  ctx.fillText('Your café starts here', mid.x, mid.y);
  ctx.restore();
}

// Draw the whole world for one frame, back to front.
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
  drawBuiltItems(state, true);  // rugs lie under everything
  drawPads(state);
  drawBuiltItems(state, false); // furniture, machines, decorations
  drawCharacters(state);
  drawBubblesAndCarried(state);
  drawFloaters(state);
  drawCoins(state);
  drawJoystick(); // last, so it sits on top of everything
}
