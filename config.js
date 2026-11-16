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
    tilesVisibleY: 14,  // how many tiles fit top-to-bottom on screen (bigger = zoomed out)
    followSpeed: 6,     // how quickly the camera catches up with the player (higher = snappier)
  },

  // --- The player (your barista) ---
  player: {
    speed: 5,       // walking speed, in tiles per second
    radius: 0.55,   // size of the player's body, in tiles (also used for bumping into walls)
    startX: 16,     // where a new game starts, in tiles (middle of the shop...)
    startY: 14,     // (...just inside the door)
  },

  // --- On-screen joystick (touch anywhere to make it appear) ---
  joystick: {
    radius: 55,      // size of the joystick base, in screen pixels
    knobRadius: 24,  // size of the knob you drag, in screen pixels
    deadZone: 0.15,  // ignore tiny drags below this fraction of the radius (0..1)
  },

  // --- Starting values for a brand new game ---
  start: {
    cash: 120,      // coins you start with (enough for the first pads until
                    // Part 4 adds income; lower this later)
  },

  // --- Buy pads ---
  // Walk onto a pad with enough cash to build its item.
  // A pad only appears once the pad named in "requires" has been bought
  // (null = visible from the start). This is the build order.
  //   id       unique name used in the save file (don't rename once players have saves)
  //   name     label shown above the pad
  //   price    cost in coins
  //   pad      where the pad sits: x, y, w, h in tiles
  //   builds   what appears: type (how it's drawn), x, y, w, h in tiles,
  //            solid (true = you can't walk through it)
  pads: [
    {
      id: 'counter', name: 'Counter', price: 25, requires: null,
      pad:    { x: 15,   y: 10.5, w: 2,   h: 1.2 },
      builds: { type: 'counter', x: 12, y: 8, w: 8, h: 1.2, solid: true },
    },
    {
      id: 'espresso1', name: 'Espresso Machine', price: 60, requires: 'counter',
      pad:    { x: 8.5,  y: 8,    w: 2,   h: 1.2 },
      builds: { type: 'espresso', x: 13, y: 5.8, w: 1.6, h: 1.2, solid: true },
    },
    {
      id: 'table1', name: 'Cozy Table', price: 30, requires: 'espresso1',
      pad:    { x: 23.5, y: 12.2, w: 2,   h: 1.2 },
      builds: { type: 'table', x: 20.6, y: 12, w: 1.6, h: 1.6, solid: true },
    },
  ],

  // --- Effects ---
  effects: {
    buildPopTime: 0.35,  // seconds a new item takes to "pop" into place
    floatTextTime: 1.2,  // seconds the "-25" text floats up after buying
  },

  // --- Colors used when drawing the world ---
  colors: {
    grass: '#a8c98a',      // ground outside the shop
    grassDark: '#9cbd7e',  // checker pattern on the grass
    floor: '#e9d6b8',      // shop floor tiles
    floorDark: '#e0caa7',  // checker pattern on the floor
    wall: '#7a5238',       // shop walls
    buildArea: '#b08a64',  // dashed outline of the empty "build here" area
    playerBody: '#f2c9a0', // the barista's skin/head
    playerApron: '#4f7a5a',// the barista's green apron
    shadow: 'rgba(0, 0, 0, 0.18)', // soft shadow under characters
    pad: '#7ccf7a',        // buy pad you can afford
    padTooPricey: '#c9b9a3',// buy pad you can't afford yet
    padText: '#3b2a20',    // text on and above pads
    wood: '#a8754f',       // counters and tables
    woodLight: '#c79a72',  // top edge highlight on wood
    metal: '#8d949b',      // machines
    metalDark: '#5f666d',  // machine details
  },
};
