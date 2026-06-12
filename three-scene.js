import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const viewport = document.querySelector("#threeViewport");
const toggle = document.querySelector("#toggle3dBtn");

let scene;
let camera;
let renderer;
let ball;
let batter;
let bowler;
let bat;
let clock;
let active = false;

function initThreeStadium() {
  if (!viewport || renderer) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x061018);
  scene.fog = new THREE.Fog(0x061018, 40, 180);

  camera = new THREE.PerspectiveCamera(58, viewport.clientWidth / viewport.clientHeight, 0.1, 500);
  camera.position.set(0, 30, 72);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.innerHTML = "";
  viewport.appendChild(renderer.domElement);

  clock = new THREE.Clock();
  buildLights();
  buildGround();
  buildStadium();
  buildPlayers();
  buildBall();
  animate();
}

function buildLights() {
  const hemi = new THREE.HemisphereLight(0xd8f3ff, 0x16351f, 1.4);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(-35, 65, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  scene.add(sun);

  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(0xffffff, 120, 130);
    light.position.set(i < 2 ? -45 : 45, 36, i % 2 ? -38 : 38);
    scene.add(light);
  }
}

function buildGround() {
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(68, 96),
    new THREE.MeshStandardMaterial({ color: 0x1d7a3e, roughness: 0.82 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  const pitch = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.18, 52),
    new THREE.MeshStandardMaterial({ color: 0xb9824f, roughness: 0.9 })
  );
  pitch.position.y = 0.08;
  pitch.receiveShadow = true;
  scene.add(pitch);

  const creaseMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-21, 21].forEach((z) => {
    const crease = new THREE.Mesh(new THREE.BoxGeometry(10, 0.04, 0.16), creaseMaterial);
    crease.position.set(0, 0.22, z);
    scene.add(crease);
  });
}

function buildStadium() {
  const standMaterial = new THREE.MeshStandardMaterial({ color: 0x1e3447, roughness: 0.7, metalness: 0.1 });
  for (let ring = 0; ring < 3; ring++) {
    const radius = 76 + ring * 6;
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(7, 4 + ring * 1.5, 5), standMaterial);
      block.position.set(Math.cos(angle) * radius, 2 + ring * 2, Math.sin(angle) * radius);
      block.rotation.y = -angle;
      block.castShadow = true;
      block.receiveShadow = true;
      scene.add(block);
    }
  }

  const crowdMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.6 });
  for (let i = 0; i < 180; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 72 + Math.random() * 14;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), crowdMaterial);
    dot.position.set(Math.cos(angle) * radius, 5 + Math.random() * 9, Math.sin(angle) * radius);
    scene.add(dot);
  }
}

function buildPlayers() {
  batter = createPlayer(0x0a66c2);
  batter.position.set(0, 1.7, 23);
  scene.add(batter);

  bowler = createPlayer(0xc53d3d);
  bowler.position.set(0, 1.7, -25);
  bowler.rotation.y = Math.PI;
  scene.add(bowler);

  bat = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 4.8, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xd7aa64, roughness: 0.62 })
  );
  bat.castShadow = true;
  bat.position.set(1.7, 2.8, 23.5);
  scene.add(bat);
}

function createPlayer(color) {
  const group = new THREE.Group();
  const kit = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.55 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 2.1, 6, 12), kit);
  body.castShadow = true;
  body.position.y = 1.9;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 18), new THREE.MeshStandardMaterial({ color: 0xc58f62 }));
  head.castShadow = true;
  head.position.y = 3.55;
  group.add(head);

  [-0.42, 0.42].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.5, 4, 8), white);
    leg.position.set(x, 0.65, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  return group;
}

function buildBall() {
  ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xd22f2f, roughness: 0.42 })
  );
  ball.castShadow = true;
  scene.add(ball);
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (batter && bowler && bat && ball) {
    bowler.position.z = -25 + Math.sin(t * 2.2) * 1.2;
    bowler.rotation.x = Math.sin(t * 7) * 0.05;
    batter.rotation.y = Math.sin(t * 2) * 0.08;
    bat.rotation.z = -0.35 + Math.sin(t * 5) * 0.32;
    ball.position.set(Math.sin(t * 2.7) * 2.8, 0.7 + Math.abs(Math.sin(t * 3.4)) * 2.2, -18 + ((t * 11) % 40));
  }

  renderer.render(scene, camera);
}

function resize() {
  if (!renderer || !viewport) return;
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

toggle?.addEventListener("click", () => {
  active = !active;
  viewport.classList.toggle("active", active);
  toggle.textContent = active ? "2D Gameplay" : "3D Stadium";
  initThreeStadium();
  resize();
});

window.addEventListener("resize", resize);
