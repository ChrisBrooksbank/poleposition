# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Tech Stack

- **Renderer**: Three.js (WebGL), true 3D remaster (see specs/remaster-3d.md)
- **Language**: TypeScript
- **Audio**: Web Audio API (procedural synthesis)
- **Build**: Vite
- **Test**: Vitest

## Build Commands

```bash
npm run build          # Production build
npm run dev            # Development server
```

## Test Commands

```bash
npm test               # Run tests (watch mode)
npm run test:run       # Run tests once
```

## Validation (run before committing)

```bash
npm run check          # Run ALL checks (typecheck + lint + test)
```

## Project Notes

- Reference research.md for all original game specifications; the remaster spec is specs/remaster-3d.md
- 3D world in Three.js (src/remaster/); pure metre-based simulation in src/sim/ (no Three.js imports there)
- HUD and screens are a 256x224 Canvas 2D overlay on top of the WebGL canvas (4:3 letterboxed)
- Four courses (src/sim/tracks/); layouts must stay closed and non-crossing (tests/courses.test.ts)
- Procedural audio synthesis for engine sound (oscillator frequency mapped to speed)
- All art assets are original (no copyrighted sprites, fictional sponsors)
- See CLAUDE.md for architecture and the ?debug play-test hooks
