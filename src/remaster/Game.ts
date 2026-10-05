// Game - wires the sim, states, audio and Three.js scene into the playable remaster.
import * as THREE from 'three';
import { Stage } from './Stage';
import { createRoadMesh } from './RoadMesh';
import { createScenery, type Scenery } from './scenery';
import { createCarModel, animateCar, type CarModel } from './carModel';
import { Explosion, createPuddleMeshes } from './effects';
import { BannerPlane } from './bannerPlane';
import { StartSequence } from '../state/StartSequence';
import * as screens from './screens';
import { FixedStepLoop } from '../sim/FixedStepLoop';
import { Track } from '../sim/Track';
import { COURSES, REFERENCE_LAP_LENGTH, type Course } from '../sim/courses';
import { THEMES } from './themes';
import { PlayerCar, MPH_TO_MS } from '../sim/PlayerCar';
import { AIField, AI_COUNT, gridSlot } from '../sim/AIField';
import { autopilotInput } from '../sim/Autopilot';
import { buildSceneryLayout } from '../sim/scenery';
import {
  type Box,
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
import { ChiptuneMusic, type MusicTrack } from '../audio/ChiptuneMusic';

const CAMERA_BACK = 7;
const CAMERA_HEIGHT = 2.6;
const CAMERA_LOOK_AHEAD = 30;
/** The old road-space unit: 110 px was the road half-width, which is 7 m. */
const PX_TO_M = 7 / 110;

const AI_PALETTES = [
  { body: 0x1f5fd0, accent: 0xf5f5f5 },
  { body: 0xf2c200, accent: 0x222222 },
  { body: 0x1fa04a, accent: 0xf5f5f5 },
  { body: 0x8b2fc9, accent: 0xffd400 },
];

/** Everything in the 3D world that belongs to one course, built on first use and then reused. */
interface CourseView {
  track: Track;
  group: THREE.Group;
  scenery: Scenery;
  boards: Box[];
  puddleBoxes: Box[];
}

export class Game {
  private readonly stage: Stage;
  private readonly overlay: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private track!: Track;
  private car!: PlayerCar;
  private ai!: AIField;
  private boards!: Box[];
  private puddleBoxes!: Box[];
  private scenery!: Scenery;
  private courseIndex = 0;
  private readonly courseViews = new Map<number, CourseView>();
  private readonly input = new InputHandler();
  private readonly dip = new DIPSwitchSettings();
  private readonly dipPanel = new DIPSwitchPanel(this.dip);

  private readonly playerModel: CarModel;
  private readonly aiModels: CarModel[] = [];
  private readonly explosionFx = new Explosion();
  private readonly bannerPlane = new BannerPlane();
  private readonly startSequence = new StartSequence();

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
  private readonly music = new ChiptuneMusic(this.audio);

  // Simulation bookkeeping.
  private stateElapsed = 0;
  private playerRank = 0;
  /** Total distance raced (unwrapped), used for race position. */
  private raceDistance = 0;
  private spinTime = 0;
  private shake = 0;
  /** Milliseconds of protection left after a respawn, so trailing traffic cannot instantly re-crash us. */
  private invulnerableMs = 0;
  private prevDistance = 0;
  private prevLateral = 0;
  private prevAi: number[] = [];
  private prevAiLateral: number[] = [];
  private showTraffic = false;
  private wheelDistance = 0;
  /** True once the finished game's score has been offered to the high-score table. */
  private scoreRecorded = false;

  constructor(host: HTMLElement) {
    this.stage = new Stage(host);
    const scene = this.stage.scene;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x557755, 1.5));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    sun.position.set(-300, 500, -200);
    scene.add(sun);
    this.playerModel = createCarModel({ body: 0xd22020, accent: 0xf5f5f5 });
    scene.add(this.playerModel.group);
    for (let i = 0; i < AI_COUNT; i++) {
      const model = createCarModel(AI_PALETTES[i % AI_PALETTES.length]);
      model.group.visible = false;
      this.aiModels.push(model);
      scene.add(model.group);
    }
    scene.add(this.explosionFx.group);
    scene.add(this.bannerPlane.mesh);

    this.overlay = document.createElement('canvas');
    this.overlay.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    this.stage.wrapper.appendChild(this.overlay);
    this.ctx = this.overlay.getContext('2d') as CanvasRenderingContext2D;
    this.resizeOverlay();
    window.addEventListener('resize', () => this.resizeOverlay());

    // Optional CRT look (scanlines + vignette), toggled with C and remembered.
    const crt = document.createElement('div');
    crt.style.cssText =
      'position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,0.18) 0px,rgba(0,0,0,0.18) 1px,transparent 1px,transparent 3px),radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,0.35) 100%)';
    let crtOn = false;
    try {
      crtOn = localStorage.getItem('pp-crt') === '1';
    } catch {
      // storage unavailable: default off
    }
    crt.style.display = crtOn ? 'block' : 'none';
    this.stage.wrapper.appendChild(crt);
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyC') return;
      crtOn = !crtOn;
      crt.style.display = crtOn ? 'block' : 'none';
      try {
        localStorage.setItem('pp-crt', crtOn ? '1' : '0');
      } catch {
        // storage unavailable: not remembered
      }
    });

    // Browsers only allow audio after a user gesture.
    const unlock = () => this.audio.resume();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') this.togglePause();
      if (e.code === 'KeyM' && this.audio.isReady) this.toggleMute();
    });
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);

    this.registerStates();
    this.activateCourse(0);
    this.resetPositions(0);
    // Test hook: ?debug exposes the game so automated play-tests can jump between states.
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __game: Game }).__game = this;
    }
  }

  /**
   * Keeps the overlay canvas at the real display resolution so text stays sharp. Drawing code
   * still works in the 256x224 arcade coordinate space via the context transform.
   */
  private resizeOverlay(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.stage.wrapper.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.stage.wrapper.clientHeight * dpr));
    this.overlay.width = width;
    this.overlay.height = height;
    this.ctx.setTransform(width / screens.W, 0, 0, height / screens.H, 0, 0);
  }

  /** Builds (once) and shows a course, and points the sim at its track and hazards. */
  private activateCourse(index: number): void {
    this.courseIndex = (index + COURSES.length) % COURSES.length;
    let view = this.courseViews.get(this.courseIndex);
    const course: Course = COURSES[this.courseIndex];
    if (!view) {
      const track = new Track(course.def);
      const group = new THREE.Group();
      group.add(createRoadMesh(track));
      const scenery = createScenery(track, THEMES[course.id]);
      group.add(scenery.group);
      group.add(createPuddleMeshes(track, course.puddles));
      this.stage.scene.add(group);
      view = {
        track,
        group,
        scenery,
        boards: billboardBoxes(buildSceneryLayout(track)),
        puddleBoxes: course.puddles.map(puddleBox),
      };
      this.courseViews.set(this.courseIndex, view);
    }
    for (const v of this.courseViews.values()) v.group.visible = v === view;
    this.track = view.track;
    this.scenery = view.scenery;
    this.boards = view.boards;
    this.puddleBoxes = view.puddleBoxes;
    this.stage.setAtmosphere(view.scenery.haze, view.scenery.fogFar);
    this.car = new PlayerCar(this.track, this.dip.topSpeedMph);
    this.ai = new AIField(this.track);
    this.snapshot();
  }

  private demoActive = false;
  private demoRuns = 0;

  private startDemo(): void {
    const starts = [0, 1000, 2200, 3300];
    this.demoActive = true;
    this.ai.startQualifying();
    this.car = new PlayerCar(this.track, this.dip.topSpeedMph);
    this.car.distance = starts[this.demoRuns++ % starts.length];
    this.car.speed = 45;
    this.showTraffic = true;
    this.snapshot();
  }

  private stopDemo(): void {
    this.demoActive = false;
    this.showTraffic = false;
    this.car = new PlayerCar(this.track, this.dip.topSpeedMph);
    this.resetPositions(0);
  }

  private changeCourse(step: number): void {
    this.activateCourse(this.courseIndex + step);
    this.resetPositions(0);
    this.sfx.triggerCountdownBeep();
  }

  private muted = false;

  private toggleMute(): void {
    this.muted = !this.muted;
    this.audio.setMasterVolume(this.muted ? 0 : 1);
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

  /** Switch course (used by automated play-tests). */
  debugCourse(index: number): void {
    this.activateCourse(index);
    this.resetPositions(0);
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
      drawCalls: this.stage.renderer.info.render.calls,
      triangles: this.stage.renderer.info.render.triangles,
      audio: this.audio.isReady ? this.audio.context.state : 'off',
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
  /** Test hook: ?autopilot lets the built-in driver play the race. */
  private autopilot = new URLSearchParams(location.search).has('autopilot');

  private step(dt: number): void {
    if (this.paused) return;
    this.snapshot();
    this.machine.update(dt * 1000);
    this.input.endStep();
    this.music.update();
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
    this.car = new PlayerCar(this.track, this.dip.topSpeedMph);
    this.car.distance = distance;
    this.raceDistance = distance;
    this.explosionState.update(1e9);
    this.puddleSpin.reset();
    this.spinTime = 0;
    this.shake = 0;
    this.showTraffic = true;
    this.invulnerableMs = 0;
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
        this.invulnerableMs = 2500;
      }
      this.engine.update(0);
      return;
    }

    const before = this.car.distance;
    const input = this.autopilot
      ? autopilotInput(this.track, this.car, {
          obstacles: this.ai.all.map((c) => ({ s: this.ai.sOf(c), lateral: c.lateral })),
        })
      : {
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
    this.invulnerableMs = Math.max(0, this.invulnerableMs - dtMs);
    const hitCar = this.ai.all.some((c) =>
      boxesOverlap(
        this.track,
        carBox(this.car.distance, this.car.lateral),
        carBox(this.ai.sOf(c), c.lateral)
      )
    );
    if (
      this.invulnerableMs === 0 &&
      (hitCar || anyOverlap(this.track, carBox(this.car.distance, this.car.lateral), this.boards))
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

  /** Starts the banner flyby and start lights; the race is held until they go green. */
  private beginStartSequence(label: string): void {
    this.startSequence.reset();
    this.bannerPlane.setLabel(label);
  }

  /** Advances the pre-race ceremony and returns true while the car must stay on the grid. */
  private stepStartSequence(dtMs: number): boolean {
    const seq = this.startSequence;
    const wasHolding = seq.isHolding;
    const reds = seq.redLights;
    seq.update(dtMs);
    if (seq.redLights > reds) this.sfx.triggerCountdownBeep();
    if (wasHolding && !seq.isHolding) this.sfx.triggerGoBeep();
    if (seq.isHolding) this.engine.update(0);
    return seq.isHolding;
  }

  private racePosition(): number {
    return 1 + this.ai.all.filter((c) => c.distance > this.raceDistance).length;
  }

  // ─── States ────────────────────────────────────────────────────────────────

  private registerStates(): void {
    const m = this.machine;
    const clear = () => this.ctx.clearRect(0, 0, screens.W, screens.H);
    const hudNow = (timerSeconds: number, lap?: { current: number; total: number }) => {
      this.hud.render(this.ctx, {
        score: this.score.score,
        timerSeconds,
        speedMph: this.car.speedMph,
        useKph: this.dip.useKph,
        lapCurrent: lap?.current,
        lapTotal: lap?.total,
        // Qualifying is a solo time trial: traffic is not a race order.
        racePosition: lap ? this.racePosition() : 0,
      });
      this.ctx.font = 'bold 8px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#ffdd00';
      this.ctx.fillText(`TOP ${String(this.topScore()).padStart(6, '0')}`, screens.W / 2, 12);
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = this.input.gear === 'high' ? '#ff6644' : '#66ddff';
      this.ctx.fillText(this.input.gear === 'high' ? 'HIGH' : 'LOW', screens.W - 4, screens.H - 8);
    };

    m.register(GameState.ATTRACT, {
      onEnter: () => {
        this.stateElapsed = 0;
        this.attract.reset();
        this.showTraffic = false;
        this.demoActive = false;
        this.activateCourse(0);
        this.resetPositions(0);
      },
      onExit: () => {
        this.demoActive = false;
        this.showTraffic = false;
      },
      update: (dt) => {
        this.stateElapsed += dt;
        this.attract.update(dt);
        const demo = this.attract.phase === AttractPhase.DEMO;
        if (demo && !this.demoActive) this.startDemo();
        if (!demo && this.demoActive) this.stopDemo();
        if (demo) {
          // A real autopilot lap segment, with traffic, so the demo shows the actual driving.
          this.snapshot();
          const dtS = dt / 1000;
          this.ai.update(dtS);
          const obstacles = this.ai.all.map((c) => ({ s: this.ai.sOf(c), lateral: c.lateral }));
          this.car.step(dtS, autopilotInput(this.track, this.car, { skill: 0.85, obstacles }));
        }
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
        if (this.stateElapsed > 1500) m.transition(GameState.COURSE_SELECT);
      },
      render: (ctx) => {
        clear();
        screens.drawCredit(ctx);
      },
    });

    let selectLeft = false;
    let selectRight = false;
    m.register(GameState.COURSE_SELECT, {
      onEnter: () => {
        this.stateElapsed = 0;
        selectLeft = this.input.left;
        selectRight = this.input.right;
      },
      update: (dt) => {
        this.stateElapsed += dt;
        const left = this.input.left;
        const right = this.input.right;
        if (left && !selectLeft) this.changeCourse(-1);
        if (right && !selectRight) this.changeCourse(1);
        selectLeft = left;
        selectRight = right;
        // Enter/Space confirm (throttle would too easily confirm by accident while steering).
        if ((this.stateElapsed > 300 && this.confirmPressed) || this.stateElapsed > 15000) {
          m.transition(GameState.QUALIFYING);
        }
      },
      render: (ctx) => {
        clear();
        screens.drawCourseSelect(
          ctx,
          COURSES.map((c) => c.name),
          this.courseIndex,
          this.track.length,
          this.stateElapsed
        );
      },
    });

    m.register(GameState.QUALIFYING, {
      onEnter: () => {
        this.score.reset();
        this.scoreRecorded = false;
        this.ai.startQualifying();
        this.qualifying.reset(
          this.dip.qualifyingTime,
          REFERENCE_LAP_LENGTH / this.track.length,
          this.dip.qualifyingCutoffSeconds
        );
        this.beginRun(0);
        this.sfx.triggerQualifyingFanfare();
        this.voice.triggerQualifyingStart();
        this.beginStartSequence('QUALIFYING LAP');
      },
      update: (dt) => {
        if (this.stepStartSequence(dt)) return;
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
        if (this.startSequence.showLights) {
          screens.drawStartLights(ctx, this.startSequence.redLights, this.startSequence.showGreen);
        } else if (this.qualifying.showAnnouncement) {
          screens.drawBanner(ctx, 'QUALIFYING START');
        }
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
        this.grandPrix.reset(this.dip.lapCount, this.track.length / REFERENCE_LAP_LENGTH);
        this.beginRun(gridSlot(slot).distance);
        this.car.lateral = gridSlot(slot).lateral;
        this.prevLateral = this.car.lateral;
        // Protect the player through the packed start so a slow-off-the-line neighbour cannot end the race.
        this.invulnerableMs = 2500;
        // Baseline for overtake scoring without clearing the qualifying score.
        this.score.recordOvertakes(
          this.track.wrap(this.car.distance),
          this.ai.all.map((c) => this.ai.sOf(c)),
          this.track.length
        );
        this.voice.triggerGrandPrixStart();
        this.beginStartSequence('GRAND PRIX');
      },
      update: (dt) => {
        if (this.stepStartSequence(dt)) return;
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
        if (this.startSequence.showLights) {
          screens.drawStartLights(ctx, this.startSequence.redLights, this.startSequence.showGreen);
        } else if (this.grandPrix.showAnnouncement) {
          screens.drawBanner(ctx, 'GRAND PRIX START');
        }
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
        if (this.raceComplete.isDone) m.transition(this.afterGameState());
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
        this.music.play('game_over');
      },
      onExit: () => this.music.stop(),
      update: (dt) => {
        this.stateElapsed += dt;
        if (this.stateElapsed > 3000) {
          m.transition(this.scoreRecorded ? GameState.ATTRACT : this.afterGameState());
        }
      },
      render: (ctx) => screens.drawGameOver(ctx),
    });

    m.register(GameState.NAME_ENTRY, {
      onEnter: () => {
        this.nameEntry.reset();
        this.stateElapsed = 0;
        // The jingle reflects where this score would rank.
        const rank = 1 + this.highScores.entries.filter((e) => e.score >= this.score.score).length;
        const tiers: MusicTrack[] = ['name_entry_1st', 'name_entry_top6', 'name_entry_standard'];
        this.music.play(tiers[HighScoreManager.rankingTier(rank) - 1]);
      },
      onExit: () => this.music.stop(),
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
      // D opens this screen and also steers right, so keys already held must not act.
      onEnter: () =>
        this.dipPanel.reset({
          up: this.input.throttle,
          down: this.input.brake,
          left: this.input.left,
          right: this.input.right,
          confirm: this.confirmPressed,
        }),
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

  /** Once a game ends: initials for a table-worthy score, otherwise back to the attract loop. */
  private afterGameState(): GameState {
    this.scoreRecorded = true;
    const s = this.score.score;
    if (s > 0 && this.highScores.isHighScore(s)) return GameState.NAME_ENTRY;
    return this.machine.state === GameState.GAME_OVER ? GameState.ATTRACT : GameState.GAME_OVER;
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
    const racing = state === GameState.QUALIFYING || state === GameState.GRAND_PRIX;
    this.bannerPlane.update(
      this.stage.camera,
      this.startSequence.flybyProgress,
      racing && this.startSequence.isFlyingBy
    );
    this.scenery.update(this.stage.camera.position);
    this.stage.render();

    this.machine.render(this.ctx);
    if (this.paused) screens.drawBanner(this.ctx, 'PAUSED');
  }

  private placePlayer(distance: number, lateral: number, exploding: boolean): void {
    const pose = this.track.poseAt(distance, lateral);
    const model = this.playerModel;
    // Blink while protected after a respawn.
    const blinkHidden = this.invulnerableMs > 0 && Math.floor(this.invulnerableMs / 120) % 2 === 0;
    model.group.visible = !exploding && !blinkHidden;
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
    // The attract demo turns traffic on itself; the title card leaves it off.
    const visible = this.showTraffic && (state !== GameState.ATTRACT || this.demoActive);
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
