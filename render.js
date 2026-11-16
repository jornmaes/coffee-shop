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

// Draw a checkerboard of tiles over an area, but only the tiles that are
// on screen (the world is big; drawing all of it every frame is wasteful).
function drawCheckerboard(x, y, width, height, colorA, colorB) {
  var halfW = window.innerWidth / 2 / camera.scale + 1;
  var halfH = window.innerHeight / 2 / camera.scale + 1;
  var tx0 = Math.max(0, Math.floor(camera.x - halfW - x)), tx1 = Math.min(width, Math.ceil(camera.x + halfW - x));
  var ty0 = Math.max(0, Math.floor(camera.y - halfH - y)), ty1 = Math.min(height, Math.ceil(camera.y + halfH - y));
  for (var ty = ty0; ty < ty1; ty++) {
    for (var tx = tx0; tx < tx1; tx++) {
      fillWorldRect(x + tx, y + ty, 1, 1, (tx + ty) % 2 === 0 ? colorA : colorB);
    }
  }
}

// Wooden planks (the lounge floor): long boards with staggered joints.
function drawPlanks(area) {
  fillWorldRect(area.x, area.y, area.w, area.h, area.floor[0]);
  ctx.strokeStyle = area.floor[1];
  ctx.lineWidth = Math.max(1, camera.scale * 0.05);
  ctx.beginPath();
  for (var row = 0; row < area.h * 2; row++) {
    var y = area.y + row * 0.5;
    var a = worldToScreen(area.x, y), b = worldToScreen(area.x + area.w, y);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    // board joints, shifted every other row
    for (var jx = (row % 2) * 1.5 + 1; jx < area.w; jx += 3) {
      var j = worldToScreen(area.x + jx, y);
      ctx.moveTo(j.x, j.y); ctx.lineTo(j.x, j.y + camera.scale * 0.5);
    }
  }
  ctx.stroke();
}

// How far a newly opened area has faded in: 0 = just opened, 1 = done.
function areaReveal(state, area) {
  if (area.opensWith === null) return 1;
  var at = state.builtAt[area.opensWith];
  if (at === undefined) return 1; // opened in an earlier session
  return Math.min(1, (state.time - at) / CONFIG.effects.areaRevealTime);
}

// The floor of every open area, and an outline + sign for locked areas.
function drawAreas(state) {
  CONFIG.areas.forEach(function (area) {
    if (!isAreaOpen(state, area)) { drawLockedArea(state, area); return; }
    ctx.save();
    ctx.globalAlpha = areaReveal(state, area);
    if (area.floorStyle === 'planks') drawPlanks(area);
    else drawCheckerboard(area.x, area.y, area.w, area.h, area.floor[0], area.floor[1]);
    ctx.restore();
  });
}

// A locked area: dashed outline on the grass and a little wooden sign.
function drawLockedArea(state, area) {
  var k = camera.scale;
  var s = worldToScreen(area.x, area.y);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 246, 232, 0.12)';
  ctx.fillRect(s.x, s.y, area.w * k, area.h * k);
  ctx.strokeStyle = CONFIG.colors.buildArea;
  ctx.lineWidth = Math.max(2, k * 0.08);
  ctx.setLineDash([k * 0.4, k * 0.25]);
  ctx.strokeRect(s.x, s.y, area.w * k, area.h * k);
  ctx.setLineDash([]);

  // the sign
  var pad = getPad(area.opensWith);
  var line2 = isPadVisible(state, pad) ? 'Opens for ☕ ' + formatNumber(pad.price) : 'Coming soon';
  var c = worldToScreen(area.x + area.w / 2, area.y + area.h / 2);
  setFont(0.6, 800);
  var w = Math.max(ctx.measureText('🔒 ' + area.name).width, k * 4) + k * 0.9;
  var h = k * 1.6;
  fillRoundRect(c.x - k * 0.08, c.y, k * 0.16, k * 1.5, k * 0.05, CONFIG.colors.woodDark); // post
  fillRoundRect(c.x - w / 2, c.y - h / 2, w, h, k * 0.25, CONFIG.colors.woodDark);
  fillRoundRect(c.x - w / 2 + k * 0.08, c.y - h / 2 + k * 0.08, w - k * 0.16, h - k * 0.16, k * 0.2, CONFIG.colors.woodLight);
  ctx.fillStyle = CONFIG.colors.padText;
  ctx.fillText('🔒 ' + area.name, c.x, c.y - k * 0.28);
  setFont(0.42, 600);
  ctx.fillText(line2, c.x, c.y + k * 0.34);
  ctx.restore();
}

// The stone path from the front door to the edge of the world.
function drawPath() {
  var cafe = CONFIG.areas[0];
  var door = cafe.openings[0];
  var top = cafe.y + cafe.h;
  fillWorldRect(door.x + 0.2, top, door.w - 0.4, CONFIG.world.height - top, CONFIG.colors.path);
}

// Draw the walls. Indoors: solid brown walls. Outdoors: a wooden fence.
function drawWalls() {
  var col = CONFIG.colors;
  wallRects.forEach(function (r) {
    if (r.style !== 'fence') { fillWorldRect(r.x, r.y, r.w, r.h, col.wall); return; }
    // fence: a rail with posts every tile
    var horizontal = r.w >= r.h;
    var k = camera.scale;
    var s = worldToScreen(r.x, r.y);
    var w = r.w * k, h = r.h * k;
    if (horizontal) fillRoundRect(s.x, s.y + h * 0.3, w, h * 0.4, h * 0.2, col.fence);
    else fillRoundRect(s.x + w * 0.3, s.y, w * 0.4, h, w * 0.2, col.fence);
    var len = horizontal ? r.w : r.h;
    for (var i = 0; i <= len; i += 1) {
      var px = horizontal ? s.x + Math.min(i, len) * k : s.x + w / 2;
      var py = horizontal ? s.y + h / 2 : s.y + Math.min(i, len) * k;
      fillRoundRect(px - k * 0.16, py - k * 0.16, k * 0.32, k * 0.32, k * 0.08, col.fenceDark);
    }
  });
}

// Set the canvas font, sized in tiles so text scales with the zoom.
function setFont(sizeInTiles, weight) {
  ctx.font = (weight || 600) + ' ' + Math.round(sizeInTiles * camera.scale) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

// Draw every pad that is currently on the floor (their name labels are
// drawn later, on top of everything: see drawPadLabels).
// Affordable pads glow and pulse; pads you can't afford yet are muted.
// Expansion pads are bigger and golden, with sparkles.
// Upgrade pads are blue, with a little arrow.
function drawPads(state) {
  var col = CONFIG.colors;
  getVisiblePads(state).forEach(function (pad) {
    var r = pad.pad;
    var affordable = state.cash >= pad.price;
    var golden = pad.builds.type === 'expansion';
    var upgrade = pad.builds.type === 'upgrade';
    var glowColor = golden ? col.padGold : (upgrade ? col.padUpgrade : col.pad);
    var s = worldToScreen(r.x, r.y);
    var k = camera.scale;
    var w = r.w * k, h = r.h * k;

    ctx.save();
    // soft pulsing glow around affordable pads
    if (affordable || golden) {
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = k * (golden ? 0.5 + 0.6 * pulse : 0.3 + 0.4 * pulse);
    }
    ctx.fillStyle = affordable ? glowColor : (golden ? '#e6d3a8' : (upgrade ? '#bfcad2' : col.padTooPricey));
    roundRectPath(s.x, s.y, w, h, k * 0.25);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = golden ? '#fff3c4' : 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(2, k * (golden ? 0.1 : 0.07));
    ctx.stroke();

    // sparkles twinkling around golden pads
    if (golden) {
      for (var i = 0; i < 4; i++) {
        var t = (state.time * 0.7 + i * 0.25) % 1;
        var sx = s.x + w * ((i * 0.37 + 0.1) % 1), sy = s.y + h * (i % 2 ? 0.15 : 0.85) - t * k * 0.6;
        ctx.globalAlpha = Math.sin(t * Math.PI);
        drawSparkle(sx, sy, k * 0.14, '#fff3c4');
      }
      ctx.globalAlpha = 1;
    }

    // the "buying" ring: fills up clockwise around the pad while you stand on it
    var progress = getPadHoldProgress(state, pad);
    if (progress > 0) drawHoldRing(s.x, s.y, w, h, k, progress);

    // price on the pad (upgrade pads get an arrow instead of the cup)
    ctx.fillStyle = col.padText;
    setFont(golden ? 0.62 : 0.55, 800);
    var icon = upgrade ? '⬆ ' : '☕ ';
    ctx.fillText(pad.price === 0 ? 'FREE' : icon + formatNumber(pad.price), s.x + w / 2, s.y + h / 2);
    ctx.restore();
  });
}

// A loading bar along the border of a pad (screen pixels x, y, w, h):
// a faint track all the way round, and a bright line that grows clockwise
// from the top-left corner as progress goes from 0 to 1.
function drawHoldRing(x, y, w, h, k, progress) {
  var pad = k * 0.1; // the ring sits just outside the pad
  var rx = x - pad, ry = y - pad, rw = w + pad * 2, rh = h + pad * 2;
  var r = Math.min(k * 0.33, rw / 2, rh / 2);
  // length of the whole border: straight sides plus four quarter circles
  var length = 2 * (rw + rh) - 8 * r + 2 * Math.PI * r;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(4, k * 0.17);
  roundRectPath(rx, ry, rw, rh, r);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.stroke();
  // a dashed line with one dash as long as the progress = a partial border
  ctx.setLineDash([length * progress, length]);
  ctx.strokeStyle = CONFIG.colors.holdRing;
  roundRectPath(rx, ry, rw, rh, r);
  ctx.stroke();
  ctx.restore();
}

// The name labels above pads. Drawn after furniture and characters, so
// nothing can ever cover them.
function drawPadLabels(state) {
  var k = camera.scale;
  getVisiblePads(state).forEach(function (pad) {
    var r = pad.pad;
    var s = worldToScreen(r.x + r.w / 2, r.y);
    var golden = pad.builds.type === 'expansion';
    var label = (golden ? '✨ ' : '') + pad.name + (pad.builds.cozy ? '  ♥+' + pad.builds.cozy + '%' : '');
    ctx.save();
    setFont(0.45, golden ? 800 : 600);
    var labelW = ctx.measureText(label).width + k * 0.5;
    var labelH = k * 0.65;
    var lx = s.x - labelW / 2;
    var ly = s.y - labelH - k * 0.15;
    ctx.fillStyle = golden ? 'rgba(255, 238, 190, 0.96)' : 'rgba(255, 246, 232, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = k * 0.15;
    roundRectPath(lx, ly, labelW, labelH, labelH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = CONFIG.colors.padText;
    ctx.fillText(label, s.x, ly + labelH / 2);
    ctx.restore();
  });
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
var SHADOWED_TYPES = { counter: true, machine: true, bookshelf: true, chalkboard: true, breadshelf: true,
                       display: true, fireplace: true, piano: true, records: true, sacks: true, flowerbed: true };

// Draw bought items. onlyFloor = true draws just the flat floor items
// (rugs), false draws everything else.
function drawBuiltItems(state, onlyFloor) {
  getBoughtPads(state).forEach(function (pad) {
    var b = pad.builds;
    if (b.type === 'expansion' || b.type === 'upgrade' || b.type === 'helper') return; // nothing to draw on the floor
    if (!!b.floor !== onlyFloor) return;

    var scale = popScale(state, pad.id);
    if (scale <= 0) return;
    var k = camera.scale * scale;
    var w = b.w * k, h = b.h * k;
    // grow from the item's center
    var center = worldToScreen(b.x + b.w / 2, b.y + b.h / 2);
    var x = center.x - w / 2, y = center.y - h / 2;
    // skip items that are completely off screen (with a margin for glows)
    var m = camera.scale * 3;
    if (x > window.innerWidth + m || y > window.innerHeight + m || x + w < -m || y + h < -m) return;

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
  var list = state.customers.concat(state.helpers || []);
  list.push(state.player);
  list.sort(function (a, b) { return a.y - b.y; });

  list.forEach(function (ch) {
    var s = worldToScreen(ch.x, ch.y);
    var r = ch.radius * camera.scale;
    var bob = ch.moving ? Math.abs(Math.sin(ch.walkTime * 12)) * r * 0.15 : 0;
    // seated customers sway gently, as if humming along (each to their own beat)
    if (ch.step === 'waiting' || ch.step === 'drinking') bob = (Math.sin(state.time * 2.2 + ch.id) + 1) * r * 0.05;
    if (ch === state.player) {
      var col = CONFIG.colors;
      drawCharacter(s.x, s.y, r,
        { shirt: col.playerApron, skin: col.playerBody, hair: col.playerHair, hairStyle: 'short' },
        { faceX: ch.faceX, faceY: ch.faceY, bob: bob, apron: true });
    } else if (ch.home) {
      // a helper: cap, apron and their own shirt color
      drawCharacter(s.x, s.y, r, ch.look, { faceX: ch.faceX, faceY: ch.faceY, bob: bob, apron: true });
    } else {
      drawCharacter(s.x, s.y, r, ch.look, { faceX: ch.faceX, faceY: ch.faceY, bob: bob, vip: ch.vip, time: state.time });
      // enjoying their order: the items in front of them
      if (ch.step === 'drinking') {
        var n = ch.ordered.length;
        ch.ordered.forEach(function (item, i) {
          var ix, iy;
          if (Math.abs(ch.faceX) > 0.5) {
            // sitting beside the table: items in front, one behind the other
            ix = s.x + ch.faceX * r * (0.75 + i * 0.55); iy = s.y - r * 0.1;
          } else {
            // sitting above/below the table: items side by side in front
            ix = s.x + (i - (n - 1) / 2) * r * 0.75; iy = s.y + ch.faceY * r * 0.6;
          }
          drawMenuItem(item, ix, iy, camera.scale * 0.42);
        });
      }
    }
  });
}

// Speech bubbles over customers, and what the barista is holding.
// Drawn after all characters so nothing covers them.
function drawBubblesAndCarried(state) {
  var k = camera.scale;
  state.customers.forEach(function (c) {
    var s = worldToScreen(c.x, c.y);
    var top = s.y - c.radius * k * 1.4;
    if (c.step === 'ordering') {
      // thinking "..." with dots that light up one by one
      drawBubble(s.x, top, k, 1, false, function (cx, cy, size) {
        var lit = Math.floor(state.time * 3) % 3;
        for (var i = 0; i < 3; i++) {
          fillCircle(cx + (i - 1) * size * 0.28, cy, size * 0.09, i === lit ? '#3b2a20' : '#c9b9a3');
        }
      });
    } else if (c.orders.length > 0) {
      // what they still want; glows green if the barista is holding any of it
      var hasIt = c.orders.some(function (o) { return state.carrying.indexOf(o) !== -1; });
      var bounce = c.step === 'waiting' ? Math.abs(Math.sin(state.time * 3 + c.id)) * k * 0.08 : 0;
      var n = c.orders.length;
      // a freshly placed order pops up from the tail of the bubble
      var grow = bubbleScale(state, c);
      ctx.save();
      ctx.translate(s.x, top);
      ctx.scale(grow, grow);
      ctx.translate(-s.x, -top);
      drawBubble(s.x, top - bounce, k, n, hasIt, function (cx, cy, size) {
        c.orders.forEach(function (item, i) {
          drawMenuItem(item, cx + (i - (n - 1) / 2) * size * 1.05, cy, size * 0.95);
        });
      });
      ctx.restore();
    }
  });

  // each helper's item, floating above their head
  (state.helpers || []).forEach(function (h) {
    if (!h.carrying) return;
    var hs = worldToScreen(h.x, h.y);
    var hy = hs.y - h.radius * k * 2.1 + Math.sin(state.time * 5 + 1) * k * 0.04;
    fillCircle(hs.x, hy, k * 0.27, 'rgba(255, 250, 242, 0.85)');
    drawMenuItem(h.carrying, hs.x, hy, k * 0.45);
  });

  // the barista's items, floating in a row above their head
  var p = state.player;
  var ps = worldToScreen(p.x, p.y);
  var n = state.carrying.length;
  state.carrying.forEach(function (item, i) {
    var dx = (i - (n - 1) / 2) * k * 0.6;
    var dy = ps.y - p.radius * k * 2.1 + Math.sin(state.time * 5 + i) * k * 0.04;
    fillCircle(ps.x + dx, dy, k * 0.3, 'rgba(255, 250, 242, 0.85)');
    drawMenuItem(item, ps.x + dx, dy, k * 0.5);
  });
}

// How big an order bubble is: grows from 0 to 1 (with a little overshoot)
// in CONFIG.effects.bubblePopTime seconds after the customer ordered.
function bubbleScale(state, c) {
  if (c.orderedAt === undefined) return 1;
  var t = Math.min(1, (state.time - c.orderedAt) / CONFIG.effects.bubblePopTime);
  var back = 1.7; // same bouncy "ease out back" curve as items popping in
  return Math.max(0.01, 1 + (back + 1) * Math.pow(t - 1, 3) + back * Math.pow(t - 1, 2));
}

// Butterflies fluttering over the grass outside the shop. Each one drifts
// in slow loops around its own spot, flapping its wings.
// (Their spots are spread around the edges of the world, on the grass.)
var BUTTERFLY_SPOTS = [
  { x: 4, y: 6 }, { x: 15, y: 27 }, { x: 47, y: 27 }, { x: 55, y: 8 }, { x: 24, y: 2 },
  { x: 3, y: 25 }, { x: 56, y: 22 }, { x: 44, y: 3 },
];
function drawButterflies(state) {
  var k = camera.scale, t = state.time;
  var count = Math.min(CONFIG.effects.butterflies, BUTTERFLY_SPOTS.length);
  for (var i = 0; i < count; i++) {
    var spot = BUTTERFLY_SPOTS[i];
    // a slow figure-of-eight around the spot
    var x = spot.x + Math.sin(t * 0.31 + i * 1.7) * 2.2;
    var y = spot.y + Math.sin(t * 0.53 + i * 2.3) * 1.1;
    var s = worldToScreen(x, y);
    if (s.x < -k || s.y < -k || s.x > window.innerWidth + k || s.y > window.innerHeight + k) continue;
    var flap = 0.45 + 0.55 * Math.abs(Math.sin(t * 9 + i)); // wings open and close
    var size = k * 0.26;
    var color = CONFIG.colors.confetti[i % CONFIG.colors.confetti.length];
    // a tiny shadow on the grass below
    ctx.globalAlpha = 0.15;
    fillEllipse(s.x, s.y + k * 0.5, size, size * 0.35, '#000000');
    ctx.globalAlpha = 1;
    // two wings on each side, then the body
    fillEllipse(s.x - size * 0.7 * flap, s.y - size * 0.3, size * 0.8 * flap, size * 0.7, color);
    fillEllipse(s.x + size * 0.7 * flap, s.y - size * 0.3, size * 0.8 * flap, size * 0.7, color);
    fillEllipse(s.x - size * 0.5 * flap, s.y + size * 0.4, size * 0.55 * flap, size * 0.5, color);
    fillEllipse(s.x + size * 0.5 * flap, s.y + size * 0.4, size * 0.55 * flap, size * 0.5, color);
    fillEllipse(s.x, s.y, size * 0.18, size * 0.75, '#3b2a20');
  }
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

// Confetti pieces from opening a new area: little spinning paper squares.
function drawConfetti(state) {
  var life = CONFIG.effects.confettiTime;
  var k = camera.scale;
  state.confetti.forEach(function (p) {
    var age = state.time - p.born;
    if (age < 0) return;
    var s = worldToScreen(p.x, p.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - age / life);
    ctx.translate(s.x, s.y);
    ctx.rotate(p.spin * age);
    ctx.fillStyle = p.color;
    // squash it as it flips, so it looks like it's tumbling
    ctx.fillRect(-k * 0.1, -k * 0.06 * Math.abs(Math.cos(age * 8 + p.spin)), k * 0.2, k * 0.12);
    ctx.restore();
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

// Draw a dashed outline showing where the café will be built.
function drawBuildArea() {
  var p = CONFIG.areas[0];
  var margin = 1.5; // tiles of space between the walls and the outline
  var s = worldToScreen(p.x + margin, p.y + margin);

  ctx.save();
  ctx.strokeStyle = CONFIG.colors.buildArea;
  ctx.lineWidth = Math.max(2, camera.scale * 0.08);
  ctx.setLineDash([camera.scale * 0.4, camera.scale * 0.25]);
  ctx.strokeRect(s.x, s.y, (p.w - margin * 2) * camera.scale, (p.h - margin * 2) * camera.scale);

  // a friendly label near the top (the middle is where the first pad sits)
  var mid = worldToScreen(p.x + p.w / 2, p.y + margin + 1.2);
  ctx.fillStyle = CONFIG.colors.buildArea;
  setFont(0.6, 600);
  ctx.fillText('Your café starts here', mid.x, mid.y);
  ctx.restore();
}

// Draw the whole world for one frame, back to front.
function drawWorld(state) {
  var w = CONFIG.world;
  var col = CONFIG.colors;

  // clear to the grass color (covers areas outside the world, too)
  ctx.fillStyle = col.grass;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  drawCheckerboard(0, 0, w.width, w.height, col.grass, col.grassDark);
  drawPath();
  drawAreas(state);
  drawWalls();
  // show the "starts here" hint only while the shop is still empty
  if (Object.keys(state.bought).length === 0) drawBuildArea();
  drawBuiltItems(state, true);  // rugs lie under everything
  drawPads(state);
  drawBuiltItems(state, false); // furniture, machines, decorations
  drawCharacters(state);
  drawPadLabels(state);         // on top, so furniture never hides them
  drawBubblesAndCarried(state);
  drawButterflies(state);       // flying, so above people and furniture
  drawFloaters(state);
  drawConfetti(state);
  drawCoins(state);
  drawJoystick(); // last, so it sits on top of everything
}
