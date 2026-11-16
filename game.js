// =============================================================
// game.js — game state, the main loop, the HUD, celebrations
// and the settings panel.
// =============================================================

// Everything that describes "where the game is right now".
var state = {
  cash: CONFIG.start.cash,  // coins the player has
  time: 0,                  // seconds since the game was opened (drives animations)

  bought: {},               // which pads are bought, e.g. { counter: true }
  builtAt: {},              // when each item was bought this session (for the pop-in)
  machines: {},             // per machine: { ready: items on the tray, timer: seconds brewed }
  carrying: [],             // item ids the barista is holding, e.g. ['latte']
  stats: { served: 0,       // how many customers have been served (ever)
           helperEarned: 0 }, // coins helpers earned by handing things over (ever)

  settings: {               // switches in the ⚙ panel (saved)
    sound: true,            // sound effects
    music: true,            // background music
    keepAwake: true,        // keep the phone's screen on while the game is open
  },
  events: [],               // things that just happened, for sounds (e.g. a customer paid)

  customers: [],            // customers in the shop right now (not saved)
  helpers: [],              // hired helpers (not saved: they come back from the bought pads)
  nextCustomerId: 1,
  spawnTimer: 2,            // seconds until the next customer may come in

  floaters: [],             // floating texts ("-25", "+8", "♥")
  coins: [],                // coins flying from customers to the cash display
  confetti: [],             // confetti from opening a new area
  cameraFocus: null,        // { x, y, until }: the camera visits a new area for a moment
  paused: false,            // true while the settings panel is open

  // the barista you walk around with
  player: {
    x: CONFIG.player.startX,   // position, in tiles
    y: CONFIG.player.startY,
    radius: CONFIG.player.radius,
    faceX: 0,                  // which way they look (-1..1), used for drawing
    faceY: 1,                  // start looking down, toward the screen
    moving: false,             // true while walking (makes them bounce)
    walkTime: 0,               // seconds spent walking, drives the bounce
  },
};

// HUD elements
var moneyEl = document.getElementById('money');
var cashEl = document.getElementById('cash');
var cozyEl = document.getElementById('cozy');
var hintEl = document.getElementById('hint');
var bannerEl = document.getElementById('banner');
var bannerTitleEl = document.getElementById('banner-title');
var bannerTextEl = document.getElementById('banner-text');

// Cash as text: exact up to 100,000 (with commas), then short (123K, 1.2M).
function cashText(n) {
  n = Math.floor(n);
  return n < 100000 ? n.toLocaleString('en-US') : formatNumber(n);
}

// Show cash, cozy bonus and the current hint in the HUD.
// We only touch the page when something changed (cheaper on phones).
var lastHud = {};
// The cash number on screen counts smoothly toward the real amount
// (see rollCash), instead of jumping.
var shownCash = 0;

// Move the shown cash a bit closer to the real cash (called every frame).
function rollCash(dt) {
  var diff = state.cash - shownCash;
  shownCash += diff * Math.min(1, dt * CONFIG.effects.cashRollSpeed);
  if (Math.abs(state.cash - shownCash) < 0.5) shownCash = state.cash;
}

function updateHud(coinsArrived) {
  var text = '☕ ' + cashText(shownCash);
  if (text !== lastHud.cash) { cashEl.textContent = text; lastHud.cash = text; }

  var cozy = getCozyBonus(state);
  var cozyText = cozy > 0 ? '♥ Cozy +' + cozy + '%' : '';
  if (cozyText !== lastHud.cozy) { cozyEl.textContent = cozyText; lastHud.cozy = cozyText; }

  var hint = getHint(state);
  if (hint !== lastHud.hint) {
    hintEl.textContent = hint;
    hintEl.classList.toggle('show', hint !== '');
    lastHud.hint = hint;
  }

  // a little bump on the cash display when coins land in it
  if (coinsArrived > 0) {
    moneyEl.classList.remove('bump');
    void moneyEl.offsetWidth; // forces the browser to restart the animation
    moneyEl.classList.add('bump');
  }
}

// A short "what to do next" tip for new players. Disappears after
// serving a few customers (CONFIG.hints.untilServed).
function getHint(state) {
  if (state.stats.served >= CONFIG.hints.untilServed) return '';
  if (!state.bought.counter) return 'Walk onto the glowing pad to build your counter';
  if (getBuiltMachines(state).length === 0) return 'Buy an espresso machine';
  if (getSeats(state).length === 0) return 'Buy a table so customers have somewhere to sit';

  var waiting = state.customers.filter(function (c) { return c.orders.length > 0; });
  if (waiting.length > 0) {
    // holding something someone wants? go deliver it
    for (var i = 0; i < waiting.length; i++) {
      for (var j = 0; j < waiting[i].orders.length; j++) {
        if (state.carrying.indexOf(waiting[i].orders[j]) !== -1) {
          return 'Bring the ' + CONFIG.menu[waiting[i].orders[j]].name + ' to the customer';
        }
      }
    }
    var item = waiting[0].orders[0];
    return 'Walk to the ' + getMachineFor(state, item).name + ' to grab their ' + CONFIG.menu[item].name;
  }
  if (state.customers.some(function (c) { return c.step === 'ordering'; })) return 'A customer is ordering…';
  if (state.customers.length === 0) return 'Customers are on their way…';
  return '';
}

// ---------- Celebrations ----------

// Banners wait in line so two at once don't overwrite each other.
var bannerQueue = [];
var bannerUntil = 0;

// Queue a big friendly banner, e.g. "Bakery Corner is open!".
function showBanner(title, text) {
  bannerQueue.push({ title: title, text: text || '' });
}

// Show the next banner when the current one is done.
function updateBanner() {
  var now = performance.now() / 1000;
  if (now < bannerUntil) return;
  if (bannerQueue.length === 0) { bannerEl.classList.remove('show'); return; }
  var b = bannerQueue.shift();
  bannerTitleEl.textContent = b.title;
  bannerTextEl.textContent = b.text;
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth; // restart the pop-in animation
  bannerEl.classList.add('show');
  bannerUntil = now + CONFIG.effects.bannerSeconds;
}

// Throw confetti around a world position.
function spawnConfetti(state, x, y, count) {
  var colors = CONFIG.colors.confetti;
  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 2 + Math.random() * 6;
    state.confetti.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
      spin: (Math.random() - 0.5) * 12,
      color: colors[i % colors.length],
      born: state.time + Math.random() * 0.15,
    });
  }
}

// Move confetti (it slows down and drifts "down" the screen) and remove old pieces.
function updateConfetti(state, dt) {
  var life = CONFIG.effects.confettiTime;
  state.confetti = state.confetti.filter(function (p) {
    if (state.time < p.born) return true;
    p.vx *= 0.93; p.vy = p.vy * 0.93 + 4 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    return state.time - p.born < life;
  });
}

// The area a pad belongs to (the area its pad sits in), or null.
function getPadArea(pad) {
  for (var i = 0; i < CONFIG.areas.length; i++) {
    var a = CONFIG.areas[i];
    var cx = pad.pad.x + pad.pad.w / 2, cy = pad.pad.y + pad.pad.h / 2;
    if (cx >= a.x && cx <= a.x + a.w && cy >= a.y && cy <= a.y + a.h) return a;
  }
  return null;
}

// Is everything in this area built? (expansion pads don't count:
// they belong to the area they open)
function isAreaComplete(state, area) {
  return CONFIG.pads.every(function (pad) {
    return pad.builds.type === 'expansion' || getPadArea(pad) !== area || state.bought[pad.id];
  });
}

// An upgrade was bought: a small puff of confetti and a floating text.
// (No banner: there are lots of upgrades, banners would get tiring.)
function celebrateUpgrade(state, pad) {
  var b = pad.builds;
  var col = CONFIG.colors;
  if (b.machine) {
    // over the machine that leveled up: "★3  +50%"
    var m = getPad(b.machine).builds;
    var level = getMachineLevel(state, b.machine);
    spawnConfetti(state, m.x + m.w / 2, m.y + m.h / 2, 14);
    addFloater(state, '★' + level + '  +' + CONFIG.upgrades.levelPricePlus + '%', m.x + m.w / 2, m.y, col.levelStar);
  } else {
    // a barista upgrade: show its name above the barista
    var p = state.player;
    spawnConfetti(state, p.x, p.y, 14);
    addFloater(state, pad.name + '!', p.x, p.y - 1, col.upgradeText);
  }
}

// Something was just bought: celebrate the special moments.
function celebratePurchase(state, pad) {
  var b = pad.builds;
  if (b.type === 'expansion') {
    // a whole new area! confetti, a banner, and the camera pays it a visit
    var area = getArea(b.area);
    var door = area.openings[0];
    spawnConfetti(state, door.x + door.w / 2, door.y + door.h / 2, CONFIG.effects.confettiCount);
    spawnConfetti(state, area.x + area.w / 2, area.y + area.h / 2, CONFIG.effects.confettiCount);
    showBanner('🎉 ' + area.name + ' is open!', area.tagline);
    state.cameraFocus = { x: area.x + area.w / 2, y: area.y + area.h / 2,
                          until: state.time + CONFIG.view.showAreaSeconds };
  } else if (b.makes) {
    showBanner('New on the menu!', CONFIG.menu[b.makes].name + ' · ☕ ' + CONFIG.menu[b.makes].price);
    spawnConfetti(state, b.x + b.w / 2, b.y + b.h / 2, 18);
  } else if (b.type === 'upgrade') {
    celebrateUpgrade(state, pad);
  } else if (b.type === 'helper') {
    // a new helper pops up at their home spot
    syncHelpers(state);
    spawnConfetti(state, b.x, b.y, 24);
    showBanner('🧑‍🍳 ' + pad.name.replace('Hire a ', '') + ' hired!',
      'They fetch orders and serve customers all by themselves.');
  }
  // finished an area?
  var home = getPadArea(pad);
  if (b.type !== 'expansion' && home && isAreaComplete(state, home)) {
    showBanner('✨ ' + home.name + ' complete!', 'Every piece is built. It looks wonderful.');
  }
  if (getVisiblePads(state).length === 0) {
    showBanner('☕ Your café is finished!', 'Thank you for building it with so much love.');
  }
}

// ---------- Sounds for what just happened ----------

// Play a sound for a purchase, depending on what was bought.
function soundForPurchase(pad) {
  var type = pad.builds.type;
  if (type === 'expansion') playChime(true);
  else if (type === 'upgrade') playUpgrade();
  else if (type === 'helper') playHire();
  else {
    playBuild();
    if (pad.builds.makes) playChime(false); // new on the menu!
  }
}

// Play sounds for the events of this frame (customers paying), then forget them.
function playEventSounds() {
  state.events.forEach(function (e) {
    if (e.type === 'pay') playCoin(e.vip);
  });
  state.events.length = 0;
}

// ---------- Keep the screen on ----------
// Phones dim and lock the screen after a while. With "Keep screen on"
// the game asks the browser to keep it awake (Screen Wake Lock), so you
// can leave the café running. Not every browser can do this (it also
// needs the page to come from https:// or localhost, not a file).

var wakeLock = null;
var canKeepAwake = 'wakeLock' in navigator && window.isSecureContext;

// Ask for (or let go of) the wake lock, to match the setting.
function updateWakeLock() {
  if (!canKeepAwake) return;
  var want = state.settings.keepAwake && document.visibilityState === 'visible';
  if (want && !wakeLock) {
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      // the browser drops it by itself when the page is hidden
      lock.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () { /* not allowed right now: try again later */ });
  } else if (!want && wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// ---------- Settings switches and the mute button ----------

var togglesEl = document.getElementById('toggles');
var muteBtn = document.getElementById('mute-btn');
var TOGGLES = [
  { key: 'sound', label: '🔔 Sound effects' },
  { key: 'music', label: '🎵 Music' },
  { key: 'keepAwake', label: '☀️ Keep screen on' },
];

// Make one switch button per setting.
function setUpToggles() {
  TOGGLES.forEach(function (t) {
    var btn = document.createElement('button');
    btn.className = 'toggle';
    btn.innerHTML = '<span></span><span class="pill"></span>';
    btn.firstChild.textContent = t.label;
    btn.addEventListener('click', function () {
      state.settings[t.key] = !state.settings[t.key];
      settingsChanged();
    });
    t.button = btn;
    togglesEl.appendChild(btn);
  });
  muteBtn.addEventListener('click', function () {
    // one tap silences everything; the next tap brings both back
    var anyOn = state.settings.sound || state.settings.music;
    state.settings.sound = !anyOn;
    state.settings.music = !anyOn;
    startAudio(); // (a tap is allowed to start sound)
    settingsChanged();
  });
  refreshToggles();
}

// Show each switch as ON or OFF, and the right mute icon.
function refreshToggles() {
  TOGGLES.forEach(function (t) {
    var on = state.settings[t.key];
    var unavailable = t.key === 'keepAwake' && !canKeepAwake;
    t.button.classList.toggle('on', on && !unavailable);
    t.button.disabled = unavailable;
    t.button.lastChild.textContent = unavailable ? 'n/a' : (on ? 'ON' : 'OFF');
  });
  muteBtn.textContent = state.settings.sound || state.settings.music ? '🔊' : '🔇';
}

// A switch was flipped: update sound, the screen lock, the buttons, and save.
function settingsChanged() {
  applySoundSettings();
  updateWakeLock();
  refreshToggles();
  save();
}

// ---------- Settings panel ----------

var settingsEl = document.getElementById('settings');
var statsEl = document.getElementById('stats');
var resetAskEl = document.getElementById('reset-ask');
var resetConfirmEl = document.getElementById('reset-confirm');
var resetting = false; // true while starting over, so nothing saves on the way out

// Open the settings: pause the game and show a few stats.
function openSettings() {
  state.paused = true;
  var built = getBoughtPads(state).length;
  var areas = CONFIG.areas.filter(function (a) { return isAreaOpen(state, a); }).length;
  statsEl.innerHTML = '';
  [['Customers served', cashText(state.stats.served)],
   ['Areas open', areas + ' / ' + CONFIG.areas.length],
   ['Pieces built', built + ' / ' + CONFIG.pads.length],
   ['Cozy bonus', '+' + getCozyBonus(state) + '%'],
   ['Helpers', String(getHelperPads(state).length)],
   ['Earned by helpers', '☕ ' + cashText(state.stats.helperEarned || 0)],
   ['Barista carries', getCarryLimit(state) + ' items'],
   ['Walking speed', '+' + Math.round((getPlayerSpeed(state) / CONFIG.player.speed - 1) * 100) + '%']].forEach(function (row) {
    var li = document.createElement('li');
    var name = document.createElement('span'); name.textContent = row[0];
    var value = document.createElement('b'); value.textContent = row[1];
    li.appendChild(name); li.appendChild(value);
    statsEl.appendChild(li);
  });
  resetAskEl.hidden = false;
  resetConfirmEl.hidden = true;
  settingsEl.hidden = false;
}

// ----- Testing: money buttons -----
// Opening the game as index.html?cheat (or index.html#cheat) shows buttons
// in the settings panel that add coins, to try out later parts quickly.
var cheatsOn = /cheat/.test(location.search + location.hash);

// Make one button per amount in CONFIG.cheat.amounts.
function setUpCheats() {
  if (!cheatsOn) return;
  document.getElementById('cheats').hidden = false;
  var row = document.getElementById('cheat-buttons');
  CONFIG.cheat.amounts.forEach(function (amount) {
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = '+' + formatNumber(amount);
    btn.addEventListener('click', function () {
      state.cash += amount;
      save();
      updateHud(0);
    });
    row.appendChild(btn);
  });
}
setUpCheats();

// Close the settings and carry on playing.
function closeSettings() {
  settingsEl.hidden = true;
  state.paused = false;
}

// Start over: delete the save and reload the page.
function resetProgress() {
  resetting = true;
  deleteSave();
  location.reload();
}

document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('reset-btn').addEventListener('click', function () {
  // ask first: this can't be undone
  resetAskEl.hidden = true;
  resetConfirmEl.hidden = false;
});
document.getElementById('reset-no').addEventListener('click', function () {
  resetAskEl.hidden = false;
  resetConfirmEl.hidden = true;
});
document.getElementById('reset-yes').addEventListener('click', resetProgress);

// ---------- The main loop ----------

// Called whenever the screen size or orientation changes.
function onResize() {
  resizeCanvas();
  snapCamera(state.player); // the zoom changed, so re-aim the camera instantly
  drawWorld(state);         // redraw right away so there is no blank flash
}

// Walk the player in the direction the joystick/keys point.
function updatePlayer(dt) {
  var p = state.player;
  var speed = getPlayerSpeed(state); // faster with shoe upgrades

  p.moving = input.moveX !== 0 || input.moveY !== 0;
  if (!p.moving) return;

  moveWithCollision(p, input.moveX * speed * dt, input.moveY * speed * dt);

  // remember the facing direction (normalized) for drawing
  var len = Math.sqrt(input.moveX * input.moveX + input.moveY * input.moveY);
  p.faceX = input.moveX / len;
  p.faceY = input.moveY / len;
  p.walkTime += dt;
}

// Seconds since the last automatic save
var timeSinceSave = 0;

// Save, unless we're in the middle of starting over.
function save() {
  if (!resetting) saveGame(state);
}

// Advance the game by dt seconds. Returns how many coins reached the
// cash display (for the HUD bump).
function update(dt) {
  state.time += dt;
  updateInput();
  updatePlayer(dt);
  updateMachines(state, dt);
  updateCustomers(state, dt);
  updateHelpers(state, dt);

  var bought = tryBuyPads(state, dt);
  if (bought) {
    repathCustomers(state); // nobody walks through the new item
    celebratePurchase(state, bought);
    soundForPurchase(bought);
  }
  var picked = tryPickup(state);
  if (picked) playPickup();
  var served = tryDeliver(state);
  playEventSounds();

  // save straight away after the important moments, and every few seconds
  timeSinceSave += dt;
  if (bought || picked || served || timeSinceSave >= CONFIG.save.intervalSeconds) {
    save();
    timeSinceSave = 0;
  }

  updateFloaters(state);
  updateConfetti(state, dt);
  var arrived = updateCoins(state, dt);

  // the camera follows the barista, or visits a newly opened area for a moment
  var focus = state.cameraFocus && state.time < state.cameraFocus.until ? state.cameraFocus : state.player;
  followCamera(focus, dt);
  return arrived;
}

// The main loop: runs once per screen refresh (~60 times a second).
var lastTime = performance.now();
function loop(now) {
  // Ask for the next frame FIRST. If something below ever throws an error,
  // the game keeps running (the error still shows in the console)
  // instead of freezing on a half-drawn frame.
  requestAnimationFrame(loop);

  // dt = seconds since last frame. Capped so a sleeping tab
  // doesn't cause one giant jump when it wakes up.
  var dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  var arrived = state.paused ? 0 : update(dt);
  rollCash(dt);
  drawWorld(state);
  updateHud(arrived);
  updateBanner();
}

// ----- Start the game -----
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// Save when the player leaves: switching apps, locking the phone, closing the tab.
// (Phones often kill a page in the background without warning, so this matters.)
document.addEventListener('visibilitychange', function () {
  var hidden = document.visibilityState === 'hidden';
  if (hidden) save();
  pauseAudio(hidden);  // no music from a phone in your pocket
  updateWakeLock();    // the screen lock comes back when you return
});

// Sound may only start after a touch or key press (a browser rule).
// The wake lock likes a touch too.
function onFirstTouch() {
  startAudio();
  updateWakeLock();
}
window.addEventListener('pointerdown', onFirstTouch);
window.addEventListener('keydown', onFirstTouch);
window.addEventListener('pagehide', save);

rebuildSolids(state); // walls only, for a new game
loadGame(state);      // bring back saved progress, if any (also rebuilds solids)
shownCash = state.cash; // start the cash display at the right number
setUpToggles();
updateWakeLock();
onResize();
requestAnimationFrame(loop);
