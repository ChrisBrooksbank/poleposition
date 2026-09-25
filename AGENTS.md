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

- Reference research.md for all original game specifications
- Target resolution: 256x224 pixels (scaled up for modern displays)
- Pseudo-3D road rendering via horizontal strips with perspective projection
- Procedural audio synthesis for engine sound (oscillator frequency mapped to speed)
- All art assets are original (no copyrighted sprites) - see specs for billboard replacements
- Specs in specs/ directory define JTBD requirements
