# Coffee Shop — Cozy Idle Game

A relaxed idle game played on a friend's phone. You start with one coffee
machine and slowly build up a cozy little shop.

## Concept

- **Cozy idle shop** that grows over time: more drinks, upgrades, staff, decor.
- **No fail states.** Nothing is ever lost: no running out of money, no angry
  customers leaving, no timers you can miss. The worst case is "progress is slower".
- **Short play sessions.** Opening the game for 1–2 minutes should feel good:
  collect earnings, buy something, close it. Offline progress rewards coming back.
- Calm tone: soft colors, gentle animations, no pressure or nagging.

## Tech

- **Plain HTML, CSS and JavaScript.** No frameworks, no libraries, no npm.
- **No build step.** Opening `index.html` in a browser must run the game.
  - Use classic `<script>` tags (not ES modules) so it also works from `file://`.
  - Load order matters: `config.js` first, then the game scripts.
- **Portrait phone screen first.** Design for ~360–430px wide, tall screens.
  - Big tap targets (at least 44px), thumb-friendly controls near the bottom.
  - Use `<meta name="viewport" content="width=device-width, initial-scale=1">`.
  - Desktop just shows the phone layout centered; don't design for landscape.
- **Save progress in `localStorage`.**
  - One save key (e.g. `coffeeShopSave`), stored as JSON.
  - Save on every purchase and every few seconds, plus on `visibilitychange`.
  - Include a `saveVersion` number; when loading, fill in missing fields with
    defaults so old saves never break after an update.
  - Wrap reads/writes in `try/catch`; a broken save must never crash the game.

## Balance numbers: `config.js`

**ALL balance numbers live in `config.js`** — prices, costs, timers, cost
growth multipliers, unlock thresholds, offline earning caps, starting values.

- Game code reads from a single global `CONFIG` object; it never hard-codes a
  balance number.
- Each value has a short comment saying what it does and its unit
  (seconds, coins, multiplier).
- The owner tweaks this file by hand, so keep it readable: grouped by topic,
  no clever computed values beyond simple formulas.

## Code style

- **Keep it simple.** Prefer plain functions and plain objects over classes and
  abstractions. Readable beats clever.
- **Comment the code.** A short comment above each function and each
  non-obvious block, written for someone learning JavaScript.
- Small files with clear jobs, for example:
  - `index.html` — page structure
  - `style.css` — all styling
  - `config.js` — all balance numbers
  - `game.js` — game state, game loop, earning logic
  - `save.js` — localStorage save/load
  - `ui.js` — drawing state to the screen and handling taps
- Use `requestAnimationFrame` or a simple `setInterval` tick; compute earnings
  from elapsed time (not tick count) so it stays correct when the tab sleeps.

## Workflow

After **each part** of the roadmap:

1. **Test** it:
   - Open `index.html` in a browser using phone/responsive mode (portrait, ~390px).
   - Check the browser console for errors.
   - Try the new feature, reload the page, and confirm progress was saved.
   - Run `node --check <file>.js` on changed JS files to catch syntax errors.
2. **Git commit** with a clear message describing the part (e.g.
   `Part 3: save and load progress`).

Don't start the next part until the current one works and is committed.

## ROADMAP

- [ ] **Part 1 — Skeleton:** `index.html`, `style.css`, `config.js`, `game.js`.
      Portrait layout with a header (coins), shop area, and bottom button bar.
- [ ] **Part 2 — Core loop:** tap a button to brew a coffee and earn coins;
      coin counter updates with a small animation.
- [ ] **Part 3 — Saving:** save/load to localStorage with versioning and
      safe defaults.
- [ ] **Part 4 — Upgrades:** buy upgrades (better beans = more coins per cup,
      faster machine = shorter brew time) with costs that grow per level.
- [ ] **Part 5 — Idle income:** hire baristas who brew automatically;
      show coins per second.
- [ ] **Part 6 — Offline earnings:** on return, show a cozy "Welcome back,
      you earned X" popup (capped by a config value).
- [ ] **Part 7 — Menu expansion:** unlock new drinks (latte, cappuccino, tea,
      pastries) that earn more.
- [ ] **Part 8 — Shop growth:** decor and shop levels that visibly change the
      shop (plants, lights, more tables) and give small bonuses.
- [ ] **Part 9 — Polish:** gentle animations, optional sound with a mute toggle,
      number formatting (1.2K, 3.4M), settings with a reset-save button
      (with confirmation).
- [ ] **Part 10 — Phone install:** web app manifest and icon so it can be added
      to the home screen and feel like an app.
