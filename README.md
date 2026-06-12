# Cricket Arena AI

Cricket Arena AI is an original browser-based cricket game prototype. It is inspired by modern sports-game presentation, but it is not a clone of any existing title.

The goal is to show how a future online cricket game could combine smooth gameplay, AI decision-making, premium UI, and multiplayer-ready architecture.

## Features

- Premium sports-game lobby UI
- Canvas-based cricket arena rendering
- Timing-based batting mechanic
- AI bowler delivery selection
- Bowling variation: yorker, outswinger, cutter, bouncer
- Score, wickets, balls, target, and chase equation
- Shot map visualization
- Match pressure insights
- Keyboard and button controls
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

## Controls

- `Space`: play shot
- `A`: loft left
- `D`: loft right
- `S`: defensive/straight intent

## Multiplayer roadmap

This prototype is local-first. A real online version would add:

- WebSocket match server
- authoritative ball physics on the server
- deterministic client prediction
- lag compensation
- friend rooms and matchmaking
- player profiles and progression
- anti-cheat validation for shot timing
- replay system

## Why this belongs in a portfolio

This project demonstrates:

- real-time game loop design
- animation and input handling
- sports simulation logic
- game-state management
- AI opponent behavior
- performance-minded browser rendering
- product/UI design

## Boundary

This is an original prototype. It does not copy Real Cricket, World Cricket Championship, PUBG, or any other proprietary game assets, code, names, or gameplay implementation.
