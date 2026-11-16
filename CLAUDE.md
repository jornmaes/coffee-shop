# Coffee Shop Tycoon — Cozy Idle Game

A relaxed tycoon-style game played on a friend's phone in **landscape**. You walk
a little barista around your own shop plot and grow it piece by piece, from an
empty floor into a busy, cozy café.

## Concept

- **Tycoon-style building** (genre-inspired by Roblox tycoons; all art, names
  and layout are original):
  - Top-down 2D view of your shop plot. You control a barista character.
  - **Buy pads** are glowing tiles with a name and price. Walk onto one with
    enough cash and that piece gets built (counter, espresso machine, tables,
    plants, a new room...).
  - Each purchase reveals the **next pads**, so the shop grows step by step
    along a build order.
  - Built machines brew coffee automatically; money collects in the
    **register / tip jar**. Walk over it to collect.
- **No fail states.** Nothing is ever lost: no running out of money, no angry
  customers leaving, no timers you can miss. The worst case is "progress is slower".
- **Short play sessions.** Opening the game for 1–2 minutes should feel good:
  collect the register, buy the next pad, close it. Offline earnings reward
  coming back.
- Calm tone: soft colors, gentle animations, no pressure or nagging.

## Tech

- **Plain HTML, CSS and JavaScript.** No frameworks, no libraries, no npm.
- **No build step.** Opening `index.html` in a browser must run the game.
  - Use classic `<script>` tags (not ES modules) so it also works from `file://`.
  - Load order matters: `config.js` first, then the game scripts.
- **Landscape phone screen first.** Design for roughly 800×360 up to 930×430.
  - The game world is drawn on a single `<canvas>` (2D context). The HUD
    (cash, buttons, popups) is HTML on top of the canvas.
  - The world uses fixed **world units**; a camera follows the player and
    scales the world to the screen. Handle `devicePixelRatio` so it stays sharp.
  - In portrait, show a friendly "rotate your phone" overlay instead of the game.
    Optionally try `screen.orientation.lock('landscape')` when in fullscreen.
  - Use `env(safe-area-inset-*)` so the HUD avoids notches.
  - Disable page scroll, zoom, pull-to-refresh and text selection.
- **Controls:** a virtual joystick under the left thumb (touch). WASD / arrow
  keys on desktop for testing. Big tap targets (at least 44px) for HUD buttons.
- **Graphics:** start with simple drawn shapes and emoji; real art can come later.
- **Save progress in `localStorage`.**
  - One save key (e.g. `coffeeShopSave`), stored as JSON: cash, which pads
    are bought, player position, last-seen time.
  - Save on every purchase and every few seconds, plus on `visibilitychange`.
  - Include a `saveVersion` number; when loading, fill in missing fields with
    defaults so old saves never break after an update.
  - Wrap reads/writes in `try/catch`; a broken save must never crash the game.

## Balance numbers: `config.js`

**ALL balance numbers live in `config.js`**: pad prices, build order and
unlock chain, machine earnings per second, the register cap, offline earning
caps, player walk speed, joystick size, starting cash.

- **Pad layout** (x/y positions and sizes in world units) also lives in
  config, so the shop can be rearranged without touching code.
- Game code reads from a single global `CONFIG` object; it never hard-codes a
  balance number.
- Each value has a short comment saying what it does and its unit
  (seconds, coins, world units, multiplier).
- The owner tweaks this file by hand, so keep it readable: grouped by topic,
  no clever computed values beyond simple formulas.

## Code style

- **Keep it simple.** Prefer plain functions and plain objects over classes and
  abstractions. Readable beats clever.
- **Comment the code.** A short comment above each function and each
  non-obvious block, written for someone learning JavaScript.
- Small files with clear jobs:
  - `index.html`: page structure, canvas and HUD
  - `style.css`: all styling
  - `config.js`: all balance numbers and the pad layout
  - `save.js`: localStorage save/load
  - `input.js`: joystick and keyboard
  - `world.js`: pads, buildings, earning, register
  - `render.js`: canvas drawing and camera
  - `game.js`: game state and the main loop
- Use a `requestAnimationFrame` loop and compute everything from elapsed time
  (`dt`), not frame count, so it stays correct when the tab sleeps.

## Workflow

After **each part** of the roadmap:

1. **Test** it:
   - Run `node --check <file>.js` on changed JS files to catch syntax errors.
   - Open `index.html` in a browser in responsive mode, landscape (e.g. 844×390).
     Turn on touch emulation to try the joystick.
   - Switch to portrait (390×844) and check the rotate overlay appears.
   - Check the browser console for errors.
   - Try the new feature, reload the page, and confirm progress was saved.
2. **Git commit** with a clear message describing the part (e.g.
   `Part 3: buy pads`), and tick the part off in the roadmap below.

Don't start the next part until the current one works and is committed.

## ROADMAP

- [x] **Part 1 — Skeleton:** landscape canvas, HUD (cash, income, settings
      button), rotate overlay, shop floor drawn.
- [x] **Part 2 — Player movement:** joystick + keys, barista character,
      camera follows, walls block movement.
- [x] **Part 3 — Buy pads:** step on a pad with enough cash to build a piece;
      cash shown in the HUD.
- [ ] **Part 4 — Earning:** machines brew coins into the register; walk over
      the register to collect.
- [ ] **Part 5 — Saving:** localStorage with versioning and safe defaults.
- [ ] **Part 6 — Build order:** the full chain of pads
      (counter → machines → seating → decor), each revealing the next.
- [ ] **Part 7 — Expansion:** new areas open up (patio, upstairs, bakery corner).
- [ ] **Part 8 — Customers:** little customers walk in, sit and sip; small
      visual/earning bonus.
- [ ] **Part 9 — Offline earnings:** cozy "Welcome back, you earned X" popup
      (capped by a config value).
- [ ] **Part 10 — Polish:** gentle animations, optional sound with a mute
      toggle, number formatting (1.2K, 3.4M), settings with a reset-save button
      (with confirmation).
- [ ] **Part 11 — Phone install:** web app manifest (landscape orientation,
      fullscreen) and icon so it can be added to the home screen.
