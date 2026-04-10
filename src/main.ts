// Pole Position - Main Entry Point
// Logical resolution: 256x224 pixels (scaled to fill browser window)

import { GameLoop } from './GameLoop';
import { RoadRenderer } from './renderer/RoadRenderer';

export const LOGICAL_WIDTH = 256;
export const LOGICAL_HEIGHT = 224;

export function setupCanvas(): CanvasRenderingContext2D {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D rendering context');
  }

  function resize() {
    const scaleX = window.innerWidth / LOGICAL_WIDTH;
    const scaleY = window.innerHeight / LOGICAL_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.width = `${Math.floor(LOGICAL_WIDTH * scale)}px`;
    canvas.style.height = `${Math.floor(LOGICAL_HEIGHT * scale)}px`;
  }

  window.addEventListener('resize', resize);
  resize();

  return ctx;
}

const roadRenderer = new RoadRenderer(LOGICAL_WIDTH, LOGICAL_HEIGHT);

function update(_dt: number): void {
  // dt is in milliseconds; game logic will use this in later tasks
}

function render(ctx: CanvasRenderingContext2D): void {
  // Clear screen with sky colour (placeholder until background task)
  ctx.fillStyle = '#5ba3e0';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Render pseudo-3D road (scanline perspective projection)
  roadRenderer.render(ctx);
}

function main(): void {
  const ctx = setupCanvas();
  const loop = new GameLoop((dt) => {
    update(dt);
    render(ctx);
  });
  loop.start();
}

main();
