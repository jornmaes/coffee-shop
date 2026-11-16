# Coffee Shop Tycoon — Cozy Café Game

A relaxed tycoon-style game played on a friend's phone in **landscape**. You walk
a little barista around your own café, serve customers the drinks they order,
and grow the shop piece by piece from an empty floor into a busy, cozy café.

## Concept

- **Tycoon-style building** (genre-inspired by Roblox tycoons; all art, names
  and layout are original):
  - Top-down 2D view of your shop. You control a barista character.
  - **Buy pads** are glowing tiles with a name and price. Walk onto one with
    enough cash and **stand on it for a moment** (a ring fills up around the
    pad's border); then that piece gets built (counter, coffee machines,
    tables, decorations...). Stepping off before the ring is full cancels it.
    Each purchase reveals the **next pads**, so the shop grows step by step
    along a build order.
- **The serving loop** (the heart of the game):
  1. A customer only walks in if there is a **free seat** (they claim it on
     entry). If all seats are taken, nobody new comes in.
  2. They queue at the **counter** and **place an order** (a speech bubble shows
     what they want), then walk to their seat and wait there. Once the shop
     sells treats, some customers order a **combo**: a drink *and* a treat.
  3. Each **machine makes one specific menu item** (coffee machines, bakery
     ovens, a lemonade stand, a blender, pots) and keeps a finished one ready
     on its tray.
  4. The barista walks to the right machine to **pick up** the item. The
     barista only picks up items that someone ordered, so walking past
     machines never fills your hands with unwanted things.
  5. The barista walks to the customer to **hand over the right item**. A wrong
     item is simply not handed over.
  6. The customer **pays for each item** as it's handed over, and **coins burst
     out of them** and fly to your cash. Once they have everything they enjoy
     it (little hearts), then leave and free the seat.
- **VIP customers** (a twinkling gold star) show up now and then and pay
  several times the normal price: a happy surprise, never a requirement.
- **What you buy:** machines unlock new, pricier menu items; tables add seats
  (more customers at once); **decorations** add a **cozy bonus** (+% on every
  payment).
- **Upgrades** are blue pads. Each area has one upgrade spot where its
  upgrades appear one after another:
  - **Machine levels** (★2, ★3, ★4): the item costs more and brews faster;
    stars show on the machine.
  - **Barista upgrades** (café): carry more items, walk faster, bigger
    machine trays (machines keep more items ready).
  - A pad that appears under the barista's feet waits until they step off
    it once, so one step never buys a whole chain of upgrades.
- **Areas:** the shop grows into new areas, each with its own look, menu,
  furniture and decorations. A locked area shows as an outline with a sign
  on the grass, so you always see what's coming. A big **golden pad** inside
  the café opens it: the wall opens up, confetti flies, the camera visits the
  new area and a banner announces it.
  - **Café** (start): coffee drinks, tables for two, cozy decor.
  - **Bakery Corner**: ovens bake croissants, cupcakes and cinnamon rolls
    (treats, so combo orders start); big tables for four; bunting, bread
    shelf, pastry display, flour sacks.
  - **Sunny Patio** (outdoors, fenced): lemonade stand and frappé blender;
    parasol tables; flower planter, fountain, lanterns.
  - **Book Lounge**: hot chocolate and matcha; armchairs; fireplace, piano,
    record player, big soft rug.
- **Celebrations keep it exciting:** "new on the menu" and "area complete"
  banners, confetti, golden pads with sparkles.
- **Pacing:** the whole shop is a multi-hour project (a fast bot needs about
  3.5 hours; the test allows 1.5–5 h). There's always a next pad within a few
  minutes, with an area opening as the bigger goal.
- **No fail states.** Nothing is ever lost: customers wait patiently forever and
  never leave angry, wrong drinks do nothing, money never goes negative.
  The worst case is "progress is slower".
- **Short play sessions.** Opening the game for a few minutes should feel good:
  serve a few customers, buy the next pad. Helpers and offline earnings
  (later parts) reward coming back.
- **Onboarding:** a small hint bar tells new players what to do next, until
  they've served a few customers.
- **Settings (⚙):** pauses the game, shows a few stats, and has **Reset
  progress** (asks for confirmation first).
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
- **The map is bigger than the screen** (areas side by side); the camera follows
  the barista and only what's on screen is drawn. Walls are generated from
  the areas in config; a door is cut into a wall when its area opens.
- **Pad name labels are drawn on top of everything** (after furniture and
  characters), so nothing can hide them.
- **Customers walk with pathfinding** (`path.js`): a grid of half-tile cells,
  A* search, then the route is straightened. The grid is rebuilt whenever
  something is built, and walking customers re-plan their route.
- **Save progress in `localStorage`.**
  - One save key (`coffeeShopSave`), stored as JSON: cash, bought pads, machine
    trays and timers, items being carried, stats, player position, last-seen time.
  - Save version 3 = the bigger map of Part 7. Older saves keep everything
    except the player position (the café moved), so the barista starts at the door.
  - Customers are **not** saved; a reloaded café starts empty and fills up again.
  - Save on every purchase, pickup and delivery, every few seconds, and on
    `visibilitychange` / `pagehide`.
  - Include a `saveVersion` number; when loading, check every field and fill in
    defaults, so old or damaged saves never break the game. Convert old formats
    instead of throwing them away.
  - Wrap reads/writes in `try/catch`; a broken save must never crash the game.

## Balance numbers: `config.js`

**ALL balance numbers live in `config.js`**: pad prices and build order, menu
prices / brew times / popularity, customer speed and timings, combo and VIP
chances, seats, queue, cozy bonuses, carry limit, player speed, joystick
size, starting cash, effects.

- **Layout** (areas with their walls and doors, positions and sizes of pads,
  items, the order spot and queue) also lives in config, so the shop can be
  rearranged without touching code.
- Game code reads from a single global `CONFIG` object; it never hard-codes a
  balance number.
- Each value has a short comment saying what it does and its unit
  (seconds, coins, tiles, percent).
- The owner tweaks this file by hand, so keep it readable: grouped by topic,
  no clever computed values beyond simple formulas.
- When changing the layout, keep these true (the layout test checks them):
  items don't overlap each other or pads; pads that can be visible at the same
  time don't overlap, and neither do their name labels; every pad is in an
  area that is open when the pad shows; seats and queue spots are reachable
  from the door; the barista can reach every machine, pad and seat (also at
  the moment each pad appears).

## Code style

- **Keep it simple.** Prefer plain functions and plain objects over classes and
  abstractions. Readable beats clever.
- **Comment the code.** A short comment above each function and each
  non-obvious block, written for someone learning JavaScript.
- Small files with clear jobs:
  - `index.html`: page structure, canvas, HUD, script order
  - `style.css`: all styling
  - `config.js`: all balance numbers and the layout
  - `world.js`: areas and walls, collision, buy pads, machines, pickup, seats, cozy bonus
  - `path.js`: the walking grid and route finding for customers
  - `customers.js`: customer visits (queue, order, seat, pay, leave), combos, VIPs, coins
  - `save.js`: localStorage save/load
  - `art.js`: how everything looks (menu items, machines, furniture, decor, characters)
  - `render.js`: the camera and drawing each frame in the right order
  - `input.js`: joystick and keyboard
  - `game.js`: game state, the main loop, HUD, hints, celebrations, settings panel
  - `tests/`: Node logic tests (not loaded by the game): `run-all.js` runs
    them all; `load-game.js` loads the logic files; layout, save, collision
    and a bot that plays the whole build order (`test-flow.js`)
- Use a `requestAnimationFrame` loop and compute everything from elapsed time
  (`dt`), not frame count, so it stays correct when the tab sleeps.

## Workflow

After **each part** of the roadmap:

1. **Test** it:
   - Run `node --check <file>.js` on changed JS files to catch syntax errors.
   - Run logic tests in Node when logic changed: `node tests/run-all.js`.
     They load the game's logic files (no browser needed; joined into one
     function rather than a `vm` sandbox, which is many times slower) and
     check the rules, layout and a bot that plays the whole build order (no
     getting stuck, sensible pacing). Add checks there for new rules.
   - Open `index.html` in a browser in responsive mode, landscape (e.g. 844×390).
     Turn on touch emulation to try the joystick.
   - Switch to portrait (390×844) and check the rotate overlay appears.
   - Check the browser console for errors.
   - Try the new feature, reload the page, and confirm progress was saved.
     To start over while testing, use ⚙ → Reset progress (or run
     `localStorage.removeItem('coffeeShopSave')` in the console and reload).
     To test later parts quickly, open `index.html?cheat`: ⚙ then shows
     buttons that add money (amounts in `CONFIG.cheat`).
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
- [x] **Part 7 — Expansion:** three new areas (Bakery Corner, Sunny Patio,
      Book Lounge) opened by golden pads, each with its own machines, menu,
      seats and decor; treats and combo orders; VIP customers; celebrations
      (confetti, banners, camera visit); longer pacing; pad labels always on
      top; settings panel with reset progress.
- [x] **Part 8 — Upgrades & machine levels:** blue upgrade pads, one spot per
      area: machine levels ★2–★4 (higher price, faster brewing), barista
      upgrades (carry more, walk faster, bigger trays). Logic tests moved into
      `tests/`.
- [ ] **Part 9 — Helpers:** hire a helper barista per area who picks up and
      delivers orders on their own (the idle part); helper upgrades.
- [ ] **Part 10 — Pacing to ~10 h:** rebalance prices so a fast bot needs
      about 10 hours (test allows 8–12 h), with never more than ~10 minutes
      between purchases.
- [ ] **Part 11 — Offline earnings:** helpers keep serving while you're away; a
      cozy "Welcome back, you earned X" popup (capped by a config value).
- [ ] **Part 12 — Polish:** gentle animations, optional sound with a mute
      toggle, more settings. (Number formatting and reset-with-confirmation
      came early, in Part 7.)
- [ ] **Part 13 — Phone install:** web app manifest (landscape orientation,
      fullscreen) and icon so it can be added to the home screen.
