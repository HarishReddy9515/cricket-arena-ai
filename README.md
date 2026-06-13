# Cricket Arena AI

Cricket Arena AI is an original browser-based cricket game prototype. It is inspired by modern sports-game presentation, but it is not a clone of any existing title.

The goal is to show how a future online cricket game could combine smooth gameplay, AI decision-making, premium UI, and multiplayer-ready architecture.

## Features

- Premium sports-game lobby UI
- Canvas-based cricket arena rendering
- Optional Three.js 3D stadium mode
- Procedural 3D player models and batting/bowling animation
- High-intensity stadium lighting and shadow setup
- Timing-based batting mechanic
- AI bowler delivery selection
- Bowling variation: yorker, outswinger, cutter, bouncer
- Score, wickets, balls, target, and chase equation
- Shot map visualization
- Match pressure insights
- PUBG-style room/lobby workflow concept
- Create or join room code
- Squad ready-state panel
- Browser WebSocket client for room sync
- Server-authoritative delivery generation
- Server-validated shot outcomes and synced score state
- Live scorecard and replay timeline
- Ping/latency check for multiplayer server
- Match summary JSON export
- Keyboard and button controls
- PWA mobile install manifest and service worker
- Dependency-free WebSocket multiplayer server scaffold
- 4D-style immersion layer with mobile haptics, impact flash, camera shake, dust/rain particles, crowd pulse, and slow-motion moments
- No dependencies or build step

## Run

Open `index.html` in a browser, or run:

```bash
python -m http.server 8090
```

Then visit:

```text
http://localhost:8090
```

The 2D game works from the local files. The optional 3D stadium mode loads Three.js from a CDN, so it needs internet access unless Three.js is vendored into the project.

Run the multiplayer server scaffold:

```bash
node server/multiplayer-server.js
```

Health check:

```text
http://localhost:8787/health
```

Online room demo:

1. Start the web server on `8090`.
2. Start the multiplayer server on `8787`.
3. Open the game in two browser tabs.
4. Use the same room code, click `Connect`, then `Ready` in both tabs.
5. When all players are ready, the server starts the match flow.
6. Deliveries and shot outcomes are synced through the server match state.

## Controls

- `Space`: play shot
- `A`: loft left
- `D`: loft right
- `S`: defensive/straight intent

## Multiplayer roadmap

This prototype now includes a dependency-free WebSocket server scaffold in `server/multiplayer-server.js` plus browser room UI. A production online version would add:

- deeper authoritative ball physics on the server
- deterministic client prediction
- lag compensation
- friend rooms and matchmaking
- persistent accounts, friend invites, and squads
- player profiles and progression
- anti-cheat validation for shot timing
- replay system

Implemented now:

- room join and presence
- ready state
- server-created match state
- server-selected deliveries
- server-resolved shot outcomes
- synced score, wickets, balls, delivery, and last outcome
- timeline replay events
- client/server ping checks

## Graphics roadmap

The 3D mode uses procedural Three.js geometry. To reach true AAA graphics, the next step is importing licensed 3D assets:

- stadium GLB/FBX models
- rigged batter/bowler/player models
- motion-captured batting and bowling animation clips
- physically based materials
- crowd and broadcast camera packages
- mobile-optimized LOD meshes and texture compression

## 4D-style roadmap

The project now includes browser-safe 4D-style feedback:

- vibration/haptic patterns on supported mobile devices
- camera shake on bat impact and wickets
- impact flashes for boundaries and wickets
- procedural dust/rain particles
- crowd pulse effects
- slow-motion highlight moments

True physical 4D requires native mobile or console hardware integrations. This web version provides the closest safe browser equivalent.

## Why this belongs in a portfolio

This project demonstrates:

- real-time game loop design
- Three.js scene design
- procedural 3D animation
- animation and input handling
- sports simulation logic
- game-state management
- AI opponent behavior
- performance-minded browser rendering
- product/UI design

## Boundary

This is an original prototype. It does not copy Real Cricket, World Cricket Championship, PUBG, or any other proprietary game assets, code, names, or gameplay implementation.
