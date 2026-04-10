// Pole Position - Main Entry Point
// Logical resolution: 256x224 pixels (scaled to fill browser window)

import { GameLoop } from './GameLoop';
import {
  RoadRenderer,
  computeCurveOffsets,
  HORIZON_Y,
  CAMERA_DEPTH,
  ROAD_HALF_WIDTH,
} from './renderer/RoadRenderer';
import { BackgroundRenderer } from './renderer/BackgroundRenderer';
import { BillboardRenderer } from './renderer/BillboardRenderer';
import { getTrackCurve } from './track/fujiSpeedway';
import { InputHandler } from './input/InputHandler';
import { PlayerPhysics } from './physics/PlayerPhysics';
import { SteeringPhysics, MPH_TO_MS } from './physics/SteeringPhysics';
import { PlayerCarRenderer } from './renderer/PlayerCarRenderer';
import { CollisionDetector } from './physics/CollisionDetector';
import { ExplosionState } from './state/ExplosionState';
import { ExplosionRenderer } from './renderer/ExplosionRenderer';
import { AICarSystem } from './ai/AICarSystem';
import { AICarRenderer } from './renderer/AICarRenderer';
import { GameStateMachine, GameState } from './state/GameStateMachine';

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
const playerCarRenderer = new PlayerCarRenderer(LOGICAL_WIDTH, LOGICAL_HEIGHT);
const explosionRenderer = new ExplosionRenderer(LOGICAL_WIDTH, LOGICAL_HEIGHT);
const aiCarRenderer = new AICarRenderer(LOGICAL_WIDTH, LOGICAL_HEIGHT);

const input = new InputHandler();
const physics = new PlayerPhysics();
const steering = new SteeringPhysics();
const collisionDetector = new CollisionDetector();
let explosionState = new ExplosionState();
const aiCarSystem = new AICarSystem();

/** Player's world-Z position in metres. Advances each frame based on speed. */
let playerZ = 0;

/** Whether the player car is currently off the road surface (on grass). */
let isOffRoad = false;

/** Whether the player is currently touching a collision object (billboard or AI car). */
let isColliding = false;

/** Snapshot of AI car states updated each frame (reused for collision + rendering). */
let aiCars = aiCarSystem.getCars();

/** Elapsed time in the current state (ms). Reset in each state's onEnter. */
let stateElapsed = 0;

// ─── Gameplay logic (shared by QUALIFYING and GRAND_PRIX) ────────────────────

function updateGameplay(dt: number): void {
  // Advance AI cars every frame (they move regardless of player state).
  aiCarSystem.update(dt);
  aiCars = aiCarSystem.getCars();

  // During an explosion the car is frozen — advance the timer and respawn when done.
  if (explosionState.isExploding) {
    const shouldRespawn = explosionState.update(dt);
    if (shouldRespawn) {
      physics.reset();
      steering.reset();
    }
    isOffRoad = false;
    isColliding = false;
    return;
  }

  // Update speed model
  physics.update(dt, input.throttle, input.brake, input.gear);

  // Update lateral position based on steering input and road curve
  const curvePower = getTrackCurve(playerZ);
  steering.update(dt, input.left, input.right, physics.speed, curvePower, physics.topSpeedHighGear);

  // Off-road detection: car is off-road when outside the road edges
  isOffRoad = Math.abs(steering.playerX) > ROAD_HALF_WIDTH;
  if (isOffRoad) {
    physics.applyOffRoadPenalty(dt);
  }

  // Collision detection: player vs billboards and AI cars
  isColliding =
    collisionDetector.checkBillboards(playerZ, steering.playerX) ||
    collisionDetector.checkAICars(playerZ, steering.playerX, aiCars);

  // Trigger explosion on fresh collision
  if (isColliding) {
    explosionState.trigger();
  }

  // Advance position along the track (speed in MPH → metres per second)
  playerZ += physics.speed * MPH_TO_MS * (dt / 1000);
}

function renderGameplay(ctx: CanvasRenderingContext2D): void {
  const playerX = steering.playerX;

  // Compute per-scanline curve offsets to determine vanishing-point sway.
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
  roadRenderer.render(ctx, playerZ, getTrackCurve, 0, playerX);

  // Render distance-scaled billboard sprites on road edges
  billboardRenderer.render(ctx, playerZ, getTrackCurve, playerX);

  // Render AI opponent cars (Z-sorted, same perspective projection as billboards)
  aiCarRenderer.render(ctx, aiCars, playerZ, getTrackCurve, playerX);

  // Off-road visual feedback: semi-transparent green overlay on the road area
  if (isOffRoad) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#3a6e10';
    ctx.fillRect(0, HORIZON_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - HORIZON_Y);
    ctx.restore();
  }

  // Render player car or explosion animation (mutually exclusive)
  if (explosionState.isExploding) {
    explosionRenderer.render(ctx, playerX, explosionState.frame);
  } else {
    // Collision flash: brief white overlay when first touching a billboard or AI car
    if (isColliding) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, HORIZON_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - HORIZON_Y);
      ctx.restore();
    }

    // Render player car sprite (always on top of road and billboards)
    const steer = PlayerCarRenderer.steerState(input.left, input.right);
    playerCarRenderer.render(ctx, playerX, steer);
  }
}

/** Render the road scene at a fixed camera (no player movement) — used as backdrop for overlay screens. */
function renderRoadBackdrop(ctx: CanvasRenderingContext2D): void {
  const curveOffsets = computeCurveOffsets(
    LOGICAL_HEIGHT,
    HORIZON_Y,
    CAMERA_DEPTH,
    0,
    getTrackCurve
  );
  const parallaxX = curveOffsets[HORIZON_Y + 1];
  bgRenderer.render(ctx, parallaxX);
  roadRenderer.render(ctx, 0, getTrackCurve, 0, 0);
}

// ─── State machine setup ─────────────────────────────────────────────────────

const stateMachine = new GameStateMachine(GameState.ATTRACT);

// ATTRACT — title screen shown while idle
stateMachine.register(GameState.ATTRACT, {
  onEnter: () => {
    stateElapsed = 0;
  },
  update: (dt) => {
    stateElapsed += dt;
    // Brief grace period prevents accidental transitions right after entering state
    if (stateElapsed > 300) {
      const startPressed = input.isKeyDown('Enter') || input.isKeyDown('Space') || input.throttle;
      if (startPressed) {
        stateMachine.transition(GameState.COIN_INSERT);
      }
    }
  },
  render: (ctx) => {
    renderRoadBackdrop(ctx);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('POLE POSITION', LOGICAL_WIDTH / 2, 80);
    // Blink "PRESS ENTER" every 500 ms
    if (Math.floor(stateElapsed / 500) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.fillText('PRESS ENTER TO START', LOGICAL_WIDTH / 2, 120);
    }
    ctx.restore();
  },
});

// COIN_INSERT — brief credit screen before qualifying
stateMachine.register(GameState.COIN_INSERT, {
  onEnter: () => {
    stateElapsed = 0;
  },
  update: (dt) => {
    stateElapsed += dt;
    if (stateElapsed > 1500) {
      stateMachine.transition(GameState.QUALIFYING);
    }
  },
  render: (ctx) => {
    renderRoadBackdrop(ctx);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CREDIT  1', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    ctx.restore();
  },
});

// QUALIFYING — timed single lap; full gameplay active
stateMachine.register(GameState.QUALIFYING, {
  onEnter: () => {
    playerZ = 0;
    physics.reset();
    steering.reset();
    explosionState = new ExplosionState();
    aiCarSystem.reset();
    aiCars = aiCarSystem.getCars();
    isOffRoad = false;
    isColliding = false;
  },
  update: updateGameplay,
  render: renderGameplay,
});

// GRID_DISPLAY — show earned starting grid position
stateMachine.register(GameState.GRID_DISPLAY, {
  onEnter: () => {
    stateElapsed = 0;
  },
  update: (dt) => {
    stateElapsed += dt;
    if (stateElapsed > 3000) {
      stateMachine.transition(GameState.GRAND_PRIX);
    }
  },
  render: (ctx) => {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GRID POSITION', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 8);
    ctx.fillText('YOU ARE IN 8th', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 8);
    ctx.restore();
  },
});

// GRAND_PRIX — multi-lap race; full gameplay active
stateMachine.register(GameState.GRAND_PRIX, {
  onEnter: () => {
    playerZ = 0;
    physics.reset();
    steering.reset();
    explosionState = new ExplosionState();
    aiCarSystem.reset();
    aiCars = aiCarSystem.getCars();
    isOffRoad = false;
    isColliding = false;
  },
  update: updateGameplay,
  render: renderGameplay,
});

// RACE_COMPLETE — all laps finished
stateMachine.register(GameState.RACE_COMPLETE, {
  onEnter: () => {
    stateElapsed = 0;
  },
  update: (dt) => {
    stateElapsed += dt;
    if (stateElapsed > 3000) {
      stateMachine.transition(GameState.NAME_ENTRY);
    }
  },
  render: (ctx) => {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RACE COMPLETE', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    ctx.restore();
  },
});

// GAME_OVER — timer expired before completing the qualifying lap or race
stateMachine.register(GameState.GAME_OVER, {
  onEnter: () => {
    stateElapsed = 0;
  },
  update: (dt) => {
    stateElapsed += dt;
    if (stateElapsed > 3000) {
      stateMachine.transition(GameState.ATTRACT);
    }
  },
  render: (ctx) => {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = '#ff2222';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    ctx.restore();
  },
});

// NAME_ENTRY — player enters 3-character initials for high score
stateMachine.register(GameState.NAME_ENTRY, {
  onEnter: () => {
    stateElapsed = 0;
  },
  update: (dt) => {
    stateElapsed += dt;
    if (stateElapsed > 5000) {
      stateMachine.transition(GameState.ATTRACT);
    }
  },
  render: (ctx) => {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER YOUR NAME', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    ctx.restore();
  },
});

// ─── Main entry point ─────────────────────────────────────────────────────────

function main(): void {
  const ctx = setupCanvas();
  const loop = new GameLoop((dt) => {
    stateMachine.update(dt);
    stateMachine.render(ctx);
  });
  loop.start();
}

main();
