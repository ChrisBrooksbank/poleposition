# Implementation Plan: 3D Remaster

Supersedes the Canvas 2D plan (completed; see git history). Spec: specs/remaster-3d.md. Decisions: true 3D, Three.js, full rewrite, Fuji plus practice tracks.

## Status

- Build iterations: 0
- Last updated: 2026-09-25

## Tasks

### Phase 1: Foundations
- [x] Audit existing src/ against research.md and specs; list what is reusable (state, audio, settings) vs wrong (specs: all)
- [x] Verify Three.js dependency, Vite config, and a blank Three.js scene at 4:3 with resize handling
- [x] Fixed-timestep loop (sim at 60 Hz, render interpolated)
- [x] Define pure track data format (segments: length, curvature, slope, width, scenery/hazard markers) with tests

Audit notes (Phase 1): old sim uses screen-pixel units (SteeringPhysics playerX, curve values tuned for 256x224) and the Fuji track is 6 guessed sections; physics, track and AI must be redone in metres (new code in src/sim/). Reusable mostly as-is: audio/, state/ (timers, scoring, high scores, name entry), settings/, input/. Old renderers are discarded. New work is served at remaster.html (src/remaster/) until integration replaces index.html.

### Phase 2: Tracks
- [x] Fuji Speedway track data faithful to research.md section 5 (straight, right, left, right, hairpin, long right). Note: heading closes (net 360 deg) but position does not (~1.6 km gap), like the original's looping road; at the finish line the car wraps to s=0 with the same heading. Revisit if scenery needs a true closed loop.
- [ ] Test Course, Suzuka, Seaside track data (needs research on the real practice layouts first)
- [x] Road ribbon mesh generator (src/remaster/roadGeometry.ts, RoadMesh.ts): kerbs, edge lines, stripes. Still to do: start line, centre dashes, verify visually in browser

### Phase 3: Simulation fidelity
- [x] Player physics in metres (src/sim/PlayerCar.ts): throttle/brake, low/high gear, off-road slowdown; values carried over from the old sim, still to tune against the original
- [x] Steering and curve push (in PlayerCar; tuning constants are first guesses)
- [ ] Collisions with billboards/cars, explosion and respawn; puddle spin
- [ ] AI cars: count, speeds, lane behaviour, passing; deterministic and unit-tested
- [ ] Qualifying, grid position thresholds, Grand Prix laps, timer/bonus time, scoring, high scores

### Phase 4: 3D presentation
- [ ] Chase camera matching the original framing; curve-bend effect (basic chase camera in src/remaster/main.ts, drivable at remaster.html)
- [x] Procedural F1 car model with spinning wheels and steering front wheels (src/remaster/carModel.ts); AI car liveries to do with AI system
- [x] Scenery: striped terrain, Mt. Fuji + mountain backdrop, sky, trees, posts, sponsor billboards (fictional brands), grandstands, start gantry (src/remaster/scenery.ts, src/sim/scenery.ts). Textures are procedural canvas; refine later
- [ ] Lighting, fog, tone mapping; explosion, smoke, puddle spray effects
- [ ] Arcade-style HUD and bitmap font; optional CRT post-process

### Phase 5: Integration
- [ ] Wire game-flow state machine (attract, settings, qualifying, grid, race, complete, name entry) to the new renderer
- [ ] Adapt audio system to the new sim events
- [ ] Remove the old Canvas 2D renderers; update CLAUDE.md and AGENTS.md
- [ ] Performance pass and playtest against original footage
