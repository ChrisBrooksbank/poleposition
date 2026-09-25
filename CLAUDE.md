# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A browser remaster of the Pole Position arcade game (in progress: migrating from a Canvas 2D port to a true 3D Three.js remaster; see specs/remaster-3d.md and IMPLEMENTATION_PLAN.md). Stack: TypeScript + Vite, Web Audio API for procedural sound. All art is original. The current src/renderer/ code is still Canvas 2D (256x224) and is being replaced.

## Commands

```bash
npm run dev                          # Vite dev server on :3000
npm run build                        # tsc -p tsconfig.build.json && vite build
npm run test:run                     # Vitest once (npm test = watch)
npx vitest run tests/GameLoop.test.ts    # single test file
npx vitest run -t "some test name"       # single test by name
npm run check                        # typecheck + lint + prettier check + tests (run before committing)
npm run format                       # prettier --write on src and tests
```

## Architecture

- `src/main.ts` is the composition root: it instantiates every renderer, physics object, state object and audio module as module-level singletons, and wires them together in a single per-frame update driven by `GameLoop` (rAF loop, dt in ms clamped to 100). There is no DI or framework; cross-module coordination lives here.
- `GameStateMachine` (`src/state/`) drives the top-level flow: attract/title → (settings) → qualifying → grid display → grand prix → race complete → name entry / high scores. Each phase has its own small state class in `src/state/` (`QualifyingState`, `GrandPrixState`, `AttractMode`, ...) holding timers/counters; `main.ts` resets them in each state's onEnter and tracks `stateElapsed`.
- Rendering is pseudo-3D: `RoadRenderer` draws horizontal strips with perspective projection over the track defined in `src/track/fujiSpeedway.ts` (`getTrackCurve`, `getTrackHill`, `TRACK_LENGTH`). Billboards and puddles are placed by data in `src/track/`. Other renderers (`src/renderer/`: background, billboards, player/AI cars, explosion, puddle, HUD) each take the logical width/height and draw onto the shared 2D context.
- Physics (`src/physics/`): `PlayerPhysics` (speed/gear/top speed), `SteeringPhysics` (lateral movement, curve push), `CollisionDetector`. Player position is a world-Z in metres (`playerZ` in `main.ts`); `MPH_TO_MS` converts speeds.
- `src/ai/AICarSystem.ts` owns the AI cars; its snapshot is reused for both collision checks and rendering.
- Audio (`src/audio/`): `AudioSystem` owns the AudioContext (created on first user interaction for browser autoplay rules); `EngineSound`, `TireScreech`, `CollisionSound`, `DiscreteSFX`, `ChiptuneMusic`, `VoiceAnnouncements` are synthesized procedurally.
- Settings: `DIPSwitchSettings` (persisted in localStorage) and `DIPSwitchPanel` (UI) expose arcade DIP-switch options such as top speed. `HighScoreManager` also persists to localStorage.
- Tests live in `tests/` (one `<Module>.test.ts` per source module), run under Vitest.

## Workflow notes

- The repo is developed via a "Ralph Wiggum" autonomous loop (`loop.sh` / `loop.ps1`, `PROMPT_build.md`, `PROMPT_plan.md`): each iteration takes the first unchecked task in `IMPLEMENTATION_PLAN.md`, implements it with tests, runs `npm run check`, and commits. Keep `AGENTS.md` under 60 lines (it is loaded every iteration).
