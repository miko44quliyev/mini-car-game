/**
 * HYPERDRIVE PRO // SIMULATION ENGINE (V7 PRODUCTION)
 * Secure Matrix Position Binding, Pause Controllers, and Local Storage Fix
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Element Registration Maps
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hudLayer = document.getElementById('hud');
const liveAlert = document.getElementById('live-alert');
const crashFeedbackMsg = document.getElementById('crash-feedback-msg');

const startBtn = document.getElementById('start-btn');
const hudPauseBtn = document.getElementById('hud-pause-btn');
const pauseContinueBtn = document.getElementById('pause-continue-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseExitBtn = document.getElementById('pause-exit-btn');
const restartBtn = document.getElementById('restart-btn');

const scoreDisplay = document.getElementById('score-display');
const hudBestDisplay = document.getElementById('hud-best-display');
const finalScoreDisplay = document.getElementById('final-score');
const newRecordTag = document.getElementById('new-record-tag');
const menuHighScoreDisplay = document.getElementById('menu-high-score');
const menuToggleContainer = document.querySelector('.menu-toggle-target');
const gameOverToggleContainer = document.querySelector('.game-over-toggle-target');

// System Operational Configurations
let gameState = 'MENU'; 
let chosenMode = 'SAME_WAY'; 
let score = 0;
let gameSpeed = 5;
const maxSpeed = 19;
let recordBrokenThisRun = false; 
let baselineRecordAtStart = 0;   
let recordToastTimer = null; 

// Highway Track Matrix Coordinates
const laneWidth = 95;
const roadWidth = laneWidth * 3;
const roadX = (canvas.width - roadWidth) / 2;

// Storage Nodes Buffers
let obstacles = [];
let particles = [];
let trackLines = [];
const keys = {};

// Player Car Structural Profile Matrix
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 145,
  width: 40,
  height: 76,
  targetX: canvas.width / 2 - 20,
  speed: 8.5,
  color: '#6366f1'
};

function getStorageKey() {
  return `hyperdrive_record_${chosenMode}`;
}

function refreshHighScoreUI() {
  const currentKey = getStorageKey();
  // Safe Integer Parse to prevent evaluation code loops from crashing
  const record = parseInt(localStorage.getItem(currentKey), 10) || 0;
  const formattedRecord = String(record).padStart(5, '0');
  
  menuHighScoreDisplay.textContent = record.toLocaleString();
  hudBestDisplay.textContent = formattedRecord;
  
  return record;
}

function renderTransmissionToggles() {
  menuToggleContainer.innerHTML = '';
  gameOverToggleContainer.innerHTML = '';

  const buildButtonHTML = (modeKey, title, description) => {
    const isActive = chosenMode === modeKey ? 'active-mode' : '';
    return `
      <button class="mode-btn ${isActive}" data-mode="${modeKey}" type="button">
        <span class="mode-title">${title}</span>
        <span class="mode-desc">${description}</span>
      </button>
    `;
  };

  const sameWayHTML = buildButtonHTML('SAME_WAY', 'SAME-WAY TRANSMISSION', 'Overtake traffic moving down flow paths.');
  const oppositeHTML = buildButtonHTML('OPPOSITE', 'HEAD-ON OPPOSITE', 'Survive high-velocity incoming traffic.');

  menuToggleContainer.innerHTML = sameWayHTML + oppositeHTML;
  gameOverToggleContainer.innerHTML = sameWayHTML + oppositeHTML;

  document.querySelectorAll('.mode-btn').forEach(button => {
    button.addEventListener('click', function() {
      chosenMode = this.getAttribute('data-mode');
      refreshHighScoreUI();
      renderTransmissionToggles();
    });
  });
}

function initTrackLines() {
  trackLines = [];
  for (let i = -100; i < canvas.height; i += 100) {
    trackLines.push({ y: i });
  }
}

// Bind Action Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
hudPauseBtn.addEventListener('click', togglePauseState);
pauseContinueBtn.addEventListener('click', togglePauseState);
pauseRestartBtn.addEventListener('click', startGame);
pauseExitBtn.addEventListener('click', exitToMainMenu);

window.addEventListener('keydown', e => { 
  keys[e.key] = true; 
  if (e.key === 'Escape' || e.key === 'Esc') {
    togglePauseState();
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function startGame() {
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  liveAlert.classList.add('hidden');
  hudLayer.classList.remove('hidden');

  if (recordToastTimer) clearTimeout(recordToastTimer);

  score = 0;
  recordBrokenThisRun = false;
  baselineRecordAtStart = refreshHighScoreUI(); 
  
  gameSpeed = chosenMode === 'OPPOSITE' ? 5.5 : 7.5; 
  obstacles = [];
  particles = [];
  
  // FIXED CENTER LANE ALIGNMENT OVERRIDE
  const centerLaneX = canvas.width / 2 - (player.width / 2);
  player.x = centerLaneX;
  player.targetX = centerLaneX;
  
  initTrackLines();
  gameState = 'PLAYING';
}

function togglePauseState() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseScreen.classList.remove('hidden');
  } else if (gameState === 'PAUSED') {
    gameState = 'PLAYING';
    pauseScreen.classList.add('hidden');
  }
}

function exitToMainMenu() {
  pauseScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hudLayer.classList.add('hidden');
  liveAlert.classList.add('hidden');
  startScreen.classList.remove('hidden');
  
  gameState = 'MENU';
  refreshHighScoreUI();
  renderTransmissionToggles();
}

function triggerCrashSequence() {
  gameState = 'GAMEOVER';
  hudLayer.classList.add('hidden');
  liveAlert.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');
  
  if (recordToastTimer) clearTimeout(recordToastTimer);

  const finalScoreCalculated = Math.floor(score);
  finalScoreDisplay.textContent = finalScoreCalculated.toLocaleString();
  const currentKey = getStorageKey();
  
  if (recordBrokenThisRun) {
    localStorage.setItem(currentKey, finalScoreCalculated);
    newRecordTag.style.display = 'block';
    crashFeedbackMsg.innerHTML = `<span style="color: var(--neon-success); font-weight:700;">OUTSTANDING DRIVE!</span> You set a new record for this layout by scoring ${finalScoreCalculated.toLocaleString()} points!`;
  } else {
    newRecordTag.style.display = 'none';
    if (finalScoreCalculated === 0) {
      crashFeedbackMsg.textContent = "Immediate hull collapse. Try shifting lanes sooner to avoid initial gridlock.";
    } else if (baselineRecordAtStart > 0 && finalScoreCalculated >= baselineRecordAtStart * 0.8) {
      crashFeedbackMsg.textContent = `So close! You finished within striking distance of your record. Missed it by just ${(baselineRecordAtStart - finalScoreCalculated).toLocaleString()} points.`;
    } else {
      crashFeedbackMsg.textContent = "Impact vectors exceeded structural limits. Keep an eye on target speeds to anticipate lane adjustments.";
    }
  }
  
  refreshHighScoreUI();
  renderTransmissionToggles(); 
}

function createExplosionVFX(x, y, color) {
  for (let i = 0; i < 35; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      radius: Math.random() * 4 + 2,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015,
      color: color
    });
  }
}

function injectExhaustSmoke() {
  if (Math.random() > 0.3) {
    particles.push({
      x: player.x + player.width / 2 + (Math.random() * 6 - 3),
      y: player.y + player.height - 4,
      vx: (Math.random() - 0.5) * 1.2,
      vy: gameSpeed * 0.3 + (Math.random() * 2),
      radius: Math.random() * 3 + 1,
      alpha: 0.4,
      decay: 0.02,
      color: 'rgba(130, 130, 160, 0.3)'
    });
  }
}

function evaluatesAABBIntersection(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update() {
  if (gameState !== 'PLAYING') return;

  if (gameSpeed < maxSpeed) {
    gameSpeed += 0.0018;
  }

  const modeMultiplier = chosenMode === 'OPPOSITE' ? 1.6 : 1.0;
  score += gameSpeed * 0.06 * modeMultiplier;
  
  const currentFloorScore = Math.floor(score);
  scoreDisplay.textContent = String(currentFloorScore).padStart(5, '0');

  // Timed 3.5-Second Record Notification Toast Engine
  if (currentFloorScore > baselineRecordAtStart && baselineRecordAtStart > 0) {
    if (!recordBrokenThisRun) {
      recordBrokenThisRun = true;
      liveAlert.classList.remove('hidden'); 
      recordToastTimer = setTimeout(() => {
        liveAlert.classList.add('hidden');
      }, 3500); 
    }
    hudBestDisplay.textContent = String(currentFloorScore).padStart(5, '0');
  } else if (baselineRecordAtStart === 0 && currentFloorScore > 0) {
    if (!recordBrokenThisRun) {
      recordBrokenThisRun = true;
      liveAlert.classList.remove('hidden');
      recordToastTimer = setTimeout(() => {
        liveAlert.classList.add('hidden');
      }, 3500);
    }
    hudBestDisplay.textContent = String(currentFloorScore).padStart(5, '0');
  }

  if (keys['a'] || keys['ArrowLeft']) player.targetX -= player.speed;
  if (keys['d'] || keys['ArrowRight']) player.targetX += player.speed;

  const lateralLeftWall = roadX + 15;
  const lateralRightWall = roadX + roadWidth - player.width - 15;
  if (player.targetX < lateralLeftWall) player.targetX = lateralLeftWall;
  if (player.targetX > lateralRightWall) player.targetX = lateralRightWall;

  player.x += (player.targetX - player.x) * 0.22;

  injectExhaustSmoke();

  trackLines.forEach(line => {
    line.y += gameSpeed;
    if (line.y > canvas.height) line.y = -80;
  });

  if (obstacles.length === 0 || (obstacles[obstacles.length - 1].y > 220 && Math.random() < 0.03)) {
    const assignedLane = Math.floor(Math.random() * 3);
    const calculatedX = roadX + (assignedLane * laneWidth) + (laneWidth - 38) / 2;
    const trafficSkins = ['#f43f5e', '#fbbf24', '#10b981', '#06b6d4', '#a855f7'];
    
    let speedVector = 0;
    if (chosenMode === 'SAME_WAY') {
      speedVector = Math.random() * 2.5 - 5.0; 
    } else {
      speedVector = Math.random() * 3.0 + 2.0; 
    }

    obstacles.push({
      x: calculatedX,
      y: -90,
      width: 38,
      height: 74,
      vy: speedVector,
      color: trafficSkins[Math.floor(Math.random() * trafficSkins.length)]
    });
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    let targetVehicle = obstacles[i];
    targetVehicle.y += gameSpeed + targetVehicle.vy;

    if (evaluatesAABBIntersection(player, targetVehicle)) {
      createExplosionVFX(player.x + player.width / 2, player.y + 15, '#f43f5e');
      createExplosionVFX(targetVehicle.x + targetVehicle.width / 2, targetVehicle.y + 15, targetVehicle.color);
      triggerCrashSequence();
      return;
    }

    if (targetVehicle.y > canvas.height + 100 || targetVehicle.y < -150) {
      obstacles.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    let particleNode = particles[i];
    particleNode.x += particleNode.vx;
    particleNode.y += particleNode.vy;
    particleNode.alpha -= particleNode.decay;
    if (particleNode.alpha <= 0) particles.splice(i, 1);
  }
}

function draw() {
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#111116';
  ctx.fillRect(roadX, 0, roadWidth, canvas.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let g = 0; g < roadWidth; g += 4) {
    let grainHeight = (Math.sin(g + score) * 15) + 20;
    ctx.fillRect(roadX + g, (Math.floor(score * gameSpeed) % 40) - 40, 2, grainHeight);
    ctx.fillRect(roadX + g, (Math.floor(score * gameSpeed) % 40) + 200, 1, grainHeight * 2);
    ctx.fillRect(roadX + g, (Math.floor(score * gameSpeed) % 40) + 450, 2, grainHeight);
  }

  ctx.fillStyle = '#262636';
  ctx.fillRect(roadX - 4, 0, 4, canvas.height);
  ctx.fillRect(roadX + roadWidth, 0, 4, canvas.height);

  ctx.fillStyle = '#161622';
  for (let r = 0; r < canvas.height; r += 24) {
    ctx.fillRect(roadX - 14, r + (Math.floor(score * 1.8) % 24), 6, 8);
    ctx.fillRect(roadX + roadWidth + 8, r + (Math.floor(score * 1.8) % 24), 6, 8);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  trackLines.forEach(line => {
    ctx.fillRect(roadX + laneWidth - 2, line.y, 4, 50);
    ctx.fillRect(roadX + (laneWidth * 2) - 2, line.y, 4, 50);
  });

  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Preserve rendering states for both ACTIVE and PAUSED conditions
  if (gameState === 'PLAYING' || gameState === 'PAUSED') {
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.fillRect(player.x - 6, player.y - 6, player.width + 12, player.height + 12);

    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(player.x - 1, player.y, player.width + 2, player.height);

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y + 2, player.width, player.height - 4);

    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(player.x + 8, player.y + 4, 3, 16);
    ctx.fillRect(player.x + player.width - 11, player.y + 4, 3, 16);

    ctx.fillStyle = '#0a090f';
    ctx.fillRect(player.x + 4, player.y + 22, player.width - 8, 20);
    ctx.fillStyle = '#38bdf8'; 
    ctx.fillRect(player.x + 6, player.y + 24, player.width - 12, 16);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(player.x + 3, player.y + player.height - 6, 8, 4);
    ctx.fillRect(player.x + player.width - 11, player.y + player.height - 6, 8, 4);
  }

  obstacles.forEach(obs => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(obs.x - 3, obs.y + 4, obs.width + 6, obs.height);

    ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    ctx.fillStyle = '#12121a';
    if (chosenMode === 'SAME_WAY') {
      ctx.fillRect(obs.x + 4, obs.y + 28, obs.width - 8, 16);
    } else {
      ctx.fillRect(obs.x + 4, obs.y + obs.height - 44, obs.width - 8, 16);
    }

    if (chosenMode === 'SAME_WAY') {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(obs.x + 3, obs.y + 2, 6, 3);
      ctx.fillRect(obs.x + obs.width - 9, obs.y + 2, 6, 3);
    } else {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(obs.x + 3, obs.y + obs.height - 5, 7, 4);
      ctx.fillRect(obs.x + obs.width - 10, obs.y + obs.height - 5, 7, 4);
    }
  });
}

function engineLifecycleLoop() {
  update();
  draw();
  requestAnimationFrame(engineLifecycleLoop);
}

// Initialization Systems Trigger Assembly
refreshHighScoreUI();
renderTransmissionToggles();
requestAnimationFrame(engineLifecycleLoop);