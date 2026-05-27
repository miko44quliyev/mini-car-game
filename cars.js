/**
 * HYPERDRIVE PRO — cars.js
 * All 20 car draw functions, shared helpers, TIER_COLOR, and CAR_ROSTER.
 * Loaded before game.js so CAR_ROSTER is available at startup.
 *
 * HOW TO ADD YOUR OWN DESIGN:
 *   Set drawFn to a function: (ctx, x, y, w, h, { nitroBoosting }) => { ... }
 *   Draw top-down. x/y is top-left corner, w=40, h=76 during gameplay.
 *   Leave drawFn: null to use the built-in gradient renderer.
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED DRAW HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Shade a hex color by amt (+bright / -dark). Returns rgb() string. */
function sc(hex, amt) {
  const c = parseInt(hex.replace('#', '').padStart(6, '0'), 16);
  const r = Math.max(0, Math.min(255, (c >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((c >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (c & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

/** Glow halo behind car */
function carGlow(c, x, y, w, h, color, nb) {
  c.save();
  c.shadowBlur = nb ? 30 : 16;
  c.shadowColor = color;
  c.fillStyle = color + '33';
  c.fillRect(x - 5, y - 5, w + 10, h + 10);
  c.restore();
}

/** Standard gradient body with drop shadow */
function carBody(c, x, y, w, h, color) {
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(x + 3, y + 5, w, h);
  c.fillStyle = sc(color, -50);
  c.fillRect(x - 1, y, w + 2, h);
  const g = c.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0,    sc(color, -20));
  g.addColorStop(0.45, color);
  g.addColorStop(1,    sc(color, -25));
  c.fillStyle = g;
  c.fillRect(x, y + 2, w, h - 4);
}

/** Dark roof section */
function carRoof(c, x, y, w, h) {
  c.fillStyle = '#090910';
  c.fillRect(x + 5, y + Math.floor(h * 0.27), w - 10, Math.floor(h * 0.32));
  c.fillStyle = 'rgba(100,160,220,0.18)';
  c.fillRect(x + 7, y + Math.floor(h * 0.29), w - 14, Math.floor(h * 0.12));
}

/** Front windshield with optional tint */
function carWindshield(c, x, y, w, h, tint) {
  c.fillStyle = tint || '#0b1828';
  c.fillRect(x + 5, y + Math.floor(h * 0.31), w - 10, Math.floor(h * 0.18));
  c.fillStyle = 'rgba(180,220,255,0.12)';
  c.fillRect(x + 7, y + Math.floor(h * 0.33), 7, Math.floor(h * 0.08));
}

/** Headlights (front) */
function carHeadlights(c, x, y, w, h, color, nb) {
  c.save();
  c.shadowBlur = nb ? 18 : 9;
  c.shadowColor = color || '#e8f4ff';
  c.fillStyle   = color || '#e8f4ff';
  c.fillRect(x + 2,      y + 2, 8, 5);
  c.fillRect(x + w - 10, y + 2, 8, 5);
  c.restore();
}

/** Tail lights (rear) */
function carTaillights(c, x, y, w, h) {
  c.save();
  c.shadowBlur  = 8;
  c.shadowColor = '#ff0033';
  c.fillStyle   = '#ff2244';
  c.fillRect(x + 2,      y + h - 6, 9, 4);
  c.fillRect(x + w - 11, y + h - 6, 9, 4);
  c.restore();
}

/** Four wheels */
function carWheels(c, x, y, w, h) {
  [[x - 4, y + 8], [x + w - 2, y + 8], [x - 4, y + h - 22], [x + w - 2, y + h - 22]]
    .forEach(([wx, wy]) => {
      c.fillStyle = '#040407'; c.fillRect(wx,     wy,     6, 14);
      c.fillStyle = '#1e1e2c'; c.fillRect(wx + 1, wy + 2, 4, 10);
      c.fillStyle = '#333344'; c.fillRect(wx + 2, wy + 5, 2,  4);
    });
}

/** Racing stripe helper */
function stripe(c, x, y, w, h, color, stripeW, cx) {
  c.fillStyle = color;
  c.fillRect(x + cx, y + 2, stripeW, h - 4);
}

// ═══════════════════════════════════════════════════════════════════════════
// 20 CAR DRAW FUNCTIONS
// Order matches image: row by row, left → right
// ═══════════════════════════════════════════════════════════════════════════

// ── ROW 1 ─────────────────────────────────────────────────────────────────

// 1. Red Sports Car — twin black racing stripes
function drawRedRacer(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#e02020', nb);
  carBody(c, x, y, w, h, '#d91c1c');
  stripe(c, x, y, w, h, '#111118', 6, w / 2 - 9);
  stripe(c, x, y, w, h, '#111118', 6, w / 2 + 3);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  carHeadlights(c, x, y, w, h, '#fff5cc', nb);
  carTaillights(c, x, y, w, h);
  c.fillStyle = '#cc0000';
  c.fillRect(x + 4, y + h - 14, w - 8, 6); // rear diffuser
  carWheels(c, x, y, w, h);
}

// 2. Blue Sports Coupe — sleek solid blue with hood highlight
function drawBlueCoupe(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#1a6fd4', nb);
  carBody(c, x, y, w, h, '#1565c0');
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  c.fillStyle = 'rgba(80,160,255,0.25)';
  c.fillRect(x + 6, y + 4, w - 12, 10);
  carHeadlights(c, x, y, w, h, '#cce8ff', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// 3. Yellow Muscle Car — twin black stripes
function drawYellowMuscle(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#e8b800', nb);
  carBody(c, x, y, w, h, '#f5c100');
  stripe(c, x, y, w, h, '#111118', 7, w / 2 - 10);
  stripe(c, x, y, w, h, '#111118', 7, w / 2 + 3);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  carHeadlights(c, x, y, w, h, '#fffacc', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// 4. Marlboro Race Car — white/red livery with chevron
function drawMarlboro(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#cc0000', nb);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(x + 3, y + 5, w, h);
  const g = c.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, '#d0d0d8'); g.addColorStop(0.5, '#f0f0f8'); g.addColorStop(1, '#d0d0d8');
  c.fillStyle = g; c.fillRect(x, y + 2, w, h - 4);
  c.fillStyle = '#cc0011'; c.fillRect(x, y + 2,                       w, Math.floor(h * 0.3));
  c.fillStyle = '#cc0011'; c.fillRect(x, y + Math.floor(h * 0.6),     w, Math.floor(h * 0.4));
  c.fillStyle = '#f0f0f8'; c.fillRect(x, y + Math.floor(h * 0.3),     w, Math.floor(h * 0.3));
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  carHeadlights(c, x, y, w, h, '#fffacc', nb);
  carTaillights(c, x, y, w, h);
  c.fillStyle = '#cc0011';
  c.beginPath();
  c.moveTo(x + w / 2,     y + Math.floor(h * 0.3));
  c.lineTo(x + w / 2 - 8, y + Math.floor(h * 0.42));
  c.lineTo(x + w / 2 + 8, y + Math.floor(h * 0.42));
  c.fill();
  carWheels(c, x, y, w, h);
}

// ── ROW 2 ─────────────────────────────────────────────────────────────────

// 5. Silver GT — cool metallic shine
function drawSilverGT(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#9090a0', nb);
  carBody(c, x, y, w, h, '#b0b0c0');
  c.fillStyle = 'rgba(220,230,255,0.2)';
  c.fillRect(x + 4, y + 4, w - 8, 12);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  carHeadlights(c, x, y, w, h, '#ffffff', nb);
  c.save();
  c.shadowBlur = 6; c.shadowColor = '#ff0033'; c.fillStyle = '#cc2244';
  c.fillRect(x + 2, y + h - 6, 9, 4); c.fillRect(x + w - 11, y + h - 6, 9, 4);
  c.restore();
  carWheels(c, x, y, w, h);
}

// 6. Orange Supercar — twin black stripes, orange glow
function drawOrangeSupercar(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#e06000', nb);
  carBody(c, x, y, w, h, '#e86000');
  stripe(c, x, y, w, h, '#111118', 5, w / 2 - 8);
  stripe(c, x, y, w, h, '#111118', 5, w / 2 + 3);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  c.fillStyle = 'rgba(255,160,40,0.3)';
  c.fillRect(x + 4, y + 4, w - 8, 10);
  carHeadlights(c, x, y, w, h, '#fffacc', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// 7. Purple Hypercar — chrome shimmer, cyan accent line
function drawPurpleHyper(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#9010d0', nb);
  carBody(c, x, y, w, h, '#7b0fbf');
  c.fillStyle = 'rgba(200,100,255,0.2)'; c.fillRect(x + 3, y + 3,      w - 6, 8);
  c.fillStyle = 'rgba(120,0,200,0.4)';   c.fillRect(x + 3, y + h - 14, w - 6, 8);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h, '#150a28');
  carHeadlights(c, x, y, w, h, '#e0a0ff', nb);
  carTaillights(c, x, y, w, h);
  c.fillStyle = '#00e8ff';
  c.fillRect(x, y + Math.floor(h * 0.52), w, 2); // cyan accent line
  carWheels(c, x, y, w, h);
}

// 8. Green VW Beetle — rounded classic shape
function drawGreenBeetle(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#30a030', nb);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 3, y + 6, w, h);
  const g = c.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, '#1a8020'); g.addColorStop(0.5, '#2db530'); g.addColorStop(1, '#1a8020');
  c.fillStyle = g; c.fillRect(x, y + 4, w, h - 8);
  c.fillStyle = '#0a0a10'; c.fillRect(x + 3, y + Math.floor(h * 0.25), w - 6,  Math.floor(h * 0.38));
  c.fillStyle = 'rgba(100,200,120,0.15)'; c.fillRect(x + 5, y + Math.floor(h * 0.27), w - 10, Math.floor(h * 0.12));
  c.fillStyle = '#0d1e14'; c.fillRect(x + 4, y + Math.floor(h * 0.28), w - 8,  Math.floor(h * 0.20));
  c.fillStyle = 'rgba(160,255,160,0.1)'; c.fillRect(x + 6, y + Math.floor(h * 0.30), 8, Math.floor(h * 0.09));
  c.fillStyle = '#1a8020';
  c.fillRect(x - 2, y + Math.floor(h * 0.35), 4, Math.floor(h * 0.3));
  c.fillRect(x + w - 2, y + Math.floor(h * 0.35), 4, Math.floor(h * 0.3));
  carHeadlights(c, x, y, w, h, '#ffffcc', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// ── ROW 3 ─────────────────────────────────────────────────────────────────

// 9. Police Cruiser — black/white two-tone, red/blue light bar
function drawPoliceCar(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#4040ff', nb);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 3, y + 5, w, h);
  c.fillStyle = '#f0f0f8'; c.fillRect(x, y + 2, w, Math.floor(h * 0.5));
  c.fillStyle = '#101018'; c.fillRect(x, y + Math.floor(h * 0.5), w, Math.floor(h * 0.5));
  c.fillStyle = '#000010'; c.fillRect(x, y + Math.floor(h * 0.44), w, 6);
  c.fillStyle = '#f0f0f8'; c.fillRect(x, y + Math.floor(h * 0.46), w, 2);
  // Light bar
  c.save();
  c.shadowBlur = nb ? 20 : 10; c.shadowColor = '#0040ff';
  c.fillStyle  = '#2266ff'; c.fillRect(x + 6,       y + Math.floor(h * 0.24), 6, 4);
  c.shadowColor = '#ff2020'; c.fillStyle = '#ff2020';
  c.fillRect(x + w - 12, y + Math.floor(h * 0.24), 6, 4);
  c.restore();
  c.fillStyle = '#000010'; c.fillRect(x + 3, y + Math.floor(h * 0.52), w - 6, 10);
  carWindshield(c, x, y, w, h, '#0d1428');
  carHeadlights(c, x, y, w, h, '#ffffff', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// 10. Bumblebee — yellow with black stripes, exposed engine
function drawBumblebee(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#e0b000', nb);
  carBody(c, x, y, w, h, '#e8be00');
  stripe(c, x, y, w, h, '#111118', 6, w / 2 - 9);
  stripe(c, x, y, w, h, '#111118', 6, w / 2 + 3);
  // Exposed engine top
  c.fillStyle = '#1a1a24'; c.fillRect(x + 6, y + Math.floor(h * 0.32), w - 12, Math.floor(h * 0.22));
  c.fillStyle = '#2a2a38';
  c.beginPath(); c.arc(x + w / 2, y + Math.floor(h * 0.43), Math.floor(w * 0.28), 0, Math.PI * 2); c.fill();
  c.fillStyle = '#444458';
  c.beginPath(); c.arc(x + w / 2, y + Math.floor(h * 0.43), Math.floor(w * 0.16), 0, Math.PI * 2); c.fill();
  c.fillStyle = '#666678';
  c.beginPath(); c.arc(x + w / 2, y + Math.floor(h * 0.43), Math.floor(w * 0.07), 0, Math.PI * 2); c.fill();
  carWindshield(c, x, y, w, h);
  carHeadlights(c, x, y, w, h, '#fffacc', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// 11. Hot Pink Racer — twin white stripes
function drawPinkRacer(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#e0186a', nb);
  carBody(c, x, y, w, h, '#e8186a');
  stripe(c, x, y, w, h, 'rgba(255,255,255,0.9)', 8, w / 2 - 10);
  stripe(c, x, y, w, h, 'rgba(255,255,255,0.9)', 8, w / 2 + 2);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h, '#1a0818');
  c.fillStyle = 'rgba(255,100,160,0.25)'; c.fillRect(x + 4, y + 4, w - 8, 10);
  carHeadlights(c, x, y, w, h, '#fffacc', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// 12. Deep Purple Luxury — wide haunches, purple glow
function drawDeepPurple(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#5500aa', nb);
  carBody(c, x, y, w, h, '#4a0090');
  c.fillStyle = sc('#4a0090', -15);
  c.fillRect(x - 2, y + Math.floor(h * 0.3), 4, Math.floor(h * 0.4));
  c.fillRect(x + w - 2, y + Math.floor(h * 0.3), 4, Math.floor(h * 0.4));
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h, '#150a28');
  c.fillStyle = 'rgba(160,60,255,0.2)'; c.fillRect(x + 3, y + 4, w - 6, 8);
  carHeadlights(c, x, y, w, h, '#cc88ff', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// ── ROW 4 ─────────────────────────────────────────────────────────────────

// 13. Gold Lambo — angular highlights, side skirts
function drawGoldLambo(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#c8a000', nb);
  carBody(c, x, y, w, h, '#c8a200');
  c.fillStyle = 'rgba(255,220,80,0.3)'; c.fillRect(x + 4, y + 4, w - 8, 6);
  c.fillStyle = sc('#c8a200', -30);     c.fillRect(x + 3, y + Math.floor(h * 0.62), w - 6, 4);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  carHeadlights(c, x, y, w, h, '#fff8cc', nb);
  carTaillights(c, x, y, w, h);
  c.fillStyle = '#111118';
  c.fillRect(x - 1, y + Math.floor(h * 0.42), 2, Math.floor(h * 0.22));
  c.fillRect(x + w - 1, y + Math.floor(h * 0.42), 2, Math.floor(h * 0.22));
  carWheels(c, x, y, w, h);
}

// 14. Batmobile — wide fins, jet exhaust, gold bat emblem
function drawBatmobile(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#2020ff', nb);
  c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x + 3, y + 6, w, h);
  c.fillStyle = '#080818';         c.fillRect(x, y + Math.floor(h * 0.3), w, Math.floor(h * 0.4));
  // Bat fins
  c.fillStyle = '#0d0d22';
  c.beginPath(); c.moveTo(x - 8, y + Math.floor(h * 0.55)); c.lineTo(x + 10, y + Math.floor(h * 0.28)); c.lineTo(x + 10, y + Math.floor(h * 0.7));  c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x+w+8, y + Math.floor(h * 0.55)); c.lineTo(x+w-10, y + Math.floor(h * 0.28)); c.lineTo(x+w-10, y + Math.floor(h * 0.7)); c.closePath(); c.fill();
  // Cockpit
  c.fillStyle = '#060618'; c.fillRect(x + 7,  y + Math.floor(h * 0.22), w - 14, Math.floor(h * 0.5));
  c.fillStyle = '#0a1830'; c.fillRect(x + 9,  y + Math.floor(h * 0.28), w - 18, Math.floor(h * 0.24));
  c.fillStyle = 'rgba(0,80,255,0.15)'; c.fillRect(x + 11, y + Math.floor(h * 0.3), w - 22, Math.floor(h * 0.1));
  // Jet exhaust glow
  c.save(); c.shadowBlur = nb ? 24 : 12; c.shadowColor = '#0040ff';
  c.fillStyle = '#0040ff'; c.fillRect(x + w / 2 - 4, y + h - 6, 8, 4);
  c.restore();
  // Bat emblem
  c.fillStyle = '#ffd000';
  c.beginPath(); c.arc(x + w / 2, y + Math.floor(h * 0.45), 4, 0, Math.PI * 2); c.fill();
  // Large wheels
  [[x-5, y+Math.floor(h*0.38)], [x+w-1, y+Math.floor(h*0.38)], [x-5, y+Math.floor(h*0.62)], [x+w-1, y+Math.floor(h*0.62)]]
    .forEach(([wx,wy]) => {
      c.fillStyle='#040407'; c.fillRect(wx,wy,7,16);
      c.fillStyle='#1e1e2c'; c.fillRect(wx+1,wy+2,5,12);
    });
}

// 15. Ice Cream Van — boxy, blue/white, scoop on top
function drawIceCream(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#60b0ff', nb);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 3, y + 5, w, h);
  c.fillStyle = '#f8f8ff'; c.fillRect(x, y + 2, w, h - 4);
  c.fillStyle = '#4090d8'; c.fillRect(x, y + Math.floor(h * 0.6),  w, Math.floor(h * 0.4));
  c.fillStyle = '#e040a0'; c.fillRect(x, y + Math.floor(h * 0.58), w, 4);
  c.fillStyle = '#d0e8ff'; c.fillRect(x + 4, y + Math.floor(h * 0.12), w - 8, Math.floor(h * 0.28));
  c.fillStyle = 'rgba(160,210,255,0.3)'; c.fillRect(x + 6, y + Math.floor(h * 0.14), w - 12, Math.floor(h * 0.12));
  // Ice cream scoop
  c.fillStyle = '#ffe0b0';
  c.beginPath(); c.arc(x + w / 2, y + 4, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d4a060';
  c.beginPath(); c.arc(x + w / 2 - 3, y + 6, 4, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffcc'; c.fillRect(x+2, y+Math.floor(h*0.42), 7, 5); c.fillRect(x+w-9, y+Math.floor(h*0.42), 7, 5);
  c.fillStyle = '#ff3366'; c.fillRect(x+2, y+h-5, 7, 3); c.fillRect(x+w-9, y+h-5, 7, 3);
  [[x-3, y+Math.floor(h*0.55)], [x+w-3, y+Math.floor(h*0.55)], [x-3, y+h-14], [x+w-3, y+h-14]]
    .forEach(([wx,wy]) => { c.fillStyle='#040407'; c.fillRect(wx,wy,6,10); c.fillStyle='#333344'; c.fillRect(wx+1,wy+1,4,8); });
}

// 16. Red Convertible — open top, cream leather interior
function drawRedConvertible(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#cc0000', nb);
  carBody(c, x, y, w, h, '#cc1818');
  c.fillStyle = '#c8b080'; c.fillRect(x + 5, y + Math.floor(h * 0.22), w - 10, Math.floor(h * 0.38));
  c.fillStyle = '#a08040'; c.fillRect(x + 6, y + Math.floor(h * 0.26), Math.floor(w * 0.35), Math.floor(h * 0.28));
  c.fillRect(x + w - 6 - Math.floor(w * 0.35), y + Math.floor(h * 0.26), Math.floor(w * 0.35), Math.floor(h * 0.28));
  c.fillStyle = '#c0a070'; c.fillRect(x + 5, y + Math.floor(h * 0.22), w - 10, 6);
  c.fillStyle = '#801010';
  c.fillRect(x + 4, y + Math.floor(h * 0.2), 4, 8);
  c.fillRect(x + w - 8, y + Math.floor(h * 0.2), 4, 8);
  carHeadlights(c, x, y, w, h, '#fffacc', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// ── ROW 5 ─────────────────────────────────────────────────────────────────

// 17. White Supercar — aerodynamic, rear diffuser
function drawWhiteSupercar(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#c0c0d8', nb);
  carBody(c, x, y, w, h, '#d8d8e8');
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x + 4, y + 4, w - 8, 8);
  c.fillStyle = '#111118'; c.fillRect(x + 3, y + h - 10, w - 6, 8);
  c.fillStyle = '#222230'; c.fillRect(x + 5, y + h - 8, 6, 4); c.fillRect(x + w - 11, y + h - 8, 6, 4);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h);
  carHeadlights(c, x, y, w, h, '#ffffff', nb);
  c.save(); c.shadowBlur=6; c.shadowColor='#ff0033'; c.fillStyle='#ee2244';
  c.fillRect(x+2, y+h-6, 9, 4); c.fillRect(x+w-11, y+h-6, 9, 4);
  c.restore();
  carWheels(c, x, y, w, h);
}

// 18. Teal Muscle — twin white racing stripes
function drawTealMuscle(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#008080', nb);
  carBody(c, x, y, w, h, '#009090');
  stripe(c, x, y, w, h, 'rgba(255,255,255,0.85)', 6, w / 2 - 9);
  stripe(c, x, y, w, h, 'rgba(255,255,255,0.85)', 6, w / 2 + 3);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h, '#0a1e1e');
  c.fillStyle = 'rgba(0,220,220,0.2)'; c.fillRect(x + 4, y + 4, w - 8, 10);
  carHeadlights(c, x, y, w, h, '#ccffff', nb);
  carTaillights(c, x, y, w, h);
  carWheels(c, x, y, w, h);
}

// 19. Formula 1 — open wheel, nose cone, front/rear wings, helmet, halo
function drawF1Car(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#cc0000', nb);
  c.fillStyle = '#cc0000';
  c.fillRect(x + Math.floor(w * 0.3),  y,                        Math.floor(w * 0.4),  Math.floor(h * 0.25)); // nose
  c.fillRect(x + Math.floor(w * 0.18), y + Math.floor(h * 0.2),  Math.floor(w * 0.64), Math.floor(h * 0.6));  // body
  c.fillStyle = '#aa0000';
  c.fillRect(x, y + Math.floor(h * 0.2),  w, 6); // front wing
  c.fillRect(x, y + Math.floor(h * 0.72), w, 6); // rear wing
  c.fillStyle = '#0a0a18'; c.fillRect(x + Math.floor(w * 0.28), y + Math.floor(h * 0.28), Math.floor(w * 0.44), Math.floor(h * 0.28));
  c.fillStyle = 'rgba(100,180,255,0.2)'; c.fillRect(x + Math.floor(w * 0.3), y + Math.floor(h * 0.3), Math.floor(w * 0.4), Math.floor(h * 0.12));
  // Helmet
  c.fillStyle = '#ff0000';
  c.beginPath(); c.arc(x + w / 2, y + Math.floor(h * 0.36), Math.floor(w * 0.13), 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(100,200,255,0.3)';
  c.beginPath(); c.arc(x + w / 2, y + Math.floor(h * 0.34), Math.floor(w * 0.09), 0, Math.PI, true); c.fill();
  // Open wheels
  const fw = 8, fh = 14;
  [[x-1, y+Math.floor(h*0.22)], [x+w-fw+1, y+Math.floor(h*0.22)], [x-1, y+Math.floor(h*0.64)], [x+w-fw+1, y+Math.floor(h*0.64)]]
    .forEach(([wx,wy]) => {
      c.fillStyle='#040407'; c.fillRect(wx,wy,fw,fh);
      c.fillStyle='#333344'; c.fillRect(wx+1,wy+2,fw-2,fh-4);
      c.fillStyle='#555566'; c.fillRect(wx+2,wy+fh/2-1,fw-4,2);
    });
  // Halo
  c.fillStyle = '#cc0000';
  c.fillRect(x + Math.floor(w * 0.25), y + Math.floor(h * 0.24), Math.floor(w * 0.5), 3);
}

// 20. Cyan Coupe — clean modern, rear deck
function drawCyanCoupe(c, x, y, w, h, { nitroBoosting: nb } = {}) {
  carGlow(c, x, y, w, h, '#00a8a8', nb);
  carBody(c, x, y, w, h, '#009898');
  c.fillStyle = 'rgba(0,220,220,0.2)'; c.fillRect(x + 4, y + 4, w - 8, 12);
  carRoof(c, x, y, w, h);
  carWindshield(c, x, y, w, h, '#0a1e1e');
  carHeadlights(c, x, y, w, h, '#ccffff', nb);
  carTaillights(c, x, y, w, h);
  c.fillStyle = sc('#009898', -20); c.fillRect(x + 4, y + h - 16, w - 8, 8);
  carWheels(c, x, y, w, h);
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER COLORS
// ═══════════════════════════════════════════════════════════════════════════
const TIER_COLOR = {
  D: '#6b7280',  // grey   — Starter
  C: '#10b981',  // green  — Street
  B: '#3b82f6',  // blue   — Performance
  A: '#a855f7',  // purple — Supercar
  S: '#f59e0b',  // gold   — Hypercar
};

// ═══════════════════════════════════════════════════════════════════════════
// CAR ROSTER  (20 cars)
// price:0 → free/default starter
// stats: speed/handling/nitro/accel  each 1–10
// drawFn references the functions above
// ═══════════════════════════════════════════════════════════════════════════
const CAR_ROSTER = [

  // ── TIER D — Starter ────────────────────────────────────────────────────
  {
    id: 'red_racer',     tier: 'D', name: 'Red Racer',
    price: 0,            color: '#d91c1c', accentColor: '#ff6666',
    stats: { speed:3, handling:4, nitro:3, accel:3 },
    drawFn: drawRedRacer
  },
  {
    id: 'blue_coupe',    tier: 'D', name: 'Blue Coupe',
    price: 200,          color: '#1565c0', accentColor: '#60a8ff',
    stats: { speed:4, handling:4, nitro:3, accel:4 },
    drawFn: drawBlueCoupe
  },
  {
    id: 'yellow_muscle', tier: 'D', name: 'Yellow Muscle',
    price: 450,          color: '#f5c100', accentColor: '#ffe066',
    stats: { speed:4, handling:5, nitro:4, accel:3 },
    drawFn: drawYellowMuscle
  },
  {
    id: 'marlboro',      tier: 'D', name: 'Marlboro GT',
    price: 700,          color: '#cc0011', accentColor: '#ff4444',
    stats: { speed:5, handling:4, nitro:4, accel:4 },
    drawFn: drawMarlboro
  },

  // ── TIER C — Street ─────────────────────────────────────────────────────
  {
    id: 'silver_gt',     tier: 'C', name: 'Silver GT',
    price: 1200,         color: '#b0b0c0', accentColor: '#e0e0f0',
    stats: { speed:5, handling:5, nitro:5, accel:5 },
    drawFn: drawSilverGT
  },
  {
    id: 'orange_super',  tier: 'C', name: 'Orange Supercar',
    price: 1800,         color: '#e86000', accentColor: '#ffaa44',
    stats: { speed:6, handling:5, nitro:5, accel:5 },
    drawFn: drawOrangeSupercar
  },
  {
    id: 'purple_hyper',  tier: 'C', name: 'Purple Hyper',
    price: 2500,         color: '#7b0fbf', accentColor: '#cc66ff',
    stats: { speed:6, handling:6, nitro:5, accel:6 },
    drawFn: drawPurpleHyper
  },
  {
    id: 'green_beetle',  tier: 'C', name: 'Green Beetle',
    price: 3200,         color: '#2db530', accentColor: '#80ff80',
    stats: { speed:6, handling:6, nitro:6, accel:5 },
    drawFn: drawGreenBeetle
  },

  // ── TIER B — Performance ────────────────────────────────────────────────
  {
    id: 'police',        tier: 'B', name: 'Police Cruiser',
    price: 5000,         color: '#101018', accentColor: '#4466ff',
    stats: { speed:7, handling:6, nitro:6, accel:6 },
    drawFn: drawPoliceCar
  },
  {
    id: 'bumblebee',     tier: 'B', name: 'Bumblebee',
    price: 6500,         color: '#e8be00', accentColor: '#ffe066',
    stats: { speed:7, handling:7, nitro:6, accel:7 },
    drawFn: drawBumblebee
  },
  {
    id: 'pink_racer',    tier: 'B', name: 'Pink Racer',
    price: 8000,         color: '#e8186a', accentColor: '#ff88cc',
    stats: { speed:7, handling:7, nitro:7, accel:6 },
    drawFn: drawPinkRacer
  },
  {
    id: 'deep_purple',   tier: 'B', name: 'Deep Purple',
    price: 9500,         color: '#4a0090', accentColor: '#aa44ff',
    stats: { speed:8, handling:7, nitro:6, accel:7 },
    drawFn: drawDeepPurple
  },

  // ── TIER A — Supercar ───────────────────────────────────────────────────
  {
    id: 'gold_lambo',    tier: 'A', name: 'Gold Lambo',
    price: 14000,        color: '#c8a200', accentColor: '#ffe060',
    stats: { speed:8, handling:7, nitro:8, accel:7 },
    drawFn: drawGoldLambo
  },
  {
    id: 'batmobile',     tier: 'A', name: 'Batmobile',
    price: 18000,        color: '#080818', accentColor: '#4466ff',
    stats: { speed:8, handling:8, nitro:7, accel:8 },
    drawFn: drawBatmobile
  },
  {
    id: 'ice_cream',     tier: 'A', name: 'Ice Cream Van',
    price: 22000,        color: '#4090d8', accentColor: '#e040a0',
    stats: { speed:9, handling:8, nitro:8, accel:8 },
    drawFn: drawIceCream
  },
  {
    id: 'red_convert',   tier: 'A', name: 'Red Convertible',
    price: 28000,        color: '#cc1818', accentColor: '#ff6666',
    stats: { speed:9, handling:9, nitro:7, accel:9 },
    drawFn: drawRedConvertible
  },

  // ── TIER S — Hypercar ───────────────────────────────────────────────────
  {
    id: 'white_super',   tier: 'S', name: 'White Supercar',
    price: 40000,        color: '#d8d8e8', accentColor: '#ffffff',
    stats: { speed:9,  handling:9,  nitro:9,  accel:9  },
    drawFn: drawWhiteSupercar
  },
  {
    id: 'teal_muscle',   tier: 'S', name: 'Teal Muscle',
    price: 55000,        color: '#009090', accentColor: '#00dddd',
    stats: { speed:10, handling:9,  nitro:9,  accel:9  },
    drawFn: drawTealMuscle
  },
  {
    id: 'f1_car',        tier: 'S', name: 'Formula One',
    price: 70000,        color: '#cc0000', accentColor: '#ff4444',
    stats: { speed:10, handling:10, nitro:10, accel:10 },
    drawFn: drawF1Car
  },
  {
    id: 'cyan_coupe',    tier: 'S', name: 'Cyan Coupe',
    price: 100000,       color: '#009898', accentColor: '#00dddd',
    stats: { speed:10, handling:10, nitro:10, accel:10 },
    drawFn: drawCyanCoupe
  },
];

/** Convert 1–10 stats into real gameplay numbers */
function carRuntimeStats(car) {
  const s = car.stats;
  return {
    maxSpeed:     12 + s.speed    * 1.1,    // 13.1 – 23.1
    accelRate:    0.0012 + s.accel * 0.0006, // 0.0018 – 0.0072
    lateralSpeed: 6.5  + s.handling * 0.6,  // 7.1 – 12.5
    nitroMult:    1.3  + s.nitro   * 0.08,  // 1.38 – 2.1
    nitroDrain:   2.2  - s.nitro   * 0.1,   // 1.2 – 2.1 (higher = less drain)
  };
}