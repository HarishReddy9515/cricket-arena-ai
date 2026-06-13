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

const sndCrack  = () => { tone(260, 'sawtooth', 0.06, 0.5); tone(180, 'square', 0.1, 0.3, 0.02); noise(0.15, 0.2); };
const sndSix    = () => { [440,550,660,770].forEach((f,i) => tone(f,'sine',0.3,0.4,i*0.08)); noise(1.2, 0.1); };
const sndBound  = () => { [350,450,500].forEach((f,i) => tone(f,'sine',0.25,0.3,i*0.06)); noise(0.8, 0.09); };
const sndWkt    = () => { tone(120,'sawtooth',0.4,0.5); tone(80,'square',0.6,0.4,0.05); noise(0.5,0.08); };
const sndDot    = () => tone(200,'sine',0.08,0.15);
const sndSingle = () => { tone(300,'sine',0.1,0.25); noise(0.1,0.1); };

function playOutcomeSound(out) {
  if (out.wicket)       sndWkt();
  else if (out.runs>=6) sndSix();
  else if (out.runs>=4) sndBound();
  else if (out.runs===0) sndDot();
  else                  sndSingle();
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

  updateHud(); renderShotMap(); renderScorecard();
  setTimeout(queueDelivery, 1250);
}

function resolveOutcome(q) {
  const ba    = shotIntent === 'left' ? 220 : shotIntent === 'right' ? 320 : 270;
  const angle = ba + (Math.random() * 36 - 18);
  if (q < 0.18) return { runs: 0, wicket: true,  message: 'Edge! Caught behind.',            angle, distance: 35 };
  if (q < 0.35) return { runs: 0, wicket: false, message: 'Beaten. Dot ball.',               angle, distance: 28 };
  if (q < 0.55) return { runs: 1, wicket: false, message: 'Soft hands. Quick single.',       angle, distance: 45 };
  if (q < 0.72) return { runs: 2, wicket: false, message: 'Pierced the gap. Two runs.',      angle, distance: 62 };
  if (q < 0.88) return { runs: 4, wicket: false, message: 'Cracking boundary!',              angle, distance: 82 };
  return              { runs: 6, wicket: false, message: 'Massive six into the crowd!',  angle, distance: 96 };
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
  drawStadium(); drawPitch();
  drawFielders();
  if (phase === 'bowling') drawAimGuide();
  drawPlayers();
  if (ballArc) drawBallArc(); else drawBall();
  drawOverlay();
  drawBatterCard();
  drawPowerPlayBadge();
  drawSeriesBadge();
  drawRunRateGraph();
  drawOverSummary();
  drawMilestone();
  drawWicketCelebration();
}

// Pre-computed crowd arc positions (calculated once, not per frame)
const _crowdArcX = Array.from({ length: 18 }, (_, i) => 80 + i * 58);
const _crowdArcY = Array.from({ length: 18 }, (_, i) => 96 + Math.sin(i) * 18);
// Cached gradient (created once, reused every frame)
let _bgGradient = null;

function drawStadium() {
  if (!_bgGradient) {
    _bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    _bgGradient.addColorStop(0, '#0b1621');
    _bgGradient.addColorStop(0.5, '#17391f');
    _bgGradient.addColorStop(1, '#1f6b37');
  }
  ctx.fillStyle = _bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < 18; i++) {
    ctx.beginPath(); ctx.arc(_crowdArcX[i], _crowdArcY[i], 22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(130 + i * 210, 38, 5, 92);
    ctx.beginPath(); ctx.arc(132 + i * 210, 34, 18, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPitch() {
  ctx.save(); ctx.translate(canvas.width / 2, 0);
  ctx.fillStyle = '#b9874f';
  ctx.beginPath();
  ctx.moveTo(-92, 112); ctx.lineTo(92, 112); ctx.lineTo(142, 620); ctx.lineTo(-142, 620);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-92, 500); ctx.lineTo(92, 500);
  ctx.moveTo(-55, 148); ctx.lineTo(55, 148);
  ctx.stroke(); ctx.restore();
}

function drawAimGuide() {
  const cx    = canvas.width / 2 + bowlAimX;
  const color = Math.abs(bowlAimX) < 25 ? '#16834f' : Math.abs(bowlAimX) < 55 ? '#b67817' : '#c63d3d';
  ctx.save();
  ctx.globalAlpha = 0.55; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, 510);
  ctx.lineTo(canvas.width / 2 + bowlAimX * 0.3 + DELIVERIES[bowlDeliveryChoice].swing * -18, 150);
  ctx.stroke();
  ctx.setLineDash([]); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(canvas.width / 2 + bowlAimX * 0.3, 148, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.restore();
}

function drawPlayers() {
  if (phase === 'bowling') {
    // AI batter at top, player bowler at bottom
    drawPlayer(canvas.width / 2, 118, '#1b66c9', true);
    drawBat(canvas.width / 2 + 34, 113, aiSwing);
    drawPlayer(canvas.width / 2, 525, '#c93e3e', false);
    drawBowlerArm(canvas.width / 2, 520);
  } else {
    // Player batter at bottom, AI bowler at top
    drawPlayer(canvas.width / 2, 525, '#1b66c9', true);
    drawPlayer(canvas.width / 2, 118, '#c93e3e', false);
    drawBat(canvas.width / 2 + 34, 520, batterSwing);
  }
}

function drawPlayer(x, y, color, batter) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - 42, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 16, y - 26, 32, 46);
  ctx.fillStyle = batter ? '#ffffff' : '#f4f4f4';
  ctx.fillRect(x - 21, y + 18, 12, 42);
  ctx.fillRect(x + 9,  y + 18, 12, 42);
}

function drawBat(x, y, swing) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.7 - swing * 1.1);
  ctx.fillStyle = '#d7aa64'; ctx.fillRect(-5, -68, 10, 78);
  ctx.fillStyle = '#8b5d2d'; ctx.fillRect(-9, -88, 18, 26);
  ctx.restore();
}

function drawBowlerArm(x, y) {
  const angle = bowlActive ? -2.2 : -1.0 + Math.sin(Date.now() * 0.003) * 0.08;
  ctx.save(); ctx.translate(x + 14, y - 20); ctx.rotate(angle);
  ctx.strokeStyle = '#c93e3e'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -52); ctx.stroke();
  if (!bowlActive) {
    ctx.fillStyle = '#d22f2f';
    ctx.beginPath(); ctx.arc(0, -52, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(0, -52, 5, -0.7, 0.7); ctx.stroke();
  }
  ctx.restore();
}

function drawBall() {
  if (!ball.visible) return;
  ctx.fillStyle = '#d22f2f';
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius * 0.62, -0.7, 0.7); ctx.stroke();
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(28, 28, 420, 62);
  ctx.fillStyle = 'white'; ctx.font = '700 21px Segoe UI';
  ctx.fillText(message.slice(0, 55), 46, 67);

  const label = phase === 'bowling' ? 'BOWLING' : phase === 'batting' ? 'BATTING' : '';
  const bg    = phase === 'bowling' ? 'rgba(22,131,79,0.85)' : 'rgba(10,102,194,0.85)';
  if (label) {
    ctx.fillStyle = bg; ctx.fillRect(canvas.width - 140, 28, 112, 36);
    ctx.fillStyle = 'white'; ctx.font = '700 13px Segoe UI';
    ctx.fillText(`${label} PHASE`, canvas.width - 132, 52);
  }

  // Full match innings badge
  if (isFullMatch && (phase === 'batting' || phase === 'bowling')) {
    ctx.fillStyle = 'rgba(182,120,23,0.85)'; ctx.fillRect(canvas.width - 140, 70, 112, 28);
    ctx.fillStyle = 'white'; ctx.font = '700 12px Segoe UI';
    ctx.fillText(`INNINGS ${inningsNum} of 2`, canvas.width - 132, 89);
  }

  // Commentary text (fades out)
  if (commentaryTimer > 0 && commentaryText) {
    const alpha = Math.min(1, commentaryTimer * 1.5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(28, 100, 560, 44);
    ctx.fillStyle = '#f5c842'; ctx.font = '600 16px Segoe UI';
    ctx.fillText(commentaryText.slice(0, 68), 42, 127);
    ctx.globalAlpha = 1;
  }
}

function drawFielders() {
  if (!fielders.length) return;
  fielders.forEach(f => {
    const col = (phase === 'bowling') ? '#c93e3e' : '#2a7f4e';
    // Glow when running
    if (f.running) {
      ctx.fillStyle = 'rgba(255,255,180,0.25)';
      ctx.beginPath(); ctx.arc(f.x, f.y - 8, 15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(f.x, f.y - 9, 7, 0, Math.PI * 2); ctx.fill(); // head
    ctx.fillRect(f.x - 6, f.y - 2, 12, 15);  // body
    ctx.fillRect(f.x - 5, f.y + 13, 4, 9);   // left leg
    ctx.fillRect(f.x + 1,  f.y + 13, 4, 9);  // right leg
  });
}

function drawBallArc() {
  if (!ballArc) return;
  const p = Math.min(1, ballArc.t / ballArc.duration);
  const x = ballArc.sx + (ballArc.ex - ballArc.sx) * p;
  const h = ballArc.height * Math.sin(p * Math.PI);
  const y = ballArc.sy + (ballArc.ey - ballArc.sy) * p - h;
  // Shadow on ground
  const gndY = ballArc.sy + (ballArc.ey - ballArc.sy) * p;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(x, gndY + 4, 7 * (1 - p * 0.5), 3, 0, 0, Math.PI * 2); ctx.fill();
  // Ball
  ctx.fillStyle = '#d22f2f';
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.82)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 5.5, -0.7, 0.7); ctx.stroke();
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
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rx - 218, y, 218, 54, 8); else ctx.rect(rx - 218, y, 218, 54); ctx.fill();
  ctx.fillStyle = 'white'; ctx.font = '700 20px Segoe UI'; ctx.textAlign = 'right';
  ctx.fillText(`Harish ${batter.runs}*(${batter.balls})`, rx - 8, y + 28);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '12px Segoe UI';
  ctx.fillText(`4s: ${batter.fours}   6s: ${batter.sixes}`, rx - 8, y + 46);
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
  const dx = e.changedTouches[0].clientX - touchX0;
  const dy = e.changedTouches[0].clientY - touchY0;
  const swipe = Math.abs(dx) > 30;

  if (phase === 'batting') {
    if (swipe) shotIntent = dx < 0 ? 'left' : 'right';
    playShot();
    setTimeout(() => { shotIntent = 'straight'; }, 300);
  } else if (phase === 'bowling') {
    if (swipe) {
      bowlAimX = Math.max(-80, Math.min(80, bowlAimX + (dx > 0 ? 20 : -20)));
      updateAimIndicator();
    } else {
      releaseBowl();
    }
  }
}, { passive: false });

// ─── Init ─────────────────────────────────────────────────────────────────────
updateHud(); renderShotMap(); renderSquad(); renderScorecard(); renderCareer();
loop();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
