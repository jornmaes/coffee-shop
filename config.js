// =============================================================
// config.js — ALL balance numbers and layout values live here.
// Tweak these freely; the game code reads everything from CONFIG.
// =============================================================

var CONFIG = {

  // --- The world (measured in "world units"; 1 unit = 1 floor tile) ---
  world: {
    width: 32,      // total world width, in tiles (includes grass around the shop)
    height: 20,     // total world height, in tiles
  },

  // --- The shop plot (the area you build on) ---
  plot: {
    x: 6,           // left edge of the shop floor, in tiles from the world's left
    y: 4,           // top edge of the shop floor, in tiles from the world's top
    width: 20,      // shop floor width, in tiles
    height: 12,     // shop floor height, in tiles
    wallThickness: 0.4, // how thick the shop walls are drawn, in tiles
    doorWidth: 3,   // width of the open doorway in the bottom wall, in tiles
  },

  // --- Camera / zoom ---
  view: {
    tilesVisibleY: 14, // how many tiles fit top-to-bottom on screen (bigger = zoomed out)
  },

  // --- Starting values for a brand new game ---
  start: {
    cash: 0,        // coins you start with
  },

  // --- Colors used when drawing the world ---
  colors: {
    grass: '#a8c98a',      // ground outside the shop
    grassDark: '#9cbd7e',  // checker pattern on the grass
    floor: '#e9d6b8',      // shop floor tiles
    floorDark: '#e0caa7',  // checker pattern on the floor
    wall: '#7a5238',       // shop walls
    buildArea: '#b08a64',  // dashed outline of the empty "build here" area
  },
};
