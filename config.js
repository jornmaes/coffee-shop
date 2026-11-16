// =============================================================
// config.js — ALL balance numbers and layout values live here.
// Tweak these freely; the game code reads everything from CONFIG.
// Positions and sizes are in tiles (1 tile = 1 floor square).
// =============================================================

var CONFIG = {

  // --- The world ---
  world: {
    width: 58,      // total world width, in tiles (includes grass around the shop)
    height: 30,     // total world height, in tiles
  },

  // --- Areas of the shop ---
  // The café is open from the start. The other areas open when you buy
  // their "opensWith" pad (a big golden pad inside the café).
  //   x, y, w, h   the floor of the area
  //   walls        which sides get a wall (a side shared with an older area is
  //                left out: the older area's wall is already there)
  //   wallStyle    'wall' (indoors) or 'fence' (outdoors)
  //   openings     gaps cut into walls once this area is open (doors)
  //   floor        two colors for the checkered floor; floorStyle 'tiles' or 'planks'
  //   tagline      shown in the big "now open" banner
  areas: [
    { id: 'cafe', name: 'Café', opensWith: null,
      x: 22, y: 12, w: 20, h: 12, walls: ['top', 'left', 'right', 'bottom'], wallStyle: 'wall',
      openings: [{ x: 30.5, y: 23.9, w: 3, h: 0.6 }], // the front door
      floor: ['#e9d6b8', '#e0caa7'], floorStyle: 'tiles' },

    { id: 'bakery', name: 'Bakery Corner', opensWith: 'openBakery',
      tagline: 'Bake fresh treats. Customers love a snack with their coffee!',
      x: 6, y: 12, w: 16, h: 12, walls: ['top', 'left', 'bottom'], wallStyle: 'wall',
      openings: [{ x: 21.5, y: 13, w: 0.6, h: 2.6 }], // door in the café's left wall
      floor: ['#e8c3a4', '#deb393'], floorStyle: 'tiles' },

    { id: 'patio', name: 'Sunny Patio', opensWith: 'openPatio',
      tagline: 'Fresh air, cold drinks and a fountain. Summer vibes!',
      x: 42, y: 12, w: 12, h: 12, walls: ['top', 'right', 'bottom'], wallStyle: 'fence',
      openings: [{ x: 41.9, y: 13, w: 0.6, h: 2.6 }], // door in the café's right wall
      floor: ['#d9d4c7', '#cec8b9'], floorStyle: 'tiles' },

    { id: 'lounge', name: 'Book Lounge', opensWith: 'openLounge',
      tagline: 'Comfy armchairs, a crackling fire and fancy drinks.',
      x: 26, y: 4, w: 16, h: 8, walls: ['top', 'left', 'right'], wallStyle: 'wall',
      openings: [{ x: 38.2, y: 11.5, w: 3, h: 0.6 }], // door in the café's back wall
      floor: ['#b98a62', '#ad7f58'], floorStyle: 'planks' },
  ],
  wallThickness: 0.4, // how thick walls and fences are

  // --- Camera / zoom ---
  view: {
    tilesVisibleY: 14,  // how many tiles fit top-to-bottom on screen (bigger = zoomed out)
    followSpeed: 6,     // how quickly the camera catches up with the player (higher = snappier)
    showAreaSeconds: 2.2, // when an area opens, the camera visits it for this long
  },

  // --- The player (your barista) ---
  player: {
    speed: 5,       // walking speed, in tiles per second
    radius: 0.55,   // body size (also used for bumping into things)
    startX: 32,     // where a new game starts (just inside the door)
    startY: 22,
    carry: 2,       // how many drinks/treats the barista can hold at once
    reach: 0.35,    // extra distance for picking up / handing over
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

  // --- The menu: everything customers can order ---
  // Each machine (or oven) makes one item. Customers only order items you
  // have a machine for.
  //   kind         'drink' or 'treat' (customers sometimes order one of each)
  //   price        coins the customer pays (before the cozy bonus)
  //   brewSeconds  how long the machine takes to make one
  //   popularity   how often it's ordered compared to the others (higher = more often)
  //   look         how it's drawn (cup + liquid + topping, or a treat shape)
  //   machineColor accent color of its machine
  menu: {
    espresso:   { name: 'Espresso',      kind: 'drink', price: 5,   brewSeconds: 3, popularity: 2,
                  look: { cup: 'small', liquid: '#4a2a1a', topping: 'crema' },  machineColor: '#c4574a' },
    cappuccino: { name: 'Cappuccino',    kind: 'drink', price: 8,   brewSeconds: 4, popularity: 3,
                  look: { cup: 'mug',   liquid: '#8a5a3c', topping: 'foam' },   machineColor: '#4f9a8f' },
    latte:      { name: 'Latte',         kind: 'drink', price: 12,  brewSeconds: 5, popularity: 3,
                  look: { cup: 'glass', liquid: '#b07a52', milk: '#d9b48f', topping: 'heart' }, machineColor: '#e0a64a' },
    mocha:      { name: 'Mocha',         kind: 'drink', price: 18,  brewSeconds: 6, popularity: 3,
                  look: { cup: 'mug',   liquid: '#5a3424', topping: 'cream' },  machineColor: '#8a5a8f' },
    iced:       { name: 'Iced Coffee',   kind: 'drink', price: 25,  brewSeconds: 7, popularity: 3,
                  look: { cup: 'tall',  liquid: '#7a4a2c', topping: 'ice' },    machineColor: '#5a8fc4' },
    // bakery
    croissant:  { name: 'Croissant',     kind: 'treat', price: 30,  brewSeconds: 5, popularity: 3,
                  look: { treat: 'croissant' }, machineColor: '#d9824a' },
    cupcake:    { name: 'Cupcake',       kind: 'treat', price: 55,  brewSeconds: 6, popularity: 3,
                  look: { treat: 'cupcake' },   machineColor: '#e88aa8' },
    cinnamon:   { name: 'Cinnamon Roll', kind: 'treat', price: 85,  brewSeconds: 8, popularity: 3,
                  look: { treat: 'roll' },      machineColor: '#b0703c' },
    // patio
    lemonade:   { name: 'Lemonade',      kind: 'drink', price: 120,  brewSeconds: 6, popularity: 4,
                  look: { cup: 'tall', liquid: '#f6d860', topping: 'lemon' },   machineColor: '#f2c94c' },
    frappe:     { name: 'Frappé',        kind: 'drink', price: 180, brewSeconds: 8, popularity: 4,
                  look: { cup: 'tall', liquid: '#a8774f', topping: 'whip' },    machineColor: '#7cc4a4' },
    // lounge
    hotchoc:    { name: 'Hot Chocolate', kind: 'drink', price: 300, brewSeconds: 8, popularity: 4,
                  look: { cup: 'mug', liquid: '#5a3020', topping: 'marshmallow' }, machineColor: '#a0522d' },
    matcha:     { name: 'Matcha Latte',  kind: 'drink', price: 420, brewSeconds: 9, popularity: 4,
                  look: { cup: 'glass', liquid: '#6f9e4a', milk: '#cfe3b0', topping: 'leaf' }, machineColor: '#6f9e4a' },
  },

  // --- Machines ---
  machine: {
    holds: 1,       // how many finished items a machine keeps ready on its tray
  },

  // --- Customers ---
  customers: {
    speed: 2.4,              // walking speed, in tiles per second
    radius: 0.42,            // body size
    spawnSecondsMin: 3,      // shortest wait between new customers (seconds)...
    spawnSecondsMax: 7,      // ...longest wait (both get shorter as you add seats:)
    spawnFasterPerSeat: 0.04,// each seat makes customers come 4% more often
    orderSeconds: 1.5,       // how long they think at the counter before ordering
    comboChance: 0.4,        // chance to order a drink AND a treat (once you sell treats)
    vipChance: 0.06,         // chance a customer is a ★ VIP who pays extra
    vipPayMultiplier: 3,     // VIPs pay this many times the normal price
    drinkSecondsMin: 8,      // shortest time spent sipping after being served
    drinkSecondsMax: 12,     // longest time spent sipping
    spawnX: 32,              // where customers appear and disappear (outside the door)
    spawnY: 29.5,
    orderSpot: { x: 34.2, y: 17.85 }, // where the first customer in line stands to order
    queueStep: { x: 0, y: 1.15 },     // each next person in line stands this much further back
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
  //              makes  (machines) which menu item it makes; style = how the machine looks
  //              seats  (tables) number of chairs: 2 = left + right, 4 = all sides
  //              cozy   (decor) adds this % to every payment
  //              floor  true = drawn flat on the floor, under everything (rugs)
  //              onWall true = hangs on the wall (may stick out of the floor area)
  //              area   (type 'expansion') which area this pad opens
  pads: [
    // ===== The café =====
    { id: 'counter', name: 'Counter', price: 0, requires: null,
      pad: { x: 30.6, y: 17.7, w: 2, h: 1.2 },
      builds: { type: 'counter', x: 27, y: 16, w: 10, h: 1.2, solid: true } },

    { id: 'espresso1', name: 'Espresso Machine', price: 5, requires: 'counter',
      pad: { x: 22.4, y: 14.4, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'espresso', style: 'espresso', x: 27.3, y: 12.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'table1', name: 'Table for Two', price: 10, requires: 'espresso1',
      pad: { x: 22.6, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 23.8, y: 19, w: 1.3, h: 1.3, solid: true } },

    { id: 'table2', name: 'Table for Two', price: 30, requires: 'table1',
      pad: { x: 35.4, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 37.8, y: 19, w: 1.3, h: 1.3, solid: true } },

    { id: 'flowers', name: 'Counter Flowers', price: 40, requires: 'table1',
      pad: { x: 27.6, y: 17.6, w: 2, h: 1.2 },
      builds: { type: 'flowers', x: 28.3, y: 16.1, w: 0.9, h: 0.9, cozy: 5 } },

    { id: 'cappuccino', name: 'Cappuccino Machine', price: 60, requires: 'table1',
      pad: { x: 24.8, y: 14.4, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'cappuccino', style: 'espresso', x: 29.3, y: 12.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'table3', name: 'Table for Two', price: 110, requires: 'table2',
      pad: { x: 27.2, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 27.8, y: 19, w: 1.3, h: 1.3, solid: true } },

    { id: 'bookshelf', name: 'Bookshelf', price: 150, requires: 'flowers',
      pad: { x: 23.3, y: 17.5, w: 2, h: 1.2 },
      builds: { type: 'bookshelf', x: 22.05, y: 16.4, w: 0.8, h: 2.0, solid: true, cozy: 10 } },

    { id: 'latte', name: 'Latte Machine', price: 220, requires: 'cappuccino',
      pad: { x: 22.4, y: 12.3, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'latte', style: 'espresso', x: 31.3, y: 12.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'rug', name: 'Cozy Rug', price: 200, requires: 'table3',
      pad: { x: 39.6, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'rug', x: 36.4, y: 18.5, w: 5.2, h: 5.2, floor: true, cozy: 5 } },

    { id: 'table4', name: 'Table for Two', price: 320, requires: 'table3',
      pad: { x: 24.9, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 23.8, y: 21.8, w: 1.3, h: 1.3, solid: true } },

    { id: 'plant', name: 'Big Plant', price: 350, requires: 'bookshelf',
      pad: { x: 38.9, y: 17.7, w: 2, h: 1.2 },
      builds: { type: 'plant', x: 41, y: 17.3, w: 0.9, h: 0.9, solid: true, cozy: 5 } },

    { id: 'lights', name: 'Fairy Lights', price: 420, requires: 'latte',
      pad: { x: 39.2, y: 15.6, w: 2, h: 1.2 },
      builds: { type: 'lights', x: 22.2, y: 11.45, w: 15.6, h: 0.6, onWall: true, cozy: 10 } },

    { id: 'lamp', name: 'Reading Lamp', price: 450, requires: 'bookshelf',
      pad: { x: 23.3, y: 17.5, w: 2, h: 1.2 },
      builds: { type: 'lamp', x: 22.15, y: 18.45, w: 0.7, h: 0.7, solid: true, cozy: 5 } },

    { id: 'table5', name: 'Table for Two', price: 550, requires: 'rug',
      pad: { x: 39.6, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 2, x: 37.8, y: 21.8, w: 1.3, h: 1.3, solid: true } },

    { id: 'mocha', name: 'Mocha Machine', price: 650, requires: 'latte',
      pad: { x: 24.8, y: 12.3, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'mocha', style: 'espresso', x: 33.3, y: 12.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'chalkboard', name: 'Menu Board', price: 500, requires: 'table2',
      pad: { x: 35.2, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'chalkboard', x: 35.3, y: 22.9, w: 1.1, h: 0.8, solid: true, cozy: 5 } },

    { id: 'cat', name: 'Sleepy Cat', price: 800, requires: 'table4',
      pad: { x: 27.2, y: 20.45, w: 2, h: 1.2 },
      builds: { type: 'cat', x: 28.4, y: 22.9, w: 1.2, h: 0.85, solid: true, cozy: 10 } },

    { id: 'iced', name: 'Iced Coffee Machine', price: 1100, requires: 'mocha',
      pad: { x: 22.4, y: 14.4, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'iced', style: 'espresso', x: 35.3, y: 12.1, w: 1.5, h: 1.3, solid: true } },

    // ===== Expansions: big golden pads that open a new area =====
    { id: 'openBakery', name: 'Open the Bakery Corner', price: 2500, requires: 'iced',
      pad: { x: 22.4, y: 14.1, w: 2.4, h: 1.4 },
      builds: { type: 'expansion', area: 'bakery' } },

    // ===== Bakery Corner =====
    { id: 'oven1', name: 'Croissant Oven', price: 400, requires: 'openBakery',
      pad: { x: 8.0, y: 14.2, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'croissant', style: 'oven', x: 7.6, y: 12.1, w: 1.7, h: 1.4, solid: true } },

    { id: 'btable1', name: 'Big Table', price: 550, requires: 'oven1',
      pad: { x: 19.6, y: 16.6, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 4, x: 10.2, y: 16.6, w: 1.4, h: 1.3, solid: true } },

    { id: 'bunting', name: 'Bunting Flags', price: 700, requires: 'btable1',
      pad: { x: 7.0, y: 19.0, w: 2, h: 1.2 },
      builds: { type: 'bunting', x: 6.2, y: 11.45, w: 15.6, h: 0.6, onWall: true, cozy: 5 } },

    { id: 'oven2', name: 'Cupcake Oven', price: 1250, requires: 'btable1',
      pad: { x: 11.0, y: 14.2, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'cupcake', style: 'oven', x: 9.9, y: 12.1, w: 1.7, h: 1.4, solid: true } },

    { id: 'btable2', name: 'Big Table', price: 1550, requires: 'oven2',
      pad: { x: 19.6, y: 19.0, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 4, x: 15.4, y: 16.6, w: 1.4, h: 1.3, solid: true } },

    { id: 'breadshelf', name: 'Bread Shelf', price: 1700, requires: 'bunting',
      pad: { x: 7.0, y: 19.0, w: 2, h: 1.2 },
      builds: { type: 'breadshelf', x: 6.05, y: 15.0, w: 0.8, h: 2.6, solid: true, cozy: 10 } },

    { id: 'display', name: 'Pastry Display', price: 2100, requires: 'oven2',
      pad: { x: 16.4, y: 14.2, w: 2, h: 1.2 },
      builds: { type: 'display', x: 15.2, y: 12.15, w: 3.4, h: 1.1, solid: true, cozy: 10 } },

    { id: 'btable3', name: 'Big Table', price: 2400, requires: 'btable2',
      pad: { x: 19.6, y: 21.4, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 4, x: 10.2, y: 20.8, w: 1.4, h: 1.3, solid: true } },

    { id: 'oven3', name: 'Cinnamon Roll Oven', price: 3200, requires: 'oven2',
      pad: { x: 11.0, y: 14.2, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'cinnamon', style: 'oven', x: 12.2, y: 12.1, w: 1.7, h: 1.4, solid: true } },

    { id: 'sacks', name: 'Flour Sacks', price: 2700, requires: 'breadshelf',
      pad: { x: 7.0, y: 19.0, w: 2, h: 1.2 },
      builds: { type: 'sacks', x: 6.3, y: 22.4, w: 1.4, h: 1.3, solid: true, cozy: 5 } },

    { id: 'btable4', name: 'Big Table', price: 3800, requires: 'btable3',
      pad: { x: 19.6, y: 19.0, w: 2, h: 1.2 },
      builds: { type: 'table', seats: 4, x: 15.4, y: 20.8, w: 1.4, h: 1.3, solid: true } },

    { id: 'openPatio', name: 'Open the Sunny Patio', price: 7000, requires: 'oven3',
      pad: { x: 39.4, y: 12.4, w: 2.4, h: 1.3 },
      builds: { type: 'expansion', area: 'patio' } },

    // ===== Sunny Patio =====
    { id: 'lemonade', name: 'Lemonade Stand', price: 1500, requires: 'openPatio',
      pad: { x: 43.0, y: 14.7, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'lemonade', style: 'dispenser', x: 43.6, y: 12.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'ptable1', name: 'Parasol Table', price: 1800, requires: 'lemonade',
      pad: { x: 45.6, y: 14.7, w: 2, h: 1.2 },
      builds: { type: 'parasol', seats: 2, x: 44.4, y: 16.8, w: 1.3, h: 1.3, solid: true } },

    { id: 'ptable2', name: 'Parasol Table', price: 2700, requires: 'ptable1',
      pad: { x: 48.2, y: 14.7, w: 2, h: 1.2 },
      builds: { type: 'parasol', seats: 2, x: 49.6, y: 16.8, w: 1.3, h: 1.3, solid: true } },

    { id: 'flowerbed', name: 'Flower Planter', price: 3000, requires: 'ptable1',
      pad: { x: 43.0, y: 22.7, w: 2, h: 1.2 },
      builds: { type: 'flowerbed', x: 46.7, y: 22.8, w: 2.2, h: 0.9, solid: true, cozy: 5 } },

    { id: 'frappe', name: 'Frappé Blender', price: 4800, requires: 'ptable2',
      pad: { x: 45.6, y: 14.7, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'frappe', style: 'blender', x: 45.8, y: 12.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'ptable3', name: 'Parasol Table', price: 4800, requires: 'ptable2',
      pad: { x: 49.6, y: 14.7, w: 2, h: 1.2 },
      builds: { type: 'parasol', seats: 2, x: 44.4, y: 20.6, w: 1.3, h: 1.3, solid: true } },

    { id: 'fountain', name: 'Fountain', price: 6500, requires: 'flowerbed',
      pad: { x: 43.0, y: 22.7, w: 2, h: 1.2 },
      builds: { type: 'fountain', x: 50.4, y: 12.4, w: 2.4, h: 2.0, solid: true, cozy: 15 } },

    { id: 'patioLights', name: 'Patio Lanterns', price: 5600, requires: 'frappe',
      pad: { x: 43.0, y: 14.7, w: 2, h: 1.2 },
      builds: { type: 'lights', x: 42.2, y: 11.45, w: 11.6, h: 0.6, onWall: true, cozy: 10 } },

    { id: 'ptable4', name: 'Parasol Table', price: 7700, requires: 'ptable3',
      pad: { x: 51.0, y: 22.7, w: 2, h: 1.2 },
      builds: { type: 'parasol', seats: 2, x: 49.6, y: 20.6, w: 1.3, h: 1.3, solid: true } },

    { id: 'openLounge', name: 'Open the Book Lounge', price: 15500, requires: 'frappe',
      pad: { x: 38.6, y: 12.3, w: 2.4, h: 1.3 },
      builds: { type: 'expansion', area: 'lounge' } },

    // ===== Book Lounge =====
    { id: 'hotchoc', name: 'Hot Chocolate Pot', price: 4500, requires: 'openLounge',
      pad: { x: 27.2, y: 5.8, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'hotchoc', style: 'pot', x: 27, y: 4.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'lchairs1', name: 'Armchairs', price: 5000, requires: 'hotchoc',
      pad: { x: 30.0, y: 5.8, w: 2, h: 1.2 },
      builds: { type: 'armchairs', seats: 2, x: 28.0, y: 8.4, w: 1.2, h: 1.0, solid: true } },

    { id: 'fireplace', name: 'Fireplace', price: 7600, requires: 'lchairs1',
      pad: { x: 33.0, y: 5.8, w: 2, h: 1.2 },
      builds: { type: 'fireplace', x: 32.4, y: 4.0, w: 2.8, h: 1.0, solid: true, cozy: 15 } },

    { id: 'lchairs2', name: 'Armchairs', price: 7600, requires: 'lchairs1',
      pad: { x: 32.0, y: 10.1, w: 2, h: 1.2 },
      builds: { type: 'armchairs', seats: 2, x: 32.5, y: 8.4, w: 1.2, h: 1.0, solid: true } },

    { id: 'matcha', name: 'Matcha Teapot', price: 11000, requires: 'lchairs2',
      pad: { x: 27.2, y: 5.8, w: 2, h: 1.2 },
      builds: { type: 'machine', makes: 'matcha', style: 'pot', x: 29.2, y: 4.1, w: 1.5, h: 1.3, solid: true } },

    { id: 'loungeRug', name: 'Big Soft Rug', price: 9000, requires: 'fireplace',
      pad: { x: 33.0, y: 5.8, w: 2, h: 1.2 },
      builds: { type: 'rug', palette: 'blue', x: 27, y: 7.2, w: 12, h: 3.4, floor: true, cozy: 10 } },

    { id: 'piano', name: 'Piano', price: 13000, requires: 'fireplace',
      pad: { x: 37.5, y: 5.8, w: 2, h: 1.2 },
      builds: { type: 'piano', x: 36.6, y: 4.15, w: 2.2, h: 1.25, solid: true, cozy: 15 } },

    { id: 'lchairs3', name: 'Armchairs', price: 14000, requires: 'lchairs2',
      pad: { x: 36.5, y: 10.1, w: 2, h: 1.2 },
      builds: { type: 'armchairs', seats: 2, x: 37.0, y: 8.4, w: 1.2, h: 1.0, solid: true } },

    { id: 'records', name: 'Record Player', price: 16000, requires: 'piano',
      pad: { x: 39.2, y: 5.8, w: 2, h: 1.2 },
      builds: { type: 'records', x: 40.6, y: 4.3, w: 1.1, h: 1.0, solid: true, cozy: 10 } },
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
    areaRevealTime: 1.0, // seconds a newly opened area takes to fade in
    floatTextTime: 1.2,  // seconds the "-25" / "+8" texts float up
    coinBurstTime: 0.45, // seconds coins fly up out of a paying customer...
    coinFlyTime: 0.55,   // ...and then seconds they take to fly to your cash
    maxCoins: 8,         // most coins in one burst
    confettiCount: 70,   // confetti pieces when a new area opens
    confettiTime: 1.8,   // seconds confetti stays around
    bannerSeconds: 3.2,  // how long the "now open" / "new on the menu" banner shows
  },

  // --- Colors used when drawing the world ---
  colors: {
    grass: '#a8c98a',      // ground outside the shop
    grassDark: '#9cbd7e',  // checker pattern on the grass
    path: '#d8c8a8',       // stone path to the front door
    wall: '#7a5238',       // shop walls
    fence: '#c9a577',      // patio fence
    fenceDark: '#9c7a52',  // fence posts
    buildArea: '#b08a64',  // dashed outline of empty / locked areas
    playerBody: '#f2c9a0', // the barista's skin
    playerApron: '#4f7a5a',// the barista's green apron
    playerHair: '#5a3a28', // the barista's hair
    shadow: 'rgba(0, 0, 0, 0.18)', // soft shadow under characters and items
    pad: '#7ccf7a',        // buy pad you can afford
    padTooPricey: '#c9b9a3',// buy pad you can't afford yet
    padGold: '#f2c14e',    // expansion pad you can afford
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
    vip: '#f2b93b',        // VIP customers' star
    confetti: ['#f29fb8', '#f2c14e', '#7cc4a4', '#6fa8dc', '#e57a6e', '#9b8ae0'],
    // customers get a random mix of these
    customerShirts: ['#e57a6e', '#6fa8dc', '#f4b860', '#9b8ae0', '#7cc4a4', '#f29fb8', '#8fb3c9'],
    customerSkins: ['#f2c9a0', '#e0a97c', '#c68a5e', '#8d5b3e', '#f6d7b8'],
    customerHair: ['#3b2a20', '#6b4423', '#c98a4b', '#e8c170', '#2c2c34', '#9a4a3a'],
  },
};
