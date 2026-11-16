// =============================================================
// path.js — how customers find their way around tables and walls.
//
// The world is split into a grid of small cells (half a tile each).
// A cell is "blocked" if a customer standing there would touch
// something solid. To walk somewhere, we search the grid for the
// shortest route (the A* search), then straighten it out so
// customers walk in smooth lines instead of zig-zagging.
// =============================================================

var NAV_CELL = 0.5; // size of one grid cell, in tiles

var nav = {
  cols: 0,
  rows: 0,
  blocked: [], // blocked[row * cols + col] = true if nobody can stand there
};

// The center of a grid cell, in tiles.
function cellCenter(col, row) {
  return { x: (col + 0.5) * NAV_CELL, y: (row + 0.5) * NAV_CELL };
}

// Rebuild the grid from the current solid things (called from rebuildSolids).
// Instead of testing every cell against every item, each solid item marks
// the cells it covers (grown by a customer's size): much faster.
function buildNavGrid() {
  nav.cols = Math.ceil(CONFIG.world.width / NAV_CELL);
  nav.rows = Math.ceil(CONFIG.world.height / NAV_CELL);
  nav.blocked = new Array(nav.cols * nav.rows).fill(false);
  var r = CONFIG.customers.radius;
  var e = TOUCH_TOLERANCE;
  solidRects.forEach(function (rect) {
    // a cell is blocked if a customer at its center would overlap this rect
    var c0 = Math.max(0, Math.ceil((rect.x + e - r) / NAV_CELL - 0.5));
    var c1 = Math.min(nav.cols - 1, Math.floor((rect.x + rect.w - e + r) / NAV_CELL - 0.5));
    var r0 = Math.max(0, Math.ceil((rect.y + e - r) / NAV_CELL - 0.5));
    var r1 = Math.min(nav.rows - 1, Math.floor((rect.y + rect.h - e + r) / NAV_CELL - 0.5));
    for (var row = r0; row <= r1; row++) {
      for (var col = c0; col <= c1; col++) {
        var c = cellCenter(col, row);
        if (overlapsRect(c.x, c.y, r, rect)) nav.blocked[row * nav.cols + col] = true;
      }
    }
  });
}

// ---------- A small "priority queue" (binary heap) ----------
// It hands back the item with the lowest score quickly, which is what the
// path search needs over and over.
function heapPush(heap, item) {
  heap.push(item);
  var i = heap.length - 1;
  while (i > 0) {
    var parent = (i - 1) >> 1;
    if (heap[parent].score <= heap[i].score) break;
    var tmp = heap[parent]; heap[parent] = heap[i]; heap[i] = tmp;
    i = parent;
  }
}
function heapPop(heap) {
  var top = heap[0];
  var last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    var i = 0;
    for (;;) {
      var l = i * 2 + 1, r = l + 1, smallest = i;
      if (l < heap.length && heap[l].score < heap[smallest].score) smallest = l;
      if (r < heap.length && heap[r].score < heap[smallest].score) smallest = r;
      if (smallest === i) break;
      var tmp = heap[smallest]; heap[smallest] = heap[i]; heap[i] = tmp;
      i = smallest;
    }
  }
  return top;
}

// Is this grid cell inside the world and free?
function isCellFree(col, row) {
  if (col < 0 || row < 0 || col >= nav.cols || row >= nav.rows) return false;
  return !nav.blocked[row * nav.cols + col];
}

// The free cell closest to a world position (searching outward in rings).
// Returns { col, row } or null if the whole map is blocked.
function nearestFreeCell(x, y) {
  var c0 = Math.floor(x / NAV_CELL), r0 = Math.floor(y / NAV_CELL);
  var maxRing = Math.max(nav.cols, nav.rows);
  for (var ring = 0; ring <= maxRing; ring++) {
    var best = null, bestDist = Infinity;
    for (var dr = -ring; dr <= ring; dr++) {
      for (var dc = -ring; dc <= ring; dc++) {
        // only look at the outline of the ring
        if (Math.abs(dr) !== ring && Math.abs(dc) !== ring) continue;
        if (!isCellFree(c0 + dc, r0 + dr)) continue;
        var cc = cellCenter(c0 + dc, r0 + dr);
        var d = (cc.x - x) * (cc.x - x) + (cc.y - y) * (cc.y - y);
        if (d < bestDist) { bestDist = d; best = { col: c0 + dc, row: r0 + dr }; }
      }
    }
    if (best) return best;
  }
  return null;
}

// Can a customer walk in a straight line from a to b without touching
// anything solid? We check small steps along the line.
function hasClearLine(a, b) {
  var dx = b.x - a.x, dy = b.y - a.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var steps = Math.max(1, Math.ceil(dist / 0.15));
  var r = CONFIG.customers.radius * 0.9; // a little forgiving
  for (var i = 1; i < steps; i++) {
    var t = i / steps;
    if (isBlocked(a.x + dx * t, a.y + dy * t, r)) return false;
  }
  return true;
}

// Find a walking route from (fromX, fromY) to (toX, toY).
// Returns a list of points [{x, y}, ...] ending exactly at the target,
// or null if there is no way to get there.
function findPath(fromX, fromY, toX, toY) {
  var start = nearestFreeCell(fromX, fromY);
  var goal = nearestFreeCell(toX, toY);
  if (!start || !goal) return null;

  var cols = nav.cols;
  var startId = start.row * cols + start.col;
  var goalId = goal.row * cols + goal.col;

  // A* search. "cost" = distance walked so far; "score" = cost + straight
  // distance still to go. We always continue from the lowest score.
  var cost = {}, cameFrom = {}, closed = {};
  cost[startId] = 0;
  var open = [{ id: startId, score: 0 }];

  // the 8 directions: straight moves cost 1, diagonal moves cost 1.41
  var dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
              [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]];

  while (open.length > 0) {
    // take the open cell with the lowest score
    var current = heapPop(open).id;
    if (current === goalId) break;
    if (closed[current]) continue;
    closed[current] = true;

    var col = current % cols, row = Math.floor(current / cols);
    for (var d = 0; d < dirs.length; d++) {
      var nc = col + dirs[d][0], nr = row + dirs[d][1];
      if (!isCellFree(nc, nr)) continue;
      // no cutting corners diagonally past a blocked cell
      if (dirs[d][2] > 1 && (!isCellFree(col + dirs[d][0], row) || !isCellFree(col, row + dirs[d][1]))) continue;
      var next = nr * cols + nc;
      var newCost = cost[current] + dirs[d][2];
      if (cost[next] === undefined || newCost < cost[next]) {
        cost[next] = newCost;
        cameFrom[next] = current;
        var h = Math.sqrt((nc - goal.col) * (nc - goal.col) + (nr - goal.row) * (nr - goal.row));
        heapPush(open, { id: next, score: newCost + h });
      }
    }
  }
  if (cost[goalId] === undefined) return null; // no route

  // walk back from the goal to the start to get the cells in order
  var cells = [];
  for (var id = goalId; id !== startId; id = cameFrom[id]) cells.push(id);
  cells.reverse();
  var points = cells.map(function (cid) { return cellCenter(cid % cols, Math.floor(cid / cols)); });
  points.push({ x: toX, y: toY }); // end exactly on the target

  // Straighten the route: from each point, keep looking further ahead as
  // long as we can still walk there in a straight line, then go to the
  // last point that worked.
  var smooth = [];
  var from = { x: fromX, y: fromY };
  var k = 0;
  while (k < points.length) {
    var furthest = k;
    for (var j = k + 1; j < points.length; j++) {
      if (!hasClearLine(from, points[j])) break;
      furthest = j;
    }
    smooth.push(points[furthest]);
    from = points[furthest];
    k = furthest + 1;
  }
  return smooth;
}
