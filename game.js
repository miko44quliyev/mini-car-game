/**
 * HYPERDRIVE PRO — game.js
 * Core engine: game loop, economy, garage UI, physics, rendering.
 * Car data lives in cars.js (loaded first via index.html).
 */

'use strict';

// ── Canvas ────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── Persistence helper ────────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ═══════════════════════════════════════════════════════════════════════════
// ECONOMY STATE
// red_racer is always owned and selected by default (price:0, first in roster).
// We force it into owned list on first load so the garage never shows it locked.
// ═══════════════════════════════════════════════════════════════════════════
let wallet      = LS.get('hd_wallet', 0);
let ownedCarIds = LS.get('hd_owned',  ['red_racer']);
let selectedCarId = LS.get('hd_selected', 'red_racer');

// Guard: make sure red_racer is always owned and selected is valid
if (!ownedCarIds.includes('red_racer')) ownedCarIds.unshift('red_racer');
if (!CAR_ROSTER.find(c => c.id === selectedCarId)) selectedCarId = 'red_racer';
// Persist any corrections immediately
LS.set('hd_owned',    ownedCarIds);
LS.set('hd_selected', selectedCarId);

function saveEconomy() {
  LS.set('hd_wallet',   wallet);
  LS.set('hd_owned',    ownedCarIds);
  LS.set('hd_selected', selectedCarId);
}
function addCoins(n) { wallet += n; saveEconomy(); refreshWallet(); }
function refreshWallet() {
  const fmt = wallet.toLocaleString();
  if (menuWallet)   menuWallet.textContent   = fmt;
  if (garageWallet) garageWallet.textContent = fmt;
}

// ═══════════════════════════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════════════════════════
const MILESTONES = [
  { id: 'ms_100',    score: 100,    coins: 50,    label: 'First 100 pts'    },
  { id: 'ms_500',    score: 500,    coins: 100,   label: '500 points'       },
  { id: 'ms_1000',   score: 1000,   coins: 200,   label: '1,000 points'     },
  { id: 'ms_2500',   score: 2500,   coins: 400,   label: '2,500 points'     },
  { id: 'ms_5000',   score: 5000,   coins: 700,   label: '5,000 points'     },
  { id: 'ms_10000',  score: 10000,  coins: 1200,  label: '10,000 points'    },
  { id: 'ms_25000',  score: 25000,  coins: 2500,  label: '25,000 points'    },
  { id: 'ms_50000',  score: 50000,  coins: 5000,  label: '50,000 points!'   },
  { id: 'ms_100000', score: 100000, coins: 12000, label: '100,000 points!!' },
];

// ── DOM refs ──────────────────────────────────────────────────────────────
const startScreen      = document.getElementById('start-screen');
const garageScreen     = document.getElementById('garage-screen');
const pauseScreen      = document.getElementById('pause-screen');
const gameOverScreen   = document.getElementById('game-over-screen');
const hudLayer         = document.getElementById('hud');
const liveAlert        = document.getElementById('live-alert');
const nearMissBanner   = document.getElementById('near-miss-banner');
const nearMissPts      = document.getElementById('near-miss-pts');
const crashFeedbackMsg = document.getElementById('crash-feedback-msg');

const startBtn         = document.getElementById('start-btn');
const garageOpenBtn    = document.getElementById('garage-open-btn');
const garageCloseBtn   = document.getElementById('garage-close-btn');
const hudPauseBtn      = document.getElementById('hud-pause-btn');
const pauseContinueBtn = document.getElementById('pause-continue-btn');
const pauseRestartBtn  = document.getElementById('pause-restart-btn');
const pauseExitBtn     = document.getElementById('pause-exit-btn');
const restartBtn       = document.getElementById('restart-btn');
const gameoverMenuBtn  = document.getElementById('gameover-menu-btn');

const scoreDisplay   = document.getElementById('score-display');
const hudBestDisplay = document.getElementById('hud-best-display');
const finalScoreEl   = document.getElementById('final-score');
const finalCoinsEl   = document.getElementById('final-coins-earned');
const finalNearMissEl= document.getElementById('final-near-misses');
const finalMaxComboEl= document.getElementById('final-max-combo');
const milestoneBox   = document.getElementById('milestone-rewards');
const newRecordTag   = document.getElementById('new-record-tag');
const menuHighScore  = document.getElementById('menu-high-score');
const menuWallet     = document.getElementById('menu-wallet');
const garageWallet   = document.getElementById('garage-wallet');
const nitroBar       = document.getElementById('nitro-bar');
const comboDisplay   = document.getElementById('combo-display');
const comboText      = document.getElementById('combo-text');
const garageTrack    = document.getElementById('garage-track');
const garagePrev     = document.getElementById('garage-prev');
const garageNext     = document.getElementById('garage-next');
const carInfoName    = document.getElementById('car-info-name');
const carInfoDesc    = document.getElementById('car-info-desc');
const carInfoStats   = document.getElementById('car-info-stats');
const carPriceRow    = document.getElementById('car-price-row');
const carActionBtn   = document.getElementById('car-action-btn');
const menuToggle     = document.querySelector('.menu-toggle-target');
const gameOverToggle = document.querySelector('.game-over-toggle-target');

// ── Game state ────────────────────────────────────────────────────────────
let gameState = 'MENU', chosenMode = 'SAME_WAY', chosenDiff = 'NORMAL';
let score = 0, gameSpeed = 5;
let recordBrokenThisRun = false, baselineRecord = 0, recordToastTimer = null;

// Nitro
let nitro = 100;
const nitroMax = 100;
let nitroBoosting = false, nitroRecharge = false;

// Combo / near-miss
let combo = 1, maxCombo = 1, comboTimer = 0;
const comboDecay = 180;
let nearMissCount = 0, nearMissTimer = 0, runCoins = 0;

// Weather
let rainDrops = [], weatherIntensity = 0;

// Road
const laneWidth = 95, roadWidth = laneWidth * 3, roadX = (canvas.width - roadWidth) / 2;

// Buffers
let obstacles = [], particles = [], trackLines = [], roadMarkers = [];
const keys = {};

// Active car — resolved at startGame(); default to first roster entry
let activeCar     = CAR_ROSTER[0];
let activeRuntime = carRuntimeStats(activeCar);

const player = {
  x: canvas.width / 2 - 20, y: canvas.height - 145,
  width: 40, height: 76,
  targetX: canvas.width / 2 - 20
};

const DIFF = {
  EASY:   { startBonus: -0.5, spawnChance: 0.020, obsSpeedMult: 0.7 },
  NORMAL: { startBonus:  0,   spawnChance: 0.030, obsSpeedMult: 1.0 },
  INSANE: { startBonus:  1.5, spawnChance: 0.040, obsSpeedMult: 1.4 },
};

// ── Record storage ────────────────────────────────────────────────────────
function storageKey() { return `hd_record_${chosenMode}_${chosenDiff}`; }
function refreshHighScore() {
  const r = LS.get(storageKey(), 0);
  if (menuHighScore) menuHighScore.textContent = r.toLocaleString();
  hudBestDisplay.textContent = String(r).padStart(5, '0');
  return r;
}

// ── Mode toggles ──────────────────────────────────────────────────────────
function renderToggles() {
  [menuToggle, gameOverToggle].forEach(con => {
    if (!con) return;
    con.innerHTML = ['SAME_WAY', 'OPPOSITE'].map(k => {
      const a = chosenMode === k ? 'active-mode' : '';
      const l = k === 'SAME_WAY' ? 'SAME-WAY FLOW' : 'HEAD-ON OPPOSITE';
      const d = k === 'SAME_WAY' ? 'Overtake traffic in your direction.' : 'Survive high-speed oncoming traffic.';
      return `<button class="mode-btn ${a}" data-mode="${k}" type="button"><span class="mode-title">${l}</span><span class="mode-desc">${d}</span></button>`;
    }).join('');
  });
  document.querySelectorAll('.mode-btn').forEach(b =>
    b.addEventListener('click', () => { chosenMode = b.dataset.mode; refreshHighScore(); renderToggles(); })
  );
}

function initDiffButtons() {
  document.querySelectorAll('.diff-btn').forEach(b =>
    b.addEventListener('click', () => {
      chosenDiff = b.dataset.diff;
      document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active-diff'));
      b.classList.add('active-diff');
      refreshHighScore();
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GARAGE UI
// ═══════════════════════════════════════════════════════════════════════════
let garageIndex = 0;

garageOpenBtn.addEventListener('click', () => { SFX.boot(); SFX.menuClick();
  startScreen.classList.add('hidden');
  garageScreen.classList.remove('hidden');
  buildGarage();
  refreshWallet();
});
garageCloseBtn.addEventListener('click', () => { SFX.menuClick();
  garageScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  refreshWallet();
});
garagePrev.addEventListener('click', () => { SFX.menuClick(); selectGarageIndex(garageIndex - 1); });
garageNext.addEventListener('click', () => { SFX.menuClick(); selectGarageIndex(garageIndex + 1); });

function buildGarage() {
  garageTrack.innerHTML = '';
  CAR_ROSTER.forEach((car, i) => {
    const owned    = ownedCarIds.includes(car.id);
    const selected = selectedCarId === car.id;

    const card = document.createElement('div');
    card.className = 'garage-card' + (selected ? ' selected-car' : '');
    card.dataset.index = i;

    // Mini canvas preview
    const mini = document.createElement('canvas');
    mini.width = 60; mini.height = 90;
    if (car.drawFn) car.drawFn(mini.getContext('2d'), 10, 7, 40, 76, {});
    else drawMiniCarFallback(mini.getContext('2d'), car, 10, 7, 40, 76);
    card.appendChild(mini);

    // Tier badge
    const badge = document.createElement('div');
    badge.className = 'car-tier-badge';
    badge.textContent = car.tier;
    badge.style.color        = TIER_COLOR[car.tier];
    badge.style.borderColor  = TIER_COLOR[car.tier] + '55';
    card.appendChild(badge);

    // Lock overlay
    if (!owned) {
      const lock = document.createElement('div');
      lock.className = 'car-lock-overlay';
      lock.textContent = '🔒';
      card.appendChild(lock);
    }

    card.addEventListener('click', () => selectGarageIndex(i));
    garageTrack.appendChild(card);
  });

  // Jump to currently selected car
  const idx = CAR_ROSTER.findIndex(c => c.id === selectedCarId);
  selectGarageIndex(idx >= 0 ? idx : 0);
}

function selectGarageIndex(i) {
  garageIndex = Math.max(0, Math.min(CAR_ROSTER.length - 1, i));
  const cardW = 92;
  garageTrack.style.transform = `translateX(${-(garageIndex * cardW) + 110}px)`;
  document.querySelectorAll('.garage-card').forEach((c, idx) =>
    c.classList.toggle('active-card', idx === garageIndex)
  );
  updateCarInfoBox();
}

function updateCarInfoBox() {
  const car   = CAR_ROSTER[garageIndex];
  const owned = ownedCarIds.includes(car.id);
  const sel   = selectedCarId === car.id;

  carInfoName.textContent = car.name;
  carInfoName.style.color = car.tier === 'S' ? TIER_COLOR['S'] : car.accentColor;
  carInfoDesc.textContent = `Tier ${car.tier} · ${tierLabel(car.tier)}`;
  carInfoDesc.style.color = TIER_COLOR[car.tier];

  const STATS  = ['speed', 'handling', 'nitro', 'accel'];
  const ICONS  = ['⚡', '🎯', '🚀', '📈'];
  const LABELS = ['SPEED', 'HANDLING', 'NITRO', 'ACCEL'];
  carInfoStats.innerHTML = STATS.map((s, idx) => `
    <div class="stat-bar-row">
      <span class="stat-icon">${ICONS[idx]}</span>
      <span class="stat-key">${LABELS[idx]}</span>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width:${car.stats[s] * 10}%;background:${TIER_COLOR[car.tier]};"></div>
      </div>
      <span class="stat-val">${car.stats[s]}/10</span>
    </div>`).join('');

  if (owned) {
    carPriceRow.innerHTML = `<span class="owned-badge">✓ OWNED</span>`;
  } else {
    const canAfford = wallet >= car.price;
    carPriceRow.innerHTML = `
      <span class="price-tag" style="color:${canAfford ? '#ffc200' : '#ff2d55'}">
        🪙 ${car.price.toLocaleString()}
      </span>
      ${!canAfford ? `<span class="need-more">Need ${(car.price - wallet).toLocaleString()} more</span>` : ''}`;
  }

  if (sel) {
    carActionBtn.textContent = '✓ SELECTED';
    carActionBtn.className   = 'car-action-btn selected-btn';
    carActionBtn.disabled    = true;
    carActionBtn.onclick     = null;
  } else if (owned) {
    carActionBtn.textContent = 'SELECT';
    carActionBtn.className   = 'car-action-btn';
    carActionBtn.disabled    = false;
    carActionBtn.onclick     = () => { SFX.coin(); selectedCarId = car.id; saveEconomy(); buildGarage(); };
  } else {
    const canAfford = wallet >= car.price;
    carActionBtn.textContent = canAfford ? `BUY — 🪙 ${car.price.toLocaleString()}` : '🔒 LOCKED';
    carActionBtn.className   = canAfford ? 'car-action-btn buy-btn' : 'car-action-btn locked-btn';
    carActionBtn.disabled    = !canAfford;
    carActionBtn.onclick     = canAfford ? () => { SFX.coin(); SFX.coin(); wallet -= car.price; ownedCarIds.push(car.id); saveEconomy(); refreshWallet(); buildGarage(); } : null;
  }
}

function tierLabel(t) {
  return { D: 'Starter', C: 'Street', B: 'Performance', A: 'Supercar', S: 'Hypercar' }[t] || t;
}

// Fallback mini-car renderer (used if a car has no drawFn)
function drawMiniCarFallback(c, car, x, y, w, h) {
  const g = c.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, sc(car.color, -30));
  g.addColorStop(0.5, car.color);
  g.addColorStop(1, sc(car.color, -20));
  c.fillStyle = g; c.fillRect(x, y + 3, w, h - 6);
  c.fillStyle = '#0a0a14'; c.fillRect(x + 5, y + 20, w - 10, 22);
  c.fillStyle = '#0d1e2e'; c.fillRect(x + 6, y + 23, w - 12, 14);
  c.fillStyle = car.accentColor + 'aa'; c.fillRect(x + w / 2 - 1, y + 3, 2, h - 6);
  c.fillStyle = '#ffffff'; c.fillRect(x + 2, y + 3, 6, 4); c.fillRect(x + w - 8, y + 3, 6, 4);
  c.fillStyle = '#ff2244'; c.fillRect(x + 2, y + h - 7, 6, 4); c.fillRect(x + w - 8, y + h - 7, 6, 4);
}

// ═══════════════════════════════════════════════════════════════════════════
// COIN / MILESTONE ECONOMY
// ═══════════════════════════════════════════════════════════════════════════
function calcRunCoins(finalScore, nearMisses, maxComboVal) {
  const base    = Math.floor(finalScore / 15);
  const bonus   = nearMisses * 3 + (maxComboVal - 1) * 5;
  const diffMul = chosenDiff === 'INSANE' ? 1.5 : chosenDiff === 'EASY' ? 0.8 : 1.0;
  const modeMul = chosenMode === 'OPPOSITE' ? 1.3 : 1.0;
  return Math.max(1, Math.floor((base + bonus) * diffMul * modeMul));
}

function checkMilestones(finalScore) {
  return MILESTONES.filter(ms => {
    const key = 'hd_ms_' + ms.id;
    if (!LS.get(key, false) && finalScore >= ms.score) { LS.set(key, true); return true; }
    return false;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════
startBtn.addEventListener('click', () => { SFX.boot(); SFX.menuClick(); startGame(); });
restartBtn.addEventListener('click', () => { SFX.boot(); SFX.menuClick(); startGame(); });
gameoverMenuBtn.addEventListener('click', () => { SFX.menuClick(); exitToMenu(); });
hudPauseBtn.addEventListener('click', () => { SFX.menuClick(); togglePause(); });
pauseContinueBtn.addEventListener('click', () => { SFX.menuClick(); togglePause(); });
pauseRestartBtn.addEventListener('click', () => { SFX.boot(); SFX.menuClick(); startGame(); });
pauseExitBtn.addEventListener('click', () => { SFX.menuClick(); exitToMenu(); });

window.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === 'Escape') togglePause(); });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

// Touch
let touchStartX = 0, touchCurrentX = 0, touchActive = false;
canvas.addEventListener('touchstart', e => {
  touchStartX = touchCurrentX = e.touches[0].clientX; touchActive = true;
  const rect = canvas.getBoundingClientRect();
  if (e.touches[0].clientX - rect.left > canvas.width * 0.65) keys[' '] = true;
}, { passive: true });
canvas.addEventListener('touchmove', e => { touchCurrentX = e.touches[0].clientX; e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', () => { touchActive = false; touchStartX = 0; keys[' '] = false; }, { passive: true });

function startGame() {
  [startScreen, pauseScreen, gameOverScreen, garageScreen].forEach(s => s.classList.add('hidden'));
  [liveAlert, nearMissBanner].forEach(s => s.classList.add('hidden'));
  hudLayer.classList.remove('hidden');
  if (recordToastTimer) clearTimeout(recordToastTimer);

  // Resolve active car from selection
  activeCar     = CAR_ROSTER.find(c => c.id === selectedCarId) || CAR_ROSTER[0];
  activeRuntime = carRuntimeStats(activeCar);

  score = 0; combo = 1; maxCombo = 1; comboTimer = 0;
  nearMissCount = 0; runCoins = 0;
  nitro = nitroMax; nitroBoosting = false; nitroRecharge = false;
  recordBrokenThisRun = false;
  baselineRecord = refreshHighScore();

  const diff = DIFF[chosenDiff];
  gameSpeed = (chosenMode === 'OPPOSITE' ? 5.5 : 5.0) + diff.startBonus;

  obstacles = []; particles = [];
  weatherIntensity = chosenDiff === 'INSANE' ? 0.7 : chosenDiff === 'NORMAL' ? 0.3 : 0;

  const cx = canvas.width / 2 - player.width / 2;
  player.x = cx; player.targetX = cx;

  initTrackLines(); initRoadMarkers(); initRain();
  updateNitroBar();
  comboDisplay.classList.add('hidden');

  gameState = 'PLAYING';
  SFX.startEngine();
}

function togglePause() {
  if      (gameState === 'PLAYING') { gameState = 'PAUSED';  pauseScreen.classList.remove('hidden'); }
  else if (gameState === 'PAUSED')  { gameState = 'PLAYING'; pauseScreen.classList.add('hidden'); }
}

function exitToMenu() {
  SFX.stopEngine();
  [pauseScreen, gameOverScreen, hudLayer, liveAlert, nearMissBanner].forEach(s => s.classList.add('hidden'));
  startScreen.classList.remove('hidden');
  gameState = 'MENU';
  refreshHighScore(); refreshWallet(); renderToggles();
}

function triggerCrash() {
  SFX.crash();
  SFX.stopEngine();
  gameState = 'GAMEOVER';
  [hudLayer, liveAlert, nearMissBanner].forEach(s => s.classList.add('hidden'));
  gameOverScreen.classList.remove('hidden');
  if (recordToastTimer) clearTimeout(recordToastTimer);

  const fs = Math.floor(score);
  const earned     = checkMilestones(fs);
  const milestoneC = earned.reduce((a, ms) => a + ms.coins, 0);
  runCoins         = calcRunCoins(fs, nearMissCount, maxCombo);
  const totalCoins = runCoins + milestoneC;
  addCoins(totalCoins);
  setTimeout(() => SFX.coin(), 300);

  const key  = storageKey();
  const prev = LS.get(key, 0);
  if (recordBrokenThisRun && fs > prev) {
    LS.set(key, fs);
    newRecordTag.classList.remove('hidden');
    setTimeout(() => SFX.newRecord(), 500);
    crashFeedbackMsg.innerHTML = `<span style="color:var(--success);font-weight:700;">OUTSTANDING!</span> New record ${fs.toLocaleString()} pts!`;
  } else {
    newRecordTag.classList.add('hidden');
    if (fs === 0)                           crashFeedbackMsg.textContent = 'Immediate collision. Shift lanes earlier!';
    else if (prev > 0 && fs >= prev * 0.85) crashFeedbackMsg.textContent = `So close! Only ${(prev-fs).toLocaleString()} pts from your record.`;
    else                                    crashFeedbackMsg.textContent = 'Structural limits exceeded. Watch speed & anticipate lanes.';
  }

  finalScoreEl.textContent    = fs.toLocaleString();
  finalCoinsEl.textContent    = `+${totalCoins.toLocaleString()} 🪙`;
  finalNearMissEl.textContent = nearMissCount;
  finalMaxComboEl.textContent = `x${maxCombo}`;

  if (earned.length) {
    milestoneBox.classList.remove('hidden');
    milestoneBox.innerHTML = `<div class="ms-title">🎯 MILESTONES UNLOCKED</div>` +
      earned.map(ms => `<div class="ms-row"><span>${ms.label}</span><span class="ms-coins">+🪙${ms.coins.toLocaleString()}</span></div>`).join('');
  } else {
    milestoneBox.classList.add('hidden');
  }

  refreshHighScore(); renderToggles();
}

// ── Road / weather init ───────────────────────────────────────────────────
function initTrackLines() {
  trackLines = [];
  for (let i = -100; i < canvas.height; i += 100) trackLines.push({ y: i });
}
function initRoadMarkers() {
  roadMarkers = [];
  for (let i = 0; i < canvas.height; i += 220) {
    roadMarkers.push({ y: i, side: 'left' });
    roadMarkers.push({ y: i + 110, side: 'right' });
  }
}
function initRain() {
  rainDrops = [];
  for (let i = 0; i < 120; i++) rainDrops.push({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    len: Math.random() * 14 + 8, speed: Math.random() * 6 + 10
  });
}

// ── Nitro bar ─────────────────────────────────────────────────────────────
function updateNitroBar() {
  nitroBar.style.width = (nitro / nitroMax * 100) + '%';
  nitroBar.className = nitroBoosting ? '' : nitroRecharge ? 'charging' : nitro < 5 ? 'depleted' : '';
}

// ── Particles ─────────────────────────────────────────────────────────────
function spawnExplosion(x, y, color) {
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, spd = Math.random() * 7 + 1;
    particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
      radius: Math.random()*5+2, alpha:1, decay: Math.random()*0.025+0.015, color });
  }
}
function spawnExhaust() {
  if (Math.random() > 0.35) {
    particles.push({
      x: player.x + player.width/2 + (Math.random()*8-4),
      y: player.y + player.height - 2,
      vx: (Math.random()-0.5)*1.5, vy: gameSpeed*0.35 + Math.random()*2,
      radius: nitroBoosting ? Math.random()*6+3 : Math.random()*3+1,
      alpha: nitroBoosting ? 0.7 : 0.35, decay: 0.025,
      color: nitroBoosting ? `hsla(${185+Math.random()*40},100%,60%,0.7)` : 'rgba(120,120,160,0.25)'
    });
  }
}

// ── Collision ─────────────────────────────────────────────────────────────
function aabb(a, b) {
  return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
}
function nearMissBox(obs) {
  const pad = 18;
  return player.x-pad < obs.x+obs.width && player.x+player.width+pad > obs.x &&
         player.y-pad < obs.y+obs.height && player.y+player.height+pad > obs.y && !aabb(player,obs);
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════
function update() {
  if (gameState !== 'PLAYING') return;

  if (gameSpeed < activeRuntime.maxSpeed) gameSpeed += activeRuntime.accelRate;

  // Nitro
  const nitroKey = keys[' '] || keys['Shift'];
  const wasNitroBoosting = nitroBoosting;
  if (nitroKey && nitro > 0 && !nitroRecharge) {
    nitroBoosting = true;
    nitro = Math.max(0, nitro - activeRuntime.nitroDrain);
    if (nitro === 0) { nitroBoosting = false; nitroRecharge = true; SFX.nitroDepleted(); }
  } else {
    nitroBoosting = false;
    if (nitroRecharge) { nitro = Math.min(nitroMax, nitro + 0.4); if (nitro >= nitroMax*0.3) nitroRecharge = false; }
    else nitro = Math.min(nitroMax, nitro + 0.2);
  }
  // Edge detect: nitro just activated
  if (nitroBoosting && !wasNitroBoosting) SFX.nitroActivate();
  updateNitroBar();
  SFX.tickEngine(gameSpeed, nitroBoosting);

  const sm = nitroBoosting ? activeRuntime.nitroMult : 1.0;
  const mm = chosenMode === 'OPPOSITE' ? 1.6 : 1.0;
  const dm = chosenDiff  === 'INSANE'  ? 1.3 : chosenDiff === 'EASY' ? 0.8 : 1.0;
  const cb = 1 + (combo - 1) * 0.1;
  score += gameSpeed * 0.06 * mm * dm * sm * cb;

  const fs = Math.floor(score);
  scoreDisplay.textContent = String(fs).padStart(5, '0');

  if (fs > baselineRecord && !recordBrokenThisRun) {
    recordBrokenThisRun = true;
    liveAlert.classList.remove('hidden');
    SFX.newRecord();
    recordToastTimer = setTimeout(() => liveAlert.classList.add('hidden'), 3500);
  }
  if (recordBrokenThisRun) hudBestDisplay.textContent = String(fs).padStart(5, '0');

  if (comboTimer > 0) { comboTimer--; if (comboTimer===0) { combo=1; comboDisplay.classList.add('hidden'); } }
  if (nearMissTimer > 0) { nearMissTimer--; if (nearMissTimer===1) nearMissBanner.classList.add('hidden'); }

  const ls = activeRuntime.lateralSpeed;
  if (touchActive) { const d = touchCurrentX - touchStartX; player.targetX += d*0.22; touchStartX = touchCurrentX; }
  if (keys['a']||keys['ArrowLeft'])  player.targetX -= ls;
  if (keys['d']||keys['ArrowRight']) player.targetX += ls;
  const wL = roadX+12, wR = roadX+roadWidth-player.width-12;
  player.targetX = Math.max(wL, Math.min(wR, player.targetX));
  player.x += (player.targetX - player.x) * 0.2;

  spawnExhaust();
  trackLines.forEach(l  => { l.y += gameSpeed*sm; if (l.y > canvas.height) l.y = -80; });
  roadMarkers.forEach(m => { m.y += gameSpeed*sm; if (m.y > canvas.height+50) m.y -= canvas.height+200; });
  rainDrops.forEach(d   => { d.y += d.speed+gameSpeed*0.4; d.x -= d.speed*0.1; if (d.y>canvas.height){d.y=-10;d.x=Math.random()*canvas.width;} });

  const diff = DIFF[chosenDiff];
  if (obstacles.length===0 || (obstacles[obstacles.length-1].y > 180 && Math.random() < diff.spawnChance)) {
    const lane  = Math.floor(Math.random()*3);
    const ox    = roadX + lane*laneWidth + (laneWidth-38)/2;
    const COLS  = ['#e11d48','#f59e0b','#10b981','#06b6d4','#a855f7','#f97316'];
    const color = COLS[Math.floor(Math.random()*COLS.length)];
    const vy    = chosenMode==='SAME_WAY' ? (Math.random()*2.5-5.0)*diff.obsSpeedMult : (Math.random()*3.0+2.0)*diff.obsSpeedMult;
    obstacles.push({x:ox, y:-90, width:38, height:74, vy, color, nearMissed:false});
  }

  for (let i = obstacles.length-1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.y += (gameSpeed + obs.vy) * sm;
    if (aabb(player, obs)) {
      spawnExplosion(player.x+player.width/2, player.y+20, '#ff2d55');
      spawnExplosion(obs.x+obs.width/2, obs.y+20, obs.color);
      triggerCrash(); return;
    }
    if (!obs.nearMissed && nearMissBox(obs)) {
      obs.nearMissed = true; nearMissCount++;
      SFX.nearMiss();
      combo++; if (combo > maxCombo) maxCombo = combo;
      comboTimer = comboDecay;
      SFX.comboUp(combo);
      const bonus = combo * 15; score += bonus;
      nearMissPts.textContent = bonus;
      nearMissBanner.classList.remove('hidden');
      nearMissBanner.style.animation = 'none'; void nearMissBanner.offsetWidth; nearMissBanner.style.animation = '';
      nearMissTimer = 90;
      comboText.textContent = `x${combo}`;
      comboDisplay.classList.remove('hidden');
    }
    if (obs.y > canvas.height+120 || obs.y < -200) obstacles.splice(i, 1);
  }

  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i]; p.x+=p.vx; p.y+=p.vy; p.alpha-=p.decay;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════════════════════════
function draw() {
  ctx.fillStyle = '#04040e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#06060f';
  ctx.fillRect(0, 0, roadX, canvas.height);
  ctx.fillRect(roadX+roadWidth, 0, canvas.width-(roadX+roadWidth), canvas.height);

  const rg = ctx.createLinearGradient(roadX, 0, roadX+roadWidth, 0);
  rg.addColorStop(0, '#0f0f16'); rg.addColorStop(0.5, '#141420'); rg.addColorStop(1, '#0f0f16');
  ctx.fillStyle = rg; ctx.fillRect(roadX, 0, roadWidth, canvas.height);

  // Grain
  ctx.fillStyle = 'rgba(255,255,255,0.012)';
  for (let g=0; g<roadWidth; g+=3) {
    const h = Math.sin(g*0.4+score*0.02)*18+22, yo = Math.floor(score*gameSpeed*0.3)%40;
    ctx.fillRect(roadX+g, yo-40,  1, h);
    ctx.fillRect(roadX+g, yo+200, 1, h*1.5);
    ctx.fillRect(roadX+g, yo+450, 1, h);
  }

  // Wet sheen
  if (weatherIntensity > 0) {
    const ws = ctx.createLinearGradient(roadX,0,roadX+roadWidth,0);
    ws.addColorStop(0,'transparent');
    ws.addColorStop(0.45,`rgba(0,180,255,${weatherIntensity*0.035})`);
    ws.addColorStop(0.55,`rgba(0,180,255,${weatherIntensity*0.035})`);
    ws.addColorStop(1,'transparent');
    ctx.fillStyle=ws; ctx.fillRect(roadX,0,roadWidth,canvas.height);
  }

  drawBarrier(roadX-8,0,8,canvas.height);
  drawBarrier(roadX+roadWidth,0,8,canvas.height);

  const ru = Math.floor(score*2.2)%28; ctx.fillStyle='#1e1e30';
  for (let r=0; r<canvas.height; r+=28) {
    ctx.fillRect(roadX-20, r+ru, 12, 10);
    ctx.fillRect(roadX+roadWidth+8, r+ru, 12, 10);
  }

  ctx.fillStyle='rgba(255,255,255,0.12)';
  trackLines.forEach(l => {
    ctx.fillRect(roadX+laneWidth-2,   l.y, 4, 52);
    ctx.fillRect(roadX+laneWidth*2-2, l.y, 4, 52);
  });

  roadMarkers.forEach(m => drawLampPost(m.side==='left' ? roadX-28 : roadX+roadWidth+20, m.y));

  particles.forEach(p => {
    ctx.save(); ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fill(); ctx.restore();
  });

  if (gameState==='PLAYING'||gameState==='PAUSED') {
    activeCar.drawFn
      ? activeCar.drawFn(ctx, player.x, player.y, player.width, player.height, { nitroBoosting, gameSpeed })
      : drawMiniCarFallback(ctx, activeCar, player.x, player.y, player.width, player.height);
  }

  obstacles.forEach(obs => drawTrafficCar(obs));

  if (weatherIntensity > 0) {
    ctx.save(); ctx.strokeStyle=`rgba(180,220,255,${weatherIntensity*0.25})`; ctx.lineWidth=1;
    rainDrops.forEach(d=>{ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.len*0.08,d.y+d.len);ctx.stroke();});
    ctx.restore();
  }

  if (nitroBoosting) {
    ctx.save(); ctx.globalAlpha=0.14; ctx.strokeStyle=activeCar.accentColor; ctx.lineWidth=1.5;
    for(let i=0;i<12;i++){const sx=roadX+Math.random()*roadWidth;ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx+(Math.random()-0.5)*20,canvas.height);ctx.stroke();}
    ctx.restore();
  }
}

// ── Road/environment draw helpers ─────────────────────────────────────────
function drawTrafficCar(obs) {
  const {x,y,width:w,height:h,color}=obs, on=chosenMode==='OPPOSITE';
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(x+3,y+5,w,h);
  ctx.fillStyle='#0a0a14'; ctx.fillRect(x-1,y,w+2,h);
  const g=ctx.createLinearGradient(x,y,x+w,y);
  g.addColorStop(0,sc(color,-40)); g.addColorStop(0.5,color); g.addColorStop(1,sc(color,-30));
  ctx.fillStyle=g; ctx.fillRect(x,y+3,w,h-6);
  ctx.fillStyle=sc(color,-20); ctx.fillRect(x+3,on?y+h-18:y+3,w-6,15);
  ctx.fillStyle='#0c0c18'; ctx.fillRect(x+5,y+(on?h-40:20),w-10,20);
  ctx.fillStyle='#0d1a24'; ctx.fillRect(x+6,y+(on?h-38:22),w-12,14);
  ctx.save();
  if(on){
    ctx.shadowBlur=12; ctx.shadowColor='#ffffcc'; ctx.fillStyle='#ffffee';
    ctx.fillRect(x+3,y+h-7,7,5); ctx.fillRect(x+w-10,y+h-7,7,5);
    ctx.fillStyle='#cc1133'; ctx.fillRect(x+3,y+2,6,4); ctx.fillRect(x+w-9,y+2,6,4);
  } else {
    ctx.shadowBlur=7; ctx.shadowColor='#ff0033'; ctx.fillStyle='#ff2244';
    ctx.fillRect(x+3,y+h-6,7,4); ctx.fillRect(x+w-10,y+h-6,7,4);
    ctx.fillStyle='#2a2a44'; ctx.fillRect(x+3,y+2,6,4); ctx.fillRect(x+w-9,y+2,6,4);
  }
  ctx.restore();
  [[x-3,y+10],[x+w-3,y+10],[x-3,y+h-24],[x+w-3,y+h-24]].forEach(([wx,wy])=>{
    ctx.fillStyle='#050508'; ctx.fillRect(wx,wy,6,12);
    ctx.fillStyle='#222230'; ctx.fillRect(wx+1,wy+2,4,8);
  });
}

function drawBarrier(x, y, w, h) {
  const g=ctx.createLinearGradient(x,y,x+w,y);
  g.addColorStop(0,'#1a1a2e'); g.addColorStop(1,'#0d0d1a');
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  ctx.fillStyle='rgba(0,212,255,0.12)';
  const so=Math.floor(score*1.5)%40;
  for(let r=0;r<canvas.height;r+=40) ctx.fillRect(x,r+so,w,6);
}

function drawLampPost(x, y) {
  ctx.fillStyle='#141422'; ctx.fillRect(x+3,y,4,60); ctx.fillRect(x,y,16,4);
  ctx.save(); ctx.shadowBlur=16; ctx.shadowColor='rgba(255,220,100,0.5)';
  ctx.fillStyle='#ffdd66'; ctx.fillRect(x-1,y-3,7,5); ctx.restore();
  const cg=ctx.createRadialGradient(x+2,y+2,0,x+2,y+2,50);
  cg.addColorStop(0,'rgba(255,220,100,0.06)'); cg.addColorStop(1,'transparent');
  ctx.fillStyle=cg; ctx.fillRect(x-40,y,80,80);
}

// ── Main loop + boot ──────────────────────────────────────────────────────
function loop() { update(); draw(); requestAnimationFrame(loop); }

refreshWallet();
refreshHighScore();
renderToggles();
initDiffButtons();
buildGarage();
requestAnimationFrame(loop);