// ═══════════════════════════════════════════════════════════════════════════
// HYPERDRIVE AUDIO ENGINE
// All sounds synthesised with Web Audio API — zero external files.
// ═══════════════════════════════════════════════════════════════════════════
const SFX = (() => {
  let ctx = null;
  let engineOsc = null, engineGain = null;      // persistent engine hum nodes
  let engineRunning = false;
  let lastNitroState = false;
  let lastSpeed = 5;

  // ── Bootstrap AudioContext on first user gesture ────────────────────────
  function boot() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // ── Low-level helpers ───────────────────────────────────────────────────
  function osc(type, freq, startT, endT, gainPeak, gainEnd, dest) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, startT);
    g.gain.setValueAtTime(0.001, startT);
    g.gain.linearRampToValueAtTime(gainPeak, startT + 0.015);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.001), endT);
    o.connect(g); g.connect(dest || ctx.destination);
    o.start(startT); o.stop(endT + 0.05);
    return { o, g };
  }

  function noise(durationSec, gainPeak, gainEnd, filterFreq, dest) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * durationSec, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 1.2;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gainPeak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.001), t + durationSec);
    src.connect(filt); filt.connect(g); g.connect(dest || ctx.destination);
    src.start(t); src.stop(t + durationSec);
  }

  function distort(amount) {
    const ws = ctx.createWaveShaper();
    const samples = 256, curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    ws.curve = curve;
    ws.oversample = '2x';
    return ws;
  }

  // ── 1. ENGINE HUM — continuous, pitch follows gameSpeed ─────────────────
  function startEngine() {
    if (!ctx || engineRunning) return;
    engineRunning = true;

    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;

    // Subtle low-pass so it doesn't screech
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 400;

    engineGain = ctx.createGain();
    engineGain.gain.value = 0.06;

    // Add a slight tremolo for engine "pulse"
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 14;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(engineGain.gain);

    engineOsc.connect(lpf);
    lpf.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    lfo.start();
  }

  function stopEngine() {
    if (!engineRunning) return;
    engineRunning = false;
    try {
      engineGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      engineOsc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
    engineOsc = null; engineGain = null;
  }

  // Call this every frame from update() with current gameSpeed & nitroBoosting
  function tickEngine(speed, nitroOn) {
    if (!ctx || !engineRunning || !engineOsc) return;
    // Map gameSpeed (5–23) → frequency (60–220 Hz)
    const targetFreq = 60 + (speed - 5) / 18 * 160;
    engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
    // Nitro pitch surge
    const targetGain = nitroOn ? 0.10 : 0.06;
    engineGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
  }

  // ── 2. NITRO ACTIVATE — whoosh + pitch surge ────────────────────────────
  function nitroActivate() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Whoosh: swept bandpass noise
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.55, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.Q.value = 3;
    bpf.frequency.setValueAtTime(300, t);
    bpf.frequency.exponentialRampToValueAtTime(3200, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    src.connect(bpf); bpf.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + 0.6);

    // Pitch burst on engine osc
    if (engineOsc) {
      engineOsc.frequency.setValueAtTime(engineOsc.frequency.value, t);
      engineOsc.frequency.linearRampToValueAtTime(380, t + 0.1);
      engineOsc.frequency.setTargetAtTime(60 + (lastSpeed - 5) / 18 * 160, t + 0.12, 0.12);
    }
  }

  // ── 3. NITRO DEPLETED — sputter / fizzle ───────────────────────────────
  function nitroDepleted() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Three short sputters
    [0, 0.09, 0.2].forEach(offset => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.14, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);
      src.connect(lpf); lpf.connect(g); g.connect(ctx.destination);
      src.start(t + offset); src.stop(t + offset + 0.1);
    });
  }

  // ── 4. NEAR MISS — sharp doppler swoosh ────────────────────────────────
  function nearMiss() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Doppler: high-pitched descending tone
    osc('sine', 1100, t, t + 0.25, 0.18, 0.001);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(880, t);
    o2.frequency.exponentialRampToValueAtTime(220, t + 0.22);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.12, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o2.connect(g2); g2.connect(ctx.destination);
    o2.start(t); o2.stop(t + 0.25);
    // Whoosh layer
    noise(0.2, 0.08, 0.001, 1800);
  }

  // ── 5. COMBO UP — ascending chime ──────────────────────────────────────
  function comboUp(level) {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Scale pitch with combo level so each combo sounds higher
    const base = 440 * Math.pow(1.06, Math.min(level - 1, 16));
    const notes = [base, base * 1.25, base * 1.5];
    notes.forEach((freq, i) => {
      osc('triangle', freq, t + i * 0.07, t + i * 0.07 + 0.18, 0.12, 0.001);
    });
  }

  // ── 6. CRASH / EXPLOSION ───────────────────────────────────────────────
  function crash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Boom: low noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.9, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 280;
    const dist = distort(300);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    src.connect(dist); dist.connect(lpf); lpf.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + 0.95);
    // Sub-bass thud
    osc('sine', 60, t, t + 0.35, 0.5, 0.001);
    // High frequency crack
    noise(0.15, 0.3, 0.001, 3500);
  }

  // ── 7. NEW RECORD — triumphant ding sequence ───────────────────────────
  function newRecord() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Fanfare: 4 rising notes
    const melody = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    melody.forEach((freq, i) => {
      osc('triangle', freq, t + i * 0.12, t + i * 0.12 + 0.28, 0.15, 0.001);
      // Harmony a 5th below
      osc('sine', freq * 0.667, t + i * 0.12, t + i * 0.12 + 0.25, 0.07, 0.001);
    });
  }

  // ── 8. COIN EARNED — light chime ───────────────────────────────────────
  function coin() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc('sine',     1318.5, t,        t + 0.18, 0.14, 0.001);
    osc('triangle', 1661.2, t + 0.07, t + 0.22, 0.09, 0.001);
  }

  // ── 9. MENU CLICK — subtle tap ─────────────────────────────────────────
  function menuClick() {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc('sine', 520, t, t + 0.08, 0.07, 0.001);
    noise(0.06, 0.04, 0.001, 2400);
  }

  // ── 10. COUNTDOWN BEEP ─────────────────────────────────────────────────
  function countdownBeep(isFinal) {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (isFinal) {
      // GO! — double beep, higher pitch
      osc('square', 880, t,       t + 0.12, 0.18, 0.001);
      osc('square', 880, t + 0.14, t + 0.26, 0.18, 0.001);
    } else {
      osc('square', 440, t, t + 0.10, 0.12, 0.001);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────
  return {
    boot,
    startEngine,
    stopEngine,
    tickEngine,
    nitroActivate,
    nitroDepleted,
    nearMiss,
    comboUp,
    crash,
    newRecord,
    coin,
    menuClick,
    countdownBeep,
  };
})();