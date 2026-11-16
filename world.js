// =============================================================
// world.js — the solid parts of the world and collision.
// Later parts add buy pads, buildings and the register here.
// =============================================================

// Build the list of wall rectangles (in tiles) from the plot settings.
// Each wall is { x, y, w, h }. The bottom wall has a gap for the door.
function getWallRects() {
  var p = CONFIG.plot;
  var t = p.wallThickness;
  var doorLeft = p.x + (p.width - p.doorWidth) / 2;
  var doorRight = doorLeft + p.doorWidth;

  return [
    { x: p.x - t,        y: p.y - t,        w: p.width + t * 2,             h: t },            // top
    { x: p.x - t,        y: p.y,            w: t,                           h: p.height + t }, // left
    { x: p.x + p.width,  y: p.y,            w: t,                           h: p.height + t }, // right
    { x: p.x - t,        y: p.y + p.height, w: doorLeft - (p.x - t),        h: t },            // bottom-left
    { x: doorRight,      y: p.y + p.height, w: p.x + p.width + t - doorRight, h: t },          // bottom-right
  ];
}

// All solid rectangles the player can't walk through.
// Calculated once, since the walls never move.
var solidRects = getWallRects();

// Tiny tolerance for rounding errors. Computers can't store numbers like
// 0.35 exactly, so "just touching" a wall can look like overlapping it by
// 0.0000000000000004. Overlaps smaller than this don't count.
var TOUCH_TOLERANCE = 1e-6;

// Does a square of half-size r centered at (x, y) overlap the rectangle?
function overlapsRect(x, y, r, rect) {
  var e = TOUCH_TOLERANCE;
  return x + r > rect.x + e && x - r < rect.x + rect.w - e &&
         y + r > rect.y + e && y - r < rect.y + rect.h - e;
}

// Move an entity (anything with x, y, radius) by dx, dy tiles,
// stopping it at walls and at the edge of the world.
// We move one axis at a time; that way you slide along walls
// instead of getting stuck when walking into them diagonally.
function moveWithCollision(ent, dx, dy) {
  var r = ent.radius;
  var i, rect;

  // --- horizontal (only if we're actually moving sideways) ---
  if (dx !== 0) {
    ent.x += dx;
    for (i = 0; i < solidRects.length; i++) {
      rect = solidRects[i];
      if (overlapsRect(ent.x, ent.y, r, rect)) {
        // push back out on the side we came from
        ent.x = dx > 0 ? rect.x - r : rect.x + rect.w + r;
      }
    }
  }

  // --- vertical (only if we're actually moving up/down) ---
  if (dy !== 0) {
    ent.y += dy;
    for (i = 0; i < solidRects.length; i++) {
      rect = solidRects[i];
      if (overlapsRect(ent.x, ent.y, r, rect)) {
        ent.y = dy > 0 ? rect.y - r : rect.y + rect.h + r;
      }
    }
  }

  // --- stay inside the world ---
  ent.x = Math.max(r, Math.min(CONFIG.world.width - r, ent.x));
  ent.y = Math.max(r, Math.min(CONFIG.world.height - r, ent.y));
}
