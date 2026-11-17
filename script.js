/* ==========================================================================
   ARENA PIXEL BOMBERS — Handheld Mobile + Desktop Engine
   ========================================================================== */

const COLS = 15;
const ROWS = 13;
const TILE_SIZE = 32;
const CANVAS_W = COLS * TILE_SIZE; // 480
const CANVAS_H = ROWS * TILE_SIZE; // 416

const TILE = { FLOOR: 0, WALL: 1, BRICK: 2, BOMB: 3 };
const POWERUP = { BOMB: 'bomb', FIRE: 'fire', SPEED: 'speed' };

const BOMB_FUSE_MS = 2500;
const EXPLOSION_DURATION_MS = 460;
const MATCH_DURATION_SEC = 150; // 02:30
const SUDDEN_DEATH_SEC = 30;    // 00:30
const SUDDEN_DEATH_INTERVAL = 0.42;

const BASE_SPEED = 114;
const SPEED_STEP = 18;
const MAX_SPEED_LEVEL = 5;
const MAX_BOMBS_CAP = 5;
const MAX_FIRE_CAP = 6;
const HITBOX_HALF = 11;

const FIGHTER_SLOTS = [
  { id: 'p1',    name: 'PLAYER 1', color: '#22d3ee', dark: '#0891b2', col: 1,  row: 1,  isBot: false },
  { id: 'bot-1', name: 'CRIMSON',  color: '#f43f5e', dark: '#be123c', col: 13, row: 11, isBot: true },
  { id: 'bot-2', name: 'LIME',     color: '#4ade80', dark: '#15803d', col: 13, row: 1,  isBot: true },
  { id: 'bot-3', name: 'GOLD',     color: '#facc15', dark: '#a16207', col: 1,  row: 11, isBot: true }
];

const SAFE_SPAWN_TILES = new Set([
  '1,1', '2,1', '1,2',
  '13,11', '12,11', '13,10',
  '13,1', '12,1', '13,2',
  '1,11', '2,11', '1,10'
]);

const DIFFICULTIES = {
  beginner: {
    label: 'BEGINNER',
    speedMult: 0.82,
    decisionMs: 400,
    mistakeRate: 0.28,
    desc: 'Relaxed movement & ~400ms reaction. Occasionally misjudges blasts and ignores distant items.'
  },
  medium: {
    label: 'MEDIUM',
    speedMult: 1.00,
    decisionMs: 180,
    mistakeRate: 0.00,
    desc: 'Balanced tactical BFS bots (~180ms) that verify safe escapes and actively seek power-ups.'
  },
  pro: {
    label: 'PRO',
    speedMult: 1.08,
    decisionMs: 60,
    mistakeRate: 0.00,
    desc: 'Fast ~60ms A* hunters that prioritize +Fire/+Speed, set traps, and weave chain reactions.'
  }
};

const MAP_THEMES = {
  classic: {
    floorA: '#17332a',
    floorB: '#122921',
    wallBase: '#475569',
    wallLight: '#94a3b8',
    wallDark: '#1e293b',
    brickBase: '#9a3412',
    brickMortar: '#431407',
    brickLight: '#ea580c'
  },
  lava: {
    floorA: '#1c1517',
    floorB: '#161012',
    wallBase: '#27272a',
    wallLight: '#52525b',
    wallDark: '#09090b',
    brickBase: '#b45309',
    brickMortar: '#451a03',
    brickLight: '#f59e0b'
  },
  cyber: {
    floorA: '#0b162c',
    floorB: '#081122',
    wallBase: '#1e3a5f',
    wallLight: '#38bdf8',
    wallDark: '#081628',
    brickBase: '#7e22ce',
    brickMortar: '#3b0764',
    brickLight: '#e879f9'
  }
};

const STATS_KEY = 'arenaPixelBombers_career_v2';
const MUTE_KEY = 'arenaPixelBombers_muted_v2';
const BGM_KEY = 'arenaPixelBombers_bgm_v2';
const TOUCH_KEY = 'arenaPixelBombers_touch_v2';

/* ==========================================================================
   DOM REFERENCES
   ========================================================================== */
const stageWrapper = document.getElementById('stageWrapper');
const canvasFrame = document.getElementById('canvasFrame');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const hudDiffBadge = document.getElementById('hudDiffBadge');
const compactLiveStats = document.getElementById('compactLiveStats');
const cStatBombs = document.getElementById('cStatBombs');
const cStatFire = document.getElementById('cStatFire');
const cStatSpeed = document.getElementById('cStatSpeed');
const cStatAlive = document.getElementById('cStatAlive');

const timerPill = document.getElementById('timerPill');
const timerDisplay = document.getElementById('timerDisplay');
const touchToggleBtn = document.getElementById('touchToggleBtn');
const pauseTouchToggleBtn = document.getElementById('pauseTouchToggleBtn');
const pauseBtn = document.getElementById('pauseBtn');
const bgmBtn = document.getElementById('bgmBtn');
const muteBtn = document.getElementById('muteBtn');
const playerHud = document.getElementById('playerHud');
const suddenDeathBanner = document.getElementById('suddenDeathBanner');
const touchControls = document.getElementById('touchControls');
const dpadEl = document.getElementById('dpad');
const touchBombBtn = document.getElementById('touchBombBtn');

const homeScreen = document.getElementById('homeScreen');
const mapGrid = document.getElementById('mapGrid');
const difficultyRow = document.getElementById('difficultyRow');
const diffBehaviorDesc = document.getElementById('diffBehaviorDesc');
const statsDiffLabel = document.getElementById('statsDiffLabel');
const statWins = document.getElementById('statWins');
const statStreak = document.getElementById('statStreak');
const statBestTime = document.getElementById('statBestTime');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const startBattleBtn = document.getElementById('startBattleBtn');

const pauseOverlay = document.getElementById('pauseOverlay');
const resumeBtn = document.getElementById('resumeBtn');
const restartFromPauseBtn = document.getElementById('restartFromPauseBtn');
const pauseHomeBtn = document.getElementById('pauseHomeBtn');

const gameOverOverlay = document.getElementById('gameOverOverlay');
const resultSubtitle = document.getElementById('resultSubtitle');
const winnerTitle = document.getElementById('winnerTitle');
const resultDesc = document.getElementById('resultDesc');
const newRecordBadge = document.getElementById('newRecordBadge');
const playAgainBtn = document.getElementById('playAgainBtn');
const gameOverHomeBtn = document.getElementById('gameOverHomeBtn');

/* ==========================================================================
   LOCALSTORAGE PERSISTENCE & HAPTICS
   ========================================================================== */
function defaultStats() {
  return {
    beginner: { wins: 0, streak: 0, bestTime: null },
    medium:   { wins: 0, streak: 0, bestTime: null },
    pro:      { wins: 0, streak: 0, bestTime: null }
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...defaultStats(), ...JSON.parse(raw) } : defaultStats();
  } catch {
    return defaultStats();
  }
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

function formatTimeSec(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function triggerHaptic(pattern) {
  if (state.phase !== 'PLAYING') return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch { /* ignore unsupported browsers */ }
}

/* ==========================================================================
   DYNAMIC CANVAS RESIZE (PORTRAIT, LANDSCAPE & DESKTOP)
   ========================================================================== */
function resizeCanvas() {
  if (!stageWrapper || !canvasFrame) return;
  const availW = Math.max(160, stageWrapper.clientWidth - 8);
  const availH = Math.max(140, stageWrapper.clientHeight - 8);
  const aspect = CANVAS_W / CANVAS_H; // 15:13

  let targetW = availW;
  let targetH = targetW / aspect;

  if (targetH > availH) {
    targetH = availH;
    targetW = targetH * aspect;
  }

  canvasFrame.style.width = `${Math.floor(targetW)}px`;
  canvasFrame.style.height = `${Math.floor(targetH)}px`;
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 80);
  setTimeout(resizeCanvas, 260);
});

/* ==========================================================================
   TOUCH UI VISIBILITY MODE (AUTO / ON / OFF)
   ========================================================================== */
const TOUCH_MODES = ['auto', 'on', 'off'];
let touchMode = localStorage.getItem(TOUCH_KEY) || 'auto';
if (!TOUCH_MODES.includes(touchMode)) touchMode = 'auto';

function applyTouchMode() {
  document.body.classList.remove('touch-mode-auto', 'touch-mode-on', 'touch-mode-off');
  document.body.classList.add(`touch-mode-${touchMode}`);
  const label = touchMode.toUpperCase();
  touchToggleBtn.textContent = `🎮 ${label}`;
  pauseTouchToggleBtn.textContent = `🎮 TOUCH UI: ${label}`;
  try { localStorage.setItem(TOUCH_KEY, touchMode); } catch {}
  requestAnimationFrame(resizeCanvas);
}

function cycleTouchMode() {
  sfx.playClick();
  const idx = (TOUCH_MODES.indexOf(touchMode) + 1) % TOUCH_MODES.length;
  touchMode = TOUCH_MODES[idx];
  applyTouchMode();
}

touchToggleBtn.addEventListener('click', cycleTouchMode);
pauseTouchToggleBtn.addEventListener('click', cycleTouchMode);

/* ==========================================================================
   WEB AUDIO 8-BIT SYNTHESIZER + CHIPTUNE BGM PULSE
   ========================================================================== */
class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(MUTE_KEY) === 'true';
    this.bgmEnabled = localStorage.getItem(BGM_KEY) !== 'false';
    this.lastStepAt = 0;
    this.bgmStep = 0;
    this.bgmInterval = null;
    this.syncButtons();
  }

  syncButtons() {
    muteBtn.textContent = this.muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('is-off', this.muted);
    bgmBtn.classList.toggle('is-off', !this.bgmEnabled || this.muted);
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, String(this.muted)); } catch {}
    this.syncButtons();
  }

  toggleBgm() {
    this.bgmEnabled = !this.bgmEnabled;
    try { localStorage.setItem(BGM_KEY, String(this.bgmEnabled)); } catch {}
    this.syncButtons();
    if (this.bgmEnabled) this.playClick();
  }

  tone(freq, duration, type = 'square', gainVal = 0.07, endFreq = null, delay = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  startBgmLoop(getPhaseFn) {
    if (this.bgmInterval) return;
    const bassLine = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    this.bgmInterval = setInterval(() => {
      if (this.muted || !this.bgmEnabled || !this.ctx || getPhaseFn() !== 'PLAYING') return;
      const note = bassLine[this.bgmStep % bassLine.length];
      this.tone(note, 0.11, 'triangle', 0.032, note * 0.98);
      if (this.bgmStep % 2 === 0) this.tone(note * 2, 0.06, 'square', 0.015);
      this.bgmStep++;
    }, 200);
  }

  playClick() { this.tone(520, 0.045, 'square', 0.05, 680); }
  playStep() {
    const now = performance.now();
    if (now - this.lastStepAt < 185) return;
    this.lastStepAt = now;
    this.tone(160, 0.03, 'triangle', 0.02, 110);
  }
  playBombDrop() { this.tone(240, 0.09, 'square', 0.07, 95); }
  playPowerup() {
    this.tone(523.25, 0.06, 'square', 0.07, null, 0);
    this.tone(659.25, 0.06, 'square', 0.07, null, 0.055);
    this.tone(783.99, 0.06, 'square', 0.07, null, 0.11);
    this.tone(1046.5, 0.14, 'square', 0.08, null, 0.165);
  }
  playHit() {
    this.tone(330, 0.12, 'sawtooth', 0.09, 130, 0);
    this.tone(175, 0.22, 'sawtooth', 0.09, 55, 0.1);
  }
  playSuddenDeath() {
    for (let i = 0; i < 3; i++) this.tone(680, 0.12, 'sawtooth', 0.09, 440, i * 0.18);
  }
  playBlockCrush() { this.tone(110, 0.07, 'square', 0.05, 55); }
  playVictory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
      this.tone(n, idx === 3 ? 0.28 : 0.1, 'square', 0.08, null, idx * 0.1);
    });
  }
  playDefeat() {
    this.tone(392, 0.15, 'triangle', 0.09, 349, 0);
    this.tone(349, 0.15, 'triangle', 0.09, 311, 0.16);
    this.tone(293, 0.30, 'triangle', 0.10, 196, 0.32);
  }
  playExplosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    this.tone(130, 0.32, 'sawtooth', 0.14, 30);

    const duration = 0.34;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(920, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }
}

const sfx = new RetroAudio();

/* ==========================================================================
   GAME STATE
   ========================================================================== */
const state = {
  phase: 'HOME', // 'HOME' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
  selectedMap: 'classic',
  difficulty: 'medium',
  stats: loadStats(),
  grid: [],
  hiddenPowerups: {},
  visiblePowerups: [],
  fighters: [],
  bombs: [],
  explosions: [],
  particles: [],
  popups: [],
  shakeTime: 0,
  shakeIntensity: 0,
  timeRemaining: MATCH_DURATION_SEC,
  elapsedTime: 0,
  suddenDeathActive: false,
  spiralCoords: [],
  spiralIndex: 0,
  spiralTimer: 0,
  attractResetTimer: 0
};

sfx.startBgmLoop(() => state.phase);

/* ==========================================================================
   MULTI-TOUCH + KEYBOARD INPUT ENGINE
   ========================================================================== */
const keyInput = { up: false, down: false, left: false, right: false, bomb: false };
const activeDpadTouches = new Map(); // touchId -> 'up'|'down'|'left'|'right'
const activeBombTouches = new Set(); // touchId
const dpadButtons = Array.from(document.querySelectorAll('.dpad-btn'));

function getCombinedDirection() {
  const dirs = {
    up: keyInput.up,
    down: keyInput.down,
    left: keyInput.left,
    right: keyInput.right
  };
  activeDpadTouches.forEach((d) => {
    if (d in dirs) dirs[d] = true;
  });
  return dirs;
}

function syncInputVisuals() {
  const dirs = getCombinedDirection();
  dpadButtons.forEach((btn) => {
    btn.classList.toggle('active', Boolean(dirs[btn.dataset.dir]));
  });
  touchBombBtn.classList.toggle('active', keyInput.bomb || activeBombTouches.size > 0);
}

// Keyboard listeners
function handleKeyChange(e, pressed) {
  const code = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
    if (state.phase === 'PLAYING') e.preventDefault();
  }

  if (code === 'KeyW' || code === 'ArrowUp') keyInput.up = pressed;
  if (code === 'KeyS' || code === 'ArrowDown') keyInput.down = pressed;
  if (code === 'KeyA' || code === 'ArrowLeft') keyInput.left = pressed;
  if (code === 'KeyD' || code === 'ArrowRight') keyInput.right = pressed;

  if (code === 'Space' || code === 'Enter') {
    keyInput.bomb = pressed;
    if (pressed && state.phase === 'PLAYING') {
      sfx.init();
      attemptDropBomb(state.fighters[0]);
    }
  } else if (pressed && (code === 'KeyP' || code === 'Escape')) {
    if (state.phase === 'PLAYING' || state.phase === 'PAUSED') togglePause();
  }

  syncInputVisuals();
}

window.addEventListener('keydown', (e) => handleKeyChange(e, true));
window.addEventListener('keyup', (e) => handleKeyChange(e, false));
window.addEventListener('blur', () => {
  keyInput.up = keyInput.down = keyInput.left = keyInput.right = keyInput.bomb = false;
  activeDpadTouches.clear();
  activeBombTouches.clear();
  syncInputVisuals();
});

// Multi-touch D-Pad (supports thumb sliding across directions)
function updateDpadTouch(touch) {
  const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.dpad-btn');
  if (el && el.dataset.dir) {
    activeDpadTouches.set(touch.identifier, el.dataset.dir);
  } else {
    activeDpadTouches.delete(touch.identifier);
  }
}

dpadEl.addEventListener('touchstart', (e) => {
  e.preventDefault();
  sfx.init();
  for (const t of e.changedTouches) updateDpadTouch(t);
  syncInputVisuals();
}, { passive: false });

dpadEl.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) updateDpadTouch(t);
  syncInputVisuals();
}, { passive: false });

const clearDpadTouches = (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) activeDpadTouches.delete(t.identifier);
  syncInputVisuals();
};
dpadEl.addEventListener('touchend', clearDpadTouches, { passive: false });
dpadEl.addEventListener('touchcancel', clearDpadTouches, { passive: false });

// Mouse fallback for desktop preview of Touch UI
dpadButtons.forEach((btn) => {
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    sfx.init();
    activeDpadTouches.set('mouse', btn.dataset.dir);
    syncInputVisuals();
  });
});
window.addEventListener('mouseup', () => {
  if (activeDpadTouches.has('mouse')) {
    activeDpadTouches.delete('mouse');
    syncInputVisuals();
  }
});

// Multi-touch Bomb Button (works simultaneously with D-Pad)
touchBombBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  sfx.init();
  for (const t of e.changedTouches) activeBombTouches.add(t.identifier);
  syncInputVisuals();
  if (state.phase === 'PLAYING') attemptDropBomb(state.fighters[0]);
}, { passive: false });

const clearBombTouches = (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) activeBombTouches.delete(t.identifier);
  syncInputVisuals();
};
touchBombBtn.addEventListener('touchend', clearBombTouches, { passive: false });
touchBombBtn.addEventListener('touchcancel', clearBombTouches, { passive: false });

touchBombBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  sfx.init();
  activeBombTouches.add('mouse');
  syncInputVisuals();
  if (state.phase === 'PLAYING') attemptDropBomb(state.fighters[0]);
});
window.addEventListener('mouseup', () => {
  if (activeBombTouches.has('mouse')) {
    activeBombTouches.delete('mouse');
    syncInputVisuals();
  }
});

/* ==========================================================================
   3 DISTINCT ARENA MAP LAYOUTS & MINI PREVIEWS
   ========================================================================== */
function isSolidWallLayout(mapId, c, r) {
  if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) return true;
  if (mapId === 'classic') return r % 2 === 0 && c % 2 === 0;
  if (mapId === 'lava') {
    return new Set([
      '3,2', '2,3', '11,2', '12,3',
      '3,10', '2,9', '11,10', '12,9',
      '5,4', '9,4', '5,8', '9,8'
    ]).has(`${c},${r}`);
  }
  if (mapId === 'cyber') {
    return new Set([
      '3,2', '4,2', '3,3', '11,2', '10,2', '11,3',
      '3,10', '4,10', '3,9', '11,10', '10,10', '11,9',
      '6,2', '7,2', '8,2', '7,3', '6,10', '7,10', '8,10', '7,9',
      '5,5', '5,6', '5,7', '9,5', '9,6', '9,7', '7,6'
    ]).has(`${c},${r}`);
  }
  return false;
}

function buildSpiralOrder() {
  const coords = [];
  let top = 1, bottom = ROWS - 2, left = 1, right = COLS - 2;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) coords.push({ col: c, row: top });
    top++;
    for (let r = top; r <= bottom; r++) coords.push({ col: right, row: r });
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) coords.push({ col: c, row: bottom });
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) coords.push({ col: left, row: r });
      left++;
    }
  }
  return coords;
}

function generateMap(mapId) {
  const grid = [];
  const hiddenPowerups = {};
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      if (isSolidWallLayout(mapId, c, r)) {
        row.push(TILE.WALL);
      } else if (SAFE_SPAWN_TILES.has(`${c},${r}`)) {
        row.push(TILE.FLOOR);
      } else {
        const isBrick = Math.random() < 0.62;
        row.push(isBrick ? TILE.BRICK : TILE.FLOOR);
        if (isBrick && Math.random() < 0.35) {
          const roll = Math.random();
          hiddenPowerups[`${c},${r}`] = roll < 0.34 ? POWERUP.BOMB : roll < 0.68 ? POWERUP.FIRE : POWERUP.SPEED;
        }
      }
    }
    grid.push(row);
  }

  state.grid = grid;
  state.hiddenPowerups = hiddenPowerups;
  state.visiblePowerups = [];
  state.bombs = [];
  state.explosions = [];
  state.particles = [];
  state.popups = [];
  state.spiralCoords = buildSpiralOrder();
  state.spiralIndex = 0;
  state.spiralTimer = 0;
}

function renderMapPreviews() {
  ['classic', 'lava', 'cyber'].forEach((mapId) => {
    const prevCanvas = document.getElementById(`preview-${mapId}`);
    if (!prevCanvas) return;
    const pctx = prevCanvas.getContext('2d');
    const theme = MAP_THEMES[mapId];
    const cell = 4;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (isSolidWallLayout(mapId, c, r)) pctx.fillStyle = theme.wallLight;
        else if (!SAFE_SPAWN_TILES.has(`${c},${r}`) && (r + c) % 3 === 0) pctx.fillStyle = theme.brickBase;
        else pctx.fillStyle = (r + c) % 2 === 0 ? theme.floorA : theme.floorB;
        pctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  });
}

/* ==========================================================================
   STATE MACHINE TRANSITIONS
   ========================================================================== */
function createFighter(slot, forceBot = false) {
  return {
    id: slot.id,
    name: slot.name,
    color: slot.color,
    dark: slot.dark,
    isBot: forceBot || slot.isBot,
    x: slot.col * TILE_SIZE + TILE_SIZE / 2,
    y: slot.row * TILE_SIZE + TILE_SIZE / 2,
    dir: 'down',
    moving: false,
    animTimer: 0,
    alive: true,
    maxBombs: 1,
    fireRange: 2,
    speedLevel: 1,
    aiTimer: Math.random() * 0.15,
    aiTargetDir: null,
    aiBombCooldown: 0
  };
}

function startAttractMode() {
  state.phase = 'HOME';
  state.suddenDeathActive = false;
  state.attractResetTimer = 0;
  generateMap(state.selectedMap);
  state.fighters = FIGHTER_SLOTS.map((slot) => createFighter(slot, true));

  homeScreen.classList.remove('hidden');
  pauseOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  suddenDeathBanner.classList.add('hidden');

  playerHud.classList.add('hidden');
  compactLiveStats.classList.add('hidden');
  timerPill.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  hudDiffBadge.classList.add('hidden');
  touchControls.classList.add('hidden');

  requestAnimationFrame(resizeCanvas);
}

function startBattle() {
  sfx.init();
  sfx.playClick();
  state.phase = 'PLAYING';
  state.timeRemaining = MATCH_DURATION_SEC;
  state.elapsedTime = 0;
  state.suddenDeathActive = false;

  generateMap(state.selectedMap);
  state.fighters = FIGHTER_SLOTS.map((slot) => createFighter(slot, false));

  homeScreen.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  suddenDeathBanner.classList.add('hidden');
  timerPill.classList.remove('sudden-death');

  playerHud.classList.remove('hidden');
  compactLiveStats.classList.remove('hidden');
  timerPill.classList.remove('hidden');
  pauseBtn.classList.remove('hidden');
  hudDiffBadge.classList.remove('hidden');
  touchControls.classList.remove('hidden');

  updateDifficultyUI();
  updateTimerUI();
  updateHudUI();
  requestAnimationFrame(resizeCanvas);
}

function togglePause() {
  sfx.playClick();
  if (state.phase === 'PLAYING') {
    state.phase = 'PAUSED';
    pauseOverlay.classList.remove('hidden');
  } else if (state.phase === 'PAUSED') {
    state.phase = 'PLAYING';
    pauseOverlay.classList.add('hidden');
  }
}

/* ==========================================================================
   BOMBS, EXPLOSIONS & POWER-UPS
   ========================================================================== */
function attemptDropBomb(fighter) {
  if (!fighter || !fighter.alive) return false;
  if (state.phase !== 'PLAYING' && state.phase !== 'HOME') return false;

  const col = Math.floor(fighter.x / TILE_SIZE);
  const row = Math.floor(fighter.y / TILE_SIZE);
  if (col <= 0 || col >= COLS - 1 || row <= 0 || row >= ROWS - 1) return false;
  if (state.grid[row][col] !== TILE.FLOOR) return false;

  const activeOwned = state.bombs.filter((b) => b.ownerId === fighter.id).length;
  if (activeOwned >= fighter.maxBombs) return false;

  state.grid[row][col] = TILE.BOMB;
  const passableFor = new Set();
  state.fighters.forEach((f) => {
    if (f.alive && doesFighterOverlapTile(f, col, row)) passableFor.add(f.id);
  });

  state.bombs.push({
    id: `${fighter.id}-${performance.now()}-${Math.random()}`,
    ownerId: fighter.id,
    col,
    row,
    range: fighter.fireRange,
    fuseRemainingMs: BOMB_FUSE_MS,
    passableFor
  });

  if (state.phase === 'PLAYING') {
    sfx.playBombDrop();
    if (!fighter.isBot) triggerHaptic(20);
  }
  return true;
}

function detonateBomb(rootBomb) {
  const queue = [rootBomb];
  const visited = new Set([rootBomb.id]);
  const cells = [];

  while (queue.length > 0) {
    const bomb = queue.shift();
    if (state.grid[bomb.row][bomb.col] === TILE.BOMB) state.grid[bomb.row][bomb.col] = TILE.FLOOR;
    cells.push({ col: bomb.col, row: bomb.row });

    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      for (let step = 1; step <= bomb.range; step++) {
        const nc = bomb.col + dc * step;
        const nr = bomb.row + dr * step;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;

        const tile = state.grid[nr][nc];
        if (tile === TILE.WALL) break;

        if (tile === TILE.BRICK) {
          state.grid[nr][nc] = TILE.FLOOR;
          cells.push({ col: nc, row: nr });
          spawnBrickParticles(nc, nr);
          const key = `${nc},${nr}`;
          if (state.hiddenPowerups[key]) {
            state.visiblePowerups.push({ col: nc, row: nr, type: state.hiddenPowerups[key] });
            delete state.hiddenPowerups[key];
          }
          break;
        }

        cells.push({ col: nc, row: nr });

        if (tile === TILE.BOMB) {
          const hitBomb = state.bombs.find((b) => b.col === nc && b.row === nr && !visited.has(b.id));
          if (hitBomb) {
            visited.add(hitBomb.id);
            queue.push(hitBomb);
          }
          break;
        }
      }
    }
  }

  state.bombs = state.bombs.filter((b) => !visited.has(b.id));
  state.explosions.push({ cells, remainingMs: EXPLOSION_DURATION_MS });

  if (state.phase === 'PLAYING') {
    state.shakeTime = 0.22;
    state.shakeIntensity = 5;
    sfx.playExplosion();
  }
}

function spawnBrickParticles(col, row) {
  const theme = MAP_THEMES[state.selectedMap];
  const cx = col * TILE_SIZE + TILE_SIZE / 2;
  const cy = row * TILE_SIZE + TILE_SIZE / 2;
  const colors = [theme.brickBase, theme.brickLight, theme.brickMortar];
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 95;
    state.particles.push({
      x: cx + (Math.random() - 0.5) * 14,
      y: cy + (Math.random() - 0.5) * 14,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      color: colors[i % colors.length],
      size: 3 + Math.floor(Math.random() * 4),
      life: 0.45 + Math.random() * 0.25,
      maxLife: 0.7
    });
  }
}

function spawnPopupText(x, y, text, color) {
  state.popups.push({ x, y: y - 10, text, color, life: 0.95, maxLife: 0.95 });
}

function checkPowerupPickup(fighter) {
  const col = Math.floor(fighter.x / TILE_SIZE);
  const row = Math.floor(fighter.y / TILE_SIZE);
  const idx = state.visiblePowerups.findIndex((p) => p.col === col && p.row === row);
  if (idx === -1) return;

  const pu = state.visiblePowerups.splice(idx, 1)[0];
  if (pu.type === POWERUP.BOMB) {
    fighter.maxBombs = Math.min(MAX_BOMBS_CAP, fighter.maxBombs + 1);
    spawnPopupText(fighter.x, fighter.y, '+1 BOMB', '#38bdf8');
  } else if (pu.type === POWERUP.FIRE) {
    fighter.fireRange = Math.min(MAX_FIRE_CAP, fighter.fireRange + 1);
    spawnPopupText(fighter.x, fighter.y, '+1 FIRE', '#fb923c');
  } else if (pu.type === POWERUP.SPEED) {
    fighter.speedLevel = Math.min(MAX_SPEED_LEVEL, fighter.speedLevel + 1);
    spawnPopupText(fighter.x, fighter.y, '+1 SPEED', '#4ade80');
  }

  if (state.phase === 'PLAYING') {
    if (!fighter.isBot) sfx.playPowerup();
    updateHudUI();
  }
}

function eliminateFighter(fighter) {
  if (!fighter.alive) return;
  fighter.alive = false;
  fighter.moving = false;
  if (state.phase === 'PLAYING') {
    sfx.playHit();
    if (!fighter.isBot) triggerHaptic([40, 30, 60]);
  }

  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 100;
    state.particles.push({
      x: fighter.x,
      y: fighter.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: fighter.color,
      size: 4,
      life: 0.6,
      maxLife: 0.6
    });
  }

  if (state.phase === 'PLAYING') {
    updateHudUI();
    checkRoundEnd();
  }
}

function checkRoundEnd() {
  if (state.phase !== 'PLAYING') return;
  const human = state.fighters[0];
  const aliveBots = state.fighters.slice(1).filter((b) => b.alive);
  if (!human.alive) finishMatch(false);
  else if (aliveBots.length === 0) finishMatch(true);
}

function finishMatch(playerWon) {
  state.phase = 'GAMEOVER';
  suddenDeathBanner.classList.add('hidden');

  const diffStats = state.stats[state.difficulty];
  let isNewBest = false;

  if (playerWon) {
    diffStats.wins += 1;
    diffStats.streak += 1;
    const clearSec = Math.round(state.elapsedTime);
    if (diffStats.bestTime === null || clearSec < diffStats.bestTime) {
      diffStats.bestTime = clearSec;
      isNewBest = true;
    }
    resultSubtitle.textContent = `${DIFFICULTIES[state.difficulty].label} • ${state.selectedMap.toUpperCase()}`;
    winnerTitle.textContent = 'VICTORY!';
    winnerTitle.style.color = '#22d3ee';
    resultDesc.textContent = `Cleared in ${formatTimeSec(clearSec)}!`;
    sfx.playVictory();
  } else {
    diffStats.streak = 0;
    resultSubtitle.textContent = `${DIFFICULTIES[state.difficulty].label} • ${state.selectedMap.toUpperCase()}`;
    winnerTitle.textContent = 'DEFEAT!';
    winnerTitle.style.color = '#f43f5e';
    resultDesc.textContent = 'You were eliminated from the arena.';
    sfx.playDefeat();
  }

  saveStats(state.stats);
  updateStatsPanel();

  newRecordBadge.classList.toggle('hidden', !isNewBest);
  gameOverOverlay.classList.remove('hidden');
}

/* ==========================================================================
   MOVEMENT & CORNER-SLIDING FORGIVENESS
   ========================================================================== */
function doesFighterOverlapTile(fighter, col, row) {
  const left = col * TILE_SIZE;
  const right = left + TILE_SIZE;
  const top = row * TILE_SIZE;
  const bottom = top + TILE_SIZE;
  return (
    fighter.x + HITBOX_HALF > left &&
    fighter.x - HITBOX_HALF < right &&
    fighter.y + HITBOX_HALF > top &&
    fighter.y - HITBOX_HALF < bottom
  );
}

function isTileSolidForFighter(fighter, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  const tile = state.grid[row][col];
  if (tile === TILE.WALL || tile === TILE.BRICK) return true;
  if (tile === TILE.BOMB) {
    const bomb = state.bombs.find((b) => b.col === col && b.row === row);
    if (bomb && bomb.passableFor.has(fighter.id)) return false;
    return true;
  }
  return false;
}

function canOccupy(fighter, nx, ny) {
  const leftCol = Math.floor((nx - HITBOX_HALF) / TILE_SIZE);
  const rightCol = Math.floor((nx + HITBOX_HALF - 0.01) / TILE_SIZE);
  const topRow = Math.floor((ny - HITBOX_HALF) / TILE_SIZE);
  const bottomRow = Math.floor((ny + HITBOX_HALF - 0.01) / TILE_SIZE);
  for (let r = topRow; r <= bottomRow; r++) {
    for (let c = leftCol; c <= rightCol; c++) {
      if (isTileSolidForFighter(fighter, c, r)) return false;
    }
  }
  return true;
}

function moveFighter(fighter, dx, dy, dt) {
  const mult = fighter.isBot ? DIFFICULTIES[state.difficulty].speedMult : 1.0;
  const speed = (BASE_SPEED + (fighter.speedLevel - 1) * SPEED_STEP) * mult;
  const step = speed * dt;

  state.bombs.forEach((b) => {
    if (b.passableFor.has(fighter.id) && !doesFighterOverlapTile(fighter, b.col, b.row)) {
      b.passableFor.delete(fighter.id);
    }
  });

  let moved = false;

  if (dx !== 0) {
    const nx = fighter.x + dx * step;
    if (canOccupy(fighter, nx, fighter.y)) {
      fighter.x = nx;
      moved = true;
    } else {
      const targetRow = Math.round((fighter.y - TILE_SIZE / 2) / TILE_SIZE);
      const centerY = targetRow * TILE_SIZE + TILE_SIZE / 2;
      const diffY = centerY - fighter.y;
      if (Math.abs(diffY) > 0.5 && Math.abs(diffY) <= 13) {
        const nudge = Math.sign(diffY) * Math.min(Math.abs(diffY), step * 0.9);
        if (canOccupy(fighter, fighter.x, fighter.y + nudge)) {
          fighter.y += nudge;
          moved = true;
        }
      }
    }
  }

  if (dy !== 0) {
    const ny = fighter.y + dy * step;
    if (canOccupy(fighter, fighter.x, ny)) {
      fighter.y = ny;
      moved = true;
    } else {
      const targetCol = Math.round((fighter.x - TILE_SIZE / 2) / TILE_SIZE);
      const centerX = targetCol * TILE_SIZE + TILE_SIZE / 2;
      const diffX = centerX - fighter.x;
      if (Math.abs(diffX) > 0.5 && Math.abs(diffX) <= 13) {
        const nudge = Math.sign(diffX) * Math.min(Math.abs(diffX), step * 0.9);
        if (canOccupy(fighter, fighter.x + nudge, fighter.y)) {
          fighter.x += nudge;
          moved = true;
        }
      }
    }
  }

  if (dx < 0) fighter.dir = 'left';
  else if (dx > 0) fighter.dir = 'right';
  else if (dy < 0) fighter.dir = 'up';
  else if (dy > 0) fighter.dir = 'down';

  fighter.moving = moved && (dx !== 0 || dy !== 0);
  if (fighter.moving) {
    fighter.animTimer += dt * 10;
    if (!fighter.isBot && state.phase === 'PLAYING') sfx.playStep();
  }
}

/* ==========================================================================
   AI ENGINE: DANGER MAP + BFS / A* PATHFINDING
   ========================================================================== */
const CARDINALS = [
  { dc: 0, dr: -1, dx: 0, dy: -1 },
  { dc: 0, dr: 1, dx: 0, dy: 1 },
  { dc: -1, dr: 0, dx: -1, dy: 0 },
  { dc: 1, dr: 0, dx: 1, dy: 0 }
];

function computeDangerMap(includeChain = true) {
  const danger = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
  state.explosions.forEach((exp) => {
    exp.cells.forEach(({ col, row }) => {
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) danger[row][col] = 0;
    });
  });

  const bombTimes = new Map();
  state.bombs.forEach((b) => bombTimes.set(b.id, b.fuseRemainingMs));

  if (includeChain && state.bombs.length > 1) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const bA of state.bombs) {
        const tA = bombTimes.get(bA.id);
        for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          for (let s = 1; s <= bA.range; s++) {
            const nc = bA.col + dc * s;
            const nr = bA.row + dr * s;
            if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
            const t = state.grid[nr][nc];
            if (t === TILE.WALL || t === TILE.BRICK) break;
            if (t === TILE.BOMB) {
              const bB = state.bombs.find((b) => b.col === nc && b.row === nr);
              if (bB && bombTimes.get(bB.id) > tA) {
                bombTimes.set(bB.id, tA);
                changed = true;
              }
              break;
            }
          }
        }
      }
    }
  }

  state.bombs.forEach((b) => {
    const t = bombTimes.get(b.id);
    danger[b.row][b.col] = Math.min(danger[b.row][b.col], t);
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      for (let s = 1; s <= b.range; s++) {
        const nc = b.col + dc * s;
        const nr = b.row + dr * s;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
        const tile = state.grid[nr][nc];
        if (tile === TILE.WALL) break;
        danger[nr][nc] = Math.min(danger[nr][nc], t);
        if (tile === TILE.BRICK) break;
      }
    }
  });

  return danger;
}

function getHypotheticalBlastSet(col, row, range) {
  const set = new Set([`${col},${row}`]);
  for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    for (let s = 1; s <= range; s++) {
      const nc = col + dc * s;
      const nr = row + dr * s;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
      const t = state.grid[nr][nc];
      if (t === TILE.WALL) break;
      set.add(`${nc},${nr}`);
      if (t === TILE.BRICK) break;
    }
  }
  return set;
}

function bfsFindTarget(startCol, startRow, danger, isGoalFn, minSafeMs = 0, extraBlocked = null) {
  const queue = [{ c: startCol, r: startRow, firstDir: null, dist: 0 }];
  const seen = new Set([`${startCol},${startRow}`]);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.dist > 0 && isGoalFn(cur.c, cur.r)) return cur;
    for (const dir of CARDINALS) {
      const nc = cur.c + dir.dc;
      const nr = cur.r + dir.dr;
      const key = `${nc},${nr}`;
      if (seen.has(key)) continue;
      if (nc <= 0 || nc >= COLS - 1 || nr <= 0 || nr >= ROWS - 1) continue;
      if (state.grid[nr][nc] !== TILE.FLOOR) continue;
      if (extraBlocked && extraBlocked.has(key)) continue;
      if (danger[nr][nc] <= minSafeMs) continue;
      seen.add(key);
      queue.push({ c: nc, r: nr, firstDir: cur.firstDir || dir, dist: cur.dist + 1 });
    }
  }
  return null;
}

function aStarToTarget(startCol, startRow, targetCol, targetRow, danger) {
  const h = (c, r) => Math.abs(c - targetCol) + Math.abs(r - targetRow);
  const open = [{ c: startCol, r: startRow, g: 0, f: h(startCol, startRow), firstDir: null }];
  const bestG = new Map([[`${startCol},${startRow}`, 0]]);
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (cur.c === targetCol && cur.r === targetRow) return cur.firstDir;
    if (cur.g > 24) continue;
    for (const dir of CARDINALS) {
      const nc = cur.c + dir.dc;
      const nr = cur.r + dir.dr;
      if (nc <= 0 || nc >= COLS - 1 || nr <= 0 || nr >= ROWS - 1) continue;
      if (state.grid[nr][nc] !== TILE.FLOOR) continue;
      if (danger[nr][nc] < 550) continue;
      const ng = cur.g + 1;
      const key = `${nc},${nr}`;
      if (!bestG.has(key) || ng < bestG.get(key)) {
        bestG.set(key, ng);
        open.push({ c: nc, r: nr, g: ng, f: ng + h(nc, nr), firstDir: cur.firstDir || dir });
      }
    }
  }
  return null;
}

function hasSafeEscapeIfBombPlaced(col, row, range, danger) {
  const blastSet = getHypotheticalBlastSet(col, row, range);
  return bfsFindTarget(
    col, row, danger,
    (c, r) => danger[r][c] === Infinity && !blastSet.has(`${c},${r}`),
    450,
    new Set([`${col},${row}`])
  ) !== null;
}

function decideBotAction(bot) {
  const diff = state.phase === 'HOME' ? 'medium' : state.difficulty;
  const cfg = DIFFICULTIES[diff];
  const col = Math.floor(bot.x / TILE_SIZE);
  const row = Math.floor(bot.y / TILE_SIZE);
  const useChain = diff !== 'beginner' || Math.random() > cfg.mistakeRate;
  const danger = computeDangerMap(useChain);

  if (danger[row][col] < Infinity) {
    const safe = bfsFindTarget(col, row, danger, (c, r) => danger[r][c] === Infinity, diff === 'pro' ? 350 : 500);
    if (safe) { bot.aiTargetDir = safe.firstDir; return; }
    let bestDir = null, bestTime = danger[row][col];
    for (const dir of CARDINALS) {
      const nc = col + dir.dc, nr = row + dir.dr;
      if (state.grid[nr]?.[nc] === TILE.FLOOR && danger[nr][nc] > bestTime) {
        bestTime = danger[nr][nc];
        bestDir = dir;
      }
    }
    bot.aiTargetDir = bestDir;
    return;
  }

  if (state.visiblePowerups.length > 0) {
    let targetPu = null;
    if (diff === 'pro') {
      const prio = state.visiblePowerups.filter((p) => p.type === POWERUP.FIRE || p.type === POWERUP.SPEED);
      const pool = prio.length > 0 ? prio : state.visiblePowerups;
      targetPu = bfsFindTarget(col, row, danger, (c, r) => pool.some((p) => p.col === c && p.row === r), 500);
    } else if (diff === 'medium') {
      const res = bfsFindTarget(col, row, danger, (c, r) => state.visiblePowerups.some((p) => p.col === c && p.row === r), 500);
      if (res && res.dist <= 10) targetPu = res;
    } else {
      const adj = CARDINALS.find((d) => state.visiblePowerups.some((p) => p.col === col + d.dc && p.row === row + d.dr));
      if (adj) { bot.aiTargetDir = adj; return; }
    }
    if (targetPu) { bot.aiTargetDir = targetPu.firstDir; return; }
  }

  const nearBrick = CARDINALS.some((d) => state.grid[row + d.dr]?.[col + d.dc] === TILE.BRICK);
  const opponents = state.fighters.filter((f) => f.id !== bot.id && f.alive);
  const nearOpp = opponents.some((o) => {
    const oc = Math.floor(o.x / TILE_SIZE), or = Math.floor(o.y / TILE_SIZE);
    return (oc === col && Math.abs(or - row) <= bot.fireRange) || (or === row && Math.abs(oc - col) <= bot.fireRange);
  });

  if (bot.aiBombCooldown <= 0 && (nearBrick || nearOpp)) {
    const canEscape =
      (diff === 'beginner' && Math.random() < cfg.mistakeRate) ||
      hasSafeEscapeIfBombPlaced(col, row, bot.fireRange, danger);
    if (canEscape && attemptDropBomb(bot)) {
      bot.aiBombCooldown = diff === 'pro' ? 0.9 : 1.8;
      const postDanger = computeDangerMap(true);
      const esc = bfsFindTarget(col, row, postDanger, (c, r) => postDanger[r][c] === Infinity, 350);
      if (esc) bot.aiTargetDir = esc.firstDir;
      return;
    }
  }

  if (diff === 'pro' && opponents.length > 0) {
    opponents.sort((a, b) => Math.hypot(a.x - bot.x, a.y - bot.y) - Math.hypot(b.x - bot.x, b.y - bot.y));
    const tc = Math.floor(opponents[0].x / TILE_SIZE), tr = Math.floor(opponents[0].y / TILE_SIZE);
    const huntDir = aStarToTarget(col, row, tc, tr, danger);
    if (huntDir) { bot.aiTargetDir = huntDir; return; }
  }

  if (diff !== 'beginner') {
    const brickApproach = bfsFindTarget(
      col, row, danger,
      (c, r) => CARDINALS.some((d) => state.grid[r + d.dr]?.[c + d.dc] === TILE.BRICK),
      500
    );
    if (brickApproach) { bot.aiTargetDir = brickApproach.firstDir; return; }
  }

  const safeDirs = CARDINALS.filter((d) => {
    const nc = col + d.dc, nr = row + d.dr;
    return state.grid[nr]?.[nc] === TILE.FLOOR && danger[nr][nc] === Infinity;
  });
  if (safeDirs.length > 0) {
    const keep = bot.aiTargetDir && safeDirs.some((d) => d.dc === bot.aiTargetDir.dc && d.dr === bot.aiTargetDir.dr);
    if (!keep || Math.random() < 0.25) bot.aiTargetDir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
  } else {
    bot.aiTargetDir = null;
  }
}

function updateBot(bot, dt) {
  if (!bot.alive) return;
  const diff = state.phase === 'HOME' ? 'medium' : state.difficulty;
  const cfg = DIFFICULTIES[diff];
  bot.aiTimer -= dt;
  bot.aiBombCooldown = Math.max(0, bot.aiBombCooldown - dt);

  if (bot.aiTimer <= 0) {
    bot.aiTimer = cfg.decisionMs / 1000;
    decideBotAction(bot);
  }

  if (bot.aiTargetDir) {
    const col = Math.floor(bot.x / TILE_SIZE), row = Math.floor(bot.y / TILE_SIZE);
    const centerX = col * TILE_SIZE + TILE_SIZE / 2, centerY = row * TILE_SIZE + TILE_SIZE / 2;
    let dx = bot.aiTargetDir.dx, dy = bot.aiTargetDir.dy;
    if (dx !== 0 && Math.abs(bot.y - centerY) > 2.5) dy = Math.sign(centerY - bot.y) * 0.65;
    if (dy !== 0 && Math.abs(bot.x - centerX) > 2.5) dx = Math.sign(centerX - bot.x) * 0.65;
    moveFighter(bot, dx, dy, dt);
  } else {
    bot.moving = false;
  }
}

/* ==========================================================================
   MAIN UPDATE LOOP
   ========================================================================== */
function update(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 180 * dt; pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.popups.length - 1; i >= 0; i--) {
    const pp = state.popups[i];
    pp.y -= 24 * dt; pp.life -= dt;
    if (pp.life <= 0) state.popups.splice(i, 1);
  }

  if (state.shakeTime > 0) state.shakeTime = Math.max(0, state.shakeTime - dt);
  if (state.phase !== 'PLAYING' && state.phase !== 'HOME') return;

  if (state.phase === 'PLAYING') {
    state.elapsedTime += dt;
    state.timeRemaining = Math.max(0, state.timeRemaining - dt);
    updateTimerUI();

    if (!state.suddenDeathActive && state.timeRemaining <= SUDDEN_DEATH_SEC) {
      state.suddenDeathActive = true;
      suddenDeathBanner.classList.remove('hidden');
      timerPill.classList.add('sudden-death');
      sfx.playSuddenDeath();
    }

    if (state.suddenDeathActive && state.spiralIndex < state.spiralCoords.length) {
      state.spiralTimer += dt;
      if (state.spiralTimer >= SUDDEN_DEATH_INTERVAL) {
        state.spiralTimer = 0;
        const { col, row } = state.spiralCoords[state.spiralIndex++];
        if (state.grid[row][col] !== TILE.WALL) {
          state.grid[row][col] = TILE.WALL;
          state.bombs = state.bombs.filter((b) => !(b.col === col && b.row === row));
          state.visiblePowerups = state.visiblePowerups.filter((p) => !(p.col === col && p.row === row));
          sfx.playBlockCrush();
          state.fighters.forEach((f) => {
            if (f.alive && Math.floor(f.x / TILE_SIZE) === col && Math.floor(f.y / TILE_SIZE) === row) {
              eliminateFighter(f);
            }
          });
        }
      }
    }

    const human = state.fighters[0];
    if (human && human.alive) {
      const dirs = getCombinedDirection();
      let dx = 0, dy = 0;
      if (dirs.left) dx -= 1;
      if (dirs.right) dx += 1;
      if (dirs.up) dy -= 1;
      if (dirs.down) dy += 1;
      if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
      if (dx !== 0 || dy !== 0) moveFighter(human, dx, dy, dt);
      else human.moving = false;
      checkPowerupPickup(human);
    }
  }

  state.fighters.forEach((f) => {
    if (f.isBot && f.alive) {
      updateBot(f, dt);
      checkPowerupPickup(f);
    }
  });

  const dtMs = dt * 1000;
  for (const bomb of [...state.bombs]) {
    bomb.fuseRemainingMs -= dtMs;
    if (bomb.fuseRemainingMs <= 0) detonateBomb(bomb);
  }

  state.explosions.forEach((exp) => (exp.remainingMs -= dtMs));
  state.explosions = state.explosions.filter((exp) => exp.remainingMs > 0);

  if (state.explosions.length > 0) {
    const flameSet = new Set();
    state.explosions.forEach((exp) => exp.cells.forEach((c) => flameSet.add(`${c.col},${c.row}`)));
    state.fighters.forEach((f) => {
      if (!f.alive) return;
      const c = Math.floor(f.x / TILE_SIZE), r = Math.floor(f.y / TILE_SIZE);
      if (flameSet.has(`${c},${r}`)) eliminateFighter(f);
    });
  }

  if (state.phase === 'HOME') {
    const aliveCount = state.fighters.filter((f) => f.alive).length;
    if (aliveCount <= 1) {
      state.attractResetTimer += dt;
      if (state.attractResetTimer > 1.5) startAttractMode();
    }
  }
}

/* ==========================================================================
   CANVAS RENDERER
   ========================================================================== */
function render(now) {
  const theme = MAP_THEMES[state.selectedMap];
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (state.shakeTime > 0) {
    ctx.translate(
      Math.round((Math.random() - 0.5) * 2 * state.shakeIntensity),
      Math.round((Math.random() - 0.5) * 2 * state.shakeIntensity)
    );
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE_SIZE, y = r * TILE_SIZE;
      ctx.fillStyle = (r + c) % 2 === 0 ? theme.floorA : theme.floorB;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      if (state.selectedMap === 'cyber' && (r + c) % 2 === 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(x + 15, y, 2, TILE_SIZE);
        ctx.fillRect(x, y + 15, TILE_SIZE, 2);
      } else if (state.selectedMap === 'lava' && (r * 7 + c * 13) % 11 === 0) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.16)';
        ctx.fillRect(x + 8, y + 14, 14, 2);
      }

      const tile = state.grid[r]?.[c] ?? TILE.FLOOR;
      if (tile === TILE.WALL) drawThemedWall(x, y, theme);
      else if (tile === TILE.BRICK) drawThemedBrick(x, y, theme);
    }
  }

  if (state.phase === 'PLAYING' && state.suddenDeathActive && state.spiralIndex < state.spiralCoords.length) {
    const nextTile = state.spiralCoords[state.spiralIndex];
    if (Math.floor(now / 120) % 2 === 0) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.38)';
      ctx.fillRect(nextTile.col * TILE_SIZE, nextTile.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  state.visiblePowerups.forEach((pu) => drawPowerup(pu, now));
  state.bombs.forEach((b) => drawBomb(b, now));
  state.explosions.forEach((exp) => drawExplosion(exp));

  state.fighters.filter((f) => f.alive).sort((a, b) => a.y - b.y).forEach((f) => drawFighter(f));

  state.particles.forEach((pt) => {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  });
  ctx.globalAlpha = 1;

  state.popups.forEach((pp) => {
    ctx.globalAlpha = Math.max(0, pp.life / pp.maxLife);
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(pp.text, Math.round(pp.x) + 1, Math.round(pp.y) + 1);
    ctx.fillStyle = pp.color;
    ctx.fillText(pp.text, Math.round(pp.x), Math.round(pp.y));
  });
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawThemedWall(x, y, theme) {
  ctx.fillStyle = theme.wallBase;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = theme.wallLight;
  ctx.fillRect(x, y, TILE_SIZE, 3);
  ctx.fillRect(x, y, 3, TILE_SIZE);
  ctx.fillStyle = theme.wallDark;
  ctx.fillRect(x, y + TILE_SIZE - 3, TILE_SIZE, 3);
  ctx.fillRect(x + TILE_SIZE - 3, y, 3, TILE_SIZE);
  ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
}

function drawThemedBrick(x, y, theme) {
  ctx.fillStyle = theme.brickBase;
  ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  ctx.fillStyle = theme.brickMortar;
  ctx.fillRect(x + 1, y + 10, TILE_SIZE - 2, 2);
  ctx.fillRect(x + 1, y + 21, TILE_SIZE - 2, 2);
  ctx.fillRect(x + 15, y + 1, 2, 10);
  ctx.fillRect(x + 8, y + 12, 2, 9);
  ctx.fillRect(x + 23, y + 12, 2, 9);
  ctx.fillRect(x + 15, y + 23, 2, 8);
  ctx.fillStyle = theme.brickLight;
  ctx.fillRect(x + 2, y + 2, 12, 2);
  ctx.fillRect(x + 18, y + 2, 11, 2);
  ctx.fillRect(x + 11, y + 13, 11, 2);
}

function drawPowerup(pu, now) {
  const bob = Math.round(Math.sin(now * 0.006 + pu.col) * 2);
  const x = pu.col * TILE_SIZE + 4, y = pu.row * TILE_SIZE + 4 + bob, size = TILE_SIZE - 8;
  let bg = '#0284c7', border = '#38bdf8', label = '+B';
  if (pu.type === POWERUP.FIRE) { bg = '#dc2626'; border = '#fb923c'; label = '+F'; }
  else if (pu.type === POWERUP.SPEED) { bg = '#16a34a'; border = '#4ade80'; label = '+S'; }
  ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
  ctx.fillStyle = border; ctx.fillRect(x, y, size, size);
  ctx.fillStyle = bg; ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + size / 2, y + size / 2 + 1);
}

function drawBomb(bomb, now) {
  const cx = bomb.col * TILE_SIZE + TILE_SIZE / 2, cy = bomb.row * TILE_SIZE + TILE_SIZE / 2;
  const elapsed = BOMB_FUSE_MS - bomb.fuseRemainingMs;
  const radius = Math.round(10 * (1 + Math.sin(elapsed * 0.015) * 0.12));
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(cx - 10, cy + 8, 20, 4);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - radius, cy - radius + 2, radius * 2, radius * 2 - 4);
  ctx.fillRect(cx - radius + 2, cy - radius, radius * 2 - 4, radius * 2);
  ctx.fillStyle = '#64748b'; ctx.fillRect(cx - 5, cy - 5, 4, 4);
  ctx.fillStyle = '#94a3b8'; ctx.fillRect(cx - 3, cy - radius - 2, 6, 3);
  ctx.fillStyle = Math.floor(now / 80) % 2 === 0 ? '#facc15' : '#f97316';
  ctx.fillRect(cx + 1, cy - radius - 5, 4, 4);
  ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - radius - 4, 2, 2);
}

function drawExplosion(exp) {
  const progress = Math.min(1, 1 - exp.remainingMs / EXPLOSION_DURATION_MS);
  const shrink = progress > 0.6 ? Math.floor((progress - 0.6) * 20) : 0;
  exp.cells.forEach(({ col, row }) => {
    const x = col * TILE_SIZE + shrink, y = row * TILE_SIZE + shrink, size = Math.max(4, TILE_SIZE - shrink * 2);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(x, y, size, size);
    if (size > 8) { ctx.fillStyle = '#f97316'; ctx.fillRect(x + 3, y + 3, size - 6, size - 6); }
    if (size > 14) { ctx.fillStyle = progress < 0.35 ? '#fef08a' : '#facc15'; ctx.fillRect(x + 6, y + 6, size - 12, size - 12); }
  });
}

function drawFighter(f) {
  const cx = Math.round(f.x), cy = Math.round(f.y);
  const stride = f.moving ? Math.round(Math.sin(f.animTimer) * 2) : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(cx - 8, cy + 9, 16, 4);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(cx - 7, cy + 6 + stride, 5, 5); ctx.fillRect(cx + 2, cy + 6 - stride, 5, 5);
  ctx.fillStyle = f.dark; ctx.fillRect(cx - 8, cy - 2, 16, 10);
  ctx.fillStyle = f.color; ctx.fillRect(cx - 6, cy - 1, 12, 7);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(cx - 9, cy - 13, 18, 12);
  ctx.fillStyle = f.color; ctx.fillRect(cx - 8, cy - 12, 16, 10);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(cx - 6, cy - 8, 12, 5);
  ctx.fillStyle = '#ffffff';
  let eyeX = f.dir === 'left' ? -2 : f.dir === 'right' ? 2 : 0;
  let eyeY = f.dir === 'up' ? -1 : 0;
  if (f.dir !== 'up') {
    ctx.fillRect(cx - 4 + eyeX, cy - 7 + eyeY, 2, 3);
    ctx.fillRect(cx + 2 + eyeX, cy - 7 + eyeY, 2, 3);
  }
}

/* ==========================================================================
   UI UPDATES & EVENT LISTENERS
   ========================================================================== */
function updateDifficultyUI() {
  const cfg = DIFFICULTIES[state.difficulty];
  hudDiffBadge.textContent = cfg.label;
  hudDiffBadge.className = `diff-badge diff-${state.difficulty}`;
  if (state.phase === 'HOME') hudDiffBadge.classList.add('hidden');
  diffBehaviorDesc.textContent = cfg.desc;
}

function updateStatsPanel() {
  const s = state.stats[state.difficulty];
  statsDiffLabel.textContent = DIFFICULTIES[state.difficulty].label;
  statWins.textContent = s.wins;
  statStreak.textContent = s.streak;
  statBestTime.textContent = s.bestTime !== null ? formatTimeSec(s.bestTime) : '--:--';
}

function updateTimerUI() {
  timerDisplay.textContent = formatTimeSec(state.timeRemaining);
}

function updateHudUI() {
  const p1 = state.fighters[0];
  if (p1) {
    cStatBombs.textContent = p1.maxBombs;
    cStatFire.textContent = p1.fireRange;
    cStatSpeed.textContent = p1.speedLevel;
  }
  cStatAlive.textContent = state.fighters.filter((f) => f.alive).length;

  playerHud.innerHTML = '';
  state.fighters.forEach((f) => {
    const card = document.createElement('div');
    card.className = 'hud-card';
    if (!f.isBot) card.classList.add('is-you');
    if (!f.alive) card.classList.add('dead');
    card.innerHTML = `
      <div class="hud-top">
        <span class="hud-name">
          <span class="color-swatch" style="background:${f.color}"></span>
          ${f.name}
        </span>
        <span>${f.alive ? '❤️' : '💀'}</span>
      </div>
      <div class="hud-stats">
        <span>💣${f.maxBombs}</span>
        <span>🔥${f.fireRange}</span>
        <span>⚡${f.speedLevel}</span>
      </div>
    `;
    playerHud.appendChild(card);
  });
}

mapGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.map-card');
  if (!card) return;
  sfx.playClick();
  state.selectedMap = card.dataset.map;
  document.querySelectorAll('.map-card').forEach((el) => el.classList.toggle('active', el === card));
  if (state.phase === 'HOME') startAttractMode();
});

difficultyRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.diff-btn');
  if (!btn) return;
  sfx.playClick();
  state.difficulty = btn.dataset.diff;
  document.querySelectorAll('.diff-btn').forEach((el) => el.classList.toggle('active', el === btn));
  updateDifficultyUI();
  updateStatsPanel();
});

resetStatsBtn.addEventListener('click', () => {
  sfx.playClick();
  state.stats[state.difficulty] = { wins: 0, streak: 0, bestTime: null };
  saveStats(state.stats);
  updateStatsPanel();
});

startBattleBtn.addEventListener('click', startBattle);
playAgainBtn.addEventListener('click', startBattle);
restartFromPauseBtn.addEventListener('click', startBattle);
resumeBtn.addEventListener('click', togglePause);
pauseBtn.addEventListener('click', togglePause);
pauseHomeBtn.addEventListener('click', () => { sfx.playClick(); startAttractMode(); });
gameOverHomeBtn.addEventListener('click', () => { sfx.playClick(); startAttractMode(); });

bgmBtn.addEventListener('click', () => sfx.toggleBgm());
muteBtn.addEventListener('click', () => sfx.toggleMute());

/* ==========================================================================
   BOOTSTRAP
   ========================================================================== */
applyTouchMode();
renderMapPreviews();
updateDifficultyUI();
updateStatsPanel();
startAttractMode();

let lastFrame = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  render(now);
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
