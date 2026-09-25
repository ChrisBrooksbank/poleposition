// Game - wires the sim, states, audio and Three.js scene into the playable remaster.
import * as THREE from 'three';
import { Stage } from './Stage';
import { createRoadMesh } from './RoadMesh';
import { createScenery, type Scenery } from './scenery';
import { createCarModel, animateCar, type CarModel } from './carModel';
import { Explosion, createPuddleMeshes } from './effects';
import * as screens from './screens';
import { FixedStepLoop } from '../sim/FixedStepLoop';
import { Track } from '../sim/Track';
import { FUJI } from '../sim/tracks/fuji';
import { PlayerCar, MPH_TO_MS } from '../sim/PlayerCar';
import { AIField, AI_COUNT, gridSlot } from '../sim/AIField';
import { buildSceneryLayout } from '../sim/scenery';
import {
  FUJI_PUDDLES,
  billboardBoxes,
  boxesOverlap,
  anyOverlap,
  carBox,
  puddleBox,
} from '../sim/hazards';
import { InputHandler } from '../input/InputHandler';
import { GameStateMachine, GameState } from '../state/GameStateMachine';
import { AttractMode, AttractPhase } from '../state/AttractMode';
import { QualifyingState, QualifyingOutcome } from '../state/QualifyingState';
import { GridDisplayState } from '../state/GridDisplayState';
import { GrandPrixState, GrandPrixOutcome } from '../state/GrandPrixState';
import { RaceCompleteState } from '../state/RaceCompleteState';
import { ScoreTracker } from '../state/ScoreTracker';
import { ExplosionState } from '../state/ExplosionState';
import { PuddleSpinState, SPIN_DURATION_MS } from '../state/PuddleSpinState';
import { HighScoreManager } from '../state/HighScoreManager';
import { NameEntryState } from '../state/NameEntryState';
import { HUDRenderer } from './HUDRenderer';
import { DIPSwitchSettings } from '../settings/DIPSwitchSettings';
import { DIPSwitchPanel } from '../settings/DIPSwitchPanel';
import { AudioSystem } from '../audio/AudioSystem';
import { EngineSound } from '../audio/EngineSound';
import { TireScreech } from '../audio/TireScreech';
import { CollisionSound } from '../audio/CollisionSound';
import { DiscreteSFX } from '../audio/DiscreteSFX';
import { VoiceAnnouncements } from '../audio/VoiceAnnouncements';

const CAMERA_BACK = 7;
const CAMERA_HEIGHT = 2.6;
const CAMERA_LOOK_AHEAD = 30;
/** The old road-space unit: 110 px was the road half-width, which is 7 m. */
const PX_TO_M = 7 / 110;
const DEMO_START = 300;

const AI_PALETTES = [
  { body: 0x1f5fd0, accent: 0xf5f5f5 },
  { body: 0xf2c200, accent: 0x222222 },
  { body: 0x1fa04a, accent: 0xf5f5f5 },
  { body: 0x8b2fc9, accent: 0xffd400 },
];

export class Game {
  private readonly stage: Stage;
  private readonly overlay: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly track = new Track(FUJI);
  private readonly car = new PlayerCar(this.track);
  private readonly ai = new AIField(this.track);
  private readonly input = new InputHandler();
  private readonly dip = new DIPSwitchSettings();
  private readonly dipPanel = new DIPSwitchPanel(this.dip);
  private readonly boards = billboardBoxes(buildSceneryLayout(this.track));
  private readonly puddleBoxes = FUJI_PUDDLES.map(puddleBox);

  private readonly scenery: Scenery;
  private readonly playerModel: CarModel;
  private readonly aiModels: CarModel[] = [];
  private readonly explosionFx = new Explosion();

  private readonly machine = new GameStateMachine(GameState.ATTRACT);
  private readonly attract = new AttractMode();
  private readonly qualifying = new QualifyingState();
  private readonly gridDisplay = new GridDisplayState();
  private readonly grandPrix = new GrandPrixState();
  private readonly raceComplete = new RaceCompleteState();
  private readonly score = new ScoreTracker();
  private readonly explosionState = new ExplosionState();
  private readonly puddleSpin = new PuddleSpinState();
  private readonly highScores = new HighScoreManager();
  private readonly nameEntry = new NameEntryState();
  private readonly hud = new HUDRenderer(screens.W, screens.H);

  private readonly audio = new AudioSystem();
  private readonly engine = new EngineSound(this.audio);
  private readonly screech = new TireScreech(this.audio);
  private readonly crashSound = new CollisionSound(this.audio);
  private readonly sfx = new DiscreteSFX(this.audio);
  private readonly voice = new VoiceAnnouncements(this.audio);

  // Simulation bookkeeping.
  private stateElapsed = 0;
  private playerRank = 0;
  /** Total distance raced (unwrapped), used for race position. */
  private raceDistance = 0;
  private spinTime = 0;
  private shake = 0;
  private prevDistance = 0;
  private prevLateral = 0;
  private prevAi: number[] = [];
  private prevAiLateral: number[] = [];
  private showTraffic = false;
  private wheelDistance = 0;

  constructor(host: HTMLElement) {
    this.stage = new Stage(host);
    const scene = this.stage.scene;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x557755, 1.5));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    sun.position.set(-300, 500, -200);
    scene.add(sun);
    scene.add(createRoadMesh(this.track));
    this.scenery = createScenery(this.track);
    scene.add(this.scenery.group);
    scene.add(createPuddleMeshes(this.track, FUJI_PUDDLES));

    this.playerModel = createCarModel({ body: 0xd22020, accent: 0xf5f5f5 });
    scene.add(this.playerModel.group);
    for (let i = 0; i < AI_COUNT; i++) {
      const model = createCarModel(AI_PALETTES[i % AI_PALETTES.length]);
      model.group.visible = false;
      this.aiModels.push(model);
      scene.add(model.group);
    }
    scene.add(this.explosionFx.group);

    this.overlay = document.createElement('canvas');
    this.overlay.width = screens.W;
    this.overlay.height = screens.H;
    this.overlay.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none';
    this.stage.wrapper.appendChild(this.overlay);
    this.ctx = this.overlay.getContext('2d') as CanvasRenderingContext2D;

    // Browsers only allow audio after a user gesture.
    const unlock = () => this.audio.resume();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') this.togglePause();
    });
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);

    this.registerStates();
    this.resetPositions(0);
    // Test hook: ?debug exposes the game so automated play-tests can jump between states.
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __game: Game }).__game = this;
    }
  }

  private togglePause(): void {
    const racing = [GameState.QUALIFYING, GameState.GRAND_PRIX].includes(this.machine.state);
    if (!racing && !this.paused) return;
    this.paused = !this.paused;
    if (this.audio.isReady) {
      if (this.paused) void this.audio.context.suspend();
      else void this.audio.context.resume();
    }
  }

  /** Jump straight to a state (used by automated play-tests). */
  debugGoto(state: GameState): void {
    this.machine.transition(state);
  }

  /** Put the player somewhere specific (used by automated play-tests). */
  debugTeleport(distance: number, lateral = 0, speedMph = 0): void {
    this.car.distance = distance;
    this.car.lateral = lateral;
    this.car.speed = speedMph * MPH_TO_MS;
    this.snapshot();
  }

  /** Snapshot of key sim values for automated play-tests. */
  debugInfo(): Record<string, number | string> {
    return {
      state: this.machine.state,
      distance: this.car.distance,
      lateral: this.car.lateral,
      speedMph: this.car.speedMph,
      score: this.score.score,
      lap: this.grandPrix.currentLap,
      position: this.racePosition(),
      exploding: String(this.explosionState.isExploding),
    };
  }

  start(): void {
    new FixedStepLoop(
      (dt) => this.step(dt),
      (alpha) => this.render(alpha)
    ).start();
  }

  // ─── Simulation ────────────────────────────────────────────────────────────

  private paused = false;

  private step(dt: number): void {
    if (this.paused) return;
    this.snapshot();
    this.machine.update(dt * 1000);
  }

  private snapshot(): void {
    this.prevDistance = this.car.distance;
    this.prevLateral = this.car.lateral;
    this.prevAi = this.ai.all.map((c) => c.distance);
    this.prevAiLateral = this.ai.all.map((c) => c.lateral);
  }

  private get confirmPressed(): boolean {
    return this.input.isKeyDown('Enter') || this.input.isKeyDown('Space');
  }

  private resetPositions(distance: number): void {
    this.car.respawn();
    this.car.distance = distance;
    this.raceDistance = distance;
    this.snapshot();
  }

  private beginRun(distance: number): void {
    this.car.respawn();
    this.car.distance = distance;
    this.raceDistance = distance;
    this.explosionState.update(1e9);
    this.puddleSpin.reset();
    this.spinTime = 0;
    this.shake = 0;
    this.showTraffic = true;
    this.engine.start();
    this.screech.start();
    this.sfx.startGrassRumble();
    this.snapshot();
  }

  private endRun(): void {
    this.engine.stop();
    this.screech.stop();
    this.sfx.stopGrassRumble();
    this.showTraffic = false;
  }

  private crash(): void {
    this.explosionState.trigger();
    this.crashSound.trigger();
    const pose = this.track.poseAt(this.car.distance, this.car.lateral);
    this.explosionFx.start(new THREE.Vector3(pose.x, pose.y, pose.z));
    this.car.speed = 0;
    this.shake = 1;
  }

  private stepGameplay(dtMs: number): void {
    const dt = dtMs / 1000;
    this.ai.update(dt, this.dip.aiSpeedMultiplier);
    this.explosionFx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 0.6);

    if (this.explosionState.isExploding) {
      if (this.explosionState.update(dtMs)) {
        this.car.respawn();
        this.puddleSpin.reset();
        this.spinTime = 0;
      }
      this.engine.update(0);
      return;
    }

    const before = this.car.distance;
    const input = {
      left: this.input.left,
      right: this.input.right,
      throttle: this.input.throttle,
      brake: this.input.brake,
      gear: this.input.gear,
    };
    this.car.step(dt, input);

    // Puddles cause a spin and a lateral wobble; they never destroy the car.
    this.puddleSpin.update(dtMs);
    const me = carBox(this.car.distance, this.car.lateral);
    if (
      this.puddleBoxes.some((p) => boxesOverlap(this.track, me, p)) &&
      this.puddleSpin.trigger()
    ) {
      this.sfx.triggerPuddleHit();
      this.spinTime = 0;
    }
    if (this.puddleSpin.isSpinning) this.spinTime += dt;
    const nudge = this.puddleSpin.getLateralNudge(dtMs) * PX_TO_M;
    if (nudge !== 0) this.car.lateral += nudge;

    // Solid objects: billboards and other cars.
    const hitCar = this.ai.all.some((c) =>
      boxesOverlap(
        this.track,
        carBox(this.car.distance, this.car.lateral),
        carBox(this.ai.sOf(c), c.lateral)
      )
    );
    if (
      hitCar ||
      anyOverlap(this.track, carBox(this.car.distance, this.car.lateral), this.boards)
    ) {
      this.crash();
    }

    const advanced = Math.max(0, this.car.distance - before);
    this.raceDistance += advanced;
    this.score.addDistance(advanced);
    this.score.recordOvertakes(
      this.track.wrap(this.car.distance),
      this.ai.all.map((c) => this.ai.sOf(c)),
      this.track.length
    );

    // Audio.
    this.engine.update(this.car.speedMph);
    const steer = (this.input.left ? 1 : 0) + (this.input.right ? 1 : 0);
    this.screech.update(steer * Math.min(1, this.car.speedMph / 100), this.car.offRoad);
    this.sfx.updateGrassRumble(this.car.offRoad);
  }

  private racePosition(): number {
    return 1 + this.ai.all.filter((c) => c.distance > this.raceDistance).length;
  }

  // ─── States ────────────────────────────────────────────────────────────────

  private registerStates(): void {
    const m = this.machine;
    const clear = () => this.ctx.clearRect(0, 0, screens.W, screens.H);
    const hudNow = (timerSeconds: number, lap?: { current: number; total: number }) =>
      this.hud.render(this.ctx, {
        score: this.score.score,
        timerSeconds,
        speedMph: this.car.speedMph,
        useKph: this.dip.useKph,
        lapCurrent: lap?.current,
        lapTotal: lap?.total,
        racePosition: this.racePosition(),
      });

    m.register(GameState.ATTRACT, {
      onEnter: () => {
        this.stateElapsed = 0;
        this.attract.reset();
        this.showTraffic = false;
        this.resetPositions(0);
      },
      update: (dt) => {
        this.stateElapsed += dt;
        this.attract.update(dt);
        if (this.attract.phase === AttractPhase.DEMO) {
          // The demo car cruises down the road on its own.
          this.car.distance = DEMO_START + this.attract.demoZ;
          this.car.lateral = Math.sin(this.attract.elapsed / 900) * 1.5;
          this.car.speed = AttractMode.DEMO_SPEED_MPH * MPH_TO_MS;
        } else {
          this.car.distance = 0;
          this.car.lateral = 0;
          this.car.speed = 0;
        }
        this.prevDistance = this.car.distance;
        this.prevLateral = this.car.lateral;
        if (this.stateElapsed > 300) {
          if (this.confirmPressed || this.input.throttle) {
            this.audio.resume();
            m.transition(GameState.COIN_INSERT);
          } else if (this.input.isKeyDown('KeyD')) {
            m.transition(GameState.SETTINGS);
          }
        }
      },
      render: (ctx) => {
        clear();
        if (this.attract.phase === AttractPhase.DEMO) screens.drawDemoLabel(ctx, this.stateElapsed);
        else screens.drawTitle(ctx, this.stateElapsed, this.topScore());
      },
    });

    m.register(GameState.COIN_INSERT, {
      onEnter: () => {
        this.stateElapsed = 0;
        this.sfx.triggerCoinInsert();
        this.resetPositions(0);
      },
      update: (dt) => {
        this.stateElapsed += dt;
        if (this.stateElapsed > 1500) m.transition(GameState.QUALIFYING);
      },
      render: (ctx) => {
        clear();
        screens.drawCredit(ctx);
      },
    });

    m.register(GameState.QUALIFYING, {
      onEnter: () => {
        this.score.reset();
        this.ai.startQualifying();
        this.qualifying.reset(this.dip.qualifyingTime);
        this.beginRun(0);
        this.sfx.triggerQualifyingFanfare();
        this.voice.triggerQualifyingStart();
      },
      update: (dt) => {
        this.stepGameplay(dt);
        this.qualifying.update(dt, this.car.distance, this.track.length);
        if (this.qualifying.outcome === QualifyingOutcome.QUALIFIED) {
          this.score.addQualifyingBonus(this.qualifying.gridPosition);
          this.gridDisplay.reset(this.qualifying.gridPosition);
          this.sfx.triggerQualifyingComplete(this.qualifying.gridPosition === 1);
          this.endRun();
          this.car.speed = 0;
          m.transition(GameState.GRID_DISPLAY);
        } else if (this.qualifying.outcome === QualifyingOutcome.FAILED) {
          this.endRun();
          m.transition(GameState.GAME_OVER);
        }
      },
      render: (ctx) => {
        clear();
        hudNow(this.qualifying.timerSeconds);
        if (this.qualifying.showAnnouncement) screens.drawBanner(ctx, 'QUALIFYING START');
      },
    });

    m.register(GameState.GRID_DISPLAY, {
      onEnter: () => {
        // Show the cars lined up on the grid, with the player in the slot just earned.
        const slot = Math.max(0, (this.gridDisplay.gridPosition || AI_COUNT + 1) - 1);
        this.ai.startGrid(slot);
        this.car.respawn();
        this.car.distance = gridSlot(slot).distance;
        this.car.lateral = gridSlot(slot).lateral;
        this.snapshot();
        this.showTraffic = true;
      },
      update: (dt) => {
        this.gridDisplay.update(dt);
        if (this.gridDisplay.isDone) m.transition(GameState.GRAND_PRIX);
      },
      render: (ctx) => {
        clear();
        screens.drawGrid(ctx, this.gridDisplay.gridPosition);
      },
    });

    m.register(GameState.GRAND_PRIX, {
      onEnter: () => {
        const slot = Math.max(0, (this.qualifying.gridPosition || AI_COUNT + 1) - 1);
        this.ai.startGrid(slot);
        this.grandPrix.reset(this.dip.lapCount);
        this.beginRun(gridSlot(slot).distance);
        this.car.lateral = gridSlot(slot).lateral;
        this.prevLateral = this.car.lateral;
        // Baseline for overtake scoring without clearing the qualifying score.
        this.score.recordOvertakes(
          this.track.wrap(this.car.distance),
          this.ai.all.map((c) => this.ai.sOf(c)),
          this.track.length
        );
        this.voice.triggerGrandPrixStart();
      },
      update: (dt) => {
        this.stepGameplay(dt);
        const lapCrossed = this.grandPrix.update(dt, this.car.distance, this.track.length);
        if (lapCrossed && this.grandPrix.outcome === GrandPrixOutcome.PENDING) {
          this.car.distance -= this.track.length;
          this.prevDistance -= this.track.length;
          this.sfx.triggerTimeExtend();
        }
        if (this.grandPrix.outcome === GrandPrixOutcome.COMPLETE) {
          this.score.addTimeBonus(this.grandPrix.timerMs);
          this.raceComplete.reset(this.grandPrix.timerMs);
          this.endRun();
          this.sfx.triggerRaceComplete();
          m.transition(GameState.RACE_COMPLETE);
        } else if (this.grandPrix.outcome === GrandPrixOutcome.FAILED) {
          this.endRun();
          m.transition(GameState.GAME_OVER);
        }
      },
      render: (ctx) => {
        clear();
        hudNow(this.grandPrix.timerSeconds, {
          current: this.grandPrix.currentLap,
          total: this.grandPrix.totalLaps,
        });
        if (this.grandPrix.showAnnouncement) screens.drawBanner(ctx, 'GRAND PRIX START');
      },
    });

    m.register(GameState.RACE_COMPLETE, {
      update: (dt) => {
        this.ai.update(dt / 1000, this.dip.aiSpeedMultiplier);
        // Coast to a stop past the line.
        this.car.step(dt / 1000, {
          left: false,
          right: false,
          throttle: false,
          brake: true,
          gear: 'high',
        });
        this.raceComplete.update(dt);
        if (this.raceComplete.isDone) m.transition(GameState.NAME_ENTRY);
      },
      render: (ctx) => {
        clear();
        screens.drawRaceComplete(
          ctx,
          this.raceComplete.remainingTimerSeconds,
          this.raceComplete.timeBonus,
          this.score.score
        );
      },
    });

    m.register(GameState.GAME_OVER, {
      onEnter: () => {
        this.stateElapsed = 0;
      },
      update: (dt) => {
        this.stateElapsed += dt;
        if (this.stateElapsed > 3000) m.transition(GameState.ATTRACT);
      },
      render: (ctx) => screens.drawGameOver(ctx),
    });

    m.register(GameState.NAME_ENTRY, {
      onEnter: () => {
        this.nameEntry.reset();
        this.stateElapsed = 0;
      },
      update: (dt) => {
        this.stateElapsed += dt;
        if (!this.nameEntry.isDone) {
          this.nameEntry.update(dt, this.input.left, this.input.right, this.confirmPressed);
          if (this.nameEntry.isDone) {
            this.playerRank = this.highScores.addEntry(this.nameEntry.initials, this.score.score);
          }
        } else if (this.stateElapsed > 6000) {
          m.transition(GameState.ATTRACT);
        }
      },
      render: (ctx) => {
        clear();
        if (!this.nameEntry.isDone) {
          screens.drawNameEntry(ctx, {
            score: this.score.score,
            letterIndices: this.nameEntry.letterIndices,
            currentSlot: this.nameEntry.currentSlot,
            elapsed: this.stateElapsed,
          });
        } else {
          screens.drawHighScores(
            ctx,
            this.highScores.entries,
            this.playerRank,
            this.nameEntry.initials
          );
        }
      },
    });

    m.register(GameState.SETTINGS, {
      onEnter: () => this.dipPanel.reset(),
      update: () => {
        this.dipPanel.update(
          this.input.throttle,
          this.input.brake,
          this.input.left,
          this.input.right,
          this.confirmPressed
        );
        if (this.dipPanel.isDone) m.transition(GameState.ATTRACT);
      },
      render: (ctx) => {
        clear();
        this.dipPanel.render(ctx, screens.W, screens.H);
      },
    });
  }

  private topScore(): number {
    return this.highScores.entries[0]?.score ?? 0;
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  private render(alpha: number): void {
    const lerp = (a: number, b: number) => a + (b - a) * alpha;
    const distance = lerp(this.prevDistance, this.car.distance);
    const lateral = lerp(this.prevLateral, this.car.lateral);
    const state = this.machine.state;
    const exploding = this.explosionState.isExploding;

    this.placePlayer(distance, lateral, exploding);
    this.placeTraffic(alpha, state);
    this.placeCamera(distance, lateral);
    this.scenery.update(this.stage.camera.position);
    this.stage.render();

    this.machine.render(this.ctx);
    if (this.paused) screens.drawBanner(this.ctx, 'PAUSED');
  }

  private placePlayer(distance: number, lateral: number, exploding: boolean): void {
    const pose = this.track.poseAt(distance, lateral);
    const model = this.playerModel;
    model.group.visible = !exploding;
    model.group.position.set(pose.x, pose.y, pose.z);
    const spin = this.puddleSpin.isSpinning
      ? Math.min(1, (this.spinTime * 1000) / SPIN_DURATION_MS) * Math.PI * 2
      : 0;
    model.group.rotation.y = -pose.heading + spin;
    const steer = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    this.wheelDistance = distance;
    animateCar(model, this.wheelDistance, this.machine.state === GameState.ATTRACT ? 0 : steer);
  }

  private placeTraffic(alpha: number, state: GameState): void {
    const visible = this.showTraffic && state !== GameState.ATTRACT;
    this.ai.all.forEach((car, i) => {
      const model = this.aiModels[i];
      model.group.visible = visible;
      if (!visible) return;
      const d = (this.prevAi[i] ?? car.distance) * (1 - alpha) + car.distance * alpha;
      const l = (this.prevAiLateral[i] ?? car.lateral) * (1 - alpha) + car.lateral * alpha;
      const pose = this.track.poseAt(d, l);
      model.group.position.set(pose.x, pose.y, pose.z);
      model.group.rotation.y = -pose.heading;
      animateCar(model, d, 0);
    });
  }

  private placeCamera(distance: number, lateral: number): void {
    const cam = this.stage.camera;
    // Step back along the car's heading rather than along the lap so the camera stays tight.
    const base = this.track.poseAt(distance, lateral * 0.85);
    const look = this.track.poseAt(distance + CAMERA_LOOK_AHEAD, lateral * 0.5);
    // While the car burns the camera pulls back and up so the whole explosion is in shot.
    const pull = this.explosionState.isExploding
      ? Math.min(1, this.explosionState.progress * 4)
      : 0;
    const back = CAMERA_BACK + pull * 7;
    cam.position.set(
      base.x + Math.sin(base.heading) * back,
      base.y + CAMERA_HEIGHT + pull * 2.5,
      base.z - Math.cos(base.heading) * back
    );
    if (this.shake > 0) {
      const t = performance.now() / 30;
      cam.position.x += Math.sin(t) * this.shake * 0.5;
      cam.position.y += Math.cos(t * 1.3) * this.shake * 0.4;
    }
    cam.lookAt(look.x, look.y + 1, look.z);
    const fov = 58 + 10 * Math.min(1, this.car.speedMph / this.car.topSpeedMph);
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
}
