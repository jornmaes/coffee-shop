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

// Point the camera at the middle of the shop plot.
// (In Part 2 it will follow the player instead.)
function centerCameraOnPlot() {
  var p = CONFIG.plot;
  camera.x = p.x + p.width / 2;
  camera.y = p.y + p.height / 2;
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

// Draw the four walls of the shop, leaving a doorway in the bottom wall.
function drawWalls() {
  var p = CONFIG.plot;
  var t = p.wallThickness;
  var c = CONFIG.colors.wall;

  // top, left and right walls
  fillWorldRect(p.x - t, p.y - t, p.width + t * 2, t, c);
  fillWorldRect(p.x - t, p.y, t, p.height + t, c);
  fillWorldRect(p.x + p.width, p.y, t, p.height + t, c);

  // bottom wall in two pieces, with the door gap centered
  var doorLeft = p.x + (p.width - p.doorWidth) / 2;
  var doorRight = doorLeft + p.doorWidth;
  fillWorldRect(p.x - t, p.y + p.height, doorLeft - (p.x - t), t, c);
  fillWorldRect(doorRight, p.y + p.height, p.x + p.width + t - doorRight, t, c);
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
}
