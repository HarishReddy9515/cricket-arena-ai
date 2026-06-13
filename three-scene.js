import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const viewport = document.querySelector('#threeViewport');
const toggle   = document.querySelector('#toggle3dBtn');

let scene, camera, renderer, clock;
let active = false;

// Scene objects
let ball3d, bat3d, batter3d, bowler3d;
let batArm, bowlArm;
let stumpGroupBat, stumpGroupBowl;
let scoreboard, scoreboardCtx, scoreboardTexture;
let crowdDots = [];
let trailMeshes = [];

const TRAIL_LEN = 12;
const STUMP_MAT = new THREE.MeshStandardMaterial({ color: 0xf0e8c8, roughness: 0.65 });
const BAIL_MAT  = new THREE.MeshStandardMaterial({ color: 0xd9c28a, roughness: 0.6  });

// ─── Init ─────────────────────────────────────────────────────────────────────
function initThreeStadium() {
  if (!viewport || renderer) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x061018);
  scene.fog = new THREE.Fog(0x061018, 60, 220);

  camera = new THREE.PerspectiveCamera(55, viewport.clientWidth / viewport.clientHeight, 0.1, 500);
  camera.position.set(0, 28, 68);
  camera.lookAt(0, 2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  viewport.innerHTML = '';
  viewport.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  buildLights();
  buildGround();
  buildStumps(-22, 1);
  buildStumps(22, -1);
  buildFloodlights();
  buildStadium();
  buildPlayers();
  buildBall();
  buildBallTrail();
  buildScoreboard();

  animate();
}

// ─── Lights ───────────────────────────────────────────────────────────────────
function buildLights() {
  scene.add(new THREE.AmbientLight(0x8ab0cc, 0.6));

  const hemi = new THREE.HemisphereLight(0xd8f3ff, 0x1c6b2e, 1.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sun.position.set(-40, 70, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far  = 180;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
  sun.shadow.camera.right = sun.shadow.camera.top   =  80;
  sun.shadow.bias = -0.001;
  scene.add(sun);
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function buildGround() {
  // Outfield
  const outfield = new THREE.Mesh(
    new THREE.CircleGeometry(72, 128),
    new THREE.MeshStandardMaterial({ color: 0x1d7a3e, roughness: 0.85, metalness: 0 })
  );
  outfield.rotation.x = -Math.PI / 2;
  outfield.receiveShadow = true;
  scene.add(outfield);

  // Inner circle (30-yard circle visual ring)
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(27, 27.5, 80),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.02;
  scene.add(innerRing);

  // Pitch strip
  const pitch = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.18, 50),
    new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.88 })
  );
  pitch.position.y = 0.08;
  pitch.receiveShadow = true;
  scene.add(pitch);

  // Crease lines
  const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-20, 20].forEach(z => {
    const line = new THREE.Mesh(new THREE.BoxGeometry(10, 0.05, 0.18), creaseMat);
    line.position.set(0, 0.23, z);
    scene.add(line);
  });

  // Boundary rope (white dots)
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), ropeMat);
    dot.position.set(Math.cos(a) * 66, 0.25, Math.sin(a) * 66);
    scene.add(dot);
  }
}

// ─── Stumps ───────────────────────────────────────────────────────────────────
function buildStumps(z, dir) {
  const group = new THREE.Group();

  // 3 stumps
  [-0.8, 0, 0.8].forEach(x => {
    const stump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 2.14, 10),
      STUMP_MAT.clone()
    );
    stump.position.set(x, 1.07, 0);
    stump.castShadow = true;
    group.add(stump);

    // Spike at bottom
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.22, 8),
      STUMP_MAT.clone()
    );
    spike.position.set(x, 0, 0);
    group.add(spike);
  });

  // 2 bails
  [-0.4, 0.4].forEach(x => {
    const bail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.66, 8),
      BAIL_MAT.clone()
    );
    bail.rotation.z = Math.PI / 2;
    bail.position.set(x, 2.18, 0);
    group.add(bail);
  });

  group.position.set(0, 0, z);
  scene.add(group);

  if (dir > 0) stumpGroupBat  = group;
  else         stumpGroupBowl = group;
}

// ─── Floodlights ──────────────────────────────────────────────────────────────
function buildFloodlights() {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, metalness: 0.5, roughness: 0.4 });
  const positions = [[-65, 0], [65, 0], [0, -65], [0, 65], [-46, -46], [46, 46]];

  positions.forEach(([x, z]) => {
    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 38, 8), poleMat);
    pole.position.set(x, 19, z);
    pole.castShadow = false; // static, skip shadow map
    scene.add(pole);

    // Light head cluster
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xfff4b0, emissiveIntensity: 0.6 });
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.4), headMat);
        bulb.position.set(x + i * 1.6, 38.5, z + j * 1.6);
        scene.add(bulb);
      }
    }

    // Point light from top of pole
    const light = new THREE.PointLight(0xfff8e0, 80, 90, 1.5);
    light.position.set(x, 39, z);
    scene.add(light);
  });
}

// ─── Stadium ──────────────────────────────────────────────────────────────────
// Shared dummy for InstancedMesh matrix computation
const _dummy = new THREE.Object3D();
// Crowd instance data (for animation)
let _crowdInstances = []; // [{im, data:[{i, baseY, phase, x, z}]}]

function buildStadium() {
  // Stands — 3 tiers via InstancedMesh (108 blocks → 3 draw calls)
  const tierColors  = [0x1e3447, 0x162a38, 0x0f1e2a];
  const tierHeights = [3.5, 5.3, 7.1];
  tierColors.forEach((color, ring) => {
    const count = 32 + ring * 4;
    const geo   = new THREE.BoxGeometry(6.5, tierHeights[ring], 5);
    const mat   = new THREE.MeshLambertMaterial({ color }); // cheaper than MeshStandard
    const im    = new THREE.InstancedMesh(geo, mat, count);
    im.castShadow    = false; // static — never moves, skip shadow map
    im.receiveShadow = false;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 78 + ring * 7;
      _dummy.position.set(Math.cos(a) * r, 1.5 + ring * 2.4, Math.sin(a) * r);
      _dummy.rotation.y = -a;
      _dummy.updateMatrix();
      im.setMatrixAt(i, _dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
  });

  // Crowd — 6 InstancedMesh (one per color) → 6 draw calls instead of 320
  const crowdColors = [0xe8e8e8, 0xff8844, 0x44aaff, 0xffcc44, 0xff4488, 0x88ff44];
  const crowdGeo    = new THREE.SphereGeometry(0.30, 5, 4); // low-poly (sphere far away)
  const PER_COLOR   = 54;
  crowdDots         = []; // kept for animateCrowd interface compat
  _crowdInstances   = [];

  crowdColors.forEach(color => {
    const mat  = new THREE.MeshLambertMaterial({ color });
    const im   = new THREE.InstancedMesh(crowdGeo, mat, PER_COLOR);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.castShadow = false;
    const data = [];
    for (let i = 0; i < PER_COLOR; i++) {
      const a    = Math.random() * Math.PI * 2;
      const r    = 74 + Math.random() * 18;
      const x    = Math.cos(a) * r;
      const z    = Math.sin(a) * r;
      const baseY = 5 + Math.random() * 10;
      _dummy.position.set(x, baseY, z);
      _dummy.updateMatrix();
      im.setMatrixAt(i, _dummy.matrix);
      data.push({ i, baseY, phase: Math.random() * Math.PI * 2, x, z });
      crowdDots.push(im); // kept for interface compat (length check)
    }
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    _crowdInstances.push({ im, data });
  });
}

// ─── Players ──────────────────────────────────────────────────────────────────
function buildPlayers() {
  batter3d = createPlayerGroup(0x0a66c2);
  batter3d.position.set(0, 0, 20);
  scene.add(batter3d);

  bowler3d = createPlayerGroup(0xc53d3d);
  bowler3d.position.set(0, 0, -22);
  bowler3d.rotation.y = Math.PI;
  scene.add(bowler3d);

  // Bat as child of batter, parented to right arm
  bat3d = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 4.6, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xd7aa64, roughness: 0.55 })
  );
  bat3d.castShadow = true;
  bat3d.position.set(1.6, -1.8, 0);
  // batArm is the right arm group of batter
  batArm = batter3d.userData.armR;
  if (batArm) batArm.add(bat3d);
  else batter3d.add(bat3d);
}

function createPlayerGroup(color) {
  const group = new THREE.Group();
  const kit   = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const skin  = new THREE.MeshStandardMaterial({ color: 0xc58f62, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.55 });

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.78, 1.8, 8, 14), kit);
  body.castShadow = true; body.position.y = 2.1;
  group.add(body);

  // Head + helmet
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 18), skin);
  head.castShadow = true; head.position.y = 3.6;
  group.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 18, 18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 })
  );
  helmet.scale.y = 0.72;
  helmet.position.y = 3.78;
  group.add(helmet);

  // Visor
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.22, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.6 })
  );
  visor.position.set(0, 3.58, 0.48);
  group.add(visor);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.18, 1.2, 4, 8);
  const armL = new THREE.Group(); armL.position.set(-0.98, 2.8, 0); armL.rotation.z = 0.3;
  const armLMesh = new THREE.Mesh(armGeo, kit); armLMesh.castShadow = true;
  armL.add(armLMesh); group.add(armL);

  const armR = new THREE.Group(); armR.position.set(0.98, 2.8, 0); armR.rotation.z = -0.3;
  const armRMesh = new THREE.Mesh(armGeo, kit); armRMesh.castShadow = true;
  armR.add(armRMesh); group.add(armR);
  group.userData.armR = armR;
  group.userData.armL = armL;

  // Legs
  [-0.38, 0.38].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.5, 4, 8), white);
    leg.position.set(x, 0.72, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  return group;
}

// ─── Ball ─────────────────────────────────────────────────────────────────────
function buildBall() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.38, metalness: 0.05 });
  ball3d = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 24), mat);
  ball3d.castShadow = true;
  ball3d.position.set(0, 0.5, -22);
  scene.add(ball3d);

  // Seam line
  const seamMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const pts = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.37, Math.sin(a) * 0.18, 0));
  }
  const seam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), seamMat);
  ball3d.add(seam);
}

// ─── Ball trail ───────────────────────────────────────────────────────────────
function buildBallTrail() {
  for (let i = 0; i < TRAIL_LEN; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18 - i * 0.01, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff6633,
        transparent: true,
        opacity: 0
      })
    );
    mesh.visible = false;
    scene.add(mesh);
    trailMeshes.push(mesh);
  }
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────
function buildScoreboard() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  scoreboardCtx = canvas.getContext('2d');

  scoreboardTexture = new THREE.CanvasTexture(canvas);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 5),
    new THREE.MeshBasicMaterial({ map: scoreboardTexture, side: THREE.DoubleSide })
  );
  board.position.set(0, 22, -82);
  scene.add(board);
  scoreboard = board;
  updateScoreboard('0/0', '0.0', '—');
}

function updateScoreboard(score, overs, need) {
  if (!scoreboardCtx || !scoreboardTexture) return;
  const c = scoreboardCtx;
  c.fillStyle = '#0d1b2a';
  c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#ffffff';
  c.font = 'bold 52px monospace';
  c.fillText(score, 24, 72);
  c.font = 'bold 28px monospace';
  c.fillStyle = '#aaddff';
  c.fillText(`Overs: ${overs}`, 220, 45);
  c.fillText(`Need: ${need}`, 220, 85);
  scoreboardTexture.needsUpdate = true;
}

// ─── Animate ──────────────────────────────────────────────────────────────────
const trailPositions = [];
let celebTimer  = 0;
let _frameCount = 0;

function animate() {
  requestAnimationFrame(animate);
  _frameCount++;
  const t = clock.getElapsedTime();

  animatePlayers(t);
  animateBall(t);
  // Crowd only needs to update every 8th frame (~7.5 fps) — no one notices
  if (_frameCount % 8 === 0) animateCrowd(t);
  if (celebTimer > 0) celebTimer -= 0.016;

  renderer.render(scene, camera);
}

function animatePlayers(t) {
  if (!batter3d || !bowler3d) return;

  // Batter — subtle idle sway
  batter3d.rotation.y = Math.sin(t * 1.4) * 0.06;
  const armR = batter3d.userData.armR;
  const armL = batter3d.userData.armL;
  if (armR) armR.rotation.z = -0.4 + Math.sin(t * 2.5) * 0.12;
  if (armL) armL.rotation.z =  0.4 - Math.sin(t * 2.5) * 0.12;

  // Bowler — run-up + delivery arm swing
  bowler3d.position.z = -22 + Math.sin(t * 1.8) * 1.4;
  const bArmR = bowler3d.userData.armR;
  const bArmL = bowler3d.userData.armL;
  if (bArmR) {
    bArmR.rotation.z = -0.3 + Math.sin(t * 4.5) * 0.7;
    bArmR.rotation.x = Math.sin(t * 4.5 + 1) * 0.5;
  }
  if (bArmL) {
    bArmL.rotation.z =  0.3 + Math.sin(t * 4.5 + Math.PI) * 0.4;
  }
}

function animateBall(t) {
  if (!ball3d) return;
  // Simulate ball flying between players
  const cycleT = (t * 0.6) % 1;
  const z = -22 + cycleT * 44;      // bowler end (-22) → batter end (+22)
  const arc = Math.sin(cycleT * Math.PI) * 5;
  const swingX = Math.sin(cycleT * Math.PI * 2) * 1.2;
  ball3d.position.set(swingX, 0.6 + arc, z);
  ball3d.rotation.x += 0.18;
  ball3d.rotation.z += 0.1;

  // Trail
  trailPositions.push(ball3d.position.clone());
  if (trailPositions.length > TRAIL_LEN) trailPositions.shift();
  trailMeshes.forEach((m, i) => {
    const pos = trailPositions[trailPositions.length - 1 - i];
    if (pos) {
      m.position.copy(pos);
      m.material.opacity = (1 - i / TRAIL_LEN) * 0.45;
      m.visible = true;
    } else {
      m.visible = false;
    }
  });
}

function animateCrowd(t) {
  // Update InstancedMesh matrices (called every 8th frame only)
  _crowdInstances.forEach(({ im, data }) => {
    data.forEach(d => {
      _dummy.position.set(d.x, d.baseY + Math.sin(t * 1.6 + d.phase) * 0.35, d.z);
      _dummy.updateMatrix();
      im.setMatrixAt(d.i, _dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });
}

// ─── Wicket celebration ───────────────────────────────────────────────────────
export function celebrateWicket() {
  if (!stumpGroupBat) return;
  celebTimer = 1.5;
  // Knock bails off (tilt the group)
  new Array(8).fill(0).forEach((_, i) => {
    setTimeout(() => {
      if (stumpGroupBat) {
        stumpGroupBat.rotation.z = Math.sin(i) * 0.3;
        stumpGroupBat.position.y = i < 4 ? i * 0.05 : 0;
      }
    }, i * 80);
  });
  setTimeout(() => { if (stumpGroupBat) { stumpGroupBat.rotation.z = 0; stumpGroupBat.position.y = 0; } }, 900);
}

// ─── Scoreboard update called from app.js ─────────────────────────────────────
export function syncScoreboard(score, overs, need) {
  updateScoreboard(score, overs, need);
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  if (!renderer || !viewport) return;
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

// Expose scoreboard sync globally so app.js (non-module) can call it
window.__syncScoreboard = syncScoreboard;

// ─── Toggle 2D / 3D ───────────────────────────────────────────────────────────
toggle?.addEventListener('click', () => {
  active = !active;
  viewport.classList.toggle('active', active);
  toggle.textContent = active ? '2D Gameplay' : '3D Stadium';
  if (active) {
    initThreeStadium();
    resize();
  }
});

window.addEventListener('resize', resize);
