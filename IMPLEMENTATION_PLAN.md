# Implementation Plan: 3D Remaster

Spec: specs/remaster-3d.md. Decisions: true 3D on Three.js, full rewrite of the renderer and simulation, Fuji plus extra courses.

## Status

Feature complete. All phases below are done; remaining ideas are polish only (see the end).

## Tasks

### Phase 1: Foundations
- [x] Audit the old Canvas 2D code; keep audio/state/settings/input, discard renderers and pixel-unit physics
- [x] Three.js stage at 4:3 with a 2D overlay canvas
- [x] Fixed-timestep loop (sim 60 Hz, render interpolated)
- [x] Pure track model (curvature/slope segments, centreline, poseAt)

### Phase 2: Tracks
- [x] Fuji Speedway from research.md section 5, solved to be closed and non-crossing
- [x] Test Course, Suzuka and Seaside layouts (original layouts; solved numerically), each with its own theme
- [x] Road ribbon mesh with kerbs, edge lines and stripes; striped terrain that follows road height

### Phase 3: Simulation fidelity
- [x] Player physics in metres: low/high gear, braking, coasting, off-road cap with recovery
- [x] Steering and grip-based curve push, tuned by a bot driver (tests/drivability.test.ts)
- [x] Billboard and car collisions with explosion, respawn and brief invulnerability; puddle spins
- [x] Seven AI cars (constant speeds, lanes, qualifying spread, start grid launch)
- [x] Qualifying, grid positions, Grand Prix laps, timer/bonus time, scoring, high scores

### Phase 4: 3D presentation
- [x] Chase camera with speed FOV and crash pull-back/shake
- [x] Procedural F1 car model with wheel spin and steering, blob shadows, AI liveries
- [x] Scenery: sky, Fuji/hills backdrop, trees (pine/round/palm), posts, sponsor billboards, grandstands, gantry
- [x] Explosion particles, puddle decals; optional CRT scanline overlay (C)
- [x] Arcade HUD and screens on the overlay canvas

### Phase 5: Integration
- [x] Full state flow: attract, coin, course select, qualifying, grid, grand prix, results, name entry, high scores, DIP settings, game over
- [x] Audio wired to sim events, music on name entry and game over
- [x] Old Canvas 2D renderers removed; docs updated

## Possible polish
- Real 3D models/textures beyond the procedural set; more scenery variety per course
- Touch/gamepad controls
- Practice-mode course lap records
- Verify the practice-course layouts against period sources (the arcade's own layouts are not documented in research.md)
