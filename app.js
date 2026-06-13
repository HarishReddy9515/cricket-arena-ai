// ─── DOM refs ────────────────────────────────────────────────────────────────
const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const ballsEl = document.querySelector('#balls');
const equationEl = document.querySelector('#equation');
const statusEl = document.querySelector('#status');
const ballTypeEl = document.querySelector('#ballType');
const timingNeedle = document.querySelector('#timingNeedle');
const insights = document.querySelector('#insights');
const shotMap = document.querySelector('#shotMap');
const connectionStatus = document.querySelector('#connectionStatus');
const roomCode = document.querySelector('#roomCode');
const connectBtn = document.querySelector('#connectBtn');
const readyBtn = document.querySelector('#readyBtn');
const squadList = document.querySelector('#squadList');
const pingStatus = document.querySelector('#pingStatus');
const pingBtn = document.querySelector('#pingBtn');
const scorecardGrid = document.querySelector('#scorecardGrid');
const replayTimeline = document.querySelector('#replayTimeline');
const exportSummaryBtn = document.querySelector('#exportSummaryBtn');
const targetEl = document.querySelector('#target');

// ─── Match modes ─────────────────────────────────────────────────────────────
const MODES = {
  quick: { name: 'Quick Match', overs: 1,  wickets: 2  },
  t20:   { name: 'T20',         overs: 20, wickets: 10 },
  odi:   { name: 'ODI',         overs: 50, wickets: 10 }
};

// ─── Commentary pool (60+ lines mapped by event type) ────────────────────────
const COMMENTARY = {
  six: [
    'MAXIMUM! Ball sails deep into the crowd!',
    'SIX! That is a monster hit — what power!',
    'HUGE! Cleared the ropes with room to spare!',
    'Lofted beautifully over long-on for SIX!',
    'The crowd goes absolutely wild! Six runs!',
    'Down the ground, back of the stands!',
    'He has sent that ball to another postcode!',
    'Pure muscle — the fielder does not even move!',
    'Over mid-wicket! What a clean strike!',
    'Back-foot punch over extra-cover — six!',
  ],
  four: [
    'FOUR! Racing to the fence!',
    'Cracking drive through the covers! FOUR!',
    'That bisects the field perfectly — boundary!',
    'On the up, beautiful timing — four more!',
    'Pulled off the back foot! Four!',
    'Cut square, it reaches the rope!',
    'Elegant flick through mid-wicket — four!',
    'Placed wide of mid-on — boundary!',
    'Through the gap — races to the fence!',
    'Crisp off-drive rolls to the boundary!',
  ],
  wicket: [
    'BOWLED HIM! Off stump is cartwheeling!',
    'CAUGHT BEHIND! That is a big wicket!',
    'OUT! The fielder takes a blinder at slip!',
    'LBW! Plumb in front — given!',
    'TOP EDGE — flies straight to the keeper!',
    'Gone! Shoulders arms, clips the top of off stump!',
    'What a delivery — utterly unplayable!',
    'Big wicket! The bowler is absolutely pumped!',
    'GONE! Beaten by the late movement!',
    'OUT! An incredible catch in the covers!',
  ],
  dot: [
    'Dot ball. Good line and length.',
    'Beaten outside off stump — plays and misses!',
    'Defended solidly back down the pitch.',
    'Tight bowling — nothing to score there.',
    'Excellent seam movement. Dot!',
    'Bowler wins this one.',
    'Forward defensive — no run.',
    'Left alone outside off. Keeper takes it.',
    'Probing spell continues. Dot.',
    'Lucky escape — thick outside edge, safe!',
  ],
  single: [
    'Quick single taken.',
    'Pushed to mid-on for one.',
    'Good running between the wickets!',
    'Rotated the strike there.',
    'Worked off the pads for a single.',
    'Nudged into the gap — one run.',
  ],
  two: [
    'Good running — two more added!',
    'Penetrates the off side for two.',
    'They have turned for the second — two!',
    'Excellent cricket. Two runs there.',
    'Driven through the gap — two runs!',
  ],
  three: [
    'They are running hard — three runs!',
    'Superb running between the wickets — three!',
    'Good placement — three more!',
  ],
  overEnd: [
    'End of the over. Field resets.',
    'That is the over! Game on.',
    'Good over to end — both sides satisfied?',
    'The field changes for the new over.',
    'Over complete. What a contest this is!',
  ],
};

// ─── Deliveries (6 types) ────────────────────────────────────────────────────
const DELIVERIES = [
  { name: 'Fast yorker',    speed: 8.8, swing: -0.3, difficulty: 0.86 },
  { name: 'Outswinger',     speed: 7.4, swing:  0.9, difficulty: 0.72 },
  { name: 'Leg cutter',     speed: 6.7, swing: -1.1, difficulty: 0.78 },
  { name: 'Slower bouncer', speed: 5.9, swing:  0.2, difficulty: 0.66 },
  { name: 'Full toss',      speed: 7.0, swing:  0.0, difficulty: 0.55 },
  { name: 'Googly',         speed: 6.2, swing:  1.3, difficulty: 0.82 }
];

// ─── Shot types ───────────────────────────────────────────────────────────────
const SHOT_CONFIG = {
  straight:     { angle: 270, risk: 0.00, label: 'Drive'         },
  left:         { angle: 225, risk: 0.00, label: 'Flick'         },
  right:        { angle: 315, risk: 0.00, label: 'Cut'           },
  pull:         { angle: 190, risk: 0.06, label: 'Pull'          },
  sweep:        { angle: 160, risk: 0.07, label: 'Sweep'         },
  lateCut:      { angle: 345, risk: 0.09, label: 'Late Cut'      },
  reverseSweep: { angle: 195, risk: 0.13, label: 'Reverse Sweep' },
};

// ─── State ───────────────────────────────────────────────────────────────────
let matchMode = 'quick';
let phase = 'lobby'; // lobby | toss | batting | bowling | break | result

// Batting (player bats, AI bowls)
let score = 0, wickets = 0, balls = 0, target = 18;
let running = false, deliveryActive = false;
let timing = 0, timingDirection = 1;
let shotIntent = 'straight';
let ball = resetBall();
let batterSwing = 0;
let shots = [], matchTimeline = [];
let message = 'Press Chase Target or Bowl Now';

// Bowling (player bowls, AI bats)
let aiScore = 0, aiWickets = 0, aiBalls = 0;
let bowlDeliveryChoice = 0, bowlAimX = 0;
let bowlActive = false, bowlTimingActive = false;
let aiSwing = 0, bowlingTimeline = [];

// ─── Full-match state (T20 / ODI) ────────────────────────────────────────────
let isFullMatch = false;        // true for T20/ODI
let inningsNum = 1;             // 1 or 2
let playerBatsFirst = true;     // who batted in innings 1
let innings1BatScore = 0;       // score set by whoever batted first
let aiChaseTarget = null;       // innings-2 bowling: what AI needs to reach

// ─── Fun gameplay state ───────────────────────────────────────────────────────
let fielders = [];              // 9 outfield positions with animation
let ballArc = null;             // parabolic ball arc after shot
let partnership = { runs: 0, balls: 0 };
let partnershipHistory = [];
let currentOverBalls = [];      // balls in this over (for summary)
let overSummaryData = null;     // over-end popup
let commentaryText = '';
let commentaryTimer = 0;        // seconds remaining to show

// ─── Drama & milestones ───────────────────────────────────────────────────────
let batter = { runs: 0, balls: 0, fours: 0, sixes: 0 };
let milestoneData = null;       // { text, color, timer }
let overRunHistory = [];        // [ { over, runs } ] for graph
let wicketCelebration = null;   // { timer } fielder mob + WICKET! flash

// ─── Super Over & Series ──────────────────────────────────────────────────────
let isSuperOver = false;
let superOverPhase = 'bat';     // 'bat' | 'bowl'
let superOverPlayerScore = 0;
let savedModeForSO = null;      // restore matchMode after super over

let series = null;              // { total, current, playerWins, aiWins }

// ─── AI brain state ───────────────────────────────────────────────────────────
// Adaptive difficulty (0.6 = easy, 1.0 = normal, 1.5 = hard)
let adaptiveDifficulty = 1.0;
let recentMatchResults  = [];   // bool[] last 6 results (true = player win)

// Player pattern memory (AI bowler learns from these)
let playerTimingHistory   = {}; // deliveryName → float[] average timing quality
let playerScoringZones    = { left: 0, right: 0, straight: 0 }; // runs by direction
let playerDeliveryResults = {}; // deliveryName → { faced, runs, wickets }

// Player bowler pattern memory (AI batter learns from these)
let playerBowlHistory  = {};    // deliveryName → count bowled
let aiMood = 'normal';          // 'normal' | 'aggressive' | 'defensive'

// Match context (for contextual commentary)
let consecutiveDots       = 0;
let consecutiveBoundaries = 0;

// AI Coach data (accumulated during batting phase)
let timingQualityLog  = [];     // quality per ball for analysis
let coachReport       = null;   // generated after match

// ─── Player profile ───────────────────────────────────────────────────────────
let teamName    = 'Harish XI';
let jerseyColor = '#0a66c2';
let playerPower  = 1.0;   // 0.7–1.3: increases boundary/run chance
let playerTiming = 1.0;   // 0.7–1.3: widens quality timing window
let playerTech   = 1.0;   // 0.7–1.3: reduces wicket probability

// Multiplayer
let socket;
const playerId = `player-${Math.random().toString(16).slice(2, 8)}`;
let roomPlayers = [], ready = false, onlineMode = false, awaitingServer = false;
let lastPingSent = 0;

// Career (localStorage)
let career = loadCareer();

// Audio
let audioCtx = null;

// ─── Career ──────────────────────────────────────────────────────────────────
function loadCareer() {
  try {
    const c = JSON.parse(localStorage.getItem('cricket-career') || 'null') ||
      { matches: 0, wins: 0, losses: 0, bestScore: 0, totalRuns: 0 };
    // Restore adaptive difficulty from saved career
    if (c.adaptiveDifficulty) adaptiveDifficulty = c.adaptiveDifficulty;
    if (c.recentResults)       recentMatchResults  = c.recentResults;
    return c;
  } catch {
    return { matches: 0, wins: 0, losses: 0, bestScore: 0, totalRuns: 0 };
  }
}

function saveCareer() {
  try { localStorage.setItem('cricket-career', JSON.stringify(career)); } catch {}
  renderCareer();
}

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem('cricket-profile') || 'null') || {};
    teamName    = p.teamName    || 'Harish XI';
    jerseyColor = p.jerseyColor || '#0a66c2';
    playerPower  = p.power  || 1.0;
    playerTiming = p.timing || 1.0;
    playerTech   = p.tech   || 1.0;
  } catch {}
  // Sync jersey color to 3D once Three.js is ready (slight delay for module init)
  setTimeout(() => window.__syncJerseyColor?.(jerseyColor), 1200);
}

function saveProfile() {
  try {
    localStorage.setItem('cricket-profile', JSON.stringify({
      teamName, jerseyColor, power: playerPower, timing: playerTiming, tech: playerTech,
    }));
  } catch {}
}

function renderCareer() {
  const el = document.querySelector('#careerStats');
  if (!el) return;
  const winRate = career.matches ? Math.round((career.wins / career.matches) * 100) : 0;
  el.innerHTML = `
    <div class="career-row"><span>Matches</span><strong>${career.matches}</strong></div>
    <div class="career-row"><span>Wins</span><strong>${career.wins}</strong></div>
    <div class="career-row"><span>Win rate</span><strong>${winRate}%</strong></div>
    <div class="career-row"><span>Best score</span><strong>${career.bestScore}</strong></div>
    <div class="career-row"><span>Total runs</span><strong>${career.totalRuns}</strong></div>
  `;
  renderMatchHistory();
}

// ─── Audio (Web Audio API — no files needed) ─────────────────────────────────
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
}

function tone(freq, type, dur, vol = 0.3, delay = 0) {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    g.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(audioCtx.currentTime + delay);
    o.stop(audioCtx.currentTime + delay + dur);
  } catch {}
}

function noise(dur, vol = 0.12) {
  if (!audioCtx) return;
  try {
    const n = Math.ceil(audioCtx.sampleRate * dur);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * vol * (1 - i / n);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
  } catch {}
}

const sndCrack      = () => { tone(260,'sawtooth',0.06,0.5); tone(180,'square',0.1,0.3,0.02); noise(0.15,0.2); };
const sndCrackHard  = () => { tone(320,'sawtooth',0.10,0.7); tone(220,'square',0.18,0.5,0.03); noise(0.25,0.38); };
const sndSix        = () => { [440,550,660,770].forEach((f,i) => tone(f,'sine',0.3,0.4,i*0.08)); noise(1.2,0.1); };
const sndBound      = () => { [350,450,500].forEach((f,i) => tone(f,'sine',0.25,0.3,i*0.06)); noise(0.8,0.09); };
const sndWkt        = () => { tone(120,'sawtooth',0.4,0.5); tone(80,'square',0.6,0.4,0.05); noise(0.5,0.08); };
const sndStumps     = () => { tone(90,'sawtooth',0.55,0.65); tone(145,'square',0.35,0.55,0.04); tone(60,'sine',0.8,0.4,0.08); noise(0.7,0.25); setTimeout(() => crowdRoar(1.8), 180); };
const sndChant      = () => { [196,220,247,262].forEach((f,i) => tone(f,'triangle',0.55,0.2,i*0.14)); setTimeout(() => crowdRoar(2.2), 110); };
const sndDot        = () => tone(200,'sine',0.08,0.15);
const sndSingle     = () => { tone(300,'sine',0.1,0.25); noise(0.1,0.1); };

function playOutcomeSound(out) {
  if (out.wicket) {
    out.outType === 'bowled' ? sndStumps() : sndWkt();
  } else if (out.runs >= 6) {
    sndCrackHard(); sndSix(); setTimeout(sndChant, 80);
  } else if (out.runs >= 4) {
    sndCrackHard(); sndBound();
  } else if (out.runs === 0) {
    sndDot();
  } else {
    sndCrack(); sndSingle();
  }
}

function crowdRoar(intensity = 1) {
  if (!audioCtx) return;
  try {
    const dur = intensity >= 1.5 ? 3.0 : intensity >= 1 ? 2.2 : 1.4;
    const vol = intensity * 0.18;
    const n   = Math.ceil(audioCtx.sampleRate * dur);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 650 + Math.random() * 300; flt.Q.value = 0.35;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(vol,       audioCtx.currentTime + 0.18);
    g.gain.linearRampToValueAtTime(vol * 0.6, audioCtx.currentTime + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    src.connect(flt); flt.connect(g); g.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + dur);
  } catch {}
}

// ─── Milestone popups ────────────────────────────────────────────────────────
function showMilestone(text, color = '#f5c842') {
  milestoneData = { text, color, timer: 2.8 };
}

function checkMilestones(prevScore, newScore) {
  for (const m of [200, 150, 100, 50]) {
    if (prevScore < m && newScore >= m) {
      const labels = { 200: '200! DOUBLE CENTURY!', 150: '150! MAGNIFICENT!', 100: '💯 CENTURY!', 50: '50! HALF CENTURY!' };
      showMilestone(labels[m], m >= 100 ? '#f5c842' : '#16c984');
      crowdRoar(m >= 100 ? 2 : 1.2);
      break;
    }
  }
}

// ─── Wicket celebration ───────────────────────────────────────────────────────
function triggerWicketCelebration() {
  wicketCelebration = { timer: 2.8 };
  window.__celebrateWicket3d?.();
  window.__arena4d?.wicket?.();
  crowdRoar(1.5);
  const cx = canvas.width / 2;
  fielders.forEach((f, i) => {
    setTimeout(() => {
      f.tx = cx + (Math.random() * 60 - 30);
      f.ty = 504 + (Math.random() * 32 - 16);
      f.running = true;
    }, i * 75);
  });
  setTimeout(() => {
    fielders.forEach(f => { f.tx = f.hx; f.ty = f.hy; });
    setTimeout(() => fielders.forEach(f => { f.running = false; }), 950);
    wicketCelebration = null;
  }, 2500);
}

// ─── Power play helper ────────────────────────────────────────────────────────
function isPowerPlay() {
  const pp = matchMode === 'odi' ? 10 : matchMode === 't20' ? 6 : 0;
  if (!pp || !running) return false;
  const ov = phase === 'batting' ? Math.floor(balls / 6) : Math.floor(aiBalls / 6);
  return ov < pp;
}

// ─── Ball ────────────────────────────────────────────────────────────────────
function resetBall() {
  return { x: canvas.width / 2, y: 92, vx: 0, vy: 0, radius: 8, visible: false, type: DELIVERIES[0] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function overStr(b)       { return `${Math.floor(b / 6)}.${b % 6}`; }
function getMaxBalls()    { return MODES[matchMode].overs * 6; }
function getMaxWickets()  { return MODES[matchMode].wickets; }

function generateTarget(overs) {
  if (overs === 1)  return 18;
  if (overs <= 5)   return 30 + Math.floor(Math.random() * 20);
  if (overs <= 20)  return 120 + Math.floor(Math.random() * 61);
  return 220 + Math.floor(Math.random() * 101);
}

function setPhaseUI(p) {
  const bowlCtrl = document.querySelector('#bowlControls');
  const shotBtn  = document.querySelector('#shotBtn');
  if (!bowlCtrl || !shotBtn) return;
  if (p === 'bowling') {
    shotBtn.textContent = 'Release';
    bowlCtrl.style.display = '';
    renderDeliveryBtns();
  } else {
    shotBtn.textContent = 'Play Shot';
    bowlCtrl.style.display = 'none';
  }
}

function renderDeliveryBtns() {
  const container = document.querySelector('#deliveryBtns');
  if (!container) return;
  container.innerHTML = '';
  DELIVERIES.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.className = `delivery-btn${i === bowlDeliveryChoice ? ' active' : ''}`;
    btn.textContent = `${i + 1}. ${d.name}`;
    btn.dataset.idx = i;
    container.appendChild(btn);
  });
}

function updateAimIndicator() {
  const el = document.querySelector('#aimIndicator');
  if (!el) return;
  el.style.left = `${50 + (bowlAimX / 80) * 44}%`;
  el.style.background = Math.abs(bowlAimX) < 25
    ? 'var(--green)'
    : Math.abs(bowlAimX) < 55 ? 'var(--gold)' : 'var(--red)';
}

// ─── Commentary ──────────────────────────────────────────────────────────────
function getCommentary(type) {
  const pool = COMMENTARY[type] || COMMENTARY.dot;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showCommentary(text) {
  commentaryText = text;
  commentaryTimer = 2.8;
}

// ─── Fielders ────────────────────────────────────────────────────────────────
function initFielders() {
  const cx = canvas.width / 2;
  const defs = [
    { name: 'Slip',    hx: cx + 78,  hy: 200 },
    { name: 'Gully',   hx: cx + 148, hy: 254 },
    { name: 'Point',   hx: cx + 215, hy: 336 },
    { name: 'Cover',   hx: cx + 194, hy: 428 },
    { name: 'Mid-off', hx: cx + 92,  hy: 475 },
    { name: 'Mid-on',  hx: cx - 92,  hy: 475 },
    { name: 'Sq.Leg',  hx: cx - 194, hy: 336 },
    { name: 'FineLeg', hx: cx - 108, hy: 204 },
    { name: '3rdMan',  hx: cx + 58,  hy: 168 },
  ];
  fielders = defs.map(d => ({ ...d, x: d.hx, y: d.hy, tx: d.hx, ty: d.hy, running: false }));
}

function updateFieldForPatterns() {
  if (!fielders.length) return;
  const { left, right, straight } = playerScoringZones;
  const total = left + right + straight;
  if (total < 8) return; // not enough data yet
  const cx = canvas.width / 2;
  // Identify dominant zone (where player scores most)
  const dominant = left >= right && left >= straight ? 'left'
                 : right >= straight ? 'right' : 'straight';
  // Rearrange 2 fielders to plug the gap:
  // leg-side heavy → move Point→SqLeg, Cover→FineLeg area
  // off-side heavy → move SqLeg→Cover, FineLeg→Point area
  // straight heavy → push Mid-off and Mid-on straighter/closer
  if (dominant === 'left') {
    // Reinforce leg side
    fielders.find(f => f.name === 'Point') && (fielders.find(f => f.name === 'Point').hx = cx - 160, fielders.find(f => f.name === 'Point').hy = 370);
    fielders.find(f => f.name === 'Cover') && (fielders.find(f => f.name === 'Cover').hx = cx - 220, hy => {});
  } else if (dominant === 'right') {
    // Reinforce off side — move Sq.Leg to off side cover region
    const sq = fielders.find(f => f.name === 'Sq.Leg');
    if (sq) { sq.hx = cx + 165; sq.hy = 390; }
    const fl = fielders.find(f => f.name === 'FineLeg');
    if (fl) { fl.hx = cx + 75;  fl.hy = 200; }
  } else {
    // Straight — push mid-off and mid-on closer in
    const mo = fielders.find(f => f.name === 'Mid-off');
    if (mo) { mo.hx = cx + 55; mo.hy = 440; }
    const mn = fielders.find(f => f.name === 'Mid-on');
    if (mn) { mn.hx = cx - 55; mn.hy = 440; }
  }
  // Smoothly animate to new home positions
  fielders.forEach(f => { f.tx = f.hx; f.ty = f.hy; });
}

function chaseFielder(outcome) {
  if (outcome.wicket || !fielders.length) return;
  const relAngle = (outcome.angle - 270) * Math.PI / 180;
  const dist = outcome.distance;
  const cx = canvas.width / 2;
  const landX = cx + Math.sin(relAngle) * dist * 2.1;
  const landY = 500 - Math.cos(relAngle) * dist * 3.2;
  let nearest = fielders[0], minD = Infinity;
  fielders.forEach(f => {
    const d = Math.hypot(f.hx - landX, f.hy - landY);
    if (d < minD) { minD = d; nearest = f; }
  });
  nearest.running = true;
  nearest.tx = Math.max(80, Math.min(canvas.width - 80, landX));
  nearest.ty = Math.max(128, Math.min(598, landY));
  const returnAfter = outcome.runs >= 4 ? 900 : 1500;
  setTimeout(() => {
    nearest.tx = nearest.hx; nearest.ty = nearest.hy;
    setTimeout(() => { nearest.running = false; }, 900);
  }, returnAfter);
}

// ─── Ball arc ────────────────────────────────────────────────────────────────
function startBallArc(outcome) {
  if (outcome.wicket) return; // no arc for wickets
  const relAngle = (outcome.angle - 270) * Math.PI / 180;
  const dist = outcome.distance;
  const cx = canvas.width / 2;
  const ex = cx + Math.sin(relAngle) * dist * 2.1;
  const ey = Math.max(110, Math.min(590, 500 - Math.cos(relAngle) * dist * 3.2));
  ballArc = {
    sx: cx + 34, sy: 504,
    ex, ey,
    height: outcome.runs >= 6 ? 220 : outcome.runs >= 4 ? 130 : 65,
    t: 0,
    duration: outcome.runs >= 6 ? 0.9 : outcome.runs >= 4 ? 0.65 : 0.45,
  };
}

// ─── Over summary ─────────────────────────────────────────────────────────────
function checkOverComplete() {
  if (balls > 0 && balls % 6 === 0) {
    const overRuns  = currentOverBalls.reduce((s, b) => s + b.runs, 0);
    const overWkts  = currentOverBalls.filter(b => b.wicket).length;
    const overNum   = Math.floor(balls / 6);
    overSummaryData = { overNum, runs: overRuns, wickets: overWkts, balls: [...currentOverBalls], timer: 3.5 };
    overRunHistory.push({ over: overNum, runs: overRuns });
    currentOverBalls = [];
    updateFieldForPatterns(); // AI repositions fielders based on player's scoring tendencies
    showCommentary(getCommentary('overEnd'));
  }
}

// ─── Toss ─────────────────────────────────────────────────────────────────────
function showToss() {
  phase = 'toss';
  const overlay = document.querySelector('#tossOverlay');
  if (overlay) overlay.style.display = 'flex';
  setTossUI('TOSS TIME!', 'Call it in the air — heads or tails?', `
    <button id="tossHeadsBtn" class="primary">Heads</button>
    <button id="tossTailsBtn" class="secondary">Tails</button>
  `);
  document.querySelector('#tossHeadsBtn')?.addEventListener('click', () => callToss('heads'));
  document.querySelector('#tossTailsBtn')?.addEventListener('click', () => callToss('tails'));
}

function setTossUI(title, sub, actionsHtml) {
  const t = document.querySelector('#tossTitle');
  const s = document.querySelector('#tossSubtitle');
  const a = document.querySelector('#tossActions');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  if (a) a.innerHTML = actionsHtml;
}

function callToss(call) {
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = call === result;
  if (won) {
    setTossUI(`${result.toUpperCase()}! You Won the Toss!`, 'Choose to bat or bowl first:', `
      <button id="tossBatBtn" class="primary">Bat First</button>
      <button id="tossBowlBtn" class="secondary">Bowl First</button>
    `);
    document.querySelector('#tossBatBtn')?.addEventListener('click', () => chooseBatBowl('bat'));
    document.querySelector('#tossBowlBtn')?.addEventListener('click', () => chooseBatBowl('bowl'));
  } else {
    const aiDecide = Math.random() < 0.62; // AI tends to bat first
    playerBatsFirst = !aiDecide;
    setTossUI(`${result.toUpperCase()}! AI Won the Toss!`, `AI chose to ${aiDecide ? 'bat' : 'field'} first.`, '');
    setTimeout(startFromToss, 1800);
  }
}

function chooseBatBowl(choice) {
  playerBatsFirst = choice === 'bat';
  const overlay = document.querySelector('#tossOverlay');
  if (overlay) overlay.style.display = 'none';
  startFromToss();
}

function startFromToss() {
  const overlay = document.querySelector('#tossOverlay');
  if (overlay) overlay.style.display = 'none';
  inningsNum = 1;
  if (playerBatsFirst) startBattingInnings(99999, '--', `Set a big target in ${MODES[matchMode].overs} overs!`);
  else startBowlingFull(null);
}

// ─── Innings helpers ──────────────────────────────────────────────────────────
function resetBattingState() {
  score = 0; wickets = 0; balls = 0;
  running = true; deliveryActive = false; bowlActive = false;
  shots = []; matchTimeline = []; batterSwing = 0; aiSwing = 0;
  partnership = { runs: 0, balls: 0 }; partnershipHistory = [];
  currentOverBalls = []; overSummaryData = null; ballArc = null; commentaryTimer = 0;
  batter = { runs: 0, balls: 0, fours: 0, sixes: 0 };
  milestoneData = null; overRunHistory = []; wicketCelebration = null;
  // Per-innings AI tracking (reset each batting innings)
  consecutiveDots = 0; consecutiveBoundaries = 0;
  timingQualityLog = [];
  // Don't reset playerTimingHistory/playerDeliveryResults — these persist across innings for AI learning
}

function startBattingInnings(tgt, tgtDisplay, msg) {
  resetBattingState();
  target = tgt;
  phase = 'batting'; setPhaseUI('batting');
  initFielders();
  if (targetEl) targetEl.textContent = tgtDisplay ?? tgt;
  message = msg;
  updateHud(); queueDelivery();
}

function startBowlingFull(chaseTarget) {
  aiChaseTarget = chaseTarget;
  aiScore = 0; aiWickets = 0; aiBalls = 0;
  bowlingTimeline = []; bowlActive = false; bowlTimingActive = false;
  bowlDeliveryChoice = 0; bowlAimX = 0; aiSwing = 0; batterSwing = 0;
  partnership = { runs: 0, balls: 0 }; partnershipHistory = [];
  currentOverBalls = []; overSummaryData = null; ballArc = null; commentaryTimer = 0;
  milestoneData = null; overRunHistory = []; wicketCelebration = null;
  phase = 'bowling'; running = true;
  setPhaseUI('bowling');
  initFielders();
  if (chaseTarget !== null) {
    if (targetEl) targetEl.textContent = chaseTarget;
    message = isFullMatch
      ? `Defend ${innings1BatScore}! AI needs ${chaseTarget} to win.`
      : `AI chasing ${chaseTarget} · [1–6] delivery · A/D aim · Space to release`;
  } else {
    if (targetEl) targetEl.textContent = '--';
    message = `Bowl first! Restrict the AI — max score counts.`;
  }
  updateBowlHud(); updateAimIndicator();
  queueAIBatter();
}

function finishFullMatch() {
  running = false;
  const playerScore = playerBatsFirst ? innings1BatScore : score;
  const aiScoreM   = playerBatsFirst ? aiScore : innings1BatScore;

  // Tie → Super Over!
  if (playerScore === aiScoreM) { triggerSuperOver(); return; }

  const playerWon = playerScore > aiScoreM;
  const margin    = Math.abs(playerScore - aiScoreM);
  phase = 'result';
  career.matches++;
  career.totalRuns += playerScore;
  if (playerScore > career.bestScore) career.bestScore = playerScore;
  if (playerWon) career.wins++; else career.losses++;
  updateAdaptiveDifficulty(playerWon);
  coachReport = buildCoachReport();
  addMatchHistory({ score: playerScore, won: playerWon });
  saveCareer();
  message = playerWon
    ? `HARISH XI WIN by ${margin} run${margin !== 1 ? 's' : ''}! (${playerScore} vs ${aiScoreM})`
    : `AI WIN by ${margin} run${margin !== 1 ? 's' : ''}! (${playerScore} vs ${aiScoreM})`;
  if (playerBatsFirst) updateBowlHud(); else updateHud();
  if (series) recordSeriesResult(playerWon);
}

// ─── AI Brain ────────────────────────────────────────────────────────────────
// -- Adaptive difficulty --
function updateAdaptiveDifficulty(playerWon) {
  recentMatchResults.push(playerWon);
  if (recentMatchResults.length > 6) recentMatchResults.shift();
  const wins   = recentMatchResults.filter(Boolean).length;
  const streak = wins - (recentMatchResults.length - wins);
  if (streak >= 3)       adaptiveDifficulty = Math.min(1.5, adaptiveDifficulty + 0.12);
  else if (streak <= -2) adaptiveDifficulty = Math.max(0.60, adaptiveDifficulty - 0.10);
  career.adaptiveDifficulty = adaptiveDifficulty;
  career.recentResults      = recentMatchResults;
}

function difficultyLabel() {
  if (adaptiveDifficulty >= 1.35) return { txt: 'Elite', color: '#c63d3d' };
  if (adaptiveDifficulty >= 1.15) return { txt: 'Hard',  color: '#b67817' };
  if (adaptiveDifficulty <= 0.75) return { txt: 'Easy',  color: '#16834f' };
  return                                  { txt: 'Normal', color: '#0a66c2' };
}

// -- Player pattern recording --
function recordPlayerBall(deliveryName, quality, outcome) {
  if (!playerTimingHistory[deliveryName])   playerTimingHistory[deliveryName]   = [];
  if (!playerDeliveryResults[deliveryName]) playerDeliveryResults[deliveryName] = { faced: 0, runs: 0, wickets: 0 };
  playerTimingHistory[deliveryName].push(quality);
  if (playerTimingHistory[deliveryName].length > 20) playerTimingHistory[deliveryName].shift();
  playerDeliveryResults[deliveryName].faced++;
  playerDeliveryResults[deliveryName].runs    += outcome.runs;
  if (outcome.wicket) playerDeliveryResults[deliveryName].wickets++;
}

function recordShotZone(intent, runs) {
  playerScoringZones[intent] = (playerScoringZones[intent] || 0) + runs;
}

function recordPlayerBowl(deliveryName) {
  playerBowlHistory[deliveryName] = (playerBowlHistory[deliveryName] || 0) + 1;
}

// -- Smart delivery selection (AI bowler uses player weakness data) --
function chooseBestDeliveryVsPlayer() {
  // Find delivery the player scores least from or gets out most to
  const entries = Object.entries(playerDeliveryResults)
    .filter(([, v]) => v.faced >= 3)
    .map(([name, v]) => ({
      name,
      danger: v.wickets / v.faced + (1 - v.runs / Math.max(v.faced * 3, 1)) * 0.4,
    }))
    .sort((a, b) => b.danger - a.danger);
  if (entries.length === 0) return null;
  const pick = DELIVERIES.find(d => d.name === entries[0].name);
  return pick || null;
}

// -- Smarter AI AI mood update (based on required run rate) --
function updateAiMood() {
  if (!aiChaseTarget) { aiMood = 'normal'; return; }
  const ballsLeft = Math.max(1, getMaxBalls() - aiBalls);
  const need      = Math.max(0, aiChaseTarget - aiScore);
  const rrr       = need / ballsLeft;
  aiMood = rrr > 2.2 ? 'aggressive' : rrr < 0.8 ? 'defensive' : 'normal';
}

// -- Contextual commentary engine --
function buildMatchContext(isPlayerBatting) {
  if (isPlayerBatting) {
    const ballsLeft  = Math.max(0, getMaxBalls() - balls);
    const runsNeeded = Math.max(0, target - score);
    return {
      ballsLeft, runsNeeded, wicketsLeft: getMaxWickets() - wickets,
      rrr: ballsLeft ? runsNeeded / ballsLeft : 99,
      consecutiveDots, consecutiveBoundaries,
      isPP: isPowerPlay(), isDeath: ballsLeft <= 12 && getMaxBalls() > 6,
      innings: inningsNum, isSuperOver,
    };
  }
  const ballsLeft  = Math.max(1, getMaxBalls() - aiBalls);
  const runsNeeded = aiChaseTarget ? Math.max(0, aiChaseTarget - aiScore) : 0;
  return {
    ballsLeft, runsNeeded, wicketsLeft: getMaxWickets() - aiWickets,
    rrr: runsNeeded / ballsLeft,
    consecutiveDots: 0, consecutiveBoundaries: 0,
    isPP: isPowerPlay(), isDeath: ballsLeft <= 12 && getMaxBalls() > 6,
    innings: inningsNum, isSuperOver,
  };
}

function contextualCommentary(outcome, ctx) {
  const { ballsLeft, runsNeeded, wicketsLeft, rrr, consecutiveDots: cd, consecutiveBoundaries: cb, isPP, isDeath, isSO } = ctx;

  if (outcome.wicket) {
    if (wicketsLeft <= 2)   return 'Just two wickets left — the tail is completely exposed now!';
    if (cd >= 2)            return 'A wicket after dot balls — the pressure finally told!';
    if (cb >= 1)            return 'Just as the momentum was building — OUT! The game turns!';
    if (isDeath && rrr > 2) return 'HUGE wicket in the death! That could be the match right there!';
    if (isSuperOver)        return 'WICKET in the Super Over! This is absolutely NERVY!';
    return getCommentary('wicket');
  }

  if (outcome.runs === 6) {
    if (isSuperOver)         return 'SUPER OVER SIX! The crowd is absolutely losing it!';
    if (isDeath && rrr > 2.5) return `SIX! Still needs ${runsNeeded - 6} from ${ballsLeft - 1} — anything is possible!`;
    if (cb >= 1)             return 'CONSECUTIVE SIXES! The bowler has nowhere to hide!';
    if (isPP)                return 'Power play maximum! Great use of the fielding restriction!';
    return getCommentary('six');
  }

  if (outcome.runs === 4) {
    if (isDeath && rrr > 2)  return 'FOUR! Critical boundary — keeps the chase alive!';
    if (isPP)                return 'Boundary in the power play — this innings is off to a flyer!';
    if (cd >= 3)             return `Four after ${cd} dots! Finally broke the shackles!`;
    return getCommentary('four');
  }

  if (outcome.runs === 0 && !outcome.wicket) {
    if (cd >= 4)  return `${cd + 1} consecutive dot balls! The pressure is absolutely suffocating!`;
    if (cd >= 2)  return `Dot again — that's ${cd + 1} in a row. The run rate climbs.`;
    if (isDeath && rrr > 2) return 'Dot ball! Every delivery now is like a penalty kick — no margin for error.';
    return getCommentary('dot');
  }

  if (outcome.runs === 1) {
    if (isDeath && rrr > 2) return `Single taken — but they need ${runsNeeded - 1} from ${ballsLeft - 1}!`;
    return getCommentary('single');
  }

  return getCommentary(outcome.runs === 2 ? 'two' : 'three');
}

// -- AI Coach analysis --
function buildCoachReport() {
  const avgQ  = timingQualityLog.length
    ? timingQualityLog.reduce((a, b) => a + b, 0) / timingQualityLog.length
    : 0.5;

  const timingGrade = avgQ >= 0.72 ? 'Excellent' : avgQ >= 0.55 ? 'Good' : avgQ >= 0.38 ? 'Average' : 'Poor';

  // Most runs scored in which zone
  const zones = playerScoringZones;
  const bestZone = zones.left >= zones.right && zones.left >= zones.straight
    ? 'leg side' : zones.right >= zones.straight ? 'off side' : 'straight';

  // Most dangerous delivery (highest wickets/faced ratio)
  const danger = Object.entries(playerDeliveryResults)
    .filter(([, v]) => v.faced >= 2)
    .sort(([, a], [, b]) => (b.wickets / b.faced) - (a.wickets / a.faced))[0];

  // Best scoring delivery (most runs per ball)
  const easy = Object.entries(playerDeliveryResults)
    .filter(([, v]) => v.faced >= 2)
    .sort(([, a], [, b]) => (b.runs / b.faced) - (a.runs / a.faced))[0];

  let tip = 'Stay patient in the middle overs and rotate the strike.';
  if (avgQ < 0.42) tip = 'Work on your timing — wait for the ball and hit through the line.';
  else if (danger) tip = `Watch out for the ${danger[0]} — it has taken your wicket too often.`;
  else if (avgQ >= 0.72) tip = 'Outstanding timing! Keep targeting gaps rather than big hits.';

  return {
    timingGrade, avgQ: (avgQ * 100).toFixed(0),
    bestZone,
    dangerDelivery: danger ? danger[0] : null,
    easyDelivery:   easy   ? easy[0]   : null,
    tip,
    adaptiveLabel:  difficultyLabel(),
  };
}

function renderCoachPanel() {
  const rep = coachReport;
  if (!rep) return;
  const dl = rep.adaptiveLabel;
  insights.innerHTML = `
    <article class="insight-card" style="grid-column:span 2">
      <strong>🤖 AI Coach Analysis</strong>
      <p style="font-size:0.8rem;color:var(--muted)">post-match report</p>
    </article>
    <article class="insight-card">
      <strong>Timing</strong>
      <p>${rep.timingGrade} <span style="font-size:0.8rem;opacity:0.7">(${rep.avgQ}%)</span></p>
    </article>
    <article class="insight-card">
      <strong>Best zone</strong><p>${rep.bestZone}</p>
    </article>
    ${rep.dangerDelivery ? `<article class="insight-card"><strong>⚠ Weakness</strong><p>${rep.dangerDelivery}</p></article>` : ''}
    ${rep.easyDelivery   ? `<article class="insight-card"><strong>✓ Strength</strong><p>${rep.easyDelivery}</p></article>` : ''}
    <article class="insight-card" style="grid-column:span 2">
      <strong>Coach tip</strong><p style="font-size:0.85rem">${rep.tip}</p>
    </article>
    <article class="insight-card" style="grid-column:span 2">
      <strong>AI difficulty</strong>
      <p style="color:${dl.color};font-weight:700">${dl.txt} (${(adaptiveDifficulty * 100).toFixed(0)}%)</p>
    </article>
  `;
}

// ─── Match history ────────────────────────────────────────────────────────────
function addMatchHistory({ score, won }) {
  if (!career.matchHistory) career.matchHistory = [];
  career.matchHistory.unshift({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    mode: MODES[matchMode]?.name || matchMode,
    score, won,
  });
  if (career.matchHistory.length > 10) career.matchHistory.pop();
}

function renderMatchHistory() {
  const el = document.querySelector('#matchHistory');
  if (!el) return;
  const hist = career.matchHistory || [];
  if (!hist.length) {
    el.innerHTML = '<p class="history-empty">No matches yet</p>';
    return;
  }
  el.innerHTML = hist.map(m => `
    <div class="history-row">
      <span class="hist-date">${m.date}</span>
      <span class="hist-detail">${m.mode} · ${m.score}</span>
      <span class="hist-result ${m.won ? 'hist-win' : 'hist-loss'}">${m.won ? 'W' : 'L'}</span>
    </div>
  `).join('');
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('cricket-theme', isLight ? 'light' : 'dark');
  const btn = document.querySelector('#themeBtn');
  if (btn) btn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
}

function applyTheme() {
  if (localStorage.getItem('cricket-theme') === 'light') {
    document.body.classList.add('light-theme');
    const btn = document.querySelector('#themeBtn');
    if (btn) btn.textContent = '🌙 Dark';
  }
}

// ─── Score pulse ──────────────────────────────────────────────────────────────
function pulseScore() {
  const el = document.querySelector('#score');
  if (!el) return;
  el.classList.remove('score-pulse');
  void el.offsetWidth;
  el.classList.add('score-pulse');
}

// ─── Player customisation modal ───────────────────────────────────────────────
function openCustomiseModal() {
  const modal = document.querySelector('#customiseModal');
  if (!modal) return;
  document.querySelector('#profileName').value = teamName;
  document.querySelectorAll('.jersey-swatch').forEach(s =>
    s.classList.toggle('selected', s.dataset.color === jerseyColor)
  );
  document.querySelector('#statPower').value  = playerPower;
  document.querySelector('#statTiming').value = playerTiming;
  document.querySelector('#statTech').value   = playerTech;
  updateStatLabels();
  modal.style.display = 'flex';
}

function closeCustomiseModal() {
  const m = document.querySelector('#customiseModal');
  if (m) m.style.display = 'none';
}

function statLabel(v) {
  return v >= 1.25 ? 'Max' : v >= 1.1 ? 'High' : v <= 0.75 ? 'Low' : v <= 0.9 ? 'Avg' : 'Med';
}

function updateStatLabels() {
  ['Power','Timing','Tech'].forEach(n => {
    const val = parseFloat(document.querySelector(`#stat${n}`)?.value || 1);
    const lbl = document.querySelector(`#label${n}`);
    if (lbl) lbl.textContent = statLabel(val);
  });
}

function saveCustomise() {
  teamName     = document.querySelector('#profileName').value.trim() || 'Harish XI';
  playerPower  = parseFloat(document.querySelector('#statPower').value);
  playerTiming = parseFloat(document.querySelector('#statTiming').value);
  playerTech   = parseFloat(document.querySelector('#statTech').value);
  saveProfile();
  window.__syncJerseyColor?.(jerseyColor); // update 3D batter jersey
  closeCustomiseModal();
  // Refresh avatar + name in sidebar
  const avatar = document.querySelector('.avatar');
  if (avatar) {
    avatar.style.background = jerseyColor;
    avatar.textContent = teamName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  }
  const nameEl = document.querySelector('.profile strong');
  if (nameEl) nameEl.textContent = teamName;
}

// ─── Super Over ───────────────────────────────────────────────────────────────
function triggerSuperOver() {
  savedModeForSO = matchMode;
  matchMode = 'quick'; // 1 over, 2 wickets per side
  isSuperOver = true; superOverPhase = 'bat'; superOverPlayerScore = 0;
  isFullMatch = false; // treat as quick for innings logic
  message = 'TIED! SUPER OVER — 6 balls, 2 wickets each. No mercy!';
  phase = 'break'; updateHud();
  setTimeout(() => {
    startBattingInnings(99999, '--', 'SUPER OVER! Set a target in 6 balls!');
  }, 2600);
}

// ─── 3-match series ───────────────────────────────────────────────────────────
function startSeries() {
  initAudio();
  series = { total: 3, current: 1, playerWins: 0, aiWins: 0 };
  startMatch();
}

function recordSeriesResult(playerWon) {
  if (!series) return;
  if (playerWon) series.playerWins++; else series.aiWins++;
  const msg = ` — Series: Harish ${series.playerWins}-${series.aiWins} AI`;
  if (series.current < series.total) {
    series.current++;
    message += `${msg}. Starting match ${series.current}...`;
    setTimeout(startMatch, 3600);
  } else {
    const seriesWon = series.playerWins > series.aiWins;
    message += `${msg}. SERIES ${seriesWon ? 'WON' : 'LOST'}!`;
    career.seriesWins = (career.seriesWins || 0) + (seriesWon ? 1 : 0);
    saveCareer();
    series = null;
    if (phase === 'bowling') updateBowlHud(); else updateHud();
  }
}

// ─── Start batting (Chase Target) ────────────────────────────────────────────
function startMatch() {
  initAudio();
  isFullMatch = matchMode !== 'quick';
  inningsNum = 1; innings1BatScore = 0; aiChaseTarget = null;
  if (isFullMatch) {
    showToss();
  } else {
    // Quick match: player always chases a random target
    playerBatsFirst = false; // conceptually player bats 2nd (chasing)
    const tgt = generateTarget(MODES[matchMode].overs);
    startBattingInnings(tgt, tgt, `Chase ${tgt} in ${MODES[matchMode].overs} over${MODES[matchMode].overs > 1 ? 's' : ''}`);
  }
}

// ─── Batting phase ───────────────────────────────────────────────────────────
function queueDelivery() {
  // In innings 1 batting (setting target) never end early on score — bat full allocation
  const reachedTarget = !(isFullMatch && inningsNum === 1) && score >= target;
  if (!running || balls >= getMaxBalls() || wickets >= getMaxWickets() || reachedTarget) {
    finishBatting(); return;
  }
  deliveryActive = false; ball.visible = false;
  if (onlineMode) {
    message = 'Waiting for server delivery...'; updateHud();
    sendRoomMessage({ type: 'request_delivery', roomId: roomCode.value.trim() || 'ARENA-24', playerId });
    return;
  }
  const type = chooseAIDelivery();
  ballTypeEl.textContent = type.name;
  message = 'Watch the bowler. Time your shot.';
  setTimeout(() => launchDelivery(type), 900);
}

function chooseAIDelivery() {
  const rem  = getMaxBalls() - balls;
  const need = isFullMatch && inningsNum === 1 ? 9999 : Math.max(0, target - score);
  const rrr  = rem ? need / rem : 99;

  // Death-over yorker (non-negotiable)
  if (need <= 6 && rem <= 6 && !isSuperOver) return DELIVERIES[0];
  if (rem <= 6 && rrr > 2.0) return DELIVERIES[0]; // death yorker

  // Use learned player weakness ~40% of the time (scales with difficulty)
  const exploitChance = 0.30 + (adaptiveDifficulty - 1.0) * 0.25;
  if (Math.random() < exploitChance) {
    const weak = chooseBestDeliveryVsPlayer();
    if (weak) return weak;
  }

  // Power play: variation to probe player
  if (isPowerPlay() && Math.random() < 0.5) {
    return DELIVERIES[Math.floor(Math.random() * 4) + 1]; // outswinger, leg cutter, slower, full toss
  }

  // Hard game at higher difficulty: bias toward top-3 difficult deliveries
  if (adaptiveDifficulty >= 1.25 && Math.random() < 0.38) {
    return DELIVERIES[Math.floor(Math.random() * 3)]; // yorker, outswinger, leg cutter
  }

  // Tight game: smarter selection
  if (rrr > 1.8 && rem <= 12) return DELIVERIES[Math.floor(Math.random() * 2)];

  // Surprise googly (slightly more at higher difficulty)
  if (Math.random() < 0.10 + (adaptiveDifficulty - 1.0) * 0.06) return DELIVERIES[5];

  return DELIVERIES[Math.floor(Math.random() * DELIVERIES.length)];
}

function launchDelivery(type) {
  if (!running) return;
  ball = {
    x: canvas.width / 2 + type.swing * -18,
    y: 94, vx: type.swing, vy: type.speed,
    radius: 8, visible: true, type
  };
  deliveryActive = true;
  message = 'Ball released';
}

function playShot() {
  if (phase !== 'batting' || !deliveryActive || !running) return;
  if (onlineMode) {
    awaitingServer = true; batterSwing = 1;
    deliveryActive = false; ball.visible = false;
    message = 'Shot sent to match server...';
    sendRoomMessage({ type: 'shot', roomId: roomCode.value.trim() || 'ARENA-24', playerId, timing, intent: shotIntent });
    updateHud(); return;
  }

  const cz      = Math.abs(ball.y - 512);
  const te      = Math.abs(timing - 0.5);
  const cs      = Math.max(0, 1 - cz / 160);
  const ts      = Math.max(0, 1 - te * 2.2);
  const rawQ    = cs * 0.55 + ts * 0.45 - (ball.type.difficulty - 0.65) * 0.18;
  // Adaptive difficulty penalty: harder AI = player quality slightly reduced
  const qualityPenalty = (adaptiveDifficulty - 1.0) * 0.08;
  const quality = Math.max(0, rawQ - qualityPenalty);
  const out     = resolveOutcome(quality);
  window.__arena4d?.shot?.(out);

  // Record player pattern data for AI learning
  recordPlayerBall(ball.type.name, quality, out);
  recordShotZone(shotIntent, out.runs);
  timingQualityLog.push(quality);

  // Contextual commentary
  const ctx = buildMatchContext(true);
  const commentLine = contextualCommentary(out, ctx);
  showCommentary(commentLine);
  playOutcomeSound(out);
  startBallArc(out);
  setTimeout(() => chaseFielder(out), 80);

  batterSwing = 1; deliveryActive = false; ball.visible = false;
  const prevScore = score;
  balls++; score += out.runs;
  if (out.wicket) wickets++;
  message = out.message;

  // Batter stats
  batter.balls++;
  if (!out.wicket) {
    batter.runs += out.runs;
    if (out.runs === 4) batter.fours++;
    if (out.runs === 6) batter.sixes++;
  }

  // Milestones (team score)
  checkMilestones(prevScore, score);

  // Consecutive tracking for commentary
  if (out.runs === 0 && !out.wicket) { consecutiveDots++; consecutiveBoundaries = 0; }
  else if (out.runs >= 4)            { consecutiveBoundaries++; consecutiveDots = 0; }
  else                               { consecutiveDots = 0; consecutiveBoundaries = 0; }

  // Wicket celebration
  if (out.wicket) {
    triggerWicketCelebration();
    partnershipHistory.push({ ...partnership });
    partnership = { runs: 0, balls: 0 };
    batter = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    consecutiveDots = 0; consecutiveBoundaries = 0;
  } else {
    partnership.runs += out.runs; partnership.balls++;
    if (out.runs === 6) crowdRoar(1);
  }

  shots.push({ runs: out.runs, angle: out.angle, distance: out.distance });
  matchTimeline.push({ ball: balls, delivery: ball.type.name, runs: out.runs, wicket: out.wicket, message: out.message });

  // Over summary (after each complete over)
  currentOverBalls.push({ runs: out.runs, wicket: out.wicket });
  checkOverComplete();

  pulseScore();
  updateHud(); renderShotMap(); renderScorecard();
  setTimeout(queueDelivery, 1250);
}

function resolveOutcome(q) {
  const sc    = SHOT_CONFIG[shotIntent] || SHOT_CONFIG.straight;
  const angle = sc.angle + (Math.random() * 36 - 18);
  // Player stats + shot risk modify effective quality
  const qMod  = Math.max(0, q - sc.risk + (playerPower - 1.0) * 0.07);
  const qFin  = Math.min(1, qMod * (0.7 + playerTiming * 0.3));
  // Better technique = harder to dismiss (lower wicket threshold)
  const wkQ   = 0.18 / playerTech;
  if (qFin < wkQ) {
    const outType = qFin < wkQ * 0.5 ? 'bowled' : 'caught';
    const wkMsg   = outType === 'bowled'
      ? `${sc.label} — Bowled! Timber!`
      : `${sc.label} — Edge! Caught!`;
    return { runs: 0, wicket: true, outType, message: wkMsg, angle, distance: 35 };
  }
  if (qFin < 0.35) return { runs: 0, wicket: false, message: `${sc.label} — Beaten. Dot.`,          angle, distance: 28 };
  if (qFin < 0.55) return { runs: 1, wicket: false, message: `${sc.label} — Quick single!`,          angle, distance: 45 };
  if (qFin < 0.72) return { runs: 2, wicket: false, message: `${sc.label} — Gap! Two runs.`,         angle, distance: 62 };
  if (qFin < 0.88) return { runs: 4, wicket: false, message: `${sc.label} — FOUR! Great ${sc.label.toLowerCase()}!`, angle, distance: 82 };
  return               { runs: 6, wicket: false, message: `${sc.label} — MAXIMUM SIX!`,          angle, distance: 96 };
}

function finishBatting() {
  running = false; deliveryActive = false; ball.visible = false;

  // Super Over batting phase → now bowl to defend
  if (isSuperOver && superOverPhase === 'bat') {
    superOverPlayerScore = score;
    superOverPhase = 'bowl';
    message = `Super Over! You scored ${score}. Now bowl — AI needs ${score + 1} to win!`;
    phase = 'break'; updateHud();
    setTimeout(() => startBowlingFull(score + 1), 2300);
    return;
  }

  if (isFullMatch && inningsNum === 1) {
    innings1BatScore = score;
    const defend = score + 1;
    message = `Innings 1: ${score}/${wickets}. Now bowl and defend!`;
    phase = 'break'; updateHud();
    setTimeout(() => { inningsNum = 2; startBowlingFull(defend); }, 2800);
    return;
  }

  if (isFullMatch && inningsNum === 2) { finishFullMatch(); return; }

  // Quick match result
  const won = score >= target;
  career.matches++; career.totalRuns += score;
  if (score > career.bestScore) career.bestScore = score;
  if (won) career.wins++; else career.losses++;
  updateAdaptiveDifficulty(won);
  coachReport = buildCoachReport();
  addMatchHistory({ score, won });
  saveCareer();
  message = won
    ? `Harish XI wins! ${score}/${wickets} · ${getMaxBalls() - balls} ball(s) left`
    : `Opponent wins · Needed ${target - score} more`;
  phase = 'result'; updateHud();
  if (series) recordSeriesResult(won);
}

// ─── Bowling phase (player bowls, AI bats) ───────────────────────────────────
function startBowling() {
  initAudio();
  isFullMatch = matchMode !== 'quick';
  inningsNum = 1; innings1BatScore = 0;
  if (isFullMatch) {
    // Full match: toss determines roles — same as Chase Target path
    showToss(); return;
  }
  // Quick match: player bowls, AI chases a random target
  playerBatsFirst = false;
  startBowlingFull(generateTarget(MODES[matchMode].overs));
}

function queueAIBatter() {
  // aiChaseTarget null = no target (innings 1 full match bowling)
  const aiReached = aiChaseTarget !== null && aiScore >= aiChaseTarget;
  if (!running || aiBalls >= getMaxBalls() || aiWickets >= getMaxWickets() || aiReached) {
    finishBowling(); return;
  }
  bowlActive = false; bowlTimingActive = true; ball.visible = false;
  const d = DELIVERIES[bowlDeliveryChoice];
  ballTypeEl.textContent = `Your delivery: ${d.name} · aim with A/D · Space to release`;
  message = 'Select your delivery and bowl';
  updateBowlHud();
}

function releaseBowl() {
  if (phase !== 'bowling' || !running || !bowlTimingActive || bowlActive) return;
  bowlTimingActive = false; bowlActive = true;
  const d = DELIVERIES[bowlDeliveryChoice];
  ball = {
    x: canvas.width / 2 + bowlAimX + d.swing * -18,
    y: 520,
    vx: d.swing * 0.4 + bowlAimX * 0.03,
    vy: -(d.speed * 0.9),
    radius: 8, visible: true, type: d
  };
  ballTypeEl.textContent = `${d.name} released`;
  message = 'Delivery on its way…';
  // Track player's bowling patterns (AI batter remembers)
  recordPlayerBowl(d.name);
  const timingQ = 1 - Math.abs(timing - 0.5) * 2;
  const aimQ    = 1 - Math.abs(bowlAimX) / 80;
  const bowlQ   = timingQ * 0.55 + aimQ * 0.25 + (d.difficulty - 0.55) * 0.3;
  setTimeout(() => resolveAIBat(d, bowlQ), 600);
}

function resolveAIBat(type, bowlQ) {
  updateAiMood(); // recalculate before each ball
  const r = Math.random();

  // AI "reads" frequently bowled deliveries — familiarity reduces bowlQ impact
  const timesSeenThisDelivery = playerBowlHistory[type.name] || 0;
  const totalBowledByPlayer   = Object.values(playerBowlHistory).reduce((a,b) => a+b, 0);
  const familiarity = totalBowledByPlayer > 0 ? Math.min(0.35, (timesSeenThisDelivery / totalBowledByPlayer) * 0.5) : 0;

  // Mood modifier: aggressive AI attacks more, defensive plays safer
  const moodBoost = aiMood === 'aggressive' ? 0.14 : aiMood === 'defensive' ? -0.08 : 0;

  // Adaptive: at lower difficulty, AI batter is worse
  const diffPenalty = (adaptiveDifficulty - 1.0) * (-0.06); // easier = worse AI batter
  const q = Math.max(0, Math.min(1, bowlQ - familiarity - moodBoost + diffPenalty));

  let out;
  if (q > 0.78) {
    out = r < 0.55
      ? { runs: 0, wicket: true,  message: 'Bowled! Unplayable delivery!' }
      : { runs: 0, wicket: false, message: 'Beaten outside off. Dot ball.' };
  } else if (q > 0.55) {
    if      (r < 0.22) out = { runs: 0, wicket: true,  message: 'Caught at slip!' };
    else if (r < 0.48) out = { runs: 0, wicket: false, message: 'Tight delivery. Dot.' };
    else if (r < 0.72) out = { runs: 1, wicket: false, message: 'AI nudges a single.' };
    else               out = { runs: 2, wicket: false, message: 'AI works it for two.' };
  } else if (q > 0.3) {
    if (aiMood === 'aggressive' && r < 0.25)
                       out = { runs: 6, wicket: false, message: 'AI goes aerial — SIX!' };
    else if (r < 0.18) out = { runs: 4, wicket: false, message: 'AI drives through covers!' };
    else if (r < 0.45) out = { runs: 1, wicket: false, message: 'AI flicks for a single.' };
    else if (r < 0.68) out = { runs: 2, wicket: false, message: 'AI pushes for two.' };
    else               out = { runs: 0, wicket: false, message: 'AI defends solidly.' };
  } else {
    // Poor delivery — AI capitalises hard when aggressive
    if      (aiMood === 'aggressive' && r < 0.55) out = { runs: 6, wicket: false, message: 'AI smashes it over the ropes!' };
    else if (r < 0.38) out = { runs: 6, wicket: false, message: 'AI smashes it over the ropes!' };
    else if (r < 0.68) out = { runs: 4, wicket: false, message: 'AI sends it to the fence!' };
    else               out = { runs: 2, wicket: false, message: 'Easy runs for the AI.' };
  }

  aiSwing = 1; bowlActive = false; ball.visible = false;
  // Contextual commentary for bowling phase
  const bowlCtx = buildMatchContext(false);
  const commentLine = contextualCommentary(out, bowlCtx);
  showCommentary(commentLine);
  playOutcomeSound(out);
  aiBalls++; aiScore += out.runs;
  if (out.wicket) aiWickets++;
  message = out.message;
  bowlingTimeline.push({ ball: aiBalls, delivery: type.name, runs: out.runs, wicket: out.wicket, message: out.message });
  currentOverBalls.push({ runs: out.runs, wicket: out.wicket });
  if (aiBalls > 0 && aiBalls % 6 === 0) {
    const oRuns = currentOverBalls.reduce((s, b) => s + b.runs, 0);
    const oWkts = currentOverBalls.filter(b => b.wicket).length;
    overSummaryData = { overNum: Math.floor(aiBalls / 6), runs: oRuns, wickets: oWkts, balls: [...currentOverBalls], timer: 3.5 };
    currentOverBalls = [];
    showCommentary(getCommentary('overEnd'));
  }
  updateBowlHud(); renderBowlingScorecard();
  setTimeout(queueAIBatter, 1200);
}

function finishBowling() {
  running = false;

  // Super Over bowling phase → compare and end
  if (isSuperOver && superOverPhase === 'bowl') {
    const soWon = superOverPlayerScore > aiScore;
    const soMargin = Math.abs(superOverPlayerScore - aiScore);
    matchMode = savedModeForSO || matchMode;
    isSuperOver = false;
    career.matches++; career.totalRuns += superOverPlayerScore;
    if (superOverPlayerScore > career.bestScore) career.bestScore = superOverPlayerScore;
    if (soWon) career.wins++; else career.losses++;
    updateAdaptiveDifficulty(soWon);
    coachReport = buildCoachReport();
    addMatchHistory({ score: superOverPlayerScore, won: soWon });
    saveCareer();
    phase = 'result';
    message = soWon
      ? `SUPER OVER! Harish XI WIN by ${soMargin} run${soMargin !== 1 ? 's' : ''}! (${superOverPlayerScore} vs ${aiScore})`
      : `SUPER OVER! AI WIN by ${soMargin} run${soMargin !== 1 ? 's' : ''}! (${superOverPlayerScore} vs ${aiScore})`;
    updateBowlHud();
    if (series) recordSeriesResult(soWon);
    return;
  }

  if (isFullMatch && inningsNum === 1) {
    innings1BatScore = aiScore;
    const chaseTarget = aiScore + 1;
    message = `AI scored ${aiScore}/${aiWickets}. Chase ${chaseTarget} to win!`;
    phase = 'break'; updateBowlHud();
    setTimeout(() => {
      inningsNum = 2;
      startBattingInnings(chaseTarget, chaseTarget, `Chase ${chaseTarget} to WIN the match!`);
    }, 2800);
    return;
  }

  if (isFullMatch && inningsNum === 2) { finishFullMatch(); return; }

  // Quick match bowling result
  phase = 'result';
  message = `Bowling done! AI scored ${aiScore}/${aiWickets} in ${overStr(aiBalls)}`;
  updateBowlHud();
  if (series) recordSeriesResult(false); // player bowled, compare not possible in quick bowl-only
}

function updateBowlHud() {
  scoreEl.textContent    = `AI: ${aiScore}/${aiWickets}`;
  ballsEl.textContent    = overStr(aiBalls);
  equationEl.textContent = `${aiBalls}/${getMaxBalls()} balls`;
  statusEl.textContent   = message;
  renderBowlingInsights();
  renderBowlingScorecard();
}

function renderBowlingInsights() {
  if (phase === 'result' && coachReport) { renderCoachPanel(); return; }
  const rr   = aiBalls ? (aiScore / aiBalls).toFixed(1) : '0.0';
  const rem  = getMaxBalls() - aiBalls;
  const d    = DELIVERIES[bowlDeliveryChoice];
  const dl   = difficultyLabel();
  insights.innerHTML = `
    <article class="insight-card"><strong>AI run rate</strong><p>${rr} per ball</p></article>
    <article class="insight-card"><strong>Wickets taken</strong><p>${aiWickets} / ${getMaxWickets()}</p></article>
    <article class="insight-card"><strong>Balls left</strong><p>${rem}</p></article>
    <article class="insight-card"><strong>Your delivery</strong><p>${d.name} (diff ${d.difficulty})</p></article>
    <article class="insight-card"><strong>AI level</strong><p style="color:${dl.color};font-weight:700">${dl.txt}</p></article>
  `;
}

function renderBowlingScorecard() {
  const runRate    = aiBalls ? (aiScore / aiBalls).toFixed(2) : '0.00';
  const boundaries = bowlingTimeline.filter(e => e.runs >= 4).length;
  scorecardGrid.innerHTML = `
    <article class="scorecard-metric"><strong>${aiScore}/${aiWickets}</strong><span>AI score</span></article>
    <article class="scorecard-metric"><strong>${overStr(aiBalls)}</strong><span>overs</span></article>
    <article class="scorecard-metric"><strong>${runRate}</strong><span>AI run rate</span></article>
    <article class="scorecard-metric"><strong>${boundaries}</strong><span>AI boundaries</span></article>
  `;
  replayTimeline.innerHTML = bowlingTimeline.length
    ? ''
    : '<div class="replay-item"><span>No balls yet</span><strong>Start bowling</strong><span>--</span></div>';
  bowlingTimeline.slice(-20).reverse().forEach(ev => {
    const item = document.createElement('article');
    item.className = 'replay-item';
    item.innerHTML = `<span>Ball ${ev.ball}</span><strong>${ev.delivery} · ${ev.message}</strong><span>${ev.runs}${ev.wicket ? ' W' : ''}</span>`;
    replayTimeline.appendChild(item);
  });
}

// ─── Batting HUD ─────────────────────────────────────────────────────────────
function updateHud() {
  scoreEl.textContent = `${score}/${wickets}`;
  ballsEl.textContent = overStr(balls);
  // Innings 1 batting (setting target) — show balls remaining not run equation
  if (isFullMatch && inningsNum === 1 && playerBatsFirst) {
    equationEl.textContent = `${Math.max(0, getMaxBalls() - balls)} balls left`;
  } else {
    equationEl.textContent = score >= target ? 'Won!' : `${Math.max(0, target - score)} from ${Math.max(0, getMaxBalls() - balls)}`;
  }
  statusEl.textContent = message;
  renderInsights();
  renderScorecard();
  // Keep 3D scoreboard in sync
  const need3d = score >= target ? 'Won!' : `${Math.max(0, target - score)}`;
  try { if (window.__syncScoreboard) window.__syncScoreboard(`${score}/${wickets}`, overStr(balls), need3d); } catch {}
}

function renderInsights() {
  // Post-match: show AI coach analysis instead of live stats
  if (phase === 'result' && coachReport) { renderCoachPanel(); return; }

  const rate     = balls ? (score / balls).toFixed(1) : '0.0';
  const rem      = getMaxBalls() - balls;
  const need     = target - score;
  const rr       = rem ? (need / rem).toFixed(2) : '—';
  const pressure = need > rem * 4 ? 'High' : need <= rem * 2 ? 'Low' : 'Medium';
  const dl       = difficultyLabel();
  insights.innerHTML = `
    <article class="insight-card"><strong>Run rate</strong><p>${rate} per ball</p></article>
    <article class="insight-card"><strong>Required</strong><p>${rr} per ball</p></article>
    <article class="insight-card"><strong>Pressure</strong><p>${pressure}</p></article>
    <article class="insight-card"><strong>AI plan</strong><p>${
      pressure === 'High' ? 'Expect yorkers &amp; pace-off balls.' :
      pressure === 'Low'  ? 'AI may try slower deliveries.' :
      'Mix of swing and cutters ahead.'
    }</p></article>
    <article class="insight-card"><strong>AI level</strong><p style="color:${dl.color};font-weight:700">${dl.txt}</p></article>
  `;
}

function renderShotMap() {
  shotMap.innerHTML = '';
  shots.slice(-8).forEach(s => {
    const dot = document.createElement('span');
    dot.className = 'shot-dot';
    const rad = (s.angle * Math.PI) / 180;
    const r   = s.distance * 0.45;
    dot.style.left       = `${50 + Math.cos(rad) * r}%`;
    dot.style.top        = `${50 + Math.sin(rad) * r}%`;
    dot.style.background = s.runs >= 6 ? '#b67817' : s.runs >= 4 ? '#16834f' : '#0a66c2';
    shotMap.appendChild(dot);
  });
}

function renderScorecard() {
  const runRate    = balls ? (score / balls).toFixed(2) : '0.00';
  const boundaries = matchTimeline.filter(e => e.runs >= 4).length;
  const pship      = `${partnership.runs}(${partnership.balls})`;
  const innings    = isFullMatch ? ` <span style="font-size:0.75rem;color:#b67817">INN ${inningsNum}</span>` : '';
  scorecardGrid.innerHTML = `
    <article class="scorecard-metric"><strong>${score}/${wickets}${innings}</strong><span>score</span></article>
    <article class="scorecard-metric"><strong>${overStr(balls)}</strong><span>overs</span></article>
    <article class="scorecard-metric"><strong>${runRate}</strong><span>run rate</span></article>
    <article class="scorecard-metric"><strong>${pship}</strong><span>partnership</span></article>
    <article class="scorecard-metric"><strong>${boundaries}</strong><span>boundaries</span></article>
  `;
  replayTimeline.innerHTML = matchTimeline.length
    ? ''
    : '<div class="replay-item"><span>No balls yet</span><strong>Start a match</strong><span>--</span></div>';
  // Cap at 20 entries to avoid O(n) DOM work in long-format matches
  matchTimeline.slice(-20).reverse().forEach(ev => {
    const item = document.createElement('article');
    item.className = 'replay-item';
    item.innerHTML = `<span>Ball ${ev.ball}</span><strong>${ev.delivery || 'Delivery'} · ${ev.message}</strong><span>${ev.runs}${ev.wicket ? ' W' : ''}</span>`;
    replayTimeline.appendChild(item);
  });
}

// ─── Multiplayer ─────────────────────────────────────────────────────────────
function getServerUrl() {
  const hostEl = document.querySelector('#serverHost');
  const host   = hostEl ? hostEl.value.trim() : 'localhost:8787';
  return host.startsWith('ws://') || host.startsWith('wss://') ? host : `ws://${host}`;
}

async function fetchLanInfo() {
  const hostEl = document.querySelector('#serverHost');
  const host   = hostEl ? hostEl.value.trim() : 'localhost:8787';
  const http   = host.replace('ws://', '').replace('wss://', '');
  try {
    const res  = await fetch(`http://${http}/info`, { signal: AbortSignal.timeout(2000) });
    const info = await res.json();
    const urlEl = document.querySelector('#lanUrlDisplay');
    if (urlEl && info.wsUrls?.[0]) {
      urlEl.textContent = info.wsUrls[0];
      urlEl.title = 'Share this URL with players on the same WiFi/hotspot';
    }
  } catch {}
}

function connectMultiplayer() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    sendRoomMessage({ type: 'join', roomId: roomCode.value.trim() || 'ARENA-24', playerId });
    return;
  }
  connectionStatus.textContent = 'connecting';
  fetchLanInfo();
  socket = new WebSocket(getServerUrl());
  socket.addEventListener('open', () => {
    connectionStatus.textContent = 'online';
    sendRoomMessage({ type: 'join', roomId: roomCode.value.trim() || 'ARENA-24', playerId });
  });
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.type === 'room_state') {
      roomPlayers = data.players; renderSquad();
      if (data.canStart) { onlineMode = true; message = 'Room ready. Server match starting.'; updateHud(); }
    }
    if (data.type === 'match_state') applyServerMatch(data.match);
    if (data.type === 'pong') pingStatus.textContent = `${Date.now() - Number(data.clientTime)} ms`;
    if (data.type === 'state') { message = 'Remote player action synced.'; updateHud(); }
  });
  socket.addEventListener('close', () => { connectionStatus.textContent = 'offline'; });
  socket.addEventListener('error', () => { connectionStatus.textContent = 'server off'; });
}

function applyServerMatch(match) {
  onlineMode = true; running = !match.finished;
  score = match.score; wickets = match.wickets; balls = match.balls;
  matchTimeline = match.timeline || matchTimeline;
  if (match.lastOutcome && awaitingServer) {
    shots.push(match.lastOutcome); message = match.lastOutcome.message;
    awaitingServer = false; renderShotMap();
  }
  if (match.delivery) {
    ballTypeEl.textContent = `${match.delivery.name} · server synced`;
    message = 'Server ball released'; launchDelivery(match.delivery); return;
  }
  if (match.finished) { finishBatting(); return; }
  updateHud(); renderScorecard();
  setTimeout(() => { if (onlineMode && running && !deliveryActive) queueDelivery(); }, 900);
}

function pingServer() {
  lastPingSent = Date.now();
  sendRoomMessage({ type: 'ping', clientTime: lastPingSent, playerId });
}

function toggleReady() {
  ready = !ready;
  readyBtn.textContent = ready ? 'Unready' : 'Ready';
  sendRoomMessage({ type: 'ready', roomId: roomCode.value.trim() || 'ARENA-24', playerId, ready });
}

function sendRoomMessage(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) { connectionStatus.textContent = 'offline'; return; }
  socket.send(JSON.stringify(payload));
}

function renderSquad() {
  squadList.innerHTML = '';
  if (!roomPlayers.length) {
    squadList.innerHTML = '<div class="squad-card"><strong>No squad yet</strong><span>connect</span></div>';
    return;
  }
  roomPlayers.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'squad-card';
    card.innerHTML = `<strong>${p.playerId === playerId ? 'You' : `Player ${i + 1}`}</strong><span class="${p.ready ? 'ready-pill' : 'waiting-pill'}">${p.ready ? 'Ready' : 'Waiting'}</span>`;
    squadList.appendChild(card);
  });
}

function exportMatchSummary() {
  const summary = {
    mode: onlineMode ? 'online' : matchMode,
    score, wickets, balls: overStr(balls), target,
    timeline: matchTimeline, exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'cricket-arena-match-summary.json';
  a.click(); URL.revokeObjectURL(url);
}

// ─── Game loop ────────────────────────────────────────────────────────────────
function update() {
  timing += timingDirection * 0.018;
  if (timing >= 1 || timing <= 0) { timingDirection *= -1; timing = Math.max(0, Math.min(1, timing)); }
  timingNeedle.style.left = `${timing * 100}%`;

  if (phase === 'batting' && deliveryActive) {
    ball.x += ball.vx; ball.y += ball.vy; ball.vx *= 0.996;
    if (ball.y > 590) {
      balls++; deliveryActive = false; ball.visible = false;
      currentOverBalls.push({ runs: 0, wicket: false });
      checkOverComplete();
      showCommentary(getCommentary('dot'));
      message = 'Keeper collects. Dot ball.'; updateHud();
      setTimeout(queueDelivery, 900);
    }
  }

  if (phase === 'bowling' && bowlActive) {
    ball.x += ball.vx; ball.y += ball.vy; ball.vx *= 0.996;
    if (ball.y < 94) { ball.visible = false; bowlActive = false; }
  }

  batterSwing *= 0.86;
  aiSwing     *= 0.86;
  if (batterSwing > 0.04 || aiSwing > 0.04) {
    window.__syncBatterSwing?.(Math.max(batterSwing, aiSwing));
  }

  // Fielder movement (smooth interpolation toward target)
  const dt = 0.016;
  fielders.forEach(f => {
    const dx = f.tx - f.x, dy = f.ty - f.y;
    const d  = Math.hypot(dx, dy);
    if (d > 1.5) {
      const spd = f.running ? 5.5 : 3.2;
      f.x += (dx / d) * Math.min(spd, d);
      f.y += (dy / d) * Math.min(spd, d);
    } else { f.x = f.tx; f.y = f.ty; }
  });

  // Ball arc progress
  if (ballArc) {
    ballArc.t += dt;
    if (ballArc.t >= ballArc.duration) ballArc = null;
  }

  // Commentary fade
  if (commentaryTimer > 0) commentaryTimer -= dt;

  // Over summary fade
  if (overSummaryData && overSummaryData.timer > 0) overSummaryData.timer -= dt;

  // Milestone fade
  if (milestoneData && milestoneData.timer > 0) milestoneData.timer -= dt;

  // Wicket celebration tick (null-safe — timer is managed by setTimeout in triggerWicketCelebration)
}

// ─── Drawing ─────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const use3d = document.querySelector('#threeViewport')?.classList.contains('active');
  if (!use3d) {
    drawStadium(); drawPitch();
    drawFielders();
    if (phase === 'bowling') drawAimGuide();
    drawPlayers();
    if (ballArc) drawBallArc(); else drawBall();
  } else {
    // 3D is rendering world; still call drawBallArc for the __syncBall hook
    if (ballArc) drawBallArc();
    // Draw minimal aim guide for bowling in 3D mode (no stadium behind it)
    if (phase === 'bowling') drawAimGuide();
  }
  drawOverlay();
  drawBatterCard();
  drawPowerPlayBadge();
  drawSeriesBadge();
  drawRunRateGraph();
  drawOverSummary();
  drawMilestone();
  drawWicketCelebration();
}

// ─── Colour utility ────────────────────────────────────────────────────────────
function lighten(hex, t) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#888888';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const cl = v => Math.min(255, Math.max(0, v)) | 0;
  return t >= 0
    ? `rgb(${cl(r+(255-r)*t)},${cl(g+(255-g)*t)},${cl(b+(255-b)*t)})`
    : `rgb(${cl(r*(1+t))},${cl(g*(1+t))},${cl(b*(1+t))})`;
}

// ─── Pre-seeded crowd data (stable across frames) ─────────────────────────────
const CROWD_PAL = ['#e84040','#4268e8','#f0a020','#22c060','#a040dc','#20b8d4','#f56840','#ff80a8','#40d8f0'];
const _crowd = Array.from({length:300}, (_,i) => ({
  x: 28 + (i * 3.74 % (canvas.width - 56)),
  row: i % 5,
  c: CROWD_PAL[(i * 7 + 3) % CROWD_PAL.length],
  sz: 6.5 - (i % 5) * 0.7,
}));
const AD_COLS = ['#c63d3d','#0a66c2','#16834f','#b67817','#7b3fc4','#c63d3d','#0a66c2','#16834f','#b67817'];
let _bgGradient = null;

function drawStadium() {
  const W = canvas.width, H = canvas.height, cx = W / 2;

  // Base sky → field gradient
  if (!_bgGradient) {
    _bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    _bgGradient.addColorStop(0,    '#070e1c');
    _bgGradient.addColorStop(0.22, '#0b1a30');
    _bgGradient.addColorStop(0.38, '#0d2014');
    _bgGradient.addColorStop(1,    '#1c7232');
  }
  ctx.fillStyle = _bgGradient;
  ctx.fillRect(0, 0, W, H);

  // Grass mowing stripes (alternating dark bands)
  for (let r = 0; r < 24; r++) {
    if (r % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.09)';
      ctx.fillRect(0, 158 + r * 22, W, 22);
    }
  }

  // Subtle floodlight spill across field
  [cx - 430, cx + 430, cx - 220, cx + 220].forEach(lx => {
    const sp = ctx.createRadialGradient(lx, 0, 10, lx, 300, 380);
    sp.addColorStop(0, 'rgba(255,255,210,0.07)');
    sp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H);
  });

  // Stadium stands (solid background for crowd rows)
  const sg = ctx.createLinearGradient(0, 0, 0, 157);
  sg.addColorStop(0, '#14192a'); sg.addColorStop(1, '#1e2840');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, 157);

  // Crowd rows (5 rows of coloured dots)
  _crowd.forEach(d => {
    ctx.fillStyle = d.c;
    ctx.globalAlpha = 0.82;
    ctx.beginPath(); ctx.arc(d.x, 18 + d.row * 25, d.sz, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Advertising boards at base of stands
  const bw = W / AD_COLS.length;
  AD_COLS.forEach((col, i) => {
    ctx.fillStyle = col; ctx.fillRect(i * bw, 138, bw - 2, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = '700 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CRICKET ARENA AI', i * bw + bw / 2, 150);
  });
  ctx.textAlign = 'left';

  // Boundary rope (white dashed ellipse on the field)
  ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 3;
  ctx.setLineDash([16, 10]);
  ctx.beginPath(); ctx.ellipse(cx, 402, 488, 248, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]); ctx.lineWidth = 1;

  // Floodlight towers
  [[cx-430,58],[cx+430,58],[cx-220,42],[cx+220,42]].forEach(([lx,ly]) => drawFloodlight(lx,ly));
}

function drawFloodlight(x, y) {
  // Light cone (soft radial)
  const lc = ctx.createRadialGradient(x, y+50, 6, x, y+120, 230);
  lc.addColorStop(0, 'rgba(255,255,210,0.13)');
  lc.addColorStop(1, 'rgba(255,255,210,0)');
  ctx.fillStyle = lc;
  ctx.beginPath(); ctx.moveTo(x, y+52); ctx.lineTo(x-110, y+280); ctx.lineTo(x+110, y+280); ctx.closePath(); ctx.fill();

  // Pole
  ctx.strokeStyle = '#9aabb8'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x, y+260); ctx.lineTo(x, y+50); ctx.stroke();
  // Cross arm
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(x-32, y+54); ctx.lineTo(x+32, y+54); ctx.stroke();

  // 3 light heads with glow
  [-22, 0, 22].forEach(dx => {
    const grd = ctx.createRadialGradient(x+dx, y+50, 2, x+dx, y+50, 16);
    grd.addColorStop(0, 'rgba(255,255,220,1)');
    grd.addColorStop(0.5, 'rgba(255,250,180,0.7)');
    grd.addColorStop(1,   'rgba(255,245,150,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x+dx, y+50, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffe8';
    ctx.beginPath(); ctx.arc(x+dx, y+50, 5, 0, Math.PI*2); ctx.fill();
  });
}

function drawPitch() {
  const cx = canvas.width / 2;
  ctx.save(); ctx.translate(cx, 0);

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 22; ctx.shadowOffsetX = 10;

  // Pitch gradient (perspective: lighter at ends, worn in middle)
  const pvg = ctx.createLinearGradient(0, 110, 0, 625);
  pvg.addColorStop(0,    '#c48848');
  pvg.addColorStop(0.44, '#a87030');
  pvg.addColorStop(0.5,  '#9a6428');  // heavily worn crease area
  pvg.addColorStop(0.56, '#a87030');
  pvg.addColorStop(1,    '#c48848');
  ctx.fillStyle = pvg;
  ctx.beginPath();
  ctx.moveTo(-92, 112); ctx.lineTo(92, 112);
  ctx.lineTo(142, 624); ctx.lineTo(-142, 624);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0;

  // Side grain lines (wood-grain texture effect)
  ctx.strokeStyle = 'rgba(100,60,20,0.12)'; ctx.lineWidth = 1;
  [-60,-40,-20,20,40,60].forEach(dx => {
    ctx.beginPath();
    ctx.moveTo(dx * 0.95, 115); ctx.lineTo(dx * 1.55, 622);
    ctx.stroke();
  });

  // Worn foot-marks
  ctx.fillStyle = 'rgba(70,38,10,0.20)';
  [[10,330],[14,340],[-8,348],[16,356],[-12,362],[8,370]].forEach(([fx,fy]) => {
    ctx.beginPath(); ctx.ellipse(fx, fy, 9+Math.random()*4, 3, 0.3, 0, Math.PI*2); ctx.fill();
  });
  [[10,368],[14,378],[-8,386],[16,394],[-12,400]].forEach(([fx,fy]) => {
    ctx.beginPath(); ctx.ellipse(fx, fy, 8, 2.5, -0.2, 0, Math.PI*2); ctx.fill();
  });

  // ─── Crease lines ───
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-92, 498); ctx.lineTo(92, 498);   // lower batting crease
  ctx.moveTo(-55, 148); ctx.lineTo(55, 148);   // upper batting crease
  ctx.stroke();
  // Return creases
  ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  [[-32,135,-32,162],[32,135,32,162],[-32,484,-32,516],[32,484,32,516]].forEach(([x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });

  // ─── Stumps ───
  drawStumps(0, 138, 0.72);   // AI end (smaller in perspective)
  drawStumps(0, 496, 1.00);   // Player end (full size)

  ctx.restore();
}

function drawStumps(ox, oy, sc) {
  // 3 stump bodies
  [-12, 0, 12].forEach(dx => {
    const sg = ctx.createLinearGradient(ox+dx-3, oy, ox+dx+3, oy);
    sg.addColorStop(0, '#c8b870'); sg.addColorStop(0.5, '#f0e8b0'); sg.addColorStop(1, '#c0b060');
    ctx.fillStyle = sg;
    ctx.fillRect(ox+dx-2.5*sc, oy, 5*sc, 20*sc);
    // Stump top
    ctx.fillStyle = '#ffe8a0';
    ctx.beginPath(); ctx.arc(ox+dx, oy, 3*sc, Math.PI, 0); ctx.fill();
  });
  // Bail
  const bg = ctx.createLinearGradient(ox-16*sc, oy-3*sc, ox+16*sc, oy-3*sc);
  bg.addColorStop(0, '#c8a850'); bg.addColorStop(0.5, '#f0d880'); bg.addColorStop(1, '#c8a850');
  ctx.fillStyle = bg;
  ctx.fillRect(ox-16*sc, oy-4*sc, 32*sc, 4*sc);
}

function drawAimGuide() {
  const cx    = canvas.width / 2 + bowlAimX;
  const acol  = Math.abs(bowlAimX) < 25 ? '#16834f' : Math.abs(bowlAimX) < 55 ? '#b67817' : '#c63d3d';
  ctx.save();
  ctx.globalAlpha = 0.6; ctx.strokeStyle = acol; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(cx, 510);
  ctx.lineTo(canvas.width / 2 + bowlAimX * 0.3 + DELIVERIES[bowlDeliveryChoice].swing * -18, 152);
  ctx.stroke();
  ctx.setLineDash([]); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(canvas.width / 2 + bowlAimX * 0.3, 150, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.restore();
}

function drawPlayers() {
  if (phase === 'bowling') {
    drawPlayer(canvas.width / 2, 118, '#1b6dd4', false);   // AI batter
    drawBat(canvas.width / 2 + 36, 113, aiSwing);
    drawPlayer(canvas.width / 2, 525, jerseyColor, false);  // player bowler
    drawBowlerArm(canvas.width / 2, 520);
  } else {
    drawPlayer(canvas.width / 2, 525, jerseyColor, true);  // player batter
    drawPlayer(canvas.width / 2, 118, '#c93e3e', false);   // AI bowler
    drawBat(canvas.width / 2 + 36, 520, batterSwing);
  }
}

function drawPlayer(x, y, color, isBatter) {
  const safeColor = color && color.startsWith('#') ? color : '#0a66c2';

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(x+2, y+66, 19, 7, 0, 0, Math.PI*2); ctx.fill();

  // Legs (white cricket trousers with gradient)
  const lg = ctx.createLinearGradient(x-14, 0, x+14, 0);
  lg.addColorStop(0, '#c8d4de'); lg.addColorStop(1, '#e8eff5');
  ctx.fillStyle = lg;
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(x-13, y+18, 11, 46, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x+2,  y+18, 11, 46, 3); ctx.fill();
  } else {
    ctx.fillRect(x-13, y+18, 11, 46); ctx.fillRect(x+2, y+18, 11, 46);
  }
  // Shoes
  ctx.fillStyle = '#18182a';
  ctx.beginPath(); ctx.ellipse(x-8,  y+64, 11, 5, -0.18, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+8,  y+64, 11, 5,  0.18, 0, Math.PI*2); ctx.fill();

  // Jersey body gradient
  const jg = ctx.createLinearGradient(x-18, y-30, x+18, y+18);
  jg.addColorStop(0,   lighten(safeColor, 0.3));
  jg.addColorStop(0.5, safeColor);
  jg.addColorStop(1,   lighten(safeColor, -0.18));
  ctx.fillStyle = jg;
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(x-17, y-30, 34, 50, [6,6,2,2]); ctx.fill();
  } else {
    ctx.fillRect(x-17, y-30, 34, 50);
  }
  // Jersey number
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '700 9px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText('XI', x, y-10); ctx.textAlign = 'left';

  // Arms
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.strokeStyle = lighten(safeColor, -0.08);
  if (isBatter) {
    ctx.beginPath(); ctx.moveTo(x-15, y-12); ctx.lineTo(x-28, y-33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+15, y-12); ctx.lineTo(x+28, y-33); ctx.stroke();
    // Batting gloves
    ctx.fillStyle = '#222228';
    ctx.beginPath(); ctx.arc(x-28, y-33, 5.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+28, y-33, 5.5, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(x-15, y-12); ctx.lineTo(x-25, y+14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+15, y-12); ctx.lineTo(x+25, y+14); ctx.stroke();
  }
  ctx.lineCap = 'butt'; ctx.lineWidth = 1;

  // Head — skin gradient
  const hd = ctx.createRadialGradient(x-4, y-48, 2, x, y-42, 14);
  hd.addColorStop(0, '#e8b07a'); hd.addColorStop(1, '#c47840');
  ctx.fillStyle = hd;
  ctx.beginPath(); ctx.arc(x, y-42, 13, 0, Math.PI*2); ctx.fill();

  // Helmet (dome)
  const hg = ctx.createLinearGradient(x-14, y-60, x+14, y-38);
  hg.addColorStop(0, lighten(safeColor, 0.22)); hg.addColorStop(1, safeColor);
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(x, y-46, 15, Math.PI, 0); ctx.closePath(); ctx.fill();
  // Helmet peak (left side)
  ctx.fillStyle = lighten(safeColor, -0.12);
  ctx.beginPath(); ctx.moveTo(x-15, y-44); ctx.lineTo(x-22, y-38); ctx.lineTo(x-5, y-40); ctx.closePath(); ctx.fill();
  // Helmet highlight gloss
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.beginPath(); ctx.ellipse(x-4, y-55, 5, 3, -0.5, 0, Math.PI*2); ctx.fill();

  // Batter helmet grill (wire cage)
  if (isBatter) {
    ctx.strokeStyle = 'rgba(60,60,60,0.75)'; ctx.lineWidth = 1.4;
    [[x-5,y-40,x+13,y-29],[x-5,y-36,x+13,y-25],[x-3,y-32,x+11,y-22]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.lineWidth = 1;
  }
}

function drawBat(x, y, swing) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.76 - swing * 1.12);
  // Grip/handle
  const hg = ctx.createLinearGradient(-4, -96, 4, -68);
  hg.addColorStop(0, '#5a2e14'); hg.addColorStop(0.5, '#8a5028'); hg.addColorStop(1, '#5a2e14');
  ctx.fillStyle = hg;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-3.5, -96, 7, 28, 3); ctx.fill(); }
  else { ctx.fillRect(-3.5, -96, 7, 28); }
  // Blade
  const blade = ctx.createLinearGradient(-9, -74, 9, -74);
  blade.addColorStop(0,    '#b87a28');
  blade.addColorStop(0.25, '#e8c05a');
  blade.addColorStop(0.55, '#f0d070');
  blade.addColorStop(0.75, '#e8c05a');
  blade.addColorStop(1,    '#b07020');
  ctx.fillStyle = blade;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-9, -74, 18, 84, [2,2,7,7]); ctx.fill(); }
  else { ctx.fillRect(-9, -74, 18, 84); }
  // Edge highlight (3D depth)
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-9, -74, 5, 84);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(4, -74, 5, 84);
  ctx.restore();
}

function drawBowlerArm(x, y) {
  const t = Date.now() * 0.003;
  const angle = bowlActive ? -2.45 : -1.0 + Math.sin(t) * 0.1;
  ctx.save(); ctx.translate(x + 16, y - 22);
  ctx.lineWidth = 8; ctx.lineCap = 'round';
  // Upper arm
  const ac = lighten(jerseyColor || '#0a66c2', -0.1);
  ctx.strokeStyle = ac; ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -36); ctx.stroke();
  // Forearm (slight angle)
  ctx.rotate(0.42);
  ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -64); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  if (!bowlActive) {
    // Gradient ball in hand
    const bg = ctx.createRadialGradient(-3, -72, 1, 0, -70, 10);
    bg.addColorStop(0, '#f04848'); bg.addColorStop(0.5, '#c01818'); bg.addColorStop(1, '#7a0808');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, -70, 10, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -70, 6, -0.6, 0.6); ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.restore();
}

function drawBall() {
  if (!ball.visible) return;
  const r = ball.radius;
  // Shadow beneath ball
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(ball.x+3, ball.y+r*0.55, r*0.9, r*0.35, 0, 0, Math.PI*2); ctx.fill();
  // Ball gradient (lit from top-left)
  const bg = ctx.createRadialGradient(ball.x - r*0.38, ball.y - r*0.38, 1, ball.x, ball.y, r);
  bg.addColorStop(0,   '#f05858');
  bg.addColorStop(0.4, '#d01a1a');
  bg.addColorStop(1,   '#7a0606');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI*2); ctx.fill();
  // Seam lines
  ctx.strokeStyle = 'rgba(255,255,255,0.78)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, r*0.65, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(ball.x, ball.y, r*0.65, Math.PI-0.6, Math.PI+0.6); ctx.stroke();
  // Shine spot
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.arc(ball.x - r*0.32, ball.y - r*0.32, r*0.28, 0, Math.PI*2); ctx.fill();
  ctx.lineWidth = 1;
}

function drawOverlay() {
  // ── Message bar (glassmorphism style) ──
  ctx.fillStyle = 'rgba(6,14,26,0.80)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(18, 160, 460, 52, 8); ctx.fill(); }
  else { ctx.fillRect(18, 160, 460, 52); }
  // Left phase colour accent stripe
  const accentCol = phase === 'bowling' ? '#16834f' : phase === 'result' ? '#b67817' : '#0a66c2';
  ctx.fillStyle = accentCol; ctx.fillRect(18, 160, 5, 52);
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '600 15.5px Segoe UI';
  ctx.fillText(message.slice(0, 56), 32, 191);

  // ── Phase badge (top-right corner) ──
  const label = phase === 'bowling' ? 'BOWLING' : phase === 'batting' ? 'BATTING' : phase === 'result' ? 'RESULT' : '';
  if (label) {
    const bc = phase === 'bowling' ? '#16834f' : phase === 'result' ? '#b67817' : '#0a66c2';
    ctx.fillStyle = bc;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(canvas.width-152, 160, 134, 38, [0,8,8,0]); ctx.fill(); }
    else { ctx.fillRect(canvas.width-152, 160, 134, 38); }
    ctx.fillStyle = 'white'; ctx.font = '700 12px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(`● ${label}`, canvas.width - 85, 184);
  }

  // ── Innings badge ──
  if (isFullMatch && (phase === 'batting' || phase === 'bowling')) {
    ctx.fillStyle = 'rgba(182,120,23,0.90)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(canvas.width-152, 204, 134, 26, [0,0,8,0]); ctx.fill(); }
    else { ctx.fillRect(canvas.width-152, 204, 134, 26); }
    ctx.fillStyle = 'white'; ctx.font = '700 11px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(`INNINGS ${inningsNum} OF 2`, canvas.width - 85, 222);
  }

  // ── Commentary bar (fades out, below message) ──
  if (commentaryTimer > 0 && commentaryText) {
    const alpha = Math.min(1, commentaryTimer * 1.8);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(4,10,20,0.82)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(18, 216, 540, 38, [0,0,8,8]); ctx.fill(); }
    else { ctx.fillRect(18, 216, 540, 38); }
    ctx.fillStyle = '#f5c842'; ctx.font = '600 14px Segoe UI'; ctx.textAlign = 'left';
    ctx.fillText(`▸ ${commentaryText.slice(0, 70)}`, 30, 240);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function drawFielders() {
  if (!fielders.length) return;
  const col = phase === 'bowling' ? '#c93e3e' : '#2a6e42';
  fielders.forEach(f => {
    // Running glow
    if (f.running) {
      ctx.fillStyle = 'rgba(255,255,150,0.22)';
      ctx.beginPath(); ctx.arc(f.x, f.y - 4, 18, 0, Math.PI*2); ctx.fill();
    }
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath(); ctx.ellipse(f.x+1, f.y + 22, 10, 3.5, 0, 0, Math.PI*2); ctx.fill();
    // Legs
    const lg = ctx.createLinearGradient(f.x-7, 0, f.x+7, 0);
    lg.addColorStop(0, '#b8c8d4'); lg.addColorStop(1, '#d8e4ec');
    ctx.fillStyle = lg;
    ctx.fillRect(f.x - 6, f.y + 8, 5, 14); ctx.fillRect(f.x + 1, f.y + 8, 5, 14);
    // Body
    const bj = ctx.createLinearGradient(f.x-7, f.y-14, f.x+7, f.y+8);
    bj.addColorStop(0, lighten(col, 0.24)); bj.addColorStop(1, col);
    ctx.fillStyle = bj;
    ctx.fillRect(f.x - 7, f.y - 2, 14, 11);
    // Head + helmet
    const hd = ctx.createRadialGradient(f.x-2, f.y-14, 1, f.x, f.y-10, 8);
    hd.addColorStop(0, lighten(col, 0.28)); hd.addColorStop(1, col);
    ctx.fillStyle = hd;
    ctx.beginPath(); ctx.arc(f.x, f.y - 10, 8, 0, Math.PI*2); ctx.fill();
    // Helmet shine
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(f.x - 2, f.y - 14, 3, 0, Math.PI*2); ctx.fill();
  });
}

function drawBallArc() {
  if (!ballArc) return;
  const p    = Math.min(1, ballArc.t / ballArc.duration);
  const x    = ballArc.sx + (ballArc.ex - ballArc.sx) * p;
  const arcH = ballArc.height * Math.sin(p * Math.PI);
  const y    = ballArc.sy + (ballArc.ey - ballArc.sy) * p - arcH;

  // Sync ball flight to 3D scene
  const xOff3d = ((ballArc.ex - canvas.width / 2) / (canvas.width / 2)) * 18;
  const arcH3d = Math.max(2, (ballArc.height / 220) * 12);
  window.__syncBall?.(p, xOff3d, arcH3d);

  // Motion trail (4 ghost balls fading out)
  for (let i = 1; i <= 4; i++) {
    const tp   = Math.max(0, p - i * 0.055);
    const tx   = ballArc.sx + (ballArc.ex - ballArc.sx) * tp;
    const tah  = ballArc.height * Math.sin(tp * Math.PI);
    const ty   = ballArc.sy + (ballArc.ey - ballArc.sy) * tp - tah;
    const talp = (1 - i * 0.22) * 0.35;
    ctx.globalAlpha = Math.max(0, talp);
    ctx.fillStyle = '#d82020';
    ctx.beginPath(); ctx.arc(tx, ty, 9 - i, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Shadow on ground
  const gndY = ballArc.sy + (ballArc.ey - ballArc.sy) * p;
  const shadowSz = 8 * (1 - p * 0.45);
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.beginPath(); ctx.ellipse(x+2, gndY + 5, shadowSz, shadowSz * 0.38, 0, 0, Math.PI*2); ctx.fill();

  // Ball with gradient
  const bg = ctx.createRadialGradient(x - 3.5, y - 3.5, 1, x, y, 10);
  bg.addColorStop(0, '#f05858'); bg.addColorStop(0.45, '#d01818'); bg.addColorStop(1, '#800808');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.fill();
  // Seam
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y, 6.5, -0.6, 0.6); ctx.stroke();
  // Glow when high in air
  if (arcH > 60) {
    ctx.globalAlpha = Math.min(0.55, arcH / ballArc.height * 0.7);
    const glow = ctx.createRadialGradient(x, y, 5, x, y, 28);
    glow.addColorStop(0, 'rgba(255,120,120,0.7)');
    glow.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Shine spot
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.arc(x - 3.5, y - 3.5, 2.8, 0, Math.PI*2); ctx.fill();
  ctx.lineWidth = 1;
}

function drawOverSummary() {
  if (!overSummaryData || overSummaryData.timer <= 0) return;
  const od = overSummaryData;
  const cx = canvas.width / 2;
  const x  = cx - 195, y = 170, w = 390, h = 222;
  // Slide-in alpha
  const alpha = Math.min(1, od.timer * 2, (3.5 - od.timer) * 3);
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = 'rgba(8,18,28,0.92)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 14); else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.strokeStyle = '#b67817'; ctx.lineWidth = 2; ctx.stroke();
  // Title
  ctx.fillStyle = '#b67817'; ctx.font = '700 13px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText(`▸ OVER ${od.overNum} COMPLETE ◂`, cx, y + 28);
  // Runs
  ctx.fillStyle = 'white'; ctx.font = '700 42px Segoe UI';
  ctx.fillText(od.runs, cx, y + 82);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '400 16px Segoe UI';
  ctx.fillText('runs this over', cx, y + 106);
  if (od.wickets > 0) {
    ctx.fillStyle = '#e05050'; ctx.font = '700 15px Segoe UI';
    ctx.fillText(`${od.wickets} wicket${od.wickets !== 1 ? 's' : ''}`, cx, y + 128);
  }
  // Ball-by-ball dots
  const bx0 = cx - ((od.balls.length - 1) * 34) / 2;
  od.balls.forEach((b, i) => {
    const bx = bx0 + i * 34;
    ctx.fillStyle = b.wicket ? '#c63d3d' : b.runs >= 4 ? '#16834f' : b.runs === 0 ? '#445' : '#0a66c2';
    ctx.beginPath(); ctx.arc(bx, y + 168, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = '700 12px Segoe UI';
    ctx.fillText(b.wicket ? 'W' : String(b.runs), bx, y + 173);
  });
  ctx.textAlign = 'left'; ctx.globalAlpha = 1; ctx.lineWidth = 1;
}

function drawBatterCard() {
  if (phase !== 'batting' || !running || !fielders.length) return;
  const rx = canvas.width - 14, y = 110;
  const sc = SHOT_CONFIG[shotIntent] || SHOT_CONFIG.straight;
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rx - 224, y, 224, 70, 8); else ctx.rect(rx - 224, y, 224, 70); ctx.fill();
  // Jersey colour stripe on left edge
  ctx.fillStyle = jerseyColor;
  ctx.fillRect(rx - 224, y, 5, 70);
  ctx.fillStyle = 'white'; ctx.font = '700 20px Segoe UI'; ctx.textAlign = 'right';
  ctx.fillText(`${teamName.split(' ')[0]} ${batter.runs}*(${batter.balls})`, rx - 8, y + 26);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '12px Segoe UI';
  ctx.fillText(`4s: ${batter.fours}   6s: ${batter.sixes}`, rx - 8, y + 44);
  // Shot type badge
  ctx.fillStyle = sc.risk > 0.08 ? '#e8a020' : '#16c984';
  ctx.font = '700 11px Segoe UI';
  ctx.fillText(`▶ ${sc.label}`, rx - 8, y + 62);
  ctx.textAlign = 'left';
}

function drawPowerPlayBadge() {
  if (!isPowerPlay()) return;
  const ov = phase === 'batting' ? Math.floor(balls / 6) + 1 : Math.floor(aiBalls / 6) + 1;
  ctx.fillStyle = 'rgba(22,201,132,0.88)';
  ctx.fillRect(canvas.width - 140, phase === 'bowling' ? 104 : 172, 112, 26);
  ctx.fillStyle = '#0b1a12'; ctx.font = '700 12px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText(`⚡ POWER PLAY ov.${ov}`, canvas.width - 84, phase === 'bowling' ? 121 : 189);
  ctx.textAlign = 'left';
}

function drawSeriesBadge() {
  if (!series) return;
  const cx = canvas.width / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(cx - 88, 26, 176, 32);
  ctx.fillStyle = '#f5c842'; ctx.font = '700 13px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText(`SERIES ${series.current}/${series.total} · Harish ${series.playerWins}-${series.aiWins} AI`, cx, 47);
  ctx.textAlign = 'left';
}

function drawRunRateGraph() {
  if (overRunHistory.length < 2 || phase === 'lobby' || phase === 'toss') return;
  const gx = 18, gy = canvas.height - 88, gw = 148, gh = 62;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(gx, gy, gw, gh + 20, 6); else ctx.rect(gx, gy, gw, gh + 20); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px Segoe UI';
  ctx.fillText('Runs / over', gx + 4, gy + 12);
  const recent = overRunHistory.slice(-10);
  const maxR = Math.max(...recent.map(o => o.runs), 6);
  const bw = (gw - 6) / recent.length - 2;
  recent.forEach((o, i) => {
    const bh = Math.max(4, (o.runs / maxR) * (gh - 10));
    const bx = gx + 3 + i * (bw + 2);
    const by = gy + 16 + (gh - 10) - bh;
    ctx.fillStyle = o.runs >= 12 ? '#b67817' : o.runs >= 8 ? '#16834f' : '#0a66c2';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'white'; ctx.font = '9px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(o.runs, bx + bw / 2, by - 2);
  });
  ctx.textAlign = 'left';
}

function drawMilestone() {
  if (!milestoneData || milestoneData.timer <= 0) return;
  const p = milestoneData.timer / 2.8;
  const alpha = Math.min(1, p * 4, (1 - p) * 4 + 0.3);
  const scale = 1 + (1 - p) * 0.12;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(canvas.width / 2, canvas.height / 2 - 55);
  ctx.scale(scale, scale);
  ctx.shadowColor = milestoneData.color; ctx.shadowBlur = 36;
  ctx.fillStyle = milestoneData.color;
  ctx.font = '700 54px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText(milestoneData.text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore(); ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

function drawWicketCelebration() {
  if (!wicketCelebration) return;
  const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.04;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2 - 36);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#c63d3d'; ctx.shadowBlur = 48;
  ctx.fillStyle = '#c63d3d'; ctx.font = '700 74px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText('WICKET!', 0, 0);
  ctx.shadowBlur = 0; ctx.fillStyle = 'white'; ctx.font = '700 70px Segoe UI';
  ctx.fillText('WICKET!', 0, 0);
  ctx.restore(); ctx.textAlign = 'left';
}

// ─── RAF loop ─────────────────────────────────────────────────────────────────
function loop() { update(); draw(); requestAnimationFrame(loop); }

// ─── Event listeners ─────────────────────────────────────────────────────────
document.querySelector('#startBtn').addEventListener('click', startMatch);
document.querySelector('#resetBtn').addEventListener('click', startMatch);

document.querySelector('#shotBtn').addEventListener('click', () => {
  if (phase === 'batting') playShot();
  else if (phase === 'bowling') releaseBowl();
});

document.querySelector('#bowlNowBtn')?.addEventListener('click', startBowling);
document.querySelector('#seriesBtn')?.addEventListener('click', startSeries);

// Mode card selection
document.querySelectorAll('.mode-card[data-mode]').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    matchMode = card.dataset.mode;
  });
});

// Bowling delivery selector (event delegation)
document.querySelector('#deliveryBtns')?.addEventListener('click', e => {
  const btn = e.target.closest('.delivery-btn');
  if (!btn) return;
  bowlDeliveryChoice = parseInt(btn.dataset.idx, 10);
  document.querySelectorAll('.delivery-btn').forEach((b, i) => {
    b.classList.toggle('active', i === bowlDeliveryChoice);
  });
  if (bowlTimingActive) {
    ballTypeEl.textContent = `Your delivery: ${DELIVERIES[bowlDeliveryChoice].name} · aim with A/D · Space to release`;
  }
});

// Career reset
document.querySelector('#clearCareerBtn')?.addEventListener('click', () => {
  career = { matches: 0, wins: 0, losses: 0, bestScore: 0, totalRuns: 0 };
  saveCareer();
});

connectBtn.addEventListener('click', connectMultiplayer);
readyBtn.addEventListener('click', toggleReady);
pingBtn.addEventListener('click', pingServer);
exportSummaryBtn.addEventListener('click', exportMatchSummary);

window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (phase === 'batting') playShot();
    else if (phase === 'bowling') releaseBowl();
  }
  if (e.key.toLowerCase() === 'a') {
    if (phase === 'batting') shotIntent = 'left';
    else if (phase === 'bowling') { bowlAimX = Math.max(-80, bowlAimX - 14); updateAimIndicator(); }
  }
  if (e.key.toLowerCase() === 'd') {
    if (phase === 'batting') shotIntent = 'right';
    else if (phase === 'bowling') { bowlAimX = Math.min(80, bowlAimX + 14); updateAimIndicator(); }
  }
  if (e.key.toLowerCase() === 's' && phase === 'batting') shotIntent = 'straight';
  // Extra shot types
  if (phase === 'batting') {
    if (e.key.toLowerCase() === 'q') shotIntent = 'pull';
    if (e.key.toLowerCase() === 'w') shotIntent = 'sweep';
    if (e.key.toLowerCase() === 'e') shotIntent = 'lateCut';
    if (e.key.toLowerCase() === 'r') shotIntent = 'reverseSweep';
  }
  // Delivery selection keys 1–6 (bowling phase)
  if (phase === 'bowling' && e.key >= '1' && e.key <= '6') {
    bowlDeliveryChoice = parseInt(e.key, 10) - 1;
    renderDeliveryBtns();
    if (bowlTimingActive) {
      ballTypeEl.textContent = `Your delivery: ${DELIVERIES[bowlDeliveryChoice].name} · aim with A/D · Space to release`;
    }
  }
});

window.addEventListener('keyup', () => {
  if (phase === 'batting') shotIntent = 'straight';
});

// ─── Touch controls ───────────────────────────────────────────────────────────
let touchX0 = 0, touchY0 = 0;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  touchX0 = e.touches[0].clientX;
  touchY0 = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const dx  = e.changedTouches[0].clientX - touchX0;
  const dy  = e.changedTouches[0].clientY - touchY0;
  const axs = Math.abs(dx), ays = Math.abs(dy);
  const isSwipe = axs > 28 || ays > 28;

  if (phase === 'batting') {
    if (isSwipe) {
      if (ays > axs) {
        // Vertical swipe: up = pull, down = sweep
        shotIntent = dy < 0 ? 'pull' : 'sweep';
      } else {
        // Horizontal: left = flick, right = cut
        shotIntent = dx < 0 ? 'left' : 'right';
      }
    }
    playShot();
    setTimeout(() => { shotIntent = 'straight'; }, 350);
  } else if (phase === 'bowling') {
    if (axs > 28) {
      bowlAimX = Math.max(-80, Math.min(80, bowlAimX + (dx > 0 ? 22 : -22)));
      updateAimIndicator();
    } else {
      releaseBowl();
    }
  }
}, { passive: false });

// Theme + customise event listeners
document.querySelector('#themeBtn')?.addEventListener('click', toggleTheme);
document.querySelector('#customiseBtn')?.addEventListener('click', openCustomiseModal);
document.querySelector('#customiseClose')?.addEventListener('click', closeCustomiseModal);
document.querySelector('#customiseSave')?.addEventListener('click', saveCustomise);
document.querySelectorAll('.jersey-swatch').forEach(s => {
  s.addEventListener('click', () => {
    jerseyColor = s.dataset.color;
    document.querySelectorAll('.jersey-swatch').forEach(sw => sw.classList.remove('selected'));
    s.classList.add('selected');
  });
});
['Power','Timing','Tech'].forEach(n =>
  document.querySelector(`#stat${n}`)?.addEventListener('input', updateStatLabels)
);
document.querySelector('#matchHistoryToggle')?.addEventListener('click', () => {
  const h = document.querySelector('#matchHistory');
  if (h) h.style.display = h.style.display === 'none' ? '' : 'none';
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadProfile(); applyTheme();
updateHud(); renderShotMap(); renderSquad(); renderScorecard(); renderCareer();
loop();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
