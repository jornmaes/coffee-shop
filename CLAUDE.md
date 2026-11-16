# Coffee Shop Tycoon — Cozy Café Game

A relaxed tycoon-style game played on a friend's phone in **landscape**. You walk
a little barista around your own café, serve customers the drinks they order,
and grow the shop piece by piece from an empty floor into a busy, cozy café.

## Concept

- **Tycoon-style building** (genre-inspired by Roblox tycoons; all art, names
  and layout are original):
  - Top-down 2D view of your shop. You control a barista character.
  - **Buy pads** are glowing tiles with a name and price. Walk onto one with
    enough cash and that piece gets built (counter, coffee machines, tables,
    decorations...). Each purchase reveals the **next pads**, so the shop grows
    step by step along a build order.
- **The serving loop** (the heart of the game):
  1. A customer only walks in if there is a **free seat** (they claim it on
     entry). If all seats are taken, nobody new comes in.
  2. They queue at the **counter** and **place an order** (a speech bubble shows
     the drink), then walk to their seat and wait there.
  3. Each **machine makes one specific drink** (Espresso, Cappuccino, Latte,
     Mocha, Iced Coffee) and keeps a finished one ready on its tray.
  4. The barista walks to the right machine to **pick up** the drink. The
     barista only picks up drinks that someone ordered, so walking past
     machines never fills your hands with unwanted drinks.
  5. The barista walks to the customer to **hand over the right drink**. A wrong
     drink is simply not handed over.
  6. The customer **pays**, and **coins burst out of them** and fly to your
     cash. They sip happily (little hearts), then leave and free the seat.
- **What you buy:** machines unlock new, pricier drinks; tables add seats (more
  customers at once); **decorations** (flowers, bookshelf, rug, fairy lights,
  plant, lamp, sleepy cat, menu board...) add a **cozy bonus** (+% on every payment).
- **No fail states.** Nothing is ever lost: customers wait patiently forever and
  never leave angry, wrong drinks do nothing, money never goes negative.
  The worst case is "progress is slower".
- **Short play sessions.** Opening the game for a few minutes should feel good:
  serve a few customers, buy the next pad. Helpers and offline earnings
  (later parts) reward coming back.
- **Onboarding:** a small hint bar tells new players what to do next, until
  they've served a few customers.
- Calm, cute tone: soft colors, rounded shapes, gentle animations, no pressure.

## Tech

- **Plain HTML, CSS and JavaScript.** No frameworks, no libraries, no npm.
- **No build step.** Opening `index.html` in a browser must run the game.
  - Use classic `<script>` tags (not ES modules) so it also works from `file://`.
  - Load order matters: `config.js` first, then the game scripts (see `index.html`).
- **Landscape phone screen first.** Design for roughly 800×360 up to 930×430.
  - The game world is drawn on a single `<canvas>` (2D context). The HUD
    (cash, cozy bonus, hint, buttons, popups) is HTML on top of the canvas.
  - The world uses fixed **world units** (tiles); a camera follows the player
    and scales the world to the screen. Handle `devicePixelRatio` so it stays sharp.
  - In portrait, show a friendly "rotate your phone" overlay instead of the game.
  - Use `env(safe-area-inset-*)` so the HUD avoids notches.
  - Disable page scroll, zoom, pull-to-refresh and text selection.
- **Controls:** a virtual joystick wherever the thumb touches. WASD / arrow
  keys on desktop for testing. Big tap targets (at least 44px) for HUD buttons.
  Picking up, handing over and buying all happen by **walking into things**:
  no extra buttons.
- **Graphics:** everything is drawn with simple canvas shapes (no image files)
  in a cute, rounded style. Drawing code lives in `art.js`.
- **Customers walk with pathfinding** (`path.js`): a grid of half-tile cells,
  A* search, then the route is straightened. The grid is rebuilt whenever
  something is built, and walking customers re-plan their route.
- **Save progress in `localStorage`.**
  - One save key (`coffeeShopSave`), stored as JSON: cash, bought pads, machine
    trays and timers, drinks being carried, stats, player position, last-seen time.
  - Customers are **not** saved; a reloaded café starts empty and fills up again.
  - Save on every purchase, pickup and delivery, every few seconds, and on
    `visibilitychange` / `pagehide`.
  - Include a `saveVersion` number; when loading, check every field and fill in
    defaults, so old or damaged saves never break the game. Convert old formats
    instead of throwing them away.
  - Wrap reads/writes in `try/catch`; a broken save must never crash the game.

## Balance numbers: `config.js`

**ALL balance numbers live in `config.js`**: pad prices and build order, drink
prices / brew times / popularity, customer speed and timings, seats, queue,
cozy bonuses, carry limit, player speed, joystick size, starting cash, effects.

- **Layout** (positions and sizes of pads, items, the order spot and queue)
  also lives in config, so the shop can be rearranged without touching code.
- Game code reads from a single global `CONFIG` object; it never hard-codes a
  balance number.
- Each value has a short comment saying what it does and its unit
  (seconds, coins, tiles, percent).
- The owner tweaks this file by hand, so keep it readable: grouped by topic,
  no clever computed values beyond simple formulas.
- When changing the layout, keep these true (the layout test checks them):
  items don't overlap each other or pads; pads that can be visible at the same
  time don't overlap; seats and queue spots are reachable from the door; the
  barista can reach every machine, pad and seat.

## Code style

- **Keep it simple.** Prefer plain functions and plain objects over classes and
  abstractions. Readable beats clever.
- **Comment the code.** A short comment above each function and each
  non-obvious block, written for someone learning JavaScript.
- Small files with clear jobs:
  - `index.html`: page structure, canvas, HUD, script order
  - `style.css`: all styling
  - `config.js`: all balance numbers and the layout
  - `world.js`: walls, collision, buy pads, machines, drink pickup, seats, cozy bonus
  - `path.js`: the walking grid and route finding for customers
  - `customers.js`: customer visits (queue, order, seat, pay, leave) and the coin effect
  - `save.js`: localStorage save/load
  - `art.js`: how everything looks (drinks, machines, furniture, decor, characters)
  - `render.js`: the camera and drawing each frame in the right order
  - `input.js`: joystick and keyboard
  - `game.js`: game state, the main loop, HUD and hints
- Use a `requestAnimationFrame` loop and compute everything from elapsed time
  (`dt`), not frame count, so it stays correct when the tab sleeps.

## Workflow

After **each part** of the roadmap:

1. **Test** it:
   - Run `node --check <file>.js` on changed JS files to catch syntax errors.
   - Run logic tests in Node when logic changed: load the game files into a
     `vm` sandbox (no browser needed) and check the rules, layout and a bot
     that plays the whole build order (no getting stuck, sensible pacing).
   - Open `index.html` in a browser in responsive mode, landscape (e.g. 844×390).
     Turn on touch emulation to try the joystick.
   - Switch to portrait (390×844) and check the rotate overlay appears.
   - Check the browser console for errors.
   - Try the new feature, reload the page, and confirm progress was saved.
     To start over while testing, run `localStorage.removeItem('coffeeShopSave')`
     in the browser console and reload.
2. **Git commit** with a clear message describing the part (e.g.
   `Part 3: buy pads`), and tick the part off in the roadmap below.

Don't start the next part until the current one works and is committed.

## ROADMAP

- [x] **Part 1 — Skeleton:** landscape canvas, HUD, rotate overlay, shop floor drawn.
- [x] **Part 2 — Player movement:** joystick + keys, barista character,
      camera follows, walls block movement.
- [x] **Part 3 — Buy pads:** step on a pad with enough cash to build a piece.
- [x] **Part 4 — Earning:** first earning loop (since replaced by serving customers).
- [x] **Part 5 — Saving:** localStorage with versioning and safe defaults.
- [x] **Part 6 — Customers & build order:** customers order at the counter and
      sit down; machines make specific drinks; the barista picks up and hands
      over the right drink; customers pay with a coin burst. Full build order:
      5 drink machines, 5 tables, 8 cozy decorations.
- [ ] **Part 7 — Expansion:** new areas open up (patio, upstairs, bakery corner)
      with more seats and a few new drinks or treats.
- [ ] **Part 8 — Helpers & upgrades:** hire a helper barista who delivers drinks
      on their own (the idle part); upgrades like faster machines, bigger trays,
      carrying more drinks, walking faster.
- [ ] **Part 9 — Offline earnings:** helpers keep serving while you're away; a
      cozy "Welcome back, you earned X" popup (capped by a config value).
- [ ] **Part 10 — Polish:** gentle animations, optional sound with a mute
      toggle, number formatting (1.2K, 3.4M), settings with a reset-save button
      (with confirmation).
- [ ] **Part 11 — Phone install:** web app manifest (landscape orientation,
      fullscreen) and icon so it can be added to the home screen.
