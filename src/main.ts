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
import { AttractMode, AttractPhase } from './state/AttractMode';
import { QualifyingState, QualifyingOutcome } from './state/QualifyingState';
import { GridDisplayState } from './state/GridDisplayState';
import { GrandPrixState, GrandPrixOutcome } from './state/GrandPrixState';
import { RaceCompleteState } from './state/RaceCompleteState';
import { ScoreTracker } from './state/ScoreTracker';
import { HUDRenderer } from './renderer/HUDRenderer';
import { TRACK_LENGTH } from './track/fujiSpeedway';
import { HighScoreManager } from './state/HighScoreManager';
import { NameEntryState, NAME_ENTRY_LETTERS } from './state/NameEntryState';

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

/** Attract mode cycle controller (title ↔ demo phases). */
const attractMode = new AttractMode();

/** Qualifying lap state — timer, lap detection, grid position. */
const qualifyingState = new QualifyingState();

/** Grid position display state — timer and earned position for the post-qualifying screen. */
const gridDisplayState = new GridDisplayState();

/** Grand Prix race state — lap counter, countdown timer, and bonus time management. */
const grandPrixState = new GrandPrixState();

/** Race complete state — captures remaining timer and computes time bonus. */
const raceCompleteState = new RaceCompleteState();

/** Score tracker — accumulates points for distance, overtakes, and bonuses. */
const scoreTracker = new ScoreTracker();

/** HUD renderer — draws speed, timer, score, lap, and race position overlays. */
const hudRenderer = new HUDRenderer(LOGICAL_WIDTH, LOGICAL_HEIGHT);

/** High score manager — persistent localStorage table, ranking tiers. */
const highScoreManager = new HighScoreManager();

/** Name entry state — manages 3-initial keyboard input. */
const nameEntryState = new NameEntryState();

/** 1-based rank awarded to the player at the end of the last race. */
let playerRank = 0;

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
  const metersAdvanced = physics.speed * MPH_TO_MS * (dt / 1000);
  playerZ += metersAdvanced;

  // Award distance points and check for AI car overtakes
  scoreTracker.addDistance(metersAdvanced);
  scoreTracker.recordOvertakes(
    playerZ,
    aiCars.map((c) => c.z),
    TRACK_LENGTH
  );
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return the English ordinal string for a positive integer (1→"1st", 2→"2nd", …). */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ─── State machine setup ─────────────────────────────────────────────────────

const stateMachine = new GameStateMachine(GameState.ATTRACT);

// ATTRACT — cycling title / demo screen shown while idle
stateMachine.register(GameState.ATTRACT, {
  onEnter: () => {
    stateElapsed = 0;
    attractMode.reset();
  },
  update: (dt) => {
    stateElapsed += dt;
    attractMode.update(dt);

    // Brief grace period prevents accidental transitions right after entering state
    if (stateElapsed > 300) {
      const startPressed = input.isKeyDown('Enter') || input.isKeyDown('Space') || input.throttle;
      if (startPressed) {
        stateMachine.transition(GameState.COIN_INSERT);
      }
    }
  },
  render: (ctx) => {
    if (attractMode.phase === AttractPhase.DEMO) {
      // DEMO phase: show the road scrolling with a simulated driver
      const curveOffsets = computeCurveOffsets(
        LOGICAL_HEIGHT,
        HORIZON_Y,
        CAMERA_DEPTH,
        attractMode.demoZ,
        getTrackCurve
      );
      const parallaxX = curveOffsets[HORIZON_Y + 1];
      bgRenderer.render(ctx, parallaxX);
      roadRenderer.render(ctx, attractMode.demoZ, getTrackCurve, 0, 0);

      // Dim overlay so "PRESS ENTER" is still visible
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEMO', LOGICAL_WIDTH / 2, 12);
      ctx.restore();
    } else {
      // TITLE phase: static road backdrop + title overlay
      renderRoadBackdrop(ctx);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('POLE POSITION', LOGICAL_WIDTH / 2, 80);
      ctx.restore();
    }

    // Blink "PRESS ENTER" every 500 ms across both phases
    if (Math.floor(stateElapsed / 500) % 2 === 0) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ENTER TO START', LOGICAL_WIDTH / 2, 120);
      ctx.restore();
    }
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
    qualifyingState.reset();
    scoreTracker.reset();
  },
  update: (dt) => {
    updateGameplay(dt);
    qualifyingState.update(dt, playerZ, TRACK_LENGTH);

    if (qualifyingState.outcome === QualifyingOutcome.QUALIFIED) {
      scoreTracker.addQualifyingBonus(qualifyingState.gridPosition);
      gridDisplayState.reset(qualifyingState.gridPosition);
      stateMachine.transition(GameState.GRID_DISPLAY);
    } else if (qualifyingState.outcome === QualifyingOutcome.FAILED) {
      stateMachine.transition(GameState.GAME_OVER);
    }
  },
  render: (ctx) => {
    renderGameplay(ctx);

    // "QUALIFYING START" announcement banner
    if (qualifyingState.showAnnouncement) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, HORIZON_Y + 8, LOGICAL_WIDTH, 20);
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QUALIFYING START', LOGICAL_WIDTH / 2, HORIZON_Y + 22);
      ctx.restore();
    }

    // HUD overlay: score, timer, speed, and race position
    const racePos = HUDRenderer.computeRacePosition(
      playerZ,
      aiCars.map((c) => c.z),
      TRACK_LENGTH
    );
    hudRenderer.render(ctx, {
      score: scoreTracker.score,
      timerSeconds: qualifyingState.timerSeconds,
      speedMph: physics.speed,
      racePosition: racePos,
    });
  },
});

// GRID_DISPLAY — show earned starting grid position after qualifying
stateMachine.register(GameState.GRID_DISPLAY, {
  onEnter: () => {
    // gridDisplayState was already reset in QUALIFYING's update when QUALIFIED
    // (reset call sets the earned position); nothing extra needed here.
  },
  update: (dt) => {
    gridDisplayState.update(dt);
    if (gridDisplayState.isDone) {
      stateMachine.transition(GameState.GRAND_PRIX);
    }
  },
  render: (ctx) => {
    renderRoadBackdrop(ctx);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Title banner
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GRID POSITION', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 16);

    // Position text
    const posText =
      gridDisplayState.gridPosition > 0
        ? `YOU ARE IN ${ordinal(gridDisplayState.gridPosition)}`
        : 'DID NOT QUALIFY';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(posText, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 4);

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
    grandPrixState.reset();
    // Re-initialise overtake tracking without clearing the score accumulated
    // during qualifying — just reset the per-car baseline.
    scoreTracker.recordOvertakes(
      playerZ,
      aiCars.map((c) => c.z),
      TRACK_LENGTH
    );
  },
  update: (dt) => {
    updateGameplay(dt);
    const lapCrossed = grandPrixState.update(dt, playerZ, TRACK_LENGTH);

    if (lapCrossed && grandPrixState.outcome === GrandPrixOutcome.PENDING) {
      // Wrap playerZ back to the start of the new lap
      playerZ -= TRACK_LENGTH;
    }

    if (grandPrixState.outcome === GrandPrixOutcome.COMPLETE) {
      scoreTracker.addTimeBonus(grandPrixState.timerMs);
      raceCompleteState.reset(grandPrixState.timerMs);
      stateMachine.transition(GameState.RACE_COMPLETE);
    } else if (grandPrixState.outcome === GrandPrixOutcome.FAILED) {
      stateMachine.transition(GameState.GAME_OVER);
    }
  },
  render: (ctx) => {
    renderGameplay(ctx);

    // "GRAND PRIX START" announcement banner
    if (grandPrixState.showAnnouncement) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, HORIZON_Y + 8, LOGICAL_WIDTH, 20);
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GRAND PRIX START', LOGICAL_WIDTH / 2, HORIZON_Y + 22);
      ctx.restore();
    }

    // HUD overlay: score, timer, speed, lap counter, and race position
    const racePos = HUDRenderer.computeRacePosition(
      playerZ,
      aiCars.map((c) => c.z),
      TRACK_LENGTH
    );
    hudRenderer.render(ctx, {
      score: scoreTracker.score,
      timerSeconds: grandPrixState.timerSeconds,
      speedMph: physics.speed,
      lapCurrent: grandPrixState.currentLap,
      lapTotal: grandPrixState.totalLaps,
      racePosition: racePos,
    });
  },
});

// RACE_COMPLETE — all laps finished; show time bonus then go to name entry
stateMachine.register(GameState.RACE_COMPLETE, {
  onEnter: () => {
    // raceCompleteState was already reset in GRAND_PRIX's update when COMPLETE
  },
  update: (dt) => {
    raceCompleteState.update(dt);
    if (raceCompleteState.isDone) {
      stateMachine.transition(GameState.NAME_ENTRY);
    }
  },
  render: (ctx) => {
    renderRoadBackdrop(ctx);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // "RACE COMPLETE" banner
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RACE COMPLETE', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 24);

    // Time bonus
    const secs = raceCompleteState.remainingTimerSeconds;
    const bonus = raceCompleteState.timeBonus;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(
      `TIME REMAINING  ${String(secs).padStart(3, ' ')} SEC`,
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2
    );
    ctx.fillText(
      `TIME BONUS  ${String(bonus).padStart(6, ' ')} PTS`,
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2 + 14
    );
    ctx.fillText(
      `SCORE  ${String(scoreTracker.score).padStart(6, '0')}`,
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2 + 28
    );

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
    nameEntryState.reset();
    stateElapsed = 0;
  },
  update: (dt) => {
    stateElapsed += dt;

    if (!nameEntryState.isDone) {
      nameEntryState.update(
        dt,
        input.left,
        input.right,
        input.isKeyDown('Enter') || input.isKeyDown('Space')
      );

      if (nameEntryState.isDone) {
        playerRank = highScoreManager.addEntry(nameEntryState.initials, scoreTracker.score);
      }
    } else {
      // After name is submitted, show the table for a moment before returning
      if (stateElapsed > 6000) {
        stateMachine.transition(GameState.ATTRACT);
      }
    }
  },
  render: (ctx) => {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (!nameEntryState.isDone) {
      // ── Name-entry input screen ─────────────────────────────────────────
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ENTER YOUR NAME', LOGICAL_WIDTH / 2, 28);

      // Score
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '7px monospace';
      ctx.fillText(`SCORE  ${String(scoreTracker.score).padStart(6, '0')}`, LOGICAL_WIDTH / 2, 44);

      // Letter slots — draw each of the 3 initials boxes
      const slotSpacing = 18;
      const slotsStartX = LOGICAL_WIDTH / 2 - slotSpacing;
      const slotsY = 80;

      for (let i = 0; i < 3; i++) {
        const x = slotsStartX + i * slotSpacing;
        const letter = NAME_ENTRY_LETTERS[nameEntryState.letterIndices[i] ?? 0] ?? 'A';
        const isActive = nameEntryState.currentSlot === i;

        // Highlight active slot
        if (isActive) {
          ctx.fillStyle = '#ffdd00';
          ctx.fillRect(x - 6, slotsY - 10, 12, 14);
          ctx.fillStyle = '#000000';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(letter, x, slotsY);
      }

      // Navigation hint — blink every 600 ms
      if (Math.floor(stateElapsed / 600) % 2 === 0) {
        ctx.fillStyle = '#888888';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('< > TO SELECT  ENTER TO CONFIRM', LOGICAL_WIDTH / 2, 102);
      }
    } else {
      // ── High score table ────────────────────────────────────────────────
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HIGH SCORES', LOGICAL_WIDTH / 2, 16);

      const entries = highScoreManager.entries;
      const lineH = 12;
      const tableY = 28;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry) continue;
        const rank = i + 1;
        const isPlayer = rank === playerRank && entry.initials === nameEntryState.initials;

        ctx.fillStyle = isPlayer ? '#ffdd00' : rank <= 3 ? '#ffffff' : '#aaaaaa';
        ctx.font = `${isPlayer ? 'bold ' : ''}7px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(
          `${String(rank).padStart(2, ' ')}  ${entry.initials}  ${String(entry.score).padStart(6, '0')}`,
          24,
          tableY + i * lineH
        );
      }

      if (entries.length === 0) {
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO SCORES YET', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
      }
    }

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
