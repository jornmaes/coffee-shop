// =============================================================
// art.js — how everything looks: drinks, treats, machines,
// furniture, decorations and characters. All simple shapes.
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

// Draw a line from (x1, y1) to (x2, y2).
function strokeLine(x1, y1, x2, y2, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, width);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
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

// A 4-pointed twinkle.
function drawSparkle(x, y, size, color) {
  var s = size, t = size * 0.25;
  fillPolygon([[x, y - s], [x + t, y - t], [x + s, y], [x + t, y + t], [x, y + s], [x - t, y + t], [x - s, y], [x - t, y - t]], color);
}

// A 5-pointed star.
function drawStar(x, y, size, color) {
  var pts = [];
  for (var i = 0; i < 10; i++) {
    var r = i % 2 === 0 ? size : size * 0.45;
    var a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  fillPolygon(pts, color);
}

// A music note (♪) floating up, for the piano and record player.
function drawFloatingNotes(x, y, k, time, color) {
  for (var i = 0; i < 2; i++) {
    var t = (time * 0.45 + i * 0.5) % 1;
    ctx.globalAlpha = Math.sin(t * Math.PI);
    ctx.fillStyle = color;
    ctx.font = '700 ' + Math.round(k * 0.38) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i ? '♫' : '♪', x + Math.sin(t * 6 + i) * k * 0.2 + i * k * 0.3, y - t * k * 1.1);
  }
  ctx.globalAlpha = 1;
}

// ---------- Menu items (drinks and treats) ----------

// Draw a menu item at (cx, cy), about `size` pixels tall.
// Treats get their own shapes; drinks are side-view cups. The look comes
// from CONFIG.menu.
function drawMenuItem(itemId, cx, cy, size) {
  var look = CONFIG.menu[itemId].look;
  if (look.treat) drawTreat(look.treat, cx, cy, size);
  else drawDrink(look, cx, cy, size);
}

// A drink in a cup or glass.
function drawDrink(look, cx, cy, size) {
  var s = size;
  var white = '#fffaf2', outline = 'rgba(59, 42, 32, 0.35)';
  ctx.save();
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.strokeStyle = outline;

  if (look.cup === 'small' || look.cup === 'mug') {
    var small = look.cup === 'small';
    var topW = s * (small ? 0.56 : 0.66), botW = s * (small ? 0.42 : 0.6);
    var top = cy - s * (small ? 0.12 : 0.3), bottom = cy + s * 0.3;
    var cupColor = small ? white : (look.topping === 'cream' ? '#e8d3c0' : look.topping === 'marshmallow' ? '#e86a6a' : white);
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
    // a little white heart on the red hot chocolate mug
    if (look.topping === 'marshmallow') drawHeart(cx, (top + bottom) / 2 + s * 0.04, s * 0.09, white);
    // what's inside, seen over the rim
    drawTopping(look, cx, top, topW * 0.46, s);

  } else {
    // glasses: 'glass' (layered lattes) and 'tall' (cold drinks)
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
      if (look.topping !== 'whip') {
        // ice cubes
        ctx.fillStyle = 'rgba(235, 248, 255, 0.85)';
        ctx.fillRect(cx - s * 0.17, gTop + s * 0.18, s * 0.16, s * 0.14);
        ctx.fillRect(cx + s * 0.02, gTop + s * 0.26, s * 0.15, s * 0.13);
        ctx.fillRect(cx - s * 0.08, gTop + s * 0.42, s * 0.14, s * 0.12);
      }
    } else {
      // layers: coffee/tea at the bottom, milky middle, foam on top
      ctx.fillStyle = look.liquid;
      ctx.fillRect(cx - s, gTop + s * 0.5, s * 2, s);
      ctx.fillStyle = look.milk || '#d9b48f';
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
      if (look.topping === 'whip') {
        // a dome of whipped cream with caramel drizzle
        fillEllipse(cx, gTop, gTopW * 0.55, s * 0.12, '#fffaf2');
        fillEllipse(cx, gTop - s * 0.1, gTopW * 0.4, s * 0.11, '#fffaf2');
        strokeLine(cx - gTopW * 0.3, gTop - s * 0.06, cx + gTopW * 0.3, gTop - s * 0.12, '#c98a4b', s * 0.04);
      }
      // a striped straw
      var strawColor = look.topping === 'lemon' ? '#7cc4a4' : '#e86a6a';
      strokeLine(cx + s * 0.06, gTop + s * 0.25, cx + s * 0.2, gTop - s * 0.2, strawColor, s * 0.07);
      if (look.topping === 'lemon') {
        // a lemon slice on the rim
        fillCircle(cx - gTopW * 0.42, gTop + s * 0.02, s * 0.13, '#f2c94c');
        fillCircle(cx - gTopW * 0.42, gTop + s * 0.02, s * 0.09, '#fbe9a0');
      }
    } else if (look.topping === 'leaf') {
      // a little leaf drawn in the foam
      fillEllipse(cx, gTop + s * 0.13, s * 0.1, s * 0.05, look.liquid, -0.4);
    } else {
      // little heart in the foam
      drawHeart(cx, gTop + s * 0.13, s * 0.11, look.liquid);
    }
  }
  ctx.restore();
}

// The top of a cup: coffee with crema, foam, whipped cream or marshmallows.
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
  } else if (look.topping === 'marshmallow') {
    fillEllipse(cx, top, rx, ry, look.liquid);
    fillRoundRect(cx - rx * 0.75, top - s * 0.1, s * 0.13, s * 0.11, s * 0.03, '#fffaf2');
    fillRoundRect(cx - rx * 0.05, top - s * 0.13, s * 0.13, s * 0.11, s * 0.03, '#ffd9e4');
    fillRoundRect(cx + rx * 0.45, top - s * 0.08, s * 0.12, s * 0.1, s * 0.03, '#fffaf2');
  } else {
    fillEllipse(cx, top, rx, ry, look.liquid);
  }
}

// Bakery treats, drawn on a little plate.
function drawTreat(kind, cx, cy, size) {
  var s = size;
  ctx.save();
  fillEllipse(cx, cy + s * 0.25, s * 0.48, s * 0.12, '#f3ebe0'); // plate
  if (kind === 'croissant') {
    // a crescent made of puffy segments
    var segs = [[-0.3, 0.1, 0.13], [-0.16, 0.0, 0.16], [0, -0.04, 0.18], [0.16, 0.0, 0.16], [0.3, 0.1, 0.13]];
    segs.forEach(function (g, i) {
      fillEllipse(cx + g[0] * s, cy + g[1] * s + s * 0.05, g[2] * s, g[2] * s * 0.85, i % 2 ? '#e0a052' : '#d48a3c');
    });
    fillEllipse(cx - s * 0.03, cy - s * 0.03, s * 0.08, s * 0.04, 'rgba(255, 240, 200, 0.6)'); // shine
  } else if (kind === 'cupcake') {
    // striped paper wrapper
    fillPolygon([[cx - s * 0.26, cy], [cx + s * 0.26, cy], [cx + s * 0.19, cy + s * 0.28], [cx - s * 0.19, cy + s * 0.28]], '#f29fb8');
    for (var i = -1; i <= 1; i++) strokeLine(cx + i * s * 0.1, cy + s * 0.02, cx + i * s * 0.08, cy + s * 0.26, '#fbd0dd', s * 0.03);
    // frosting swirl and a cherry
    fillEllipse(cx, cy - s * 0.02, s * 0.3, s * 0.12, '#fff0f4');
    fillEllipse(cx, cy - s * 0.12, s * 0.22, s * 0.1, '#ffe0ea');
    fillEllipse(cx, cy - s * 0.2, s * 0.13, s * 0.08, '#fff0f4');
    fillCircle(cx + s * 0.03, cy - s * 0.31, s * 0.07, '#d9455f');
    fillCircle(cx + s * 0.05, cy - s * 0.33, s * 0.02, '#ff9fae');
  } else {
    // cinnamon roll: a swirl with icing
    fillCircle(cx, cy + s * 0.02, s * 0.3, '#c98a4b');
    ctx.strokeStyle = '#8a5530';
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath();
    for (var a = 0; a < Math.PI * 5; a += 0.2) {
      var r = s * 0.04 + a * s * 0.016;
      var px = cx + Math.cos(a) * r, py = cy + s * 0.02 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // white icing drizzle
    ctx.strokeStyle = 'rgba(255, 250, 242, 0.9)';
    ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.22, cy - s * 0.1);
    ctx.quadraticCurveTo(cx - s * 0.05, cy + s * 0.12, cx + s * 0.05, cy - s * 0.15);
    ctx.quadraticCurveTo(cx + s * 0.15, cy + s * 0.1, cx + s * 0.24, cy - s * 0.02);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- Built items ----------

// Draw one built item. (x, y, w, h) is its box in screen pixels,
// k = pixels per tile (already includes the pop-in scale).
function drawItem(pad, x, y, w, h, k, state) {
  var b = pad.builds;
  var type = b.type;
  var time = state.time;
  if (type === 'counter') drawCounter(x, y, w, h, k);
  else if (type === 'machine') drawMachine(pad, x, y, w, h, k, state);
  else if (type === 'table') drawTable(b, x, y, w, h, k);
  else if (type === 'parasol') drawParasolTable(x, y, w, h, k);
  else if (type === 'armchairs') drawArmchairs(x, y, w, h, k);
  else if (type === 'flowers') drawFlowers(x, y, w, h, k);
  else if (type === 'bookshelf') drawBookshelf(x, y, w, h, k);
  else if (type === 'rug') drawRug(x, y, w, h, k, b.palette);
  else if (type === 'lights') drawLights(x, y, w, h, k, time);
  else if (type === 'plant') drawPlant(x, y, w, h, k);
  else if (type === 'lamp') drawLamp(x, y, w, h, k);
  else if (type === 'cat') drawCat(x, y, w, h, k, time);
  else if (type === 'chalkboard') drawChalkboard(x, y, w, h, k);
  else if (type === 'bunting') drawBunting(x, y, w, h, k, time);
  else if (type === 'breadshelf') drawBreadShelf(x, y, w, h, k);
  else if (type === 'display') drawDisplay(x, y, w, h, k);
  else if (type === 'sacks') drawSacks(x, y, w, h, k);
  else if (type === 'flowerbed') drawFlowerbed(x, y, w, h, k);
  else if (type === 'fountain') drawFountain(x, y, w, h, k, time);
  else if (type === 'fireplace') drawFireplace(x, y, w, h, k, time);
  else if (type === 'piano') drawPiano(x, y, w, h, k, time);
  else if (type === 'records') drawRecordPlayer(x, y, w, h, k, time);
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

// ----- Machines -----

// A machine that makes one menu item. Each style has its own body; they
// all show a progress bar while working and the finished item when ready.
function drawMachine(pad, x, y, w, h, k, state) {
  var b = pad.builds;
  var item = CONFIG.menu[b.makes];
  var ms = state.machines[pad.id] || { ready: 0, timer: 0 };
  var brewing = ms.ready < getTrayHolds(state); // still room on the tray: keep making
  var t = state.time;

  // the body; returns where the finished item sits
  var spot;
  if (b.style === 'oven') spot = drawOvenBody(x, y, w, h, k, item, brewing, t, b.makes);
  else if (b.style === 'blender') spot = drawBlenderBody(x, y, w, h, k, item, brewing, t);
  else if (b.style === 'dispenser') spot = drawDispenserBody(x, y, w, h, k, item, brewing, t);
  else if (b.style === 'pot') spot = drawPotBody(x, y, w, h, k, item, brewing, t);
  else spot = drawEspressoBody(x, y, w, h, k, item, brewing, t);

  if (brewing) {
    // progress bar under the machine
    var progress = Math.min(1, ms.timer / getBrewSeconds(state, pad));
    fillRoundRect(x + w * 0.1, y + h + k * 0.08, w * 0.8, k * 0.12, k * 0.06, 'rgba(59, 42, 32, 0.25)');
    fillRoundRect(x + w * 0.1, y + h + k * 0.08, w * 0.8 * progress, k * 0.12, k * 0.06, item.machineColor);
  }
  if (ms.ready > 0) {
    // the finished item waiting, bobbing gently, with a little sparkle
    var bob = Math.sin(t * 4) * k * 0.03;
    drawMenuItem(b.makes, spot.x, spot.y + bob, k * 0.55);
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5);
    drawSparkle(spot.x + k * 0.3, spot.y - k * 0.25, k * 0.08, '#ffffff');
    ctx.globalAlpha = 1;
    // more than one ready (bigger trays): a small "×2" badge
    if (ms.ready > 1) drawCountBadge(spot.x + k * 0.32, spot.y + k * 0.18, k, '×' + ms.ready);
  }
  drawLevelStars(x, y, w, h, k, getMachineLevel(state, pad.id));
}

// Little gold stars across the top of a machine: one per level above 1
// (a ★3 machine shows two stars). Nothing for level 1.
function drawLevelStars(x, y, w, h, k, level) {
  var n = level - 1;
  if (n <= 0) return;
  var size = k * 0.14, gap = k * 0.32;
  var startX = x + w / 2 - gap * (n - 1) / 2;
  var starY = y + k * 0.16;
  for (var i = 0; i < n; i++) {
    // a slightly bigger dark star behind each gold one, as an outline
    drawStar(startX + i * gap, starY, size * 1.35, 'rgba(90, 60, 20, 0.6)');
    drawStar(startX + i * gap, starY, size, CONFIG.colors.levelStar);
  }
}

// A small rounded label with a number on it, like "×2".
function drawCountBadge(cx, cy, k, text) {
  ctx.save();
  ctx.font = '800 ' + Math.round(k * 0.24) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var w = ctx.measureText(text).width + k * 0.14, h = k * 0.3;
  fillRoundRect(cx - w / 2, cy - h / 2, w, h, h / 2, 'rgba(255, 250, 240, 0.95)');
  ctx.fillStyle = CONFIG.colors.padText;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

// Steam puffs rising from a point.
function drawSteam(x, y, k, time, spread) {
  for (var i = 0; i < 2; i++) {
    var t = (time * 0.8 + i * 0.5) % 1;
    ctx.globalAlpha = 0.5 * (1 - t);
    fillCircle(x + (i - 0.5) * spread, y - t * k * 0.6, k * (0.08 + t * 0.1), '#ffffff');
  }
  ctx.globalAlpha = 1;
}

// A colored band across the top of a machine body.
function drawTopBand(x, y, w, h, k, color, part) {
  ctx.save();
  roundRectPath(x, y, w, h, k * 0.3);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h * part);
  ctx.restore();
}

// Espresso machine: metal body, colored top, brew head, trickle of coffee.
function drawEspressoBody(x, y, w, h, k, item, brewing, time) {
  var col = CONFIG.colors;
  fillRoundRect(x, y, w, h, k * 0.3, col.metal);
  drawTopBand(x, y, w, h, k, item.machineColor, 0.3);
  // a little round gauge and a button on the top band
  fillCircle(x + w * 0.2, y + h * 0.15, k * 0.1, '#fffaf2');
  fillCircle(x + w * 0.8, y + h * 0.15, k * 0.07, '#fffaf2');
  // the brew head and spout
  fillRoundRect(x + w * 0.32, y + h * 0.36, w * 0.36, h * 0.14, k * 0.06, col.metalDark);
  fillRoundRect(x + w * 0.45, y + h * 0.5, w * 0.1, h * 0.08, k * 0.03, col.metalDark);
  // drip tray
  fillRoundRect(x + w * 0.18, y + h * 0.84, w * 0.64, h * 0.1, k * 0.04, col.metalDark);
  var cx = x + w / 2;
  if (brewing) {
    // thin trickle of coffee from the spout
    ctx.strokeStyle = item.look.liquid;
    ctx.lineWidth = Math.max(1, k * 0.04);
    ctx.setLineDash([k * 0.06, k * 0.05]);
    ctx.lineDashOffset = -time * k * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.58);
    ctx.lineTo(cx, y + h * 0.82);
    ctx.stroke();
    ctx.setLineDash([]);
    drawSteam(x + w / 2, y, k, time, w * 0.3);
  }
  return { x: cx, y: y + h * 0.72 };
}

// Bakery oven: cream body, colored top, a window that glows while baking.
function drawOvenBody(x, y, w, h, k, item, brewing, time, itemId) {
  fillRoundRect(x, y, w, h, k * 0.3, '#efe3d0');
  drawTopBand(x, y, w, h, k, item.machineColor, 0.24);
  // knobs
  for (var i = 0; i < 3; i++) fillCircle(x + w * (0.25 + i * 0.25), y + h * 0.12, k * 0.06, '#fffaf2');
  // the window
  var wx = x + w * 0.15, wy = y + h * 0.32, ww = w * 0.7, wh = h * 0.38;
  fillRoundRect(wx - k * 0.05, wy - k * 0.05, ww + k * 0.1, wh + k * 0.1, k * 0.14, '#8a6a52');
  if (brewing) {
    // warm, flickering glow with the treat baking inside
    var glow = 0.75 + 0.25 * Math.sin(time * 6);
    fillRoundRect(wx, wy, ww, wh, k * 0.1, 'rgba(255, ' + Math.round(150 + 40 * glow) + ', 70, 1)');
    ctx.save();
    roundRectPath(wx, wy, ww, wh, k * 0.1);
    ctx.clip();
    ctx.globalAlpha = 0.6;
    drawMenuItem(itemId, wx + ww / 2, wy + wh * 0.55, wh * 0.9);
    ctx.restore();
    // heat shimmer above
    for (var j = 0; j < 2; j++) {
      var t = (time * 0.7 + j * 0.5) % 1;
      ctx.globalAlpha = 0.4 * (1 - t);
      strokeLine(x + w * (0.4 + j * 0.2), y - t * k * 0.5, x + w * (0.42 + j * 0.2), y - t * k * 0.5 - k * 0.15, '#ffb36b', k * 0.05);
    }
    ctx.globalAlpha = 1;
  } else {
    fillRoundRect(wx, wy, ww, wh, k * 0.1, '#5a4636');
  }
  // the handle and a little shelf where the finished treat waits
  fillRoundRect(x + w * 0.3, y + h * 0.74, w * 0.4, k * 0.06, k * 0.03, '#8a6a52');
  fillRoundRect(x + w * 0.15, y + h * 0.9, w * 0.7, k * 0.08, k * 0.03, '#c9b49a');
  return { x: x + w / 2, y: y + h * 0.8 };
}

// Blender: a base with a glass jar on top that spins while blending.
function drawBlenderBody(x, y, w, h, k, item, brewing, time) {
  var col = CONFIG.colors;
  // base (bottom part)
  fillRoundRect(x, y + h * 0.5, w, h * 0.5, k * 0.25, col.metal);
  fillRoundRect(x, y + h * 0.5, w, h * 0.14, k * 0.06, item.machineColor);
  // jar
  var jx = x + w * 0.2, jw = w * 0.6;
  fillRoundRect(jx, y + h * 0.02, jw, h * 0.52, k * 0.12, 'rgba(225, 240, 248, 0.9)');
  // contents, swirling while brewing
  var level = h * 0.3;
  fillRoundRect(jx + k * 0.05, y + h * 0.5 - level, jw - k * 0.1, level, k * 0.08, item.look.liquid);
  if (brewing) {
    ctx.strokeStyle = 'rgba(255, 250, 242, 0.7)';
    ctx.lineWidth = Math.max(1, k * 0.04);
    ctx.beginPath();
    var cx = jx + jw / 2, cy = y + h * 0.36;
    ctx.ellipse(cx, cy, jw * 0.3, h * 0.06, 0, time * 8, time * 8 + Math.PI * 1.3);
    ctx.stroke();
  }
  fillRoundRect(jx - k * 0.04, y, jw + k * 0.08, k * 0.1, k * 0.04, item.machineColor); // lid
  return { x: x + w / 2, y: y + h * 0.8 };
}

// Lemonade stand: a striped awning and a big jar with lemon slices.
function drawDispenserBody(x, y, w, h, k, item, brewing, time) {
  var col = CONFIG.colors;
  fillRoundRect(x, y + h * 0.3, w, h * 0.7, k * 0.2, col.woodLight);
  // striped awning
  ctx.save();
  roundRectPath(x - k * 0.05, y, w + k * 0.1, h * 0.3, k * 0.15);
  ctx.clip();
  for (var i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#fffaf2' : item.machineColor;
    ctx.fillRect(x - k * 0.05 + i * (w + k * 0.1) / 6, y, (w + k * 0.1) / 6 + 1, h * 0.3);
  }
  ctx.restore();
  // jar with lemonade, lemon slices floating
  var jx = x + w * 0.2, jy = y + h * 0.34, jw = w * 0.6, jh = h * 0.36;
  fillRoundRect(jx, jy, jw, jh, k * 0.12, 'rgba(225, 240, 248, 0.9)');
  var wobble = brewing ? Math.sin(time * 3) * k * 0.02 : 0;
  fillRoundRect(jx + k * 0.04, jy + jh * 0.25 + wobble, jw - k * 0.08, jh * 0.7, k * 0.08, item.look.liquid);
  fillCircle(jx + jw * 0.3, jy + jh * 0.55 + wobble, k * 0.08, '#fbe9a0');
  fillCircle(jx + jw * 0.68, jy + jh * 0.7 - wobble, k * 0.07, '#fbe9a0');
  // tap
  fillRoundRect(x + w * 0.45, jy + jh, w * 0.1, k * 0.08, k * 0.03, col.metalDark);
  if (brewing) {
    // bubbles rising in the jar
    var t = (time * 1.2) % 1;
    ctx.globalAlpha = 1 - t;
    fillCircle(jx + jw * 0.5, jy + jh * (0.9 - t * 0.6), k * 0.03, '#ffffff');
    ctx.globalAlpha = 1;
  }
  return { x: x + w / 2, y: y + h * 0.84 };
}

// A pot on a little stove (hot chocolate) or a teapot (matcha), steaming.
function drawPotBody(x, y, w, h, k, item, brewing, time) {
  fillRoundRect(x, y, w, h, k * 0.3, '#5f5550');
  drawTopBand(x, y, w, h, k, item.machineColor, 0.18);
  // burner ring glowing while it works
  var cx = x + w / 2, cy = y + h * 0.42;
  fillCircle(cx, cy, k * 0.38, brewing ? 'rgba(255, 120, 60, ' + (0.5 + 0.3 * Math.sin(time * 5)) + ')' : '#3f3833');
  // the pot itself, in the item's color
  fillCircle(cx, cy, k * 0.3, item.machineColor);
  fillCircle(cx, cy, k * 0.22, item.look.liquid);
  fillCircle(cx - k * 0.08, cy - k * 0.08, k * 0.05, 'rgba(255, 255, 255, 0.5)');
  fillRoundRect(cx + k * 0.25, cy - k * 0.04, k * 0.3, k * 0.08, k * 0.04, '#3f3833'); // handle
  if (brewing) drawSteam(cx, cy - k * 0.2, k, time, k * 0.2);
  // a shelf for the finished cup
  fillRoundRect(x + w * 0.18, y + h * 0.88, w * 0.64, k * 0.08, k * 0.03, '#8a7f78');
  return { x: cx, y: y + h * 0.82 };
}

// ----- Tables and seats -----

// A chair seen from above.
function drawChair(cx, cy, k, frame, cushion) {
  fillRoundRect(cx - k * 0.33, cy - k * 0.33, k * 0.66, k * 0.66, k * 0.18, frame);
  fillRoundRect(cx - k * 0.25, cy - k * 0.25, k * 0.5, k * 0.5, k * 0.14, cushion);
}

// A table with chairs: round for two, rectangular for four.
function drawTable(b, x, y, w, h, k) {
  var col = CONFIG.colors;
  var off = CONFIG.customers.seatOffset * k;
  var cx = x + w / 2, cy = y + h / 2;
  // chairs (where customers sit)
  drawChair(x - off, cy, k, col.woodDark, col.wood);
  drawChair(x + w + off, cy, k, col.woodDark, col.wood);
  if (b.seats >= 4) {
    drawChair(cx, y - off, k, col.woodDark, col.wood);
    drawChair(cx, y + h + off, k, col.woodDark, col.wood);
    // rectangular table top with a checkered cloth runner
    fillRoundRect(x, y, w, h, k * 0.2, col.woodDark);
    fillRoundRect(x + k * 0.06, y + k * 0.06, w - k * 0.12, h - k * 0.12, k * 0.16, col.woodLight);
    fillRoundRect(cx - k * 0.22, y + k * 0.1, k * 0.44, h - k * 0.2, k * 0.08, '#f2c4b8');
    fillCircle(cx, cy, k * 0.1, '#fffaf2');
    fillCircle(cx, cy - k * 0.03, k * 0.06, '#e86a6a');
    return;
  }
  // round table top
  fillCircle(cx, cy, Math.min(w, h) * 0.5, col.woodDark);
  fillCircle(cx, cy, Math.min(w, h) * 0.45, col.woodLight);
  // a tiny flower in a little pot
  fillCircle(cx, cy, k * 0.12, '#fffaf2');
  fillCircle(cx, cy - k * 0.04, k * 0.07, '#f29fb8');
}

// An outdoor table with white metal chairs and a striped parasol.
function drawParasolTable(x, y, w, h, k) {
  var off = CONFIG.customers.seatOffset * k;
  var cx = x + w / 2, cy = y + h / 2;
  drawChair(x - off, cy, k, '#dcdcdc', '#ffffff');
  drawChair(x + w + off, cy, k, '#dcdcdc', '#ffffff');
  fillCircle(cx, cy, Math.min(w, h) * 0.45, '#e8e8e8');
  // parasol: wedges in two colors, seen from above
  var r = Math.min(w, h) * 0.62;
  var wedges = 8;
  fillEllipse(cx + k * 0.15, cy + k * 0.2, r, r * 0.9, 'rgba(0, 0, 0, 0.12)'); // shadow
  for (var i = 0; i < wedges; i++) {
    ctx.fillStyle = i % 2 ? '#fffaf2' : '#e57a6e';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, i / wedges * Math.PI * 2, (i + 1) / wedges * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  fillCircle(cx, cy, k * 0.08, '#9c7a52');
}

// Two plush armchairs facing each other across a low coffee table.
function drawArmchairs(x, y, w, h, k) {
  var off = CONFIG.customers.seatOffset * k;
  var cy = y + h / 2;
  [[x - off, 1], [x + w + off, -1]].forEach(function (c) {
    var ax = c[0];
    fillRoundRect(ax - k * 0.42, cy - k * 0.42, k * 0.84, k * 0.84, k * 0.25, '#7a4a6a'); // frame + arms
    fillRoundRect(ax - k * 0.32 + c[1] * k * 0.06, cy - k * 0.28, k * 0.56, k * 0.56, k * 0.18, '#b07aa0'); // cushion
  });
  // coffee table with a book and a candle
  fillRoundRect(x, y, w, h, k * 0.2, '#6b4a33');
  fillRoundRect(x + k * 0.06, y + k * 0.06, w - k * 0.12, h - k * 0.12, k * 0.16, '#8a6244');
  fillRoundRect(x + w * 0.2, y + h * 0.25, w * 0.35, h * 0.45, k * 0.04, '#6fa8dc');
  fillCircle(x + w * 0.72, y + h * 0.5, k * 0.09, '#fff3d0');
  fillCircle(x + w * 0.72, y + h * 0.5, k * 0.04, '#ffb36b');
}

// ----- Decorations -----

// A vase of flowers standing on the counter.
function drawFlowers(x, y, w, h, k) {
  var cx = x + w / 2;
  // stems
  [[-0.22, 0.18], [0, 0.1], [0.22, 0.2]].forEach(function (p) {
    strokeLine(cx, y + h * 0.62, cx + p[0] * k, y + p[1] * k + k * 0.12, '#5f9a5a', k * 0.05);
  });
  // blossoms: petals around a yellow middle
  [[-0.22, 0.18, '#f29fb8'], [0, 0.1, '#fffaf2'], [0.22, 0.2, '#f4b860']].forEach(function (p) {
    drawBlossom(cx + p[0] * k, y + p[1] * k + k * 0.1, k * 0.08, p[2]);
  });
  // vase
  fillRoundRect(cx - k * 0.17, y + h * 0.55, k * 0.34, h * 0.42, k * 0.12, '#6fa8dc');
  fillRoundRect(cx - k * 0.17, y + h * 0.62, k * 0.34, k * 0.06, k * 0.03, '#9cc6ec');
}

// One flower: five petals around a yellow middle.
function drawBlossom(fx, fy, size, color) {
  for (var a = 0; a < 5; a++) {
    var ang = a / 5 * Math.PI * 2;
    fillCircle(fx + Math.cos(ang) * size, fy + Math.sin(ang) * size, size * 0.9, color);
  }
  fillCircle(fx, fy, size * 0.6, '#f2c14e');
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

// A patterned rug lying on the floor. palette: 'warm' (default) or 'blue'.
function drawRug(x, y, w, h, k, palette) {
  var c = palette === 'blue'
    ? { edge: '#4f6f9a', light: '#e6ecf5', mid: '#7f9cc4' }
    : { edge: '#c96f4a', light: '#f2e3c6', mid: '#d98a5f' };
  // fringe on the short ends
  ctx.strokeStyle = c.light;
  ctx.lineWidth = Math.max(1, k * 0.04);
  for (var fx = x + k * 0.3; fx < x + w - k * 0.2; fx += k * 0.25) {
    ctx.beginPath();
    ctx.moveTo(fx, y - k * 0.12); ctx.lineTo(fx, y + k * 0.1);
    ctx.moveTo(fx, y + h - k * 0.1); ctx.lineTo(fx, y + h + k * 0.12);
    ctx.stroke();
  }
  fillRoundRect(x, y, w, h, k * 0.4, c.edge);
  fillRoundRect(x + k * 0.25, y + k * 0.25, w - k * 0.5, h - k * 0.5, k * 0.3, c.light);
  fillRoundRect(x + k * 0.4, y + k * 0.4, w - k * 0.8, h - k * 0.8, k * 0.25, c.mid);
  // a row of diamonds along the long side
  var horizontal = w > h;
  var len = horizontal ? w : h;
  for (var d = k * 0.9; d < len - k * 0.6; d += k * 0.9) {
    var px = horizontal ? x + d : x + w / 2, py = horizontal ? y + h / 2 : y + d;
    fillPolygon([[px, py - k * 0.3], [px + k * 0.3, py], [px, py + k * 0.3], [px - k * 0.3, py]], c.light);
  }
}

// A string of twinkling fairy lights along a wall.
function drawLights(x, y, w, h, k, time) {
  var hooks = Math.max(2, Math.round(w / (2.4 * k)));
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

// Triangle flags on a string, gently swaying.
function drawBunting(x, y, w, h, k, time) {
  var hooks = Math.max(2, Math.round(w / (2.6 * k)));
  var segW = w / hooks;
  var colors = ['#e57a6e', '#f4b860', '#7cc4a4', '#6fa8dc', '#f29fb8'];
  ctx.strokeStyle = '#7d5236';
  ctx.lineWidth = Math.max(1, k * 0.03);
  ctx.beginPath();
  for (var i = 0; i < hooks; i++) {
    ctx.moveTo(x + i * segW, y);
    ctx.quadraticCurveTo(x + i * segW + segW / 2, y + h * 0.8, x + (i + 1) * segW, y);
  }
  ctx.stroke();
  var n = 0;
  for (var j = 0; j < hooks; j++) {
    for (var f = 1; f <= 4; f++) {
      var t = f / 5;
      var fx = x + j * segW + segW * t;
      var fy = y + 2 * (1 - t) * t * h * 0.8;
      var sway = Math.sin(time * 2 + n) * k * 0.04;
      fillPolygon([[fx - k * 0.14, fy], [fx + k * 0.14, fy], [fx + sway, fy + k * 0.32]], colors[n % colors.length]);
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
  drawGlow(cx, cy, k * 2.4, 'rgba(255, 214, 120, 0.35)');
  fillCircle(cx, cy, w * 0.5, '#e8c170');
  fillCircle(cx, cy, w * 0.38, '#fff3d0');
  fillCircle(cx, cy, w * 0.12, '#3b2a20');
}

// A soft round glow (light spilling onto the floor).
function drawGlow(cx, cy, radius, color) {
  var glow = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
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

// A tall shelf of bread loaves and baguettes against the wall.
function drawBreadShelf(x, y, w, h, k) {
  var col = CONFIG.colors;
  fillRoundRect(x, y, w, h, k * 0.15, col.woodDark);
  var shelves = 3;
  var inner = h - k * 0.2;
  for (var s = 0; s < shelves; s++) {
    var sy = y + k * 0.1 + s * inner / shelves;
    var sh = inner / shelves - k * 0.06;
    fillRoundRect(x + k * 0.08, sy, w - k * 0.16, sh, k * 0.05, '#5a3a28');
    if (s === 1) {
      // baguettes lying side by side
      for (var b = 0; b < 3; b++) {
        fillRoundRect(x + k * 0.12 + b * (w - k * 0.24) / 3, sy + k * 0.05, (w - k * 0.3) / 3, sh - k * 0.1, k * 0.08, '#e0a052');
      }
    } else {
      // round loaves with a score mark
      for (var l = 0; l < 2; l++) {
        var lx = x + w / 2, ly = sy + sh * (0.28 + l * 0.46);
        fillEllipse(lx, ly, (w - k * 0.25) / 2, sh * 0.22, '#c98a4b');
        strokeLine(lx - k * 0.1, ly, lx + k * 0.1, ly, '#f2d3a6', k * 0.03);
      }
    }
  }
}

// A glass pastry display case with treats on two rows.
function drawDisplay(x, y, w, h, k) {
  var col = CONFIG.colors;
  fillRoundRect(x, y, w, h, k * 0.2, col.wood);
  fillRoundRect(x + k * 0.1, y + k * 0.1, w - k * 0.2, h - k * 0.25, k * 0.12, 'rgba(220, 240, 250, 0.9)');
  var treats = ['croissant', 'cupcake', 'roll'];
  var per = Math.floor((w - k * 0.3) / (k * 0.55));
  for (var row = 0; row < 2; row++) {
    for (var i = 0; i < per; i++) {
      drawTreat(treats[(i + row) % 3], x + k * 0.4 + i * k * 0.55, y + h * (0.3 + row * 0.33), k * 0.38);
    }
  }
  // glass shine
  strokeLine(x + w * 0.1, y + k * 0.15, x + w * 0.25, y + k * 0.15, 'rgba(255, 255, 255, 0.9)', k * 0.04);
}

// Two plump flour sacks, one with a little wheat stamp.
function drawSacks(x, y, w, h, k) {
  [[0.32, 0.6, 0.3], [0.68, 0.45, 0.33]].forEach(function (s, i) {
    var sx = x + w * s[0], sy = y + h * s[1], r = k * s[2];
    fillRoundRect(sx - r, sy - r * 1.05, r * 2, r * 2.1, r * 0.7, i ? '#e8d6b0' : '#dcc79c');
    fillRoundRect(sx - r * 0.5, sy - r * 1.25, r, r * 0.35, r * 0.15, '#c9a577'); // tied top
    if (i) {
      strokeLine(sx, sy + r * 0.5, sx, sy - r * 0.3, '#b08a4f', k * 0.03);
      fillEllipse(sx - r * 0.18, sy - r * 0.1, r * 0.13, r * 0.07, '#b08a4f', -0.6);
      fillEllipse(sx + r * 0.18, sy - r * 0.1, r * 0.13, r * 0.07, '#b08a4f', 0.6);
      fillEllipse(sx - r * 0.18, sy + r * 0.15, r * 0.13, r * 0.07, '#b08a4f', -0.6);
      fillEllipse(sx + r * 0.18, sy + r * 0.15, r * 0.13, r * 0.07, '#b08a4f', 0.6);
    }
  });
}

// A long wooden planter full of flowers.
function drawFlowerbed(x, y, w, h, k) {
  fillRoundRect(x, y, w, h, k * 0.2, '#9c7a52');
  fillRoundRect(x + k * 0.08, y + k * 0.08, w - k * 0.16, h - k * 0.16, k * 0.14, '#6b4a33');
  var colors = ['#f29fb8', '#f4b860', '#fffaf2', '#9b8ae0', '#e57a6e'];
  var n = Math.floor(w / (k * 0.38));
  for (var i = 0; i < n; i++) {
    var fx = x + k * 0.25 + i * (w - k * 0.5) / Math.max(1, n - 1);
    var fy = y + h * (i % 2 ? 0.38 : 0.62);
    fillCircle(fx, fy + k * 0.1, k * 0.12, '#5f9a5a');
    drawBlossom(fx, fy, k * 0.07, colors[i % colors.length]);
  }
}

// A round stone fountain with a splashing spout and ripples.
function drawFountain(x, y, w, h, k, time) {
  var cx = x + w / 2, cy = y + h / 2;
  var rx = w * 0.5, ry = h * 0.5;
  fillEllipse(cx + k * 0.08, cy + k * 0.12, rx, ry, CONFIG.colors.shadow);
  fillEllipse(cx, cy, rx, ry, '#b9b2a4');
  fillEllipse(cx, cy, rx * 0.85, ry * 0.85, '#7fc4dd');
  // ripples spreading out
  for (var i = 0; i < 2; i++) {
    var t = (time * 0.6 + i * 0.5) % 1;
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.strokeStyle = '#e6f6fb';
    ctx.lineWidth = Math.max(1, k * 0.04);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * (0.25 + t * 0.55), ry * (0.25 + t * 0.55), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // middle column and splashing droplets
  fillCircle(cx, cy, k * 0.22, '#d6cfc0');
  fillCircle(cx, cy, k * 0.12, '#a6dcee');
  for (var d = 0; d < 6; d++) {
    var dt = (time * 1.2 + d / 6) % 1;
    var ang = d / 6 * Math.PI * 2;
    var dist = dt * rx * 0.55;
    var lift = Math.sin(dt * Math.PI) * k * 0.5;
    ctx.globalAlpha = 1 - dt * 0.6;
    fillCircle(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * (ry / rx) - lift, k * 0.05, '#e6f6fb');
  }
  ctx.globalAlpha = 1;
}

// A stone fireplace with dancing flames and a warm glow.
function drawFireplace(x, y, w, h, k, time) {
  var cx = x + w / 2;
  drawGlow(cx, y + h, k * 3, 'rgba(255, 160, 80, 0.35)');
  fillRoundRect(x, y, w, h, k * 0.15, '#9a8d80');
  // stones
  for (var i = 0; i < 6; i++) {
    fillRoundRect(x + k * 0.08 + (i % 3) * (w - k * 0.16) / 3, y + k * 0.06 + Math.floor(i / 3) * h * 0.2,
      (w - k * 0.16) / 3 - k * 0.05, h * 0.17, k * 0.05, i % 2 ? '#b3a698' : '#a89a8b');
  }
  // the opening
  var ox = x + w * 0.2, oy = y + h * 0.45, ow = w * 0.6, oh = h * 0.5;
  fillRoundRect(ox, oy, ow, oh, k * 0.15, '#3b2a20');
  // logs
  fillRoundRect(ox + ow * 0.15, oy + oh * 0.7, ow * 0.7, oh * 0.18, k * 0.05, '#7d5236');
  // flames: three wobbling teardrops, front ones lighter
  [['#e5652e', 0.5, 0.38, 0], ['#f29a3b', 0.36, 0.3, 1.3], ['#f29a3b', 0.64, 0.3, 2.1], ['#ffd36b', 0.5, 0.22, 0.7]].forEach(function (f) {
    var fx = ox + ow * f[1];
    var fh = oh * (0.55 + 0.12 * Math.sin(time * 9 + f[3]));
    var fw = ow * f[2] * 0.5;
    var base = oy + oh * 0.78;
    ctx.fillStyle = f[0];
    ctx.beginPath();
    ctx.moveTo(fx - fw, base);
    ctx.quadraticCurveTo(fx - fw, base - fh * 0.6, fx + Math.sin(time * 7 + f[3]) * fw * 0.4, base - fh);
    ctx.quadraticCurveTo(fx + fw, base - fh * 0.6, fx + fw, base);
    ctx.closePath();
    ctx.fill();
  });
  // mantel shelf with a little candle
  fillRoundRect(x - k * 0.05, y + h * 0.36, w + k * 0.1, k * 0.1, k * 0.04, '#7d5236');
  fillRoundRect(x + w * 0.82, y + h * 0.2, k * 0.1, k * 0.16, k * 0.03, '#fffaf2');
}

// An upright piano: dark wood, keys at the front, and floating notes.
function drawPiano(x, y, w, h, k, time) {
  fillRoundRect(x, y, w, h, k * 0.15, '#3f2a20');
  fillRoundRect(x + k * 0.08, y + k * 0.08, w - k * 0.16, h * 0.45, k * 0.1, '#5a3a2a');
  // keys
  var ky = y + h * 0.62, kh = h * 0.3;
  fillRoundRect(x + k * 0.1, ky, w - k * 0.2, kh, k * 0.04, '#fffaf2');
  var keys = 14;
  var kw = (w - k * 0.2) / keys;
  for (var i = 1; i < keys; i++) {
    strokeLine(x + k * 0.1 + i * kw, ky, x + k * 0.1 + i * kw, ky + kh, '#d8cfc2', k * 0.02);
    if (i % 7 !== 3 && i % 7 !== 0) fillRect2(x + k * 0.1 + i * kw - kw * 0.3, ky, kw * 0.6, kh * 0.6, '#2a1c15');
  }
  // music sheet
  fillRoundRect(x + w * 0.38, y + h * 0.15, w * 0.24, h * 0.3, k * 0.03, '#fffaf2');
  drawFloatingNotes(x + w * 0.5, y, k, time, '#6b4a8a');
}

// A plain filled rectangle (no rounding).
function fillRect2(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// A record player with a spinning vinyl.
function drawRecordPlayer(x, y, w, h, k, time) {
  fillRoundRect(x, y, w, h, k * 0.15, '#c9a577');
  var cx = x + w * 0.45, cy = y + h / 2;
  var r = Math.min(w, h) * 0.4;
  fillCircle(cx, cy, r, '#2a2a30');
  // a shine line that spins with the record
  var a = time * 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(1, k * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.7, a, a + 0.8);
  ctx.stroke();
  fillCircle(cx, cy, r * 0.3, '#e57a6e');
  fillCircle(cx, cy, r * 0.06, '#fffaf2');
  // tone arm
  strokeLine(x + w * 0.88, y + h * 0.2, cx + r * 0.5, cy + r * 0.2, '#8a8f96', k * 0.05);
  drawFloatingNotes(x + w / 2, y, k, time + 1.3, '#4f6f9a');
}

// ---------- Characters ----------

// Draw a round little person seen from above-front.
//   look: { shirt, skin, hair, hairStyle }
//   opts: { faceX, faceY, bob, apron, vip, time }
function drawCharacter(sx, sy, r, look, opts) {
  var bob = opts.bob || 0;
  // shadow on the floor (doesn't bounce)
  fillEllipse(sx, sy + r * 0.7, r, r * 0.45, CONFIG.colors.shadow);
  // VIPs stand in a soft golden glow
  if (opts.vip) fillEllipse(sx, sy + r * 0.7, r * 1.3, r * 0.6, 'rgba(242, 185, 59, 0.35)');
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
  // VIPs wear a little golden star that twinkles
  if (opts.vip) {
    var tw = 1 + 0.12 * Math.sin((opts.time || 0) * 5);
    drawStar(hx + hr * 0.75, hy - hr * 0.85, r * 0.32 * tw, CONFIG.colors.vip);
    drawStar(hx + hr * 0.75, hy - hr * 0.85, r * 0.15 * tw, '#fff3c4');
  }
}

// A speech bubble above a character, wide enough for `slots` items.
// (sx, sy) is where the tail points. `drawInside(cx, cy, size)` draws the contents.
function drawBubble(sx, sy, k, slots, highlight, drawInside) {
  var bh = k * 0.95;
  var bw = bh + (slots - 1) * bh * 0.7;
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
