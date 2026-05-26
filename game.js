/**
 * HYPERDRIVE PRO — Enhanced Engine
 * NEW: Nitro boost · Near-miss scoring · Combo multiplier
 *      Difficulty levels · Rain/weather · Improved car rendering
 *      Touch controls · Roadside details
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM
const startScreen      = document.getElementById('start-screen');
const pauseScreen      = document.getElementById('pause-screen');
const gameOverScreen   = document.getElementById('game-over-screen');
const hudLayer         = document.getElementById('hud');
const liveAlert        = document.getElementById('live-alert');
const nearMissBanner   = document.getElementById('near-miss-banner');
const nearMissPts      = document.getElementById('near-miss-pts');
const crashFeedbackMsg = document.getElementById('crash-feedback-msg');

const startBtn         = document.getElementById('start-btn');
const hudPauseBtn      = document.getElementById('hud-pause-btn');
const pauseContinueBtn = document.getElementById('pause-continue-btn');
const pauseRestartBtn  = document.getElementById('pause-restart-btn');
const pauseExitBtn     = document.getElementById('pause-exit-btn');
const restartBtn       = document.getElementById('restart-btn');

const scoreDisplay     = document.getElementById('score-display');
const hudBestDisplay   = document.getElementById('hud-best-display');
const finalScoreEl     = document.getElementById('final-score');
const finalNearMissEl  = document.getElementById('final-near-misses');
const finalMaxComboEl  = document.getElementById('final-max-combo');
const newRecordTag     = document.getElementById('new-record-tag');
const menuHighScore    = document.getElementById('menu-high-score');
const nitroBar         = document.getElementById('nitro-bar');
const comboDisplay     = document.getElementById('combo-display');
const comboText        = document.getElementById('combo-text');
const menuToggle       = document.querySelector('.menu-toggle-target');
const gameOverToggle   = document.querySelector('.game-over-toggle-target');

// ── State ──────────────────────────────────────────────────────────────────
let gameState = 'MENU';
let chosenMode = 'SAME_WAY';
let chosenDiff = 'NORMAL';

let score = 0;
let gameSpeed = 5;
const maxSpeed = 22;
let recordBrokenThisRun = false;
let baselineRecord = 0;
let recordToastTimer = null;

// Nitro
let nitro = 100;
const nitroMax = 100;
let nitroBoosting = false;
let nitroRecharging = false;
const nitroRechargeRate = 0.8;
const nitroDrainRate = 1.8;
const nitroBoostMult = 1.7;

// Combo / near-miss
let combo = 1;
let maxCombo = 1;
let comboTimer = 0;
const comboDecay = 180; // frames until combo resets
let nearMissCount = 0;
let nearMissTimer = 0;

// Weather
let rainDrops = [];
let weatherIntensity = 0; // 0–1

// Road
const laneWidth = 95;
const roadWidth = laneWidth * 3;
const roadX = (canvas.width - roadWidth) / 2;

// Buffers
let obstacles = [];
let particles = [];
let trackLines = [];
let roadMarkers = []; // lamp posts / road signs
const keys = {};

// Player
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 145,
  width: 40,
  height: 76,
  targetX: canvas.width / 2 - 20,
  speed: 8.5,
  color: '#00d4ff',
  trailColor: 'rgba(0,212,255,0.4)'
};

// Difficulty config
const DIFF = {
  EASY:   { startSpeed: 4.5, spawnChance: 0.022, obstacleSpeedMult: 0.7  },
  NORMAL: { startSpeed: 5.5, spawnChance: 0.030, obstacleSpeedMult: 1.0  },
  INSANE: { startSpeed: 7.0, spawnChance: 0.040, obstacleSpeedMult: 1.4  }
};

// ── Storage ────────────────────────────────────────────────────────────────
function storageKey() { return `hd_pro_${chosenMode}_${chosenDiff}`; }

function refreshHighScore() {
  const record = parseInt(localStorage.getItem(storageKey()), 10) || 0;
  menuHighScore.textContent = record.toLocaleString();
  hudBestDisplay.textContent = String(record).padStart(5, '0');
  return record;
}

// ── Mode toggles ───────────────────────────────────────────────────────────
function renderToggles() {
  [menuToggle, gameOverToggle].forEach(container => {
    if (!container) return;
    container.innerHTML = ['SAME_WAY', 'OPPOSITE'].map(key => {
      const active = chosenMode === key ? 'active-mode' : '';
      const label = key === 'SAME_WAY' ? 'SAME-WAY FLOW' : 'HEAD-ON OPPOSITE';
      const desc  = key === 'SAME_WAY' ? 'Overtake traffic moving in your direction.' : 'Survive high-speed oncoming traffic.';
      return `<button class="mode-btn ${active}" data-mode="${key}" type="button">
        <span class="mode-title">${label}</span>
        <span class="mode-desc">${desc}</span>
      </button>`;
    }).join('');
  });
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenMode = btn.dataset.mode;
      refreshHighScore();
      renderToggles();
    });
  });
}

function initDiffButtons() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenDiff = btn.dataset.diff;
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active-diff'));
      btn.classList.add('active-diff');
      refreshHighScore();
    });
  });
}

// ── Track lines & road markers ─────────────────────────────────────────────
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
  for (let i = 0; i < 120; i++) {
    rainDrops.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: Math.random() * 14 + 8,
      speed: Math.random() * 6 + 10
    });
  }
}

// ── Game lifecycle ─────────────────────────────────────────────────────────
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
hudPauseBtn.addEventListener('click', togglePause);
pauseContinueBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', startGame);
pauseExitBtn.addEventListener('click', exitToMenu);

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Escape') togglePause();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

// Touch controls
let touchStartX = 0;
let touchCurrentX = 0;
let touchActive = false;

canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchCurrentX = touchStartX;
  touchActive = true;
  // Right half tap = nitro
  const rect = canvas.getBoundingClientRect();
  if (e.touches[0].clientX - rect.left > canvas.width * 0.65) {
    keys[' '] = true;
  }
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  touchCurrentX = e.touches[0].clientX;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
  touchActive = false;
  touchStartX = 0;
  keys[' '] = false;
}, { passive: true });

function startGame() {
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  liveAlert.classList.add('hidden');
  nearMissBanner.classList.add('hidden');
  hudLayer.classList.remove('hidden');

  if (recordToastTimer) clearTimeout(recordToastTimer);

  score = 0;
  combo = 1; maxCombo = 1; comboTimer = 0;
  nearMissCount = 0;
  nitro = nitroMax;
  nitroBoosting = false;
  nitroRecharging = false;
  recordBrokenThisRun = false;
  baselineRecord = refreshHighScore();

  const diff = DIFF[chosenDiff];
  gameSpeed = chosenMode === 'OPPOSITE' ? diff.startSpeed + 0.5 : diff.startSpeed;

  obstacles = [];
  particles = [];
  weatherIntensity = chosenDiff === 'INSANE' ? 0.7 : chosenDiff === 'NORMAL' ? 0.3 : 0;

  const cx = canvas.width / 2 - player.width / 2;
  player.x = cx; player.targetX = cx;

  initTrackLines();
  initRoadMarkers();
  initRain();

  updateNitroBar();
  comboDisplay.classList.add('hidden');
  gameState = 'PLAYING';
}

function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseScreen.classList.remove('hidden');
  } else if (gameState === 'PAUSED') {
    gameState = 'PLAYING';
    pauseScreen.classList.add('hidden');
  }
}

function exitToMenu() {
  pauseScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hudLayer.classList.add('hidden');
  liveAlert.classList.add('hidden');
  nearMissBanner.classList.add('hidden');
  startScreen.classList.remove('hidden');
  gameState = 'MENU';
  refreshHighScore();
  renderToggles();
}

function triggerCrash() {
  gameState = 'GAMEOVER';
  hudLayer.classList.add('hidden');
  liveAlert.classList.add('hidden');
  nearMissBanner.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');

  if (recordToastTimer) clearTimeout(recordToastTimer);

  const fs = Math.floor(score);
  finalScoreEl.textContent = fs.toLocaleString();
  finalNearMissEl.textContent = nearMissCount;
  finalMaxComboEl.textContent = `x${maxCombo}`;

  const key = storageKey();
  const prev = parseInt(localStorage.getItem(key), 10) || 0;

  if (recordBrokenThisRun && fs > prev) {
    localStorage.setItem(key, fs);
    newRecordTag.classList.remove('hidden');
    crashFeedbackMsg.innerHTML = `<span style="color:var(--success);font-weight:700;">OUTSTANDING!</span> New record: ${fs.toLocaleString()} pts with ${nearMissCount} near misses!`;
  } else {
    newRecordTag.classList.add('hidden');
    if (fs === 0) {
      crashFeedbackMsg.textContent = "Immediate collision. Try shifting lanes earlier.";
    } else if (prev > 0 && fs >= prev * 0.85) {
      crashFeedbackMsg.textContent = `So close! Just ${(prev - fs).toLocaleString()} pts from your record.`;
    } else {
      crashFeedbackMsg.textContent = "Structural limits exceeded. Watch your speed and anticipate lanes.";
    }
  }

  refreshHighScore();
  renderToggles();
}

// ── Nitro ──────────────────────────────────────────────────────────────────
function updateNitroBar() {
  const pct = (nitro / nitroMax) * 100;
  nitroBar.style.width = pct + '%';
  nitroBar.className = '';
  if (nitroRecharging) nitroBar.classList.add('charging');
  else if (nitro < 5) nitroBar.classList.add('depleted');
}

// ── Particles ──────────────────────────────────────────────────────────────
function spawnExplosion(x, y, color) {
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 7 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      radius: Math.random() * 5 + 2,
      alpha: 1,
      decay: Math.random() * 0.025 + 0.015,
      color
    });
  }
}

function spawnExhaust() {
  if (Math.random() > 0.35) {
    const boost = nitroBoosting;
    particles.push({
      x: player.x + player.width / 2 + (Math.random() * 8 - 4),
      y: player.y + player.height - 2,
      vx: (Math.random() - 0.5) * 1.5,
      vy: gameSpeed * 0.35 + Math.random() * 2,
      radius: boost ? Math.random() * 6 + 3 : Math.random() * 3 + 1,
      alpha: boost ? 0.7 : 0.35,
      decay: 0.025,
      color: boost ? 'rgba(0,212,255,0.5)' : 'rgba(120,120,160,0.25)'
    });
  }
}

function spawnNitroTrail() {
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: player.x + Math.random() * player.width,
      y: player.y + player.height,
      vx: (Math.random() - 0.5) * 3,
      vy: gameSpeed * 0.5 + Math.random() * 3,
      radius: Math.random() * 4 + 2,
      alpha: 0.8,
      decay: 0.04,
      color: `hsla(${185 + Math.random() * 40}, 100%, 60%, 0.7)`
    });
  }
}

// ── AABB ──────────────────────────────────────────────────────────────────
function aabb(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

// Near-miss detection (slightly expanded box around player)
function nearMissCheck(obs) {
  const pad = 18;
  return (
    player.x - pad < obs.x + obs.width  &&
    player.x + player.width + pad > obs.x &&
    player.y - pad < obs.y + obs.height  &&
    player.y + player.height + pad > obs.y &&
    !aabb(player, obs)
  );
}

// ── Update ────────────────────────────────────────────────────────────────
function update() {
  if (gameState !== 'PLAYING') return;

  // Speed ramp
  if (gameSpeed < maxSpeed) gameSpeed += 0.0022;

  // Nitro
  const nitroKey = keys[' '] || keys['Shift'];
  if (nitroKey && nitro > 0 && !nitroRecharging) {
    nitroBoosting = true;
    nitro = Math.max(0, nitro - nitroDrainRate);
    if (nitro === 0) { nitroBoosting = false; nitroRecharging = true; }
    spawnNitroTrail();
  } else {
    nitroBoosting = false;
    if (nitroRecharging) {
      nitro = Math.min(nitroMax, nitro + nitroRechargeRate * 0.5);
      if (nitro >= nitroMax * 0.3) nitroRecharging = false;
    } else {
      nitro = Math.min(nitroMax, nitro + nitroRechargeRate * 0.25);
    }
  }
  updateNitroBar();

  const speedMult = nitroBoosting ? nitroBoostMult : 1.0;
  const modeBonus = chosenMode === 'OPPOSITE' ? 1.6 : 1.0;
  const diffBonus = chosenDiff === 'INSANE' ? 1.3 : chosenDiff === 'EASY' ? 0.8 : 1.0;
  const comboBonus = 1 + (combo - 1) * 0.1;

  score += gameSpeed * 0.06 * modeBonus * diffBonus * speedMult * comboBonus;

  const fs = Math.floor(score);
  scoreDisplay.textContent = String(fs).padStart(5, '0');

  // Record detection
  if (fs > baselineRecord && !recordBrokenThisRun) {
    recordBrokenThisRun = true;
    liveAlert.classList.remove('hidden');
    recordToastTimer = setTimeout(() => liveAlert.classList.add('hidden'), 3500);
  }
  if (recordBrokenThisRun) {
    hudBestDisplay.textContent = String(fs).padStart(5, '0');
  }

  // Combo decay
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) {
      combo = 1;
      comboDisplay.classList.add('hidden');
    }
  }

  // Near miss timer (banner auto-hide)
  if (nearMissTimer > 0) nearMissTimer--;
  if (nearMissTimer === 1) nearMissBanner.classList.add('hidden');

  // Input
  if (touchActive) {
    const delta = touchCurrentX - touchStartX;
    player.targetX += delta * 0.22;
    touchStartX = touchCurrentX; // relative drag
  }

  if (keys['a'] || keys['ArrowLeft'])  player.targetX -= player.speed;
  if (keys['d'] || keys['ArrowRight']) player.targetX += player.speed;

  const wallL = roadX + 12;
  const wallR = roadX + roadWidth - player.width - 12;
  player.targetX = Math.max(wallL, Math.min(wallR, player.targetX));
  player.x += (player.targetX - player.x) * 0.2;

  spawnExhaust();

  // Track lines
  trackLines.forEach(line => {
    line.y += gameSpeed * speedMult;
    if (line.y > canvas.height) line.y = -80;
  });

  // Road markers scroll
  roadMarkers.forEach(m => {
    m.y += gameSpeed * speedMult;
    if (m.y > canvas.height + 50) m.y -= canvas.height + 200;
  });

  // Rain
  rainDrops.forEach(drop => {
    drop.y += drop.speed + gameSpeed * 0.4;
    drop.x -= drop.speed * 0.1;
    if (drop.y > canvas.height) { drop.y = -10; drop.x = Math.random() * canvas.width; }
  });

  // Obstacles
  const diff = DIFF[chosenDiff];
  const spawnChance = diff.spawnChance;
  const obsMult = diff.obstacleSpeedMult;

  if (obstacles.length === 0 || (obstacles[obstacles.length - 1].y > 180 && Math.random() < spawnChance)) {
    const lane = Math.floor(Math.random() * 3);
    const ox = roadX + lane * laneWidth + (laneWidth - 38) / 2;
    const colors = ['#e11d48', '#f59e0b', '#10b981', '#06b6d4', '#a855f7', '#f97316'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    let vy;
    if (chosenMode === 'SAME_WAY') {
      vy = (Math.random() * 2.5 - 5.0) * obsMult;
    } else {
      vy = (Math.random() * 3.0 + 2.0) * obsMult;
    }
    obstacles.push({ x: ox, y: -90, width: 38, height: 74, vy, color, passed: false, nearMissed: false });
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.y += (gameSpeed + obs.vy) * speedMult;

    // Collision
    if (aabb(player, obs)) {
      spawnExplosion(player.x + player.width / 2, player.y + 20, '#ff2d55');
      spawnExplosion(obs.x + obs.width / 2, obs.y + 20, obs.color);
      triggerCrash();
      return;
    }

    // Near miss
    if (!obs.nearMissed && nearMissCheck(obs)) {
      obs.nearMissed = true;
      nearMissCount++;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      comboTimer = comboDecay;

      const bonus = combo * 15;
      score += bonus;
      nearMissPts.textContent = bonus;
      nearMissBanner.classList.remove('hidden');
      // re-trigger animation
      nearMissBanner.style.animation = 'none';
      void nearMissBanner.offsetWidth;
      nearMissBanner.style.animation = '';
      nearMissTimer = 90;

      comboText.textContent = `x${combo}`;
      comboDisplay.classList.remove('hidden');
    }

    // Remove off-screen
    if (obs.y > canvas.height + 120 || obs.y < -200) {
      obstacles.splice(i, 1);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

// ── Draw ──────────────────────────────────────────────────────────────────
function draw() {
  // Sky/background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#04040e');
  bgGrad.addColorStop(1, '#07070f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Roadside gutter glow
  ctx.fillStyle = '#09090f';
  ctx.fillRect(0, 0, roadX, canvas.height);
  ctx.fillRect(roadX + roadWidth, 0, canvas.width - (roadX + roadWidth), canvas.height);

  // Road surface
  const roadGrad = ctx.createLinearGradient(roadX, 0, roadX + roadWidth, 0);
  roadGrad.addColorStop(0,   '#0f0f16');
  roadGrad.addColorStop(0.5, '#131320');
  roadGrad.addColorStop(1,   '#0f0f16');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(roadX, 0, roadWidth, canvas.height);

  // Subtle road grain/texture
  ctx.fillStyle = 'rgba(255,255,255,0.012)';
  for (let g = 0; g < roadWidth; g += 3) {
    const h = (Math.sin(g * 0.4 + score * 0.02) * 18) + 22;
    const yOff = (Math.floor(score * gameSpeed * 0.3) % 40);
    ctx.fillRect(roadX + g, yOff - 40, 1, h);
    ctx.fillRect(roadX + g, yOff + 200, 1, h * 1.5);
    ctx.fillRect(roadX + g, yOff + 450, 1, h);
  }

  // Reflective road sheen (wet road when raining)
  if (weatherIntensity > 0) {
    const sheen = ctx.createLinearGradient(roadX, 0, roadX + roadWidth, 0);
    sheen.addColorStop(0,   'transparent');
    sheen.addColorStop(0.4, `rgba(0,180,255,${weatherIntensity * 0.035})`);
    sheen.addColorStop(0.6, `rgba(0,180,255,${weatherIntensity * 0.035})`);
    sheen.addColorStop(1,   'transparent');
    ctx.fillStyle = sheen;
    ctx.fillRect(roadX, 0, roadWidth, canvas.height);
  }

  // Road edge barriers
  drawBarrier(roadX - 8, 0, 8, canvas.height);
  drawBarrier(roadX + roadWidth, 0, 8, canvas.height);

  // Rumble strips
  const rumbleOff = Math.floor(score * 2.2) % 28;
  ctx.fillStyle = '#1e1e30';
  for (let r = 0; r < canvas.height; r += 28) {
    ctx.fillRect(roadX - 20, r + rumbleOff, 12, 10);
    ctx.fillRect(roadX + roadWidth + 8, r + rumbleOff, 12, 10);
  }

  // Lane dividers (dashed)
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  trackLines.forEach(line => {
    ctx.fillRect(roadX + laneWidth - 2, line.y, 4, 52);
    ctx.fillRect(roadX + laneWidth * 2 - 2, line.y, 4, 52);
  });

  // Roadside lamp posts
  roadMarkers.forEach(m => {
    drawLampPost(m.side === 'left' ? roadX - 28 : roadX + roadWidth + 20, m.y);
  });

  // Particles
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Player car (visible during PLAYING and PAUSED)
  if (gameState === 'PLAYING' || gameState === 'PAUSED') {
    drawPlayerCar();
  }

  // Traffic cars
  obstacles.forEach(obs => drawTrafficCar(obs));

  // Rain overlay
  if (weatherIntensity > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(180,220,255,${weatherIntensity * 0.25})`;
    ctx.lineWidth = 1;
    rainDrops.forEach(drop => {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * 0.08, drop.y + drop.len);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Nitro boost speed-lines
  if (nitroBoosting) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const sx = roadX + Math.random() * roadWidth;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + (Math.random() - 0.5) * 20, canvas.height);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Car drawing ────────────────────────────────────────────────────────────
function drawPlayerCar() {
  const x = player.x, y = player.y, w = player.width, h = player.height;

  // Glow halo
  const glowColor = nitroBoosting ? 'rgba(0,212,255,0.5)' : 'rgba(99,102,241,0.3)';
  ctx.save();
  ctx.shadowBlur = nitroBoosting ? 30 : 18;
  ctx.shadowColor = nitroBoosting ? '#00d4ff' : '#6366f1';
  ctx.fillStyle = glowColor;
  ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
  ctx.restore();

  // Car body shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 4, y + 6, w, h);

  // Body base
  ctx.fillStyle = '#0c0c18';
  ctx.fillRect(x - 2, y, w + 4, h);

  // Paint (main body color)
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
  bodyGrad.addColorStop(0,   nitroBoosting ? '#0080cc' : '#3b3bf0');
  bodyGrad.addColorStop(0.4, nitroBoosting ? '#00d4ff' : '#6366f1');
  bodyGrad.addColorStop(1,   nitroBoosting ? '#0070bb' : '#4f46e5');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(x, y + 3, w, h - 6);

  // Hood
  ctx.fillStyle = nitroBoosting ? '#00aadd' : '#5254c8';
  ctx.fillRect(x + 4, y + 3, w - 8, 16);

  // Roof
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(x + 6, y + 20, w - 12, 22);
  // Roof highlight
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x + 8, y + 22, w - 16, 4);

  // Windshield
  ctx.fillStyle = '#081428';
  ctx.fillRect(x + 5, y + 24, w - 10, 16);
  // Windshield reflection
  ctx.fillStyle = 'rgba(0,212,255,0.18)';
  ctx.fillRect(x + 7, y + 26, 6, 8);

  // Rear window
  ctx.fillStyle = '#081428';
  ctx.fillRect(x + 5, y + h - 32, w - 10, 14);
  ctx.fillStyle = 'rgba(0,150,200,0.12)';
  ctx.fillRect(x + 7, y + h - 30, 5, 6);

  // Stripe
  ctx.fillStyle = nitroBoosting ? 'rgba(0,255,255,0.4)' : 'rgba(150,150,255,0.3)';
  ctx.fillRect(x + w / 2 - 1, y + 3, 2, h - 6);

  // Front headlights
  ctx.fillStyle = nitroBoosting ? '#ffffff' : '#e0f0ff';
  ctx.shadowBlur = nitroBoosting ? 16 : 10;
  ctx.shadowColor = '#00d4ff';
  ctx.fillRect(x + 3, y + 3, 7, 5);
  ctx.fillRect(x + w - 10, y + 3, 7, 5);
  ctx.shadowBlur = 0;
  // Headlight flare
  ctx.fillStyle = 'rgba(200,240,255,0.5)';
  ctx.fillRect(x + 3, y + 4, 3, 3);
  ctx.fillRect(x + w - 10, y + 4, 3, 3);

  // Tail lights
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ff0040';
  ctx.fillStyle = '#ff2244';
  ctx.fillRect(x + 3, y + h - 7, 8, 5);
  ctx.fillRect(x + w - 11, y + h - 7, 8, 5);
  ctx.shadowBlur = 0;

  // Wheels
  drawWheel(x - 3, y + 10, 6, 14);
  drawWheel(x + w - 3, y + 10, 6, 14);
  drawWheel(x - 3, y + h - 28, 6, 14);
  drawWheel(x + w - 3, y + h - 28, 6, 14);
}

function drawWheel(x, y, w, h) {
  ctx.fillStyle = '#050508';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#222230';
  ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  ctx.fillStyle = '#3a3a50';
  ctx.fillRect(x + 2, y + h / 2 - 1, w - 4, 2);
}

function drawTrafficCar(obs) {
  const { x, y, width: w, height: h, color } = obs;
  const isOncoming = chosenMode === 'OPPOSITE';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 3, y + 5, w, h);

  // Body shadow
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(x - 1, y, w + 2, h);

  // Body
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, shadeColor(color, -40));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shadeColor(color, -30));
  ctx.fillStyle = g;
  ctx.fillRect(x, y + 3, w, h - 6);

  // Hood / roof
  ctx.fillStyle = shadeColor(color, -20);
  if (isOncoming) {
    ctx.fillRect(x + 3, y + h - 18, w - 6, 15);
  } else {
    ctx.fillRect(x + 3, y + 3, w - 6, 15);
  }

  // Roof cabin
  ctx.fillStyle = '#0c0c18';
  ctx.fillRect(x + 5, y + (isOncoming ? h - 40 : 20), w - 10, 20);
  // Cabin glass
  ctx.fillStyle = '#0d1a24';
  ctx.fillRect(x + 6, y + (isOncoming ? h - 38 : 22), w - 12, 14);
  ctx.fillStyle = 'rgba(150,200,220,0.1)';
  ctx.fillRect(x + 7, y + (isOncoming ? h - 36 : 24), 5, 6);

  // Headlights / tail lights
  if (isOncoming) {
    // Oncoming: headlights at bottom (facing player)
    ctx.shadowBlur = 12; ctx.shadowColor = '#ffffcc';
    ctx.fillStyle = '#ffffee';
    ctx.fillRect(x + 3, y + h - 7, 7, 5);
    ctx.fillRect(x + w - 10, y + h - 7, 7, 5);
    ctx.shadowBlur = 0;
    // taillights at top
    ctx.fillStyle = '#cc1133';
    ctx.fillRect(x + 3, y + 2, 6, 4);
    ctx.fillRect(x + w - 9, y + 2, 6, 4);
  } else {
    // Same-way: taillights at bottom
    ctx.shadowBlur = 7; ctx.shadowColor = '#ff0033';
    ctx.fillStyle = '#ff2244';
    ctx.fillRect(x + 3, y + h - 6, 7, 4);
    ctx.fillRect(x + w - 10, y + h - 6, 7, 4);
    ctx.shadowBlur = 0;
    // headlights at top (faint, facing away)
    ctx.fillStyle = '#2a2a44';
    ctx.fillRect(x + 3, y + 2, 6, 4);
    ctx.fillRect(x + w - 9, y + 2, 6, 4);
  }

  // Wheels
  drawWheel(x - 3, y + 10, 6, 12);
  drawWheel(x + w - 3, y + 10, 6, 12);
  drawWheel(x - 3, y + h - 24, 6, 12);
  drawWheel(x + w - 3, y + h - 24, 6, 12);
}

function drawBarrier(x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, '#1a1a2e');
  g.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Reflector strips
  ctx.fillStyle = 'rgba(0,212,255,0.15)';
  const stripOff = Math.floor(score * 1.5) % 40;
  for (let r = 0; r < canvas.height; r += 40) {
    ctx.fillRect(x, r + stripOff, w, 6);
  }
}

function drawLampPost(x, y) {
  // Post
  ctx.fillStyle = '#141422';
  ctx.fillRect(x + 3, y, 4, 60);
  // Arm
  ctx.fillStyle = '#141422';
  ctx.fillRect(x, y, 16, 4);
  // Light
  ctx.shadowBlur = 16;
  ctx.shadowColor = 'rgba(255,220,100,0.5)';
  ctx.fillStyle = '#ffdd66';
  ctx.fillRect(x - 1, y - 3, 7, 5);
  ctx.shadowBlur = 0;
  // Glow cone
  const coneGrad = ctx.createRadialGradient(x + 2, y + 2, 0, x + 2, y + 2, 50);
  coneGrad.addColorStop(0, 'rgba(255,220,100,0.06)');
  coneGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coneGrad;
  ctx.fillRect(x - 40, y, 80, 80);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function shadeColor(hex, amt) {
  let c = parseInt(hex.replace('#',''), 16);
  let r = Math.max(0, Math.min(255, (c >> 16) + amt));
  let g = Math.max(0, Math.min(255, ((c >> 8) & 0xff) + amt));
  let b = Math.max(0, Math.min(255, (c & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

// ── Main loop ─────────────────────────────────────────────────────────────
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ── Init ──────────────────────────────────────────────────────────────────
refreshHighScore();
renderToggles();
initDiffButtons();
requestAnimationFrame(loop);