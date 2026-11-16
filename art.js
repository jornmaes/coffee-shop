// =============================================================
// art.js — how everything looks: drinks, machines, furniture,
// decorations and characters. All drawn with simple shapes.
//
// Most functions take a position in screen pixels and `k`, the
// number of pixels per tile (camera zoom times any pop-in scale),
// so details stay the right size at any zoom.
// =============================================================

// ---------- Small drawing helpers ----------

// Trace a rounded rectangle path. Call fill() / stroke() after.
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

// Fill a rounded rectangle in one go.
function fillRoundRect(x, y, w, h, radius, color) {
  ctx.fillStyle = color;
  roundRectPath(x, y, w, h, radius);
  ctx.fill();
}

// Fill a circle.
function fillCircle(x, y, r, color) {
  if (r <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Fill an ellipse (a squashed circle).
function fillEllipse(x, y, rx, ry, color, rotation) {
  if (rx <= 0 || ry <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation || 0, 0, Math.PI * 2);
  ctx.fill();
}

// Fill a shape given as a list of [x, y] corner points.
function fillPolygon(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (var i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

// ---------- Drinks ----------

// Draw a drink as a little side-view cup. (cx, cy) is its center and
// `size` its height in pixels. The look comes from CONFIG.drinks.
function drawDrink(drinkId, cx, cy, size) {
  var look = CONFIG.drinks[drinkId].look;
  var s = size;
  var white = '#fffaf2', outline = 'rgba(59, 42, 32, 0.35)';
  ctx.save();
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.strokeStyle = outline;

  if (look.cup === 'small' || look.cup === 'mug') {
    var small = look.cup === 'small';
    var topW = s * (small ? 0.56 : 0.66), botW = s * (small ? 0.42 : 0.6);
    var top = cy - s * (small ? 0.12 : 0.3), bottom = cy + s * 0.3;
    var cupColor = small ? white : (look.topping === 'cream' ? '#e8d3c0' : white);
    // saucer under small cups
    if (small) fillEllipse(cx, bottom + s * 0.02, s * 0.46, s * 0.1, '#efe6da');
    // handle
    ctx.beginPath();
    ctx.arc(cx + topW * 0.52, (top + bottom) / 2, s * 0.13, -Math.PI / 2, Math.PI / 2);
    ctx.lineWidth = s * 0.07;
    ctx.strokeStyle = cupColor;
    ctx.stroke();
    // cup body
    fillPolygon([[cx - topW / 2, top], [cx + topW / 2, top], [cx + botW / 2, bottom], [cx - botW / 2, bottom]], cupColor);
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.strokeStyle = outline;
    ctx.stroke();
    // what's inside, seen over the rim
    drawTopping(look, cx, top, topW * 0.46, s);

  } else {
    // glasses: 'glass' (latte) and 'tall' (iced coffee)
    var tall = look.cup === 'tall';
    var gTopW = s * (tall ? 0.5 : 0.56), gBotW = s * (tall ? 0.4 : 0.44);
    var gTop = cy - s * 0.42, gBot = cy + s * 0.38;
    var glassPoly = [[cx - gTopW / 2, gTop], [cx + gTopW / 2, gTop], [cx + gBotW / 2, gBot], [cx - gBotW / 2, gBot]];
    // the drink inside (clipped to the glass shape)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(glassPoly[0][0], glassPoly[0][1]);
    for (var i = 1; i < 4; i++) ctx.lineTo(glassPoly[i][0], glassPoly[i][1]);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(cx - s, gTop, s * 2, gBot - gTop);
    if (tall) {
      ctx.fillStyle = look.liquid;
      ctx.fillRect(cx - s, gTop + s * 0.14, s * 2, gBot - gTop);
      // ice cubes
      ctx.fillStyle = 'rgba(235, 248, 255, 0.85)';
      ctx.fillRect(cx - s * 0.17, gTop + s * 0.18, s * 0.16, s * 0.14);
      ctx.fillRect(cx + s * 0.02, gTop + s * 0.26, s * 0.15, s * 0.13);
      ctx.fillRect(cx - s * 0.08, gTop + s * 0.42, s * 0.14, s * 0.12);
    } else {
      // latte layers: coffee at the bottom, milky middle, foam on top
      ctx.fillStyle = look.liquid;
      ctx.fillRect(cx - s, gTop + s * 0.5, s * 2, s);
      ctx.fillStyle = '#d9b48f';
      ctx.fillRect(cx - s, gTop + s * 0.22, s * 2, s * 0.28);
      ctx.fillStyle = '#f6ead8';
      ctx.fillRect(cx - s, gTop + s * 0.06, s * 2, s * 0.17);
    }
    ctx.restore();
    // glass outline
    ctx.beginPath();
    ctx.moveTo(glassPoly[0][0], glassPoly[0][1]);
    for (var j = 1; j < 4; j++) ctx.lineTo(glassPoly[j][0], glassPoly[j][1]);
    ctx.closePath();
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.strokeStyle = 'rgba(90, 110, 130, 0.55)';
    ctx.stroke();
    if (tall) {
      // a striped straw
      ctx.lineWidth = s * 0.07;
      ctx.strokeStyle = '#e86a6a';
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.06, gTop + s * 0.25);
      ctx.lineTo(cx + s * 0.2, gTop - s * 0.16);
      ctx.stroke();
    } else {
      // little heart in the foam
      drawHeart(cx, gTop + s * 0.13, s * 0.11, '#b07a52');
    }
  }
  ctx.restore();
}

// The top of a cup: coffee with crema, foam, or whipped cream.
function drawTopping(look, cx, top, rx, s) {
  var ry = s * 0.08;
  if (look.topping === 'crema') {
    fillEllipse(cx, top, rx, ry, look.liquid);
    fillEllipse(cx, top, rx * 0.7, ry * 0.6, '#b9773f');
  } else if (look.topping === 'foam') {
    fillEllipse(cx, top, rx, ry, '#fbf3e6');
    fillCircle(cx - rx * 0.3, top, s * 0.025, '#8a5a3c');
    fillCircle(cx + rx * 0.2, top - ry * 0.3, s * 0.025, '#8a5a3c');
    fillCircle(cx + rx * 0.05, top + ry * 0.3, s * 0.02, '#8a5a3c');
  } else if (look.topping === 'cream') {
    // whipped cream piled above the rim, with chocolate drizzle
    fillEllipse(cx, top, rx, ry * 1.2, '#fffaf2');
    fillEllipse(cx, top - s * 0.09, rx * 0.75, s * 0.1, '#fffaf2');
    fillEllipse(cx, top - s * 0.18, rx * 0.42, s * 0.08, '#fffaf2');
    ctx.strokeStyle = '#5a3424';
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.6, top - s * 0.08);
    ctx.quadraticCurveTo(cx, top - s * 0.02, cx + rx * 0.5, top - s * 0.14);
    ctx.stroke();
  } else {
    fillEllipse(cx, top, rx, ry, look.liquid);
  }
}

// A small heart shape centered at (x, y).
function drawHeart(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.9);
  ctx.bezierCurveTo(x - size * 1.4, y - size * 0.1, x - size * 0.6, y - size * 1.1, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.6, y - size * 1.1, x + size * 1.4, y - size * 0.1, x, y + size * 0.9);
  ctx.fill();
}

// ---------- Built items ----------

// Draw one built item. (x, y, w, h) is its box in screen pixels,
// k = pixels per tile (already includes the pop-in scale).
function drawItem(pad, x, y, w, h, k, state) {
  var type = pad.builds.type;
  if (type === 'counter') drawCounter(x, y, w, h, k);
  else if (type === 'machine') drawMachine(pad, x, y, w, h, k, state);
  else if (type === 'table') drawTable(x, y, w, h, k);
  else if (type === 'flowers') drawFlowers(x, y, w, h, k);
  else if (type === 'bookshelf') drawBookshelf(x, y, w, h, k);
  else if (type === 'rug') drawRug(x, y, w, h, k);
  else if (type === 'lights') drawLights(x, y, w, h, k, state.time);
  else if (type === 'plant') drawPlant(x, y, w, h, k);
  else if (type === 'lamp') drawLamp(x, y, w, h, k);
  else if (type === 'cat') drawCat(x, y, w, h, k, state.time);
  else if (type === 'chalkboard') drawChalkboard(x, y, w, h, k);
  else {
    // unknown type: a bright box so mistakes in config are easy to spot
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x, y, w, h);
  }
}

// Wooden counter with a cash register, a stack of cups and a tip jar.
function drawCounter(x, y, w, h, k) {
  var col = CONFIG.colors;
  fillRoundRect(x, y, w, h, k * 0.3, col.wood);
  // lighter top band, clipped to the rounded shape
  ctx.save();
  ctx.clip();
  ctx.fillStyle = col.woodLight;
  ctx.fillRect(x, y, w, h * 0.55);
  ctx.restore();
  // stack of cups on the left
  for (var i = 0; i < 3; i++) {
    fillRoundRect(x + k * 0.35, y + k * (0.12 + i * 0.13), k * 0.4, k * 0.2, k * 0.06, '#fffaf2');
  }
  // tip jar
  fillRoundRect(x + w * 0.52, y + k * 0.18, k * 0.38, k * 0.5, k * 0.12, 'rgba(220, 240, 250, 0.8)');
  fillCircle(x + w * 0.52 + k * 0.19, y + k * 0.52, k * 0.08, col.coin);
  // cash register on the right, near where customers order
  var rx = x + w * 0.67, ry = y + k * 0.1;
  fillRoundRect(rx, ry, k * 1.05, k * 0.85, k * 0.18, '#4a3a30');
  fillRoundRect(rx + k * 0.15, ry + k * 0.12, k * 0.75, k * 0.25, k * 0.06, '#9fd6a0');
  fillRoundRect(rx + k * 0.2, ry + k * 0.5, k * 0.65, k * 0.2, k * 0.05, '#6b5648');
}

// An espresso-style machine in the drink's accent color. While brewing,
// coffee trickles and steam puffs; when ready, the cup waits on the tray.
function drawMachine(pad, x, y, w, h, k, state) {
  var col = CONFIG.colors;
  var drink = CONFIG.drinks[pad.builds.drink];
  var ms = state.machines[pad.id] || { ready: 0, timer: 0 };
  var brewing = ms.ready < CONFIG.machine.holds;

  // body
  fillRoundRect(x, y, w, h, k * 0.3, col.metal);
  // colored top band
  ctx.save();
  roundRectPath(x, y, w, h, k * 0.3);
  ctx.clip();
  ctx.fillStyle = drink.machineColor;
  ctx.fillRect(x, y, w, h * 0.3);
  ctx.restore();
  // a little round gauge and a button on the top band
  fillCircle(x + w * 0.2, y + h * 0.15, k * 0.1, '#fffaf2');
  fillCircle(x + w * 0.8, y + h * 0.15, k * 0.07, '#fffaf2');
  // the brew head and spout
  fillRoundRect(x + w * 0.32, y + h * 0.36, w * 0.36, h * 0.14, k * 0.06, col.metalDark);
  fillRoundRect(x + w * 0.45, y + h * 0.5, w * 0.1, h * 0.08, k * 0.03, col.metalDark);
  // drip tray
  fillRoundRect(x + w * 0.18, y + h * 0.84, w * 0.64, h * 0.1, k * 0.04, col.metalDark);

  var cupX = x + w / 2, cupY = y + h * 0.72;
  if (brewing) {
    // thin trickle of coffee from the spout
    ctx.strokeStyle = drink.look.liquid;
    ctx.lineWidth = Math.max(1, k * 0.04);
    ctx.setLineDash([k * 0.06, k * 0.05]);
    ctx.lineDashOffset = -state.time * k * 0.6;
    ctx.beginPath();
    ctx.moveTo(cupX, y + h * 0.58);
    ctx.lineTo(cupX, y + h * 0.82);
    ctx.stroke();
    ctx.setLineDash([]);
    // steam puffs rising from the top
    for (var i = 0; i < 2; i++) {
      var t = (state.time * 0.8 + i * 0.5) % 1;
      ctx.globalAlpha = 0.5 * (1 - t);
      fillCircle(x + w * (0.35 + i * 0.3), y - t * k * 0.6, k * (0.08 + t * 0.1), '#ffffff');
    }
    ctx.globalAlpha = 1;
    // progress bar under the machine
    var progress = Math.min(1, ms.timer / drink.brewSeconds);
    fillRoundRect(x + w * 0.1, y + h + k * 0.08, w * 0.8, k * 0.12, k * 0.06, 'rgba(59, 42, 32, 0.25)');
    fillRoundRect(x + w * 0.1, y + h + k * 0.08, w * 0.8 * progress, k * 0.12, k * 0.06, drink.machineColor);
  } else {
    // a finished drink waiting on the tray, bobbing gently
    var bob = Math.sin(state.time * 4) * k * 0.03;
    drawDrink(pad.builds.drink, cupX, cupY + bob, k * 0.55);
  }
}

// A round table with a chair on each side and a tiny flower in the middle.
function drawTable(x, y, w, h, k) {
  var col = CONFIG.colors;
  var off = CONFIG.customers.seatOffset * k;
  var cx = x + w / 2, cy = y + h / 2;
  // chairs (where customers sit)
  [cx - w / 2 - off, cx + w / 2 + off].forEach(function (chx) {
    fillRoundRect(chx - k * 0.33, cy - k * 0.33, k * 0.66, k * 0.66, k * 0.18, col.woodDark);
    fillRoundRect(chx - k * 0.25, cy - k * 0.25, k * 0.5, k * 0.5, k * 0.14, col.wood);
  });
  // table top
  fillCircle(cx, cy, Math.min(w, h) * 0.5, col.woodDark);
  fillCircle(cx, cy, Math.min(w, h) * 0.45, col.woodLight);
  // a tiny flower in a little pot
  fillCircle(cx, cy, k * 0.12, '#fffaf2');
  fillCircle(cx, cy - k * 0.04, k * 0.07, '#f29fb8');
}

// A vase of flowers standing on the counter.
function drawFlowers(x, y, w, h, k) {
  var cx = x + w / 2;
  // stems
  ctx.strokeStyle = '#5f9a5a';
  ctx.lineWidth = Math.max(1, k * 0.05);
  [[-0.22, 0.18], [0, 0.1], [0.22, 0.2]].forEach(function (p) {
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.62);
    ctx.lineTo(cx + p[0] * k, y + p[1] * k + k * 0.12);
    ctx.stroke();
  });
  // blossoms: petals around a yellow middle
  [[-0.22, 0.18, '#f29fb8'], [0, 0.1, '#fffaf2'], [0.22, 0.2, '#f4b860']].forEach(function (p) {
    var fx = cx + p[0] * k, fy = y + p[1] * k + k * 0.1;
    for (var a = 0; a < 5; a++) {
      var ang = a / 5 * Math.PI * 2;
      fillCircle(fx + Math.cos(ang) * k * 0.08, fy + Math.sin(ang) * k * 0.08, k * 0.07, p[2]);
    }
    fillCircle(fx, fy, k * 0.05, '#f2c14e');
  });
  // vase
  fillRoundRect(cx - k * 0.17, y + h * 0.55, k * 0.34, h * 0.42, k * 0.12, '#6fa8dc');
  fillRoundRect(cx - k * 0.17, y + h * 0.62, k * 0.34, k * 0.06, k * 0.03, '#9cc6ec');
}

// A bookshelf against the wall, full of colorful books and a tiny plant.
function drawBookshelf(x, y, w, h, k) {
  var col = CONFIG.colors;
  fillRoundRect(x, y, w, h, k * 0.15, col.woodDark);
  var bookColors = ['#e57a6e', '#6fa8dc', '#f4b860', '#7cc4a4', '#9b8ae0', '#f29fb8', '#e8c170'];
  var shelves = 3;
  var inner = h - k * 0.2;
  for (var s = 0; s < shelves; s++) {
    var sy = y + k * 0.1 + s * inner / shelves;
    var sh = inner / shelves - k * 0.06;
    fillRoundRect(x + k * 0.08, sy, w - k * 0.16, sh, k * 0.05, '#5a3a28');
    // books lying along the shelf: stripes of different lengths and colors
    var books = 4;
    for (var b = 0; b < books; b++) {
      if (s === 0 && b === 3) continue; // room for the plant
      var len = (0.55 + ((s * 7 + b * 3) % 4) * 0.1) * (w - k * 0.2);
      fillRoundRect(x + k * 0.1, sy + k * 0.03 + b * sh / books, len, sh / books - k * 0.03, k * 0.03,
        bookColors[(s * 3 + b) % bookColors.length]);
    }
  }
  // a little plant on the top shelf
  fillCircle(x + w * 0.65, y + k * 0.1 + inner / shelves * 0.78, k * 0.1, '#7cb36a');
  fillCircle(x + w * 0.5, y + k * 0.1 + inner / shelves * 0.8, k * 0.08, '#5f9a5a');
}

// A warm patterned rug lying on the floor.
function drawRug(x, y, w, h, k) {
  // fringe on the short ends
  ctx.strokeStyle = '#f2e3c6';
  ctx.lineWidth = Math.max(1, k * 0.04);
  for (var fx = x + k * 0.3; fx < x + w - k * 0.2; fx += k * 0.25) {
    ctx.beginPath();
    ctx.moveTo(fx, y - k * 0.12); ctx.lineTo(fx, y + k * 0.1);
    ctx.moveTo(fx, y + h - k * 0.1); ctx.lineTo(fx, y + h + k * 0.12);
    ctx.stroke();
  }
  fillRoundRect(x, y, w, h, k * 0.4, '#c96f4a');
  fillRoundRect(x + k * 0.25, y + k * 0.25, w - k * 0.5, h - k * 0.5, k * 0.3, '#f2e3c6');
  fillRoundRect(x + k * 0.4, y + k * 0.4, w - k * 0.8, h - k * 0.8, k * 0.25, '#d98a5f');
  // a row of diamonds down the middle
  var cx = x + w / 2;
  for (var dy = y + k * 0.9; dy < y + h - k * 0.6; dy += k * 0.9) {
    fillPolygon([[cx, dy - k * 0.3], [cx + k * 0.3, dy], [cx, dy + k * 0.3], [cx - k * 0.3, dy]], '#f2e3c6');
  }
}

// A string of twinkling fairy lights along the back wall.
function drawLights(x, y, w, h, k, time) {
  var hooks = 8;
  var segW = w / hooks;
  ctx.strokeStyle = '#3b2a20';
  ctx.lineWidth = Math.max(1, k * 0.03);
  ctx.beginPath();
  for (var i = 0; i < hooks; i++) {
    var sx = x + i * segW;
    ctx.moveTo(sx, y);
    ctx.quadraticCurveTo(sx + segW / 2, y + h * 0.9, sx + segW, y);
  }
  ctx.stroke();
  // bulbs hang along each dip of the string
  var colors = ['#ffd36b', '#f29fb8', '#9fe0c0', '#ffb36b'];
  var n = 0;
  for (var j = 0; j < hooks; j++) {
    for (var b = 1; b <= 3; b++) {
      var t = b / 4;
      var bx = x + j * segW + segW * t;
      var by = y + 2 * (1 - t) * t * h * 0.9 + k * 0.08; // follows the curve
      var twinkle = 0.65 + 0.35 * Math.sin(time * 2.5 + n * 1.7);
      ctx.save();
      ctx.globalAlpha = twinkle;
      ctx.shadowColor = colors[n % colors.length];
      ctx.shadowBlur = k * 0.35;
      fillCircle(bx, by, k * 0.09, colors[n % colors.length]);
      ctx.restore();
      n++;
    }
  }
}

// A big leafy plant in a terracotta pot.
function drawPlant(x, y, w, h, k) {
  var cx = x + w / 2, cy = y + h / 2;
  // leaves first, spreading out from the middle
  var leaf = '#5f9a5a', leafLight = '#7cb36a';
  for (var i = 0; i < 7; i++) {
    var ang = i / 7 * Math.PI * 2 + 0.3;
    fillEllipse(cx + Math.cos(ang) * k * 0.35, cy + Math.sin(ang) * k * 0.35 - k * 0.1,
      k * 0.32, k * 0.14, i % 2 ? leaf : leafLight, ang);
  }
  fillCircle(cx, cy - k * 0.1, k * 0.18, leafLight);
  // pot
  fillCircle(cx, cy + k * 0.12, k * 0.3, '#c9774f');
  fillCircle(cx, cy + k * 0.12, k * 0.22, '#5a3a28');
  fillCircle(cx, cy + k * 0.05, k * 0.14, leaf);
}

// A reading lamp with a soft warm glow around it.
function drawLamp(x, y, w, h, k) {
  var cx = x + w / 2, cy = y + h / 2;
  var glow = ctx.createRadialGradient(cx, cy, k * 0.2, cx, cy, k * 2.4);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.35)');
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, k * 2.4, 0, Math.PI * 2);
  ctx.fill();
  fillCircle(cx, cy, w * 0.5, '#e8c170');
  fillCircle(cx, cy, w * 0.38, '#fff3d0');
  fillCircle(cx, cy, w * 0.12, '#3b2a20');
}

// A sleepy orange cat curled up on a cushion. It breathes and snores "z".
function drawCat(x, y, w, h, k, time) {
  var cx = x + w / 2, cy = y + h / 2;
  fillEllipse(cx, cy, w * 0.5, h * 0.5, '#b9a3d9');
  fillEllipse(cx, cy, w * 0.42, h * 0.4, '#cbb8e6');
  var breathe = 1 + Math.sin(time * 2) * 0.04;
  // tail curling around
  ctx.strokeStyle = '#e09a4f';
  ctx.lineWidth = k * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx + k * 0.05, cy + k * 0.05, k * 0.3, 0.2, 2.2);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // body
  fillEllipse(cx + k * 0.05, cy, k * 0.3 * breathe, k * 0.22 * breathe, '#f0a85a');
  fillEllipse(cx + k * 0.12, cy - k * 0.02, k * 0.12, k * 0.08, '#f6c48a');
  // head with ears
  var hx = cx - k * 0.25, hy = cy - k * 0.04;
  fillPolygon([[hx - k * 0.15, hy - k * 0.05], [hx - k * 0.12, hy - k * 0.24], [hx - k * 0.01, hy - k * 0.1]], '#e09a4f');
  fillPolygon([[hx + k * 0.15, hy - k * 0.05], [hx + k * 0.12, hy - k * 0.24], [hx + k * 0.01, hy - k * 0.1]], '#e09a4f');
  fillCircle(hx, hy, k * 0.17, '#f0a85a');
  // closed sleepy eyes
  ctx.strokeStyle = '#3b2a20';
  ctx.lineWidth = Math.max(1, k * 0.025);
  ctx.beginPath();
  ctx.arc(hx - k * 0.06, hy, k * 0.04, 0.2, Math.PI - 0.2);
  ctx.moveTo(hx + k * 0.1, hy);
  ctx.arc(hx + k * 0.06, hy, k * 0.04, 0.2, Math.PI - 0.2);
  ctx.stroke();
  fillCircle(hx, hy + k * 0.06, k * 0.025, '#e86a8a');
  // floating "z"
  var t = (time * 0.5) % 1;
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = '#6b5648';
  ctx.font = '700 ' + Math.round(k * (0.25 + t * 0.15)) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('z', hx + k * 0.2 + t * k * 0.2, hy - k * 0.3 - t * k * 0.5);
  ctx.globalAlpha = 1;
}

// A little chalkboard sign showing the menu.
function drawChalkboard(x, y, w, h, k) {
  var col = CONFIG.colors;
  fillRoundRect(x, y, w, h, k * 0.12, col.woodDark);
  fillRoundRect(x + k * 0.08, y + k * 0.08, w - k * 0.16, h - k * 0.16, k * 0.06, '#3f5a4a');
  ctx.fillStyle = '#f2efe6';
  ctx.font = '700 ' + Math.round(k * 0.2) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MENU', x + w / 2, y + h * 0.3);
  ctx.strokeStyle = 'rgba(242, 239, 230, 0.7)';
  ctx.lineWidth = Math.max(1, k * 0.03);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.55); ctx.lineTo(x + w * 0.75, y + h * 0.55);
  ctx.moveTo(x + w * 0.3, y + h * 0.72); ctx.lineTo(x + w * 0.7, y + h * 0.72);
  ctx.stroke();
  drawHeart(x + w * 0.82, y + h * 0.3, k * 0.06, '#f29fb8');
}

// ---------- Characters ----------

// Draw a round little person seen from above-front.
//   look: { shirt, skin, hair, hairStyle }
//   opts: { faceX, faceY, bob, apron }
function drawCharacter(sx, sy, r, look, opts) {
  var bob = opts.bob || 0;
  // shadow on the floor (doesn't bounce)
  fillEllipse(sx, sy + r * 0.7, r, r * 0.45, CONFIG.colors.shadow);
  // body
  fillCircle(sx, sy - bob, r, look.shirt);
  if (opts.apron) {
    // a cream apron with a little pocket
    fillRoundRect(sx - r * 0.5, sy - bob + r * 0.05, r, r * 0.75, r * 0.25, '#f6ead8');
    fillRoundRect(sx - r * 0.2, sy - bob + r * 0.3, r * 0.4, r * 0.25, r * 0.08, '#e8d6bb');
  }
  // head, nudged a little in the facing direction
  var hx = sx + opts.faceX * r * 0.2;
  var hy = sy - bob - r * 0.35 + opts.faceY * r * 0.15;
  var hr = r * 0.62;
  // long hair goes behind the head
  if (look.hairStyle === 'long') fillRoundRect(hx - hr * 1.05, hy - hr * 0.5, hr * 2.1, hr * 1.6, hr * 0.6, look.hair);
  fillCircle(hx, hy, hr, look.skin);
  // hair on top
  if (look.hairStyle === 'cap') {
    ctx.fillStyle = look.shirt;
    ctx.beginPath();
    ctx.arc(hx, hy - hr * 0.1, hr * 1.02, Math.PI, Math.PI * 2);
    ctx.fill();
    fillRoundRect(hx - hr * 0.2 + opts.faceX * hr * 0.6, hy - hr * 0.2, hr * 1.1, hr * 0.25, hr * 0.12, look.shirt);
  } else {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(hx, hy - hr * 0.05, hr * 1.04, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    if (look.hairStyle === 'bun') fillCircle(hx, hy - hr * 1.05, hr * 0.38, look.hair);
  }
  // face (only when facing somewhat toward the screen or sideways)
  if (opts.faceY > -0.5) {
    var ex = opts.faceX * r * 0.22, ey = opts.faceY * r * 0.12 + hr * 0.15;
    fillCircle(hx - r * 0.22 + ex, hy + ey, r * 0.08, '#3b2a20');
    fillCircle(hx + r * 0.22 + ex, hy + ey, r * 0.08, '#3b2a20');
    // rosy cheeks
    ctx.globalAlpha = 0.45;
    fillCircle(hx - r * 0.36 + ex, hy + ey + r * 0.14, r * 0.09, '#e86a8a');
    fillCircle(hx + r * 0.36 + ex, hy + ey + r * 0.14, r * 0.09, '#e86a8a');
    ctx.globalAlpha = 1;
  }
}

// A speech bubble above a character. (sx, sy) is where the tail points.
// `drawInside(cx, cy, size)` draws the contents.
function drawBubble(sx, sy, k, highlight, drawInside) {
  var bw = k * 0.95, bh = k * 0.95;
  var bx = sx - bw / 2, by = sy - bh - k * 0.18;
  ctx.save();
  if (highlight) {
    ctx.shadowColor = '#7ccf7a';
    ctx.shadowBlur = k * 0.45;
  }
  ctx.fillStyle = '#fffaf2';
  roundRectPath(bx, by, bw, bh, k * 0.28);
  ctx.fill();
  ctx.shadowBlur = 0;
  // the little tail
  fillPolygon([[sx - k * 0.14, by + bh - 1], [sx + k * 0.14, by + bh - 1], [sx, sy]], '#fffaf2');
  if (highlight) {
    ctx.strokeStyle = '#7ccf7a';
    ctx.lineWidth = Math.max(2, k * 0.07);
    roundRectPath(bx, by, bw, bh, k * 0.28);
    ctx.stroke();
  }
  drawInside(sx, by + bh / 2, bh * 0.7);
  ctx.restore();
}
