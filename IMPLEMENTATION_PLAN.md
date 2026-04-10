# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 0
- Last updated: 2026-04-10

## Tasks

### Phase 1: Project Scaffolding (prerequisite for everything)

- [x] Scaffold Vite + TypeScript project: package.json, tsconfig.json, vite.config.ts with entry point index.html and src/main.ts (spec: all)
- [x] Configure Vitest with npm test / npm run test:run scripts and a sample passing test (spec: all)
- [x] Configure ESLint + Prettier + npm run check (typecheck + lint + test) script (spec: all)
- [x] Set up main game canvas: 256x224 logical resolution scaled to fill the browser window, 60 FPS game loop with delta time (spec: road-rendering.md)

### Phase 2: Road Rendering (core visual engine — nothing else renders without this)

- [x] Implement pseudo-3D scanline renderer: horizontal strip loop, perspective projection formula `screen_scale = cameraDepth / z_distance`, road width narrowing toward vanishing point (spec: road-rendering.md)
- [x] Add road surface details: alternating gray shades per segment, dashed center line, red/white shoulder rumble strips, alternating green grass on both sides (spec: road-rendering.md)
- [x] Implement curve system: segment-based dx accumulation, running horizontal offset per scanline, vanishing point sway (spec: road-rendering.md)
- [x] Define Fuji Speedway track data: segment array encoding curve values for main straight, sharp right, quick left, medium right, left hairpin, long gradual right — continuous loop ~4.36 km (spec: road-rendering.md)
- [x] Add start/finish checkered pattern: render checker across road width at lap boundary segment (spec: road-rendering.md)
- [x] Add background layer: sky gradient, Mt. Fuji silhouette, mountain range, parallax horizontal scroll synced to road curve dx (spec: road-rendering.md)
- [x] Add roadside billboard sprites: distance-scaled sprites at defined track positions for 7 fictional brands (TURBO, ZOOM COLA, OPTIC, VICTOR, VELOCE, FUEL+, SPARK) (spec: road-rendering.md)

### Phase 3: Player Car & Input (driving feel)

- [x] Implement keyboard input handler: left/right arrows for steering, up for throttle, down for brake, one key for gear shift toggle (spec: driving-mechanics.md)
- [x] Implement speed/acceleration model: low gear (half top speed, better accel), high gear (full top speed 225 MPH default), gradual deceleration on release, faster decel on brake (spec: driving-mechanics.md)
- [x] Implement steering physics: proportional input, speed-sensitive sensitivity, car lateral position update relative to road curve (spec: driving-mechanics.md)
- [x] Implement off-road behavior: detect when car is outside road edges, apply dramatic speed reduction, trigger audio/visual feedback (spec: driving-mechanics.md)
- [x] Render player car sprite: rear-view with three states (straight, turning left, turning right), positioned at fixed screen Y with lateral offset (spec: driving-mechanics.md)

### Phase 4: Collision & AI Cars

- [x] Implement collision detection: player car vs AI car and vs billboard bounding boxes in road-space coordinates (spec: driving-mechanics.md)
- [x] Implement explosion + respawn: 4-6 frame explosion animation over ~2.5s, then car reappears at road center at zero speed (spec: driving-mechanics.md)
- [x] Implement AI opponent system: 7 cars with predetermined path offsets, distance-based sprite scaling, 3-4 color variants, rendered via the same scanline Z-sort as billboards (spec: driving-mechanics.md)

### Phase 5: Game State Machine (game flow backbone)

- [x] Implement state machine with states: ATTRACT, COIN_INSERT, QUALIFYING, GRID_DISPLAY, GRAND_PRIX, RACE_COMPLETE, GAME_OVER, NAME_ENTRY — wired to game loop update/render dispatch (spec: game-flow.md)
- [ ] Implement attract mode: idle demo screen / title display cycling until input (spec: game-flow.md)
- [ ] Implement qualifying lap: 90s countdown timer (configurable 90/100/110/120s), detect lap completion, compare time against 8 position thresholds, "Qualifying Start" trigger, fail path if time expires (spec: game-flow.md)
- [ ] Implement grid position display: show "YOU ARE IN Xth" with earned grid slot after qualifying (spec: game-flow.md)
- [ ] Implement Grand Prix race: multi-lap (default 4), 75s initial timer + bonus time per lap (+51/+57/+61s), "Grand Prix Start" trigger, lap counter, game over on timer expiry (spec: game-flow.md)
- [ ] Implement race complete state: trigger when all laps finished, show time bonus, transition to name entry (spec: game-flow.md)

### Phase 6: Scoring & HUD

- [ ] Implement scoring: 10 pts/meter driven, +50 pts per AI car fully overtaken, qualifying position bonus (4000/2000/1400/1000/800/600/400/200), +200 pts/sec remaining at race end (spec: game-flow.md)
- [ ] Implement HUD overlay: speed (MPH/KPH), countdown timer, lap number/total, current score, race position "YOU ARE IN Xth" (spec: game-flow.md)
- [ ] Implement high score system: localStorage persistence, 3-initial name entry screen (keyboard navigation), high score table display, three ranking music tiers (spec: game-flow.md)

### Phase 7: Audio System

- [ ] Initialize Web Audio API: AudioContext, master gain node, channel mixing without clipping (spec: audio-system.md)
- [ ] Implement engine sound: continuous oscillator (sawtooth/square), frequency mapped to car speed, smooth transitions, idle tone at rest (spec: audio-system.md)
- [ ] Implement tire screech: band-pass filtered noise triggered on sharp turns, intensity proportional to turn sharpness, suppressed when off-road (spec: audio-system.md)
- [ ] Implement collision sound: LFSR-style noise burst with ~3s decay envelope (spec: audio-system.md)
- [ ] Implement discrete SFX: coin insert, qualifying fanfare, countdown beeps, qualifying complete (non-pole + pole variants), race complete, time extend, puddle hit, time bonus tick, overtake tick, grass rumble loop (spec: audio-system.md)
- [ ] Implement voice announcements: synthesized or procedurally filtered "Qualifying Start" and "Grand Prix Start" with 4-bit downsampling / low-pass to match Namco retro character (spec: audio-system.md)
- [ ] Implement chiptune music: wavetable synthesis (≤8 voices), three name entry melodies (1st, 2nd-6th, 7th-100th place) and game over melody, plays only outside gameplay (spec: audio-system.md)

### Phase 8: Configuration & Polish

- [ ] Implement DIP switch settings panel: qualifying time, practice/extended rank, lap count, speed setting, units (KPH/MPH) — persisted in localStorage (spec: game-flow.md)
- [ ] Implement puddle sprites on track + brief spin-out effect on player contact (spec: road-rendering.md, driving-mechanics.md)
- [ ] Hills stretch goal: Y-offset per segment to create crests that obscure the road ahead (spec: road-rendering.md)
- [ ] Gamepad API support: map analog stick to steering, triggers to throttle/brake, button to gear shift (spec: driving-mechanics.md)
- [ ] Stereo spatial audio stretch goal: AI car engine pan based on lateral position relative to player (spec: audio-system.md)

## Completed

<!-- Completed tasks move here -->

## Notes

### Architecture Decisions

- **Canvas rendering**: Use an HTML5 2D Canvas (OffscreenCanvas or regular) for all scanline road rendering. Three.js is listed in AGENTS.md but the road system is explicitly pseudo-3D via 2D strips — use Three.js only if a clean integration exists, otherwise plain Canvas 2D API is more appropriate for scanline rendering.
- **Road rendering approach**: Segment-based array where each segment stores curve, hill, and object data. Player progress is tracked as a floating-point distance along the segment array.
- **Game loop**: `requestAnimationFrame` with fixed 40 FPS timer logic (as spec requires 40 frames/second for timer resolution) inside a 60 FPS render loop.
- **Coordinate system**: Road-space Z (distance from player) maps to scanline Y on screen via `screen_scale = cameraDepth / z`. Road-space X (lateral) maps to screen X via the same scale.
- **State machine**: Simple enum + switch dispatch pattern — no framework needed at this scale.
- **Audio**: All sounds procedurally synthesized with Web Audio API nodes; no external audio files required.
- **Sprites**: Drawn with Canvas 2D API as simple pixel-art rectangles/shapes — no external image assets required to ship a functional game.
- **Track data**: Hardcoded segment array for Fuji Speedway; encode curve as a signed float per segment (positive = right, negative = left), length in meters per segment.
- **Billboard collision**: Treated as a point-in-segment check — if player Z and X fall within a billboard's road-space footprint, trigger collision.
