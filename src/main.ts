// Pole Position - Main Entry Point
// Logical resolution: 256x224 pixels (scaled to fill browser window)

const LOGICAL_WIDTH = 256;
const LOGICAL_HEIGHT = 224;

function setupCanvas(): CanvasRenderingContext2D {
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

function gameLoop(ctx: CanvasRenderingContext2D): void {
  // Clear screen
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Placeholder: draw "POLE POSITION" text
  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('POLE POSITION', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);

  requestAnimationFrame(() => gameLoop(ctx));
}

function main(): void {
  const ctx = setupCanvas();
  requestAnimationFrame(() => gameLoop(ctx));
}

main();
