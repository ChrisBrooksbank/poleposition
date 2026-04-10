/**
 * AICarSystem — manages the 7 AI opponent cars on the track.
 *
 * Each AI car:
 *  - Advances along the track at a fixed speed (no rubber-banding).
 *  - Stays in a predetermined lateral lane with subtle sinusoidal weaving.
 *  - Wraps seamlessly at the lap boundary.
 *  - Exposes its state in the AICar format used by CollisionDetector.
 */

import type { AICar } from '../physics/CollisionDetector';
import { TRACK_LENGTH } from '../track/fujiSpeedway';
import { MPH_TO_MS } from '../physics/SteeringPhysics';

/** AI car state exposed to collision detection and rendering. */
export interface AICarState extends AICar {
  /** Colour palette index (0–3). */
  colorVariant: number;
}

/** Static configuration for one AI car (not mutated at runtime). */
interface AICarConfig {
  /** Constant speed in MPH. */
  speedMph: number;
  /** Lane centre in road-space pixels (same units as SteeringPhysics.playerX). */
  baseLateralX: number;
  /** Colour palette index (0–3). */
  colorVariant: number;
  /** Starting world-Z position in metres. */
  initialZ: number;
  /** Peak lateral weave amplitude in pixels. */
  waveAmplitude: number;
  /** Weave frequency in Hz. */
  waveFrequency: number;
}

/** Number of AI cars on track. */
export const AI_CAR_COUNT = 7;

/**
 * The 7 AI opponent configurations.
 *
 * Speeds range 155–185 MPH so the player (max 225 MPH) can always overtake
 * if they drive well.  Initial Z positions spread the cars around the full
 * lap so the player encounters traffic throughout the circuit.
 */
const AI_CAR_CONFIGS: readonly AICarConfig[] = [
  {
    speedMph: 180,
    baseLateralX: -50,
    colorVariant: 0,
    initialZ: 500,
    waveAmplitude: 8,
    waveFrequency: 0.3,
  },
  {
    speedMph: 170,
    baseLateralX: +50,
    colorVariant: 1,
    initialZ: 800,
    waveAmplitude: 6,
    waveFrequency: 0.25,
  },
  {
    speedMph: 160,
    baseLateralX: -30,
    colorVariant: 2,
    initialZ: 1200,
    waveAmplitude: 10,
    waveFrequency: 0.2,
  },
  {
    speedMph: 185,
    baseLateralX: +30,
    colorVariant: 3,
    initialZ: 1600,
    waveAmplitude: 5,
    waveFrequency: 0.35,
  },
  {
    speedMph: 175,
    baseLateralX: 0,
    colorVariant: 0,
    initialZ: 2200,
    waveAmplitude: 12,
    waveFrequency: 0.22,
  },
  {
    speedMph: 165,
    baseLateralX: +70,
    colorVariant: 1,
    initialZ: 2800,
    waveAmplitude: 7,
    waveFrequency: 0.28,
  },
  {
    speedMph: 155,
    baseLateralX: -70,
    colorVariant: 2,
    initialZ: 3400,
    waveAmplitude: 9,
    waveFrequency: 0.18,
  },
] as const;

export class AICarSystem {
  /** Current world-Z position of each car in metres. */
  private readonly carZ: Float64Array;
  /** Current lateral position of each car in road-space pixels. */
  private readonly carX: Float64Array;
  /** Colour variant index per car. */
  private readonly carColors: Uint8Array;
  /**
   * Initial wave phase per car (radians).
   * Evenly distributed so cars don't all weave in sync.
   */
  private readonly wavePhases: Float64Array;
  /** Cumulative time in seconds (drives the lateral wave). */
  private time = 0;

  constructor() {
    const n = AI_CAR_CONFIGS.length;
    this.carZ = new Float64Array(n);
    this.carX = new Float64Array(n);
    this.carColors = new Uint8Array(n);
    this.wavePhases = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      this.carZ[i] = AI_CAR_CONFIGS[i].initialZ;
      this.carX[i] = AI_CAR_CONFIGS[i].baseLateralX;
      this.carColors[i] = AI_CAR_CONFIGS[i].colorVariant;
      // Spread phases evenly around the circle so cars weave independently.
      this.wavePhases[i] = (i * Math.PI * 2) / n;
    }
  }

  /**
   * Advance all AI cars by one frame.
   *
   * @param dt  Delta time in milliseconds.
   */
  update(dt: number): void {
    this.time += dt / 1000;

    for (let i = 0; i < AI_CAR_CONFIGS.length; i++) {
      const cfg = AI_CAR_CONFIGS[i];

      // Advance along track, wrapping at the lap boundary.
      const advance = cfg.speedMph * MPH_TO_MS * (dt / 1000);
      this.carZ[i] = (this.carZ[i] + advance) % TRACK_LENGTH;

      // Sinusoidal lateral weave around the base lane.
      const angle = this.time * cfg.waveFrequency * Math.PI * 2 + this.wavePhases[i];
      this.carX[i] = cfg.baseLateralX + Math.sin(angle) * cfg.waveAmplitude;
    }
  }

  /**
   * Return a snapshot of all AI car states for collision detection and rendering.
   *
   * Allocates a new array each call; call once per frame and reuse the result.
   */
  getCars(): readonly AICarState[] {
    const result: AICarState[] = [];
    for (let i = 0; i < AI_CAR_CONFIGS.length; i++) {
      result.push({
        z: this.carZ[i],
        x: this.carX[i],
        colorVariant: this.carColors[i],
      });
    }
    return result;
  }

  /** Total number of AI cars managed by this system. */
  get count(): number {
    return AI_CAR_CONFIGS.length;
  }
}
