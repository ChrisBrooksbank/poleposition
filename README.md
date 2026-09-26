# Pole Position (unofficial fan project)

A 3D fan recreation of the classic 1982 arcade racer, built with TypeScript, Vite and Three.js. Original art and procedural audio.

> **Unofficial fan project. Not affiliated with, endorsed by or connected to Bandai Namco Entertainment.** "Pole Position" is a trademark of its respective owner. No original assets, code or sounds are used; all art is procedural and the sponsors are fictional.

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # typecheck + lint + format + tests
```

## Controls

| Key | Action |
| --- | --- |
| Up / Down | Accelerate / brake |
| Left / Right | Steer |
| Shift | Toggle low / high gear |
| Enter | Start, confirm |
| Left / Right (course select) | Change course |
| D (title) | DIP switch settings |
| P or Esc | Pause |
| C | CRT scanline look |

## How it plays

Insert a coin, pick a course, then set a qualifying lap against the clock. Your time decides your grid position (pole under 58.5 s at Fuji). Then race the Grand Prix against seven cars before the timer runs out; each lap adds bonus time. Hitting billboards or cars blows you up, puddles spin you, grass slows you down. Remaining time becomes bonus points and the best scores are saved locally.
