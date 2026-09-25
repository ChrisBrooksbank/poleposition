# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A 3D remaster of Namco's 1982 Pole Position: TypeScript + Vite, Three.js (WebGL) for the world, a 256x224 Canvas 2D overlay for the arcade HUD and screens, Web Audio for procedural sound. All art is original (fictional sponsors, procedural models and textures). Gameplay, scoring and timings follow `research.md`; `specs/*.md` hold requirements. Four selectable courses: Fuji Speedway (the arcade circuit), Test Course, Suzuka and Seaside.

## Commands

```bash
npm run dev                          # Vite dev server on :3000 (add ?debug to expose window.__game)
npm run build                        # tsc -p tsconfig.build.json && vite build
npm run test:run                     # Vitest once (npm test = watch)
npx vitest run tests/PlayerCar.test.ts   # single test file
npx vitest run -t "some test name"       # single test by name
npm run check                        # typecheck + lint + prettier check + tests (run before committing)
npm run format                       # prettier --write on src and tests
```

## Architecture

The code splits into a pure simulation and a rendering layer; keep Three.js imports out of `src/sim/`.

- `src/sim/` - pure, metre/second-based simulation, unit-tested without WebGL.
  - `Track` turns a `TrackDef` (segments of length, curvature, slope) into a centreline and `poseAt(s, lateral)`; `tracks/*.ts` hold the four circuits via `tracks/builder.ts`. Layouts were solved numerically to be closed (heading, position, height) and non-self-crossing; `tests/courses.test.ts` enforces this for every course, so keep it true when editing layouts.
  - `PlayerCar` (gears, braking, grass, steering, grip-based curve push), `AIField` (7 constant-speed cars, qualifying spread or start grid), `hazards` (puddles, billboard/car collision boxes in track space), `scenery` (deterministic roadside layout shared by rendering and collision), `courses` (course list, puddle placement, lap-length scale for qualifying thresholds), `FixedStepLoop` (60 Hz sim, interpolated render).
- `src/remaster/` - rendering and the game itself.
  - `Game.ts` is the composition root: it builds each course lazily (`activateCourse`), runs the state machine, steps the sim, plays audio and renders. Screens/HUD are drawn to an overlay canvas (`screens.ts`, `HUDRenderer.ts`); `Stage.ts` owns the renderer and a 4:3 wrapper.
  - `roadGeometry`/`terrainGeometry` are pure array builders (tested); `RoadMesh`, `scenery.ts` (sky, backdrop, trees, billboards, grandstands, gantry), `carModel.ts`, `effects.ts` (explosion, puddles) create the Three.js objects; `themes.ts` styles each course.
- `src/state/` - arcade flow classes (qualifying, grand prix, grid, results, scoring, high scores, name entry, attract, explosion, puddle spin) driven by `GameStateMachine`. Times are in milliseconds and positions in metres.
- `src/audio/` - procedural engine, tyre, collision, SFX, voice and chiptune music; `AudioSystem` must be resumed from a user gesture. `src/settings/` holds DIP switch options (persisted in localStorage); `src/input/` is keyboard input.

## Notes

- Convention: lateral offset is metres from the centreline, positive to the driver's right; positive curvature turns right; the car faces +z and heading turns toward -x.
- `?debug` exposes `window.__game` with `debugGoto`, `debugCourse`, `debugTeleport` and `debugInfo`, which is how headless Chrome play-tests drive the game.
- The repo was built with a "Ralph Wiggum" loop (`loop.sh`, `PROMPT_build.md`, `IMPLEMENTATION_PLAN.md`); `AGENTS.md` must stay under 60 lines.
