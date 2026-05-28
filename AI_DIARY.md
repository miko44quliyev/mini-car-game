# 🤖 AI_DIARY.md — HyperDrive Pro

## Which AI tools I used and why

**Primary tool: Claude (Anthropic)**

I used Claude for this entire project. It can read multiple files at once, write vanilla JS without pushing frameworks on me, and even run Python to automate tasks like slicing a sprite sheet. I kept it to one tool so my diary entries are consistent and easy to trace back.

---

## Development Log

---

### Day 1 — Set up the project and got a car moving on screen

Started from scratch. Created `index.html`, `styles.css`, and `game.js`. Asked Claude to scaffold a top-down canvas game with a player car that moves left and right using arrow keys and A/D.

It gave me a working canvas setup with a `player` object, a `keys` listener, and a basic `update()` / `draw()` loop using `requestAnimationFrame`. The car moved. Felt good.

One issue on day 1: the car was declared as a `const` object but `gameSpeed` was also `const` — the AI wrote increment logic later that tried to do `gameSpeed += 0.002` which silently did nothing in strict mode. The car moved but never sped up. I noticed the road lines were scrolling at a fixed speed and the game felt too easy. Checked the code, found the `const`, changed it to `let`. Fixed.

**What I asked:** "Write a top-down canvas car game with player movement, a road, and lane lines."
**What went wrong:** `const gameSpeed` couldn't be incremented — silent failure, no error thrown.
**How I fixed it:** Changed to `let gameSpeed = 5`.
**Time lost:** ~20 minutes

---

### Day 2 — Added traffic cars, collision detection, and a score

Asked Claude to spawn coloured traffic cars from the top of the screen and add AABB collision detection. Also added a score counter that increments based on game speed.

The spawning and collision worked, but there was a bug: obstacles were never being removed from the array. The removal check was `if (obs.y > canvas.height)` — fine for SAME-WAY mode where traffic drifts down. But later when I added HEAD-ON mode (traffic coming toward you), those cars move upward, so their Y goes negative. The check never triggered for them. After about a minute of gameplay the obstacles array had thousands of entries and the browser tab froze.

Also the score display was showing `NaN` for one frame on startup because `activeRuntime` was undefined until `startGame()` was called, and the `draw()` loop started before that.

**What I asked:** "Add traffic spawning, collision, and a score counter."
**What went wrong:** Removal condition didn't handle upward-moving cars. Score showed NaN on load.
**How I fixed it:** Changed removal to `obs.y > canvas.height + 120 || obs.y < -200`. Added a `gameState !== 'PLAYING'` guard at the top of `update()` so score logic only runs during a real game session.
**Time lost:** ~25 minutes

---

### Day 3 — Added nitro boost, combo system, and near-miss detection

Asked Claude to add a nitro bar (Space/Shift to activate), a near-miss bonus when the player passes within 18px of a car without hitting it, and a combo counter that chains near-misses.

This all came out mostly working. The near-miss detection used the same AABB logic but with a `pad = 18` expansion — clever. The combo counter incremented and reset on a timer. The nitro bar filled and drained correctly.

The one thing that broke: the nitro bar HTML element wasn't being updated visually even though the JS value changed. The `nitroBar.style.width` line was correct, but the CSS for `#nitro-bar` had `width: 0` hardcoded with `!important` — Claude had written it that way to prevent a FOUC (flash of unstyled content) and forgot to remove it. The bar was always empty visually even while nitro was working in the logic.

**What I asked:** "Add nitro boost, near-miss detection, and a combo counter with a timer."
**What went wrong:** Nitro bar stayed visually empty due to `width: 0 !important` in CSS overriding the JS update.
**How I fixed it:** Removed `!important` from `#nitro-bar { width: 0 }` in styles.css.
**Time lost:** ~15 minutes

---

### Day 4 — Added start screen, pause screen, and game over screen

Asked Claude to build three overlay screens in HTML on top of the canvas: a start menu with difficulty and mode selection, a pause screen (ESC key), and a game over screen with final score, coins earned, and a restart button.

The screens used a `hidden` CSS class to show/hide. This worked, but the game-over screen had a visual bug: it flashed on screen for one frame immediately when the page loaded, then disappeared. The reason was the HTML didn't have `class="hidden"` on `#game-over-screen` by default — Claude added it dynamically in `exitToMenu()` but the initial HTML was missing it.

Also the restart button wasn't fully resetting state. `score`, `combo`, and `particles` were being reset inside `startGame()`, but `nearMissCount` and `runCoins` were not — so the game over stats from the first run carried over into the second run's display.

**What I asked:** "Add start screen, pause, and game over screens with a restart button."
**What went wrong:** Game over screen flashed on load. Restart didn't fully reset near-miss count and run coin total.
**How I fixed it:** Added `class="hidden"` to `#game-over-screen` in index.html. Added `nearMissCount = 0; runCoins = 0;` inside `startGame()`.
**Time lost:** ~20 minutes

---

### Day 5 — Added localStorage: high score, wallet, and owned cars

Asked Claude to save the high score per mode+difficulty combination, the coin wallet, and the list of owned car IDs to localStorage. Each mode/difficulty combo gets its own key so scores don't mix (e.g. `hd_record_SAME_WAY_NORMAL`).

The storage logic itself was clean. The bug came from the high score display: `hudBestDisplay.textContent` was being set in `refreshHighScore()`, which was called before the `hudLayer` element was visible. That was fine. But the `menuHighScore` element was also being updated there, and on the very first ever load (localStorage empty), `LS.get(storageKey(), 0)` returned `0`, so the menu showed `0` — correct. But after a game, if the player went back to the menu without refreshing, the best score in the menu didn't update because `refreshHighScore()` was tied to the storage key for the current mode/difficulty — and the player might have switched mode on the game over screen. The record shown was for the wrong mode.

**What I asked:** "Save the high score to localStorage, display it in the HUD and main menu."
**What went wrong:** Menu high score showed the wrong mode's record if the player changed mode on the game over screen.
**How I fixed it:** Called `refreshHighScore()` explicitly inside `renderToggles()` so any time the mode changed, the displayed record updated immediately.
**Time lost:** ~15 minutes

---

### Day 6 — Built the garage with 20 cars, prices, and a coin economy

This was the biggest day. Asked Claude to build a garage screen with a horizontal scrolling card strip showing all 20 cars, a detail panel with stats, buy/select buttons, and a coin system tied to score.

The card strip worked on desktop. On mobile the `.garage-strip` overflowed the screen horizontally — the `#ui-layer` became side-scrollable which broke the canvas touch zones. Claude had set the strip's parent to `overflow: visible`, meaning the 1840px-wide track leaked out.

Also the buy button didn't disable properly after purchasing — `carActionBtn.disabled` was set, but `onclick` was still attached from the previous state and could still be triggered by keyboard Enter on the focused button.

**What I asked:** "Build a garage screen with a scrollable car strip, stats panel, and buy/select logic."
**What went wrong:** Garage horizontal overflow broke mobile touch. Buy button onclick wasn't cleared after purchase.
**How I fixed it:** Added `overflow: hidden` to `.garage-strip` and `max-width: 100vw` to `#game-container`. Set `carActionBtn.onclick = null` alongside `carActionBtn.disabled = true` after any state change.
**Time lost:** ~35 minutes

---

### Day 7 — Split into modules (cars.js) and hit the file:// CORS wall

Decided to clean up the code by splitting `CAR_ROSTER` and `MILESTONES` into their own `cars.js` file using ES module `import`/`export`. Asked Claude to refactor.

It did it perfectly — clean imports, `type="module"` on the script tag. Worked fine when I tested it through VS Code Live Server. Pushed to GitHub, opened the raw file locally to show a friend, got:

```
Blocked: origin (null) is not allowed by Access-Control-Allow-Origin
```

The `file://` protocol gives pages a null origin, and browsers block ES module imports across null origins even within the same folder. Claude knew about this but assumed I'd always be serving from a server. It should have warned me.

Asked Claude to bundle everything back into a single `game.js` with no imports. The bundler script it wrote the first time only stripped single-line imports with a simple regex — it missed the multi-line import block at the top of `game.js` that imported 5 names from `state.js` across multiple lines. One remaining `import` keyword in the script tag-less file caused a syntax error and the whole game went blank.

**What I asked:** "Split the roster into cars.js using ES modules."
**What went wrong:** file:// protocol blocks module imports. Bundler regex missed multi-line import blocks.
**How I fixed it:** Changed the bundler regex to match multi-line imports: `re.sub(r'import\s*\{[^}]*\}\s*from\s*...', '', src, flags=re.DOTALL)`. Verified zero remaining `import` occurrences before outputting the bundle.
**Time lost:** ~45 minutes

---

### Day 8 — Replaced CSS car drawings with real sprite images

The cars were being drawn procedurally as coloured rectangles with gradient fills and pixel wheels. I had a sprite sheet image (4 columns × 5 rows = 20 cars, 1024×1536px). Asked Claude to replace the procedural renderer with real images.

Claude wrote a Python script using Pillow to crop the sheet into 20 individual images, encode them as base64, and embed them in a `CAR_SPRITES` object inside `game.js`. The integration was clean — it added `drawCarSprite()` and replaced both `drawPlayerCar()` and `drawTrafficCar()` to use it.

Two bugs:

**Bug 1 — Garage cards showed blank white squares.** The `drawMiniCar()` function called `ctx.drawImage(img)` immediately in `buildGarage()`, but the `Image` objects hadn't fired their `load` events yet. Fixed by adding an `img.complete && img.naturalWidth > 0` guard and a one-time `load` listener to redraw once ready.

**Bug 2 — HEAD-ON traffic sprites faced the wrong way.** In HEAD-ON mode, traffic comes toward you — visually they should face downward. Claude added `ctx.scale(1, -1)` to flip them, but flipped around Y=0 (the top of the canvas), so a car at y=300 appeared at y=−300 (off screen). Fixed by translating to the car's centre first: `ctx.translate(x + w/2, y + h/2); ctx.scale(1, -1); ctx.drawImage(img, -w/2, -h/2, w, h)`.

Also the resulting `game.js` is 860 KB because 20 PNGs in base64 are large. The game takes a few extra seconds to parse on slow connections. Accepted the trade-off for now since it means zero external file dependencies.

**What I asked:** "Replace the procedural car drawing with real sprite images from the sheet."
**What went wrong:** drawImage on unloaded images caused blank garage cards. Canvas flip around wrong origin made HEAD-ON cars invisible.
**How I fixed it:** Added load guard + listener. Fixed flip to translate → scale → draw at offset.
**Time lost:** ~35 minutes

---

*Total diary entries: 8*
*Total estimated time lost to AI errors: ~3.5 hours*
*Total time saved by using AI: way more than that — the full game would have taken weeks solo.*

---

### Day 9 — Added full audio engine with 10 synthesised sound effects

The game was completely silent. I wanted: engine hum, nitro whoosh, nitro fizzle, near-miss doppler, combo chime, crash explosion, new record fanfare, coin chime, menu click, and countdown beeps — all without any audio files.

Asked Claude to build a Web Audio API `SFX` module and wire it into the existing game.

**The engine hum** uses a sawtooth oscillator running continuously while the game is in PLAYING state. Its frequency maps from 60 Hz (slow) to 220 Hz (max speed) so the engine pitch rises as the road speeds up. A low-pass filter at 400 Hz stops it from sounding harsh, and a slow LFO creates a subtle pulse. It starts on the first countdown beep and stops when you crash or exit to menu.

**Nitro activate** plays a bandpass-swept noise burst (frequency sweeps 300 → 3200 Hz over 0.45s) layered with a pitch surge on the engine oscillator. **Nitro depleted** fires three short low-pass noise sputters with slight time offsets.

**Near-miss** uses a descending sine tone (1100 → dropping) plus a triangle wave descending from 880 → 220 Hz, simulating a doppler effect as the car passes close.

**Combo up** plays 3 ascending triangle wave notes whose base frequency scales with the combo level — so combo ×2 sounds different from ×8.

**Crash** uses distorted low-pass noise (a waveshaper with 300 drive), a sub-bass sine at 60 Hz, and a short high-frequency crack burst.

**New record** plays a 4-note fanfare (C5 E5 G5 C6) with a harmony a fifth below each note. **Coin** is two short sine tones at musical intervals. **Menu click** is a short sine pop + noise transient. **Countdown** is three 440 Hz square beeps then a double 880 Hz "GO!" beep.

Also added a **COUNTDOWN game state** — the game doesn't actually start (input blocked, physics frozen) until all 3 beeps finish. This replaced the instant start, which felt abrupt.

One bug: the engine oscillator was being started before AudioContext was created, because `SFX.startEngine()` was called at the end of `startGame()` but `SFX.boot()` was only called on the button click handlers. If someone called `startGame()` from a restart button that didn't boot first, the oscillator creation would throw `Cannot create OscillatorNode with null context`. Fixed by adding a boot guard inside `startEngine()` itself.

Second bug: `SFX.coin()` was being called twice for a car purchase (intended — buy = two chimes, select = one), but it was also accidentally firing during the milestone reward payout. The milestone payout already had its own `SFX.coin()` call, so coins were playing 3 times at game over. Fixed by removing the duplicate from the milestone path and keeping only the intentional one.

**What I asked:** "Build a Web Audio API sound engine with 10 synthesised sounds and wire them all into the game."
**What went wrong:** Engine oscillator started before AudioContext boot. Coin sound fired 3× at game over.
**How I fixed it:** Added boot guard in `startEngine()`. Traced all `SFX.coin()` call sites and removed the duplicate in the milestone path.
**Time lost:** ~25 minutes