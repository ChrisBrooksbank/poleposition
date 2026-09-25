# Remaster: True 3D on Three.js

## Goal

A faithful remaster of Namco's 1982 Pole Position. Gameplay, track layouts, timings, scoring and AI must match the original (see research.md). Only presentation is modernised: real 3D geometry, lighting and post-processing.

## Renderer

- Three.js WebGL renderer; the Canvas 2D renderers in `src/renderer/` are replaced.
- Road is a 3D ribbon mesh generated from a track definition (per-segment curvature, elevation, width), not scanline strips.
- Chase camera locked behind the car at the original's height and distance so the on-screen feel matches the arcade. Road curvature "bends" ahead of the car as in the original.
- Scenery: Mt. Fuji and mountain backdrop, sky, grass, kerbs/rumble strips, start/finish gantry, grandstands, branded billboards (original art, no copyrighted logos), roadside posts.
- Cars: low-poly 3D models for the player F1 car (wheel spin, steering wheel-turn of front wheels) and AI cars in original colour schemes.
- Effects: explosion, tyre smoke, puddle spray. Optional CRT/scanline post-process toggle; 4:3 aspect preserved.
- HUD: keep arcade layout (score, top, time, lap time, speed, gear, position); rendered as a DOM/canvas overlay or an orthographic Three.js scene using an arcade-style bitmap font.

## Gameplay fidelity

- Fixed-timestep simulation (decoupled from rendering) so behaviour is deterministic and testable.
- Track logic lives in pure TypeScript data + functions (no Three.js imports) so physics, AI and tests do not depend on rendering.
- Tracks: Fuji Speedway (qualifying + Grand Prix), plus the practice tracks (Test Course, Suzuka, Seaside). Layouts, lengths and curve order taken from research.md and verified against reference footage/notes.
- Speeds, gears (low/high), off-road slowdown, puddle spin, collision/explosion respawn, qualifying thresholds, lap timer, bonus time, scoring: per research.md sections 2 and 6.
- AI behaviour, count and spacing per research.md section 2.

## Architecture

- `src/sim/`: pure simulation (track, physics, AI, race state, scoring). Reused from the existing code where it already matches the spec.
- `src/render/`: Three.js scene, road mesh, cars, scenery, camera, post-processing.
- `src/audio/`, `src/state/`, `src/settings/`: kept and adapted.
- `src/main.ts`: thin composition root.

## Acceptance

- `npm run check` passes.
- Fuji lap is recognisably the same circuit and the qualifying/GP flow matches game-flow.md.
- Runs at 60 FPS on a mid-range laptop.
