// =============================================================
// config.js — ALL balance numbers and layout values live here.
// Tweak these freely; the game code reads everything from CONFIG.
// Positions and sizes are in tiles (1 tile = 1 floor square).
// =============================================================

var CONFIG = {

  // --- The world ---
  world: {
    width: 32,      // total world width, in tiles (includes grass around the shop)
    height: 20,     // total world height, in tiles
  },

  // --- The shop plot (the area you build on) ---
  plot: {
    x: 6,           // left edge of the shop floor
    y: 4,           // top edge of the shop floor
    width: 20,      // shop floor width
    height: 12,     // shop floor height
    wallThickness: 0.4, // how thick the shop walls are drawn
    doorWidth: 3,   // width of the open doorway in the bottom wall
  },

  // --- Camera / zoom ---
  view: {
    tilesVisibleY: 14,  // how many tiles fit top-to-bottom on screen (bigger = zoomed out)
    followSpeed: 6,     // how quickly the camera catches up with the player (higher = snappier)
  },

  // --- The player (your barista) ---
  player: {
    speed: 5,       // walking speed, in tiles per second
    radius: 0.55,   // body size (also used for bumping into things)
    startX: 16,     // where a new game starts (just inside the door)
    startY: 14,
    carry: 2,       // how many drinks the barista can hold at once
    reach: 0.35,    // extra distance for picking up / handing over drinks
  },

  // --- On-screen joystick (touch anywhere to make it appear) ---
  joystick: {
    radius: 55,      // size of the joystick base, in screen pixels
    knobRadius: 24,  // size of the knob you drag, in screen pixels
    deadZone: 0.15,  // ignore tiny drags below this fraction of the radius (0..1)
  },

  // --- Starting values for a brand new game ---
  start: {
    cash: 15,       // coins you start with (first machine + first table)
  },

  // --- Drinks ---
  // Each machine makes one drink. Customers only order drinks you have a machine for.
  //   price        coins the customer pays (before the cozy bonus)
  //   brewSeconds  how long the machine takes to make one
  //   popularity   how often it's ordered compared to the others (higher = more often)
  //   look         how the cup is drawn: cup, liquid, topping
  //   machineColor accent color of its machine
  drinks: {
    espresso:   { name: 'Espresso',    price: 5,  brewSeconds: 3, popularity: 3,
                  look: { cup: 'small', liquid: '#4a2a1a', topping: 'crema' },  machineColor: '#c4574a' },
    cappuccino: { name: 'Cappuccino',  price: 8,  brewSeconds: 4, popularity: 3,
                  look: { cup: 'mug',   liquid: '#8a5a3c', topping: 'foam' },   machineColor: '#4f9a8f' },
    latte:      { name: 'Latte',       price: 12, brewSeconds: 5, popularity: 3,
                  look: { cup: 'glass', liquid: '#b07a52', topping: 'heart' },  machineColor: '#e0a64a' },
    mocha:      { name: 'Mocha',       price: 18, brewSeconds: 6, popularity: 2,
                  look: { cup: 'mug',   liquid: '#5a3424', topping: 'cream' },  machineColor: '#8a5a8f' },
    iced:       { name: 'Iced Coffee', price: 25, brewSeconds: 7, popularity: 2,
                  look: { cup: 'tall',  liquid: '#7a4a2c', topping: 'ice' },    machineColor: '#5a8fc4' },
  },

  // --- Machines ---
  machine: {
    holds: 1,       // how many finished drinks a machine keeps ready on its tray
  },

  // --- Customers ---
  customers: {
    speed: 2.2,              // walking speed, in tiles per second
    radius: 0.42,            // body size
    spawnSecondsMin: 3,      // shortest wait between new customers (seconds)
    spawnSecondsMax: 7,      // longest wait between new customers (seconds)
    orderSeconds: 1.5,       // how long they think at the counter before ordering
    drinkSecondsMin: 8,      // shortest time spent sipping after being served
    drinkSecondsMax: 12,     // longest time spent sipping
    spawnX: 16,              // where customers appear and disappear (outside the door)
    spawnY: 19.5,
    orderSpot: { x: 18.2, y: 9.85 }, // where the first customer in line stands to order
    queueStep: { x: 0, y: 1.15 },    // each next person in line stands this much further back
    maxQueue: 4,             // most people waiting in line at once
    seatOffset: 0.6,         // how far a chair is from the side of its table
  },

  // --- Buy pads ---
  // Walk onto a pad with enough cash to build its item.
  // A pad only appears once the pad named in "requires" has been bought
  // (null = visible from the start). This makes the build order.
  //   id       unique name used in the save file (don't rename once players have saves)
  //   name     label shown above the pad
  //   price    cost in coins (0 = free, the pad says "FREE")
  //   pad      where the pad sits: x, y, w, h
  //   builds   what appears: type (how it's drawn), x, y, w, h, and:
  //              solid  true = you can't walk through it
  //              drink  (machines) which drink it makes
  //              seats  (tables) number of chairs: 2 = one on each side
  //              cozy   (decor) adds this % to every payment
  //              floor  true = drawn flat on the floor, under everything (rugs)
  //              onWall true = hangs on the wall (may stick out of the floor area)
  pads: [
    { id: 'counter', name: 'Counter', price: 0, requires: null,
      pad: { x: 14.6, y: 9.7, w: 2, h: 1.2 },
      builds: { type: 'counter', x: 11, y: 8, w: 10, h: 1.2, solid: true } },

    { id: 'espresso1', name: 'Espresso Machine', price: 5, requires: 'counter',
      pad: { x: 6.4, y: 6.4, w: 2, h: 1.2 },
      builds: { type: 'machine', drink: 'espresso', x: 11.3, y: 4.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'table1', name: 'Table for Two', price: 10, requires: 'espresso1',
      pad: { x: 6.6, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 7.8, y: 11, w: 1.3, h: 1.3, solid: true } },

    { id: 'table2', name: 'Table for Two', price: 25, requires: 'table1',
      pad: { x: 19.4, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 21.8, y: 11, w: 1.3, h: 1.3, solid: true } },

    { id: 'flowers', name: 'Counter Flowers', price: 30, requires: 'table1',
      pad: { x: 11.6, y: 9.6, w: 2, h: 1.2 },
      builds: { type: 'flowers', x: 12.3, y: 8.1, w: 0.9, h: 0.9, cozy: 5 } },

    { id: 'cappuccino', name: 'Cappuccino Machine', price: 50, requires: 'table1',
      pad: { x: 8.8, y: 6.4, w: 2, h: 1.2 },
      builds: { type: 'machine', drink: 'cappuccino', x: 13.3, y: 4.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'table3', name: 'Table for Two', price: 80, requires: 'table2',
      pad: { x: 11.2, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 11.8, y: 11, w: 1.3, h: 1.3, solid: true } },

    { id: 'bookshelf', name: 'Bookshelf', price: 100, requires: 'flowers',
      pad: { x: 7.3, y: 9.5, w: 2, h: 1.2 },
      builds: { type: 'bookshelf', x: 6.05, y: 8.4, w: 0.8, h: 2.0, solid: true, cozy: 10 } },

    { id: 'latte', name: 'Latte Machine', price: 150, requires: 'cappuccino',
      pad: { x: 6.4, y: 4.3, w: 2, h: 1.2 },
      builds: { type: 'machine', drink: 'latte', x: 15.3, y: 4.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'rug', name: 'Cozy Rug', price: 140, requires: 'table3',
      pad: { x: 22.3, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'rug', x: 20.4, y: 10.5, w: 5.2, h: 5.2, floor: true, cozy: 5 } },

    { id: 'table4', name: 'Table for Two', price: 200, requires: 'table3',
      pad: { x: 8.9, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 7.8, y: 13.8, w: 1.3, h: 1.3, solid: true } },

    { id: 'plant', name: 'Big Plant', price: 220, requires: 'bookshelf',
      pad: { x: 22.4, y: 9.5, w: 2, h: 1.2 },
      builds: { type: 'plant', x: 25, y: 9.3, w: 0.9, h: 0.9, solid: true, cozy: 5 } },

    { id: 'lights', name: 'Fairy Lights', price: 250, requires: 'latte',
      pad: { x: 23, y: 6.4, w: 2, h: 1.2 },
      builds: { type: 'lights', x: 6.2, y: 3.45, w: 19.6, h: 0.6, onWall: true, cozy: 10 } },

    { id: 'lamp', name: 'Reading Lamp', price: 280, requires: 'bookshelf',
      pad: { x: 7.3, y: 9.5, w: 2, h: 1.2 },
      builds: { type: 'lamp', x: 6.15, y: 10.45, w: 0.7, h: 0.7, solid: true, cozy: 5 } },

    { id: 'table5', name: 'Table for Two', price: 350, requires: 'rug',
      pad: { x: 22.3, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 21.8, y: 13.8, w: 1.3, h: 1.3, solid: true } },

    { id: 'mocha', name: 'Mocha Machine', price: 400, requires: 'latte',
      pad: { x: 8.8, y: 4.3, w: 2, h: 1.2 },
      builds: { type: 'machine', drink: 'mocha', x: 17.3, y: 4.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'chalkboard', name: 'Menu Board', price: 300, requires: 'table2',
      pad: { x: 19.4, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'chalkboard', x: 19.3, y: 14.9, w: 1.1, h: 0.8, solid: true, cozy: 5 } },

    { id: 'cat', name: 'Sleepy Cat', price: 450, requires: 'table4',
      pad: { x: 11.2, y: 12.45, w: 2, h: 1.2 },
      builds: { type: 'cat', x: 12.4, y: 14.9, w: 1.2, h: 0.85, solid: true, cozy: 10 } },

    { id: 'iced', name: 'Iced Coffee Machine', price: 700, requires: 'mocha',
      pad: { x: 6.4, y: 6.4, w: 2, h: 1.2 },
      builds: { type: 'machine', drink: 'iced', x: 19.3, y: 4.1, w: 1.5, h: 1.3, solid: true } },
  ],

  // --- Saving ---
  save: {
    intervalSeconds: 5,  // how often progress is saved automatically (it also
                         // saves right after buying/serving and when the app is closed)
  },

  // --- Help text at the bottom of the screen ---
  hints: {
    untilServed: 5,  // stop showing "how to play" hints after serving this many customers
  },

  // --- Effects ---
  effects: {
    buildPopTime: 0.35,  // seconds a new item takes to "pop" into place
    floatTextTime: 1.2,  // seconds the "-25" / "+8" texts float up
    coinBurstTime: 0.45, // seconds coins fly up out of a paying customer...
    coinFlyTime: 0.55,   // ...and then seconds they take to fly to your cash
    maxCoins: 8,         // most coins in one burst
  },

  // --- Colors used when drawing the world ---
  colors: {
    grass: '#a8c98a',      // ground outside the shop
    grassDark: '#9cbd7e',  // checker pattern on the grass
    floor: '#e9d6b8',      // shop floor tiles
    floorDark: '#e0caa7',  // checker pattern on the floor
    wall: '#7a5238',       // shop walls
    buildArea: '#b08a64',  // dashed outline of the empty "build here" area
    playerBody: '#f2c9a0', // the barista's skin
    playerApron: '#4f7a5a',// the barista's green apron
    playerHair: '#5a3a28', // the barista's hair
    shadow: 'rgba(0, 0, 0, 0.18)', // soft shadow under characters and items
    pad: '#7ccf7a',        // buy pad you can afford
    padTooPricey: '#c9b9a3',// buy pad you can't afford yet
    padText: '#3b2a20',    // text on and above pads
    wood: '#a8754f',       // counters and tables
    woodLight: '#c79a72',  // top highlight on wood
    woodDark: '#7d5236',   // chairs and shelf frames
    metal: '#d8d4cc',      // machine bodies
    metalDark: '#5f666d',  // machine details
    spend: '#b5523b',      // floating text for money spent
    earn: '#c98a12',       // floating text for money earned
    coin: '#f2c14e',       // coins
    coinDark: '#c98a12',   // coin rim
    heart: '#e86a8a',      // hearts from happy customers
    // customers get a random mix of these
    customerShirts: ['#e57a6e', '#6fa8dc', '#f4b860', '#9b8ae0', '#7cc4a4', '#f29fb8', '#8fb3c9'],
    customerSkins: ['#f2c9a0', '#e0a97c', '#c68a5e', '#8d5b3e', '#f6d7b8'],
    customerHair: ['#3b2a20', '#6b4423', '#c98a4b', '#e8c170', '#2c2c34', '#9a4a3a'],
  },
};
