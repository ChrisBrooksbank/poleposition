// Pole Position - Main Entry Point
// Logical resolution: 256x224 pixels (scaled to fill browser window)

import { GameLoop } from './GameLoop';
import {
  RoadRenderer,
  computeCurveOffsets,
  HORIZON_Y,
  CAMERA_DEPTH,
} from './renderer/RoadRenderer';
import { BackgroundRenderer } from './renderer/BackgroundRenderer';
import { BillboardRenderer } from './renderer/BillboardRenderer';
import { getTrackCurve } from './track/fujiSpeedway';

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
const bgRenderer = new BackgroundRenderer(LOGICAL_WIDTH, LOGICAL_HEIGHT);
const billboardRenderer = new BillboardRenderer(LOGICAL_WIDTH, LOGICAL_HEIGHT);

/** Player's world-Z position in metres. Advances each frame once driving is implemented. */
const playerZ = 0;

function update(_dt: number): void {
  // dt is in milliseconds; game logic will use this in later tasks
}

function render(ctx: CanvasRenderingContext2D): void {
  // Compute per-scanline curve offsets to determine vanishing-point sway.
  // The offset at horizonY + 1 is the maximum accumulated offset and drives
  // background parallax (farther layers shift proportionally less).
  const curveOffsets = computeCurveOffsets(
    LOGICAL_HEIGHT,
    HORIZON_Y,
    CAMERA_DEPTH,
    playerZ,
    getTrackCurve
  );
  const parallaxX = curveOffsets[HORIZON_Y + 1];

  // Background: sky gradient, Mt. Fuji, mountain range (drawn before road)
  bgRenderer.render(ctx, parallaxX);

  // Render pseudo-3D road (scanline perspective projection)
  roadRenderer.render(ctx, playerZ, getTrackCurve);

  // Render distance-scaled billboard sprites on road edges
  billboardRenderer.render(ctx, playerZ, getTrackCurve);
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
