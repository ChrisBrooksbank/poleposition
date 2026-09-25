// AIField - the seven computer-controlled cars (research.md section 2).
// They follow fixed lanes at constant speeds (no rubber-banding, as in the arcade), weaving
// slightly, so the player has to pick a way through traffic.

import { MPH_TO_MS } from './PlayerCar';
import type { Track } from './Track';

export interface AICar {
  /** Distance travelled along the lap in metres (unwrapped; may start negative on the grid). */
  distance: number;
  /** Lateral offset from the centreline in metres, positive to the right. */
  lateral: number;
  /** Current speed in m/s. */
  speed: number;
  /** Livery index (0-3). */
  variant: number;
}

interface AIConfig {
  speedMph: number;
  lane: number;
  variant: number;
  /** Where the car sits in qualifying, as a fraction of the lap. */
  qualifyingFrac: number;
  weaveAmplitude: number;
  weaveHz: number;
}

export const AI_COUNT = 7;
/** Grid slots are staggered in two columns, this far apart along the track. */
export const GRID_SPACING = 9;
export const GRID_LANE = 2.6;
/** Launch acceleration for AI cars off the grid, m/s^2. */
const LAUNCH_ACCEL = 24;

/** Speeds sit below the player's 225 mph top so a good driver can pass everyone. */
const CONFIGS: readonly AIConfig[] = [
  {
    speedMph: 180,
    lane: -3.2,
    variant: 0,
    qualifyingFrac: 0.115,
    weaveAmplitude: 0.5,
    weaveHz: 0.3,
  },
  {
    speedMph: 170,
    lane: 3.2,
    variant: 1,
    qualifyingFrac: 0.183,
    weaveAmplitude: 0.4,
    weaveHz: 0.25,
  },
  {
    speedMph: 160,
    lane: -1.8,
    variant: 2,
    qualifyingFrac: 0.275,
    weaveAmplitude: 0.6,
    weaveHz: 0.2,
  },
  {
    speedMph: 185,
    lane: 1.8,
    variant: 3,
    qualifyingFrac: 0.367,
    weaveAmplitude: 0.35,
    weaveHz: 0.35,
  },
  { speedMph: 175, lane: 0, variant: 0, qualifyingFrac: 0.505, weaveAmplitude: 0.7, weaveHz: 0.22 },
  {
    speedMph: 165,
    lane: 4.2,
    variant: 1,
    qualifyingFrac: 0.642,
    weaveAmplitude: 0.45,
    weaveHz: 0.28,
  },
  {
    speedMph: 155,
    lane: -4.2,
    variant: 2,
    qualifyingFrac: 0.78,
    weaveAmplitude: 0.55,
    weaveHz: 0.18,
  },
];

/** Start-grid slot (0 = pole) to a lap distance (behind the line) and lateral offset. */
export function gridSlot(slot: number): { distance: number; lateral: number } {
  return {
    distance: -(6 + slot * GRID_SPACING),
    lateral: slot % 2 === 0 ? -GRID_LANE : GRID_LANE,
  };
}

export class AIField {
  private cars: AICar[] = [];
  private time = 0;
  private launching = false;

  constructor(private readonly track: Track) {
    this.startQualifying();
  }

  get all(): readonly AICar[] {
    return this.cars;
  }

  /** Lap-relative position of a car in [0, track length). */
  sOf(car: AICar): number {
    return this.track.wrap(car.distance);
  }

  /** Cars already up to speed and spread around the circuit (qualifying lap traffic). */
  startQualifying(): void {
    this.time = 0;
    this.launching = false;
    this.cars = CONFIGS.map((c) => ({
      distance: c.qualifyingFrac * this.track.length,
      lateral: c.lane,
      speed: c.speedMph * MPH_TO_MS,
      variant: c.variant,
    }));
  }

  /**
   * Cars on the starting grid. The player takes `playerSlot` (0 = pole); AI cars fill the other
   * seven slots in order and accelerate away from rest.
   */
  startGrid(playerSlot: number): void {
    this.time = 0;
    this.launching = true;
    const slots: number[] = [];
    for (let i = 0; i < AI_COUNT + 1; i++) if (i !== playerSlot) slots.push(i);
    this.cars = CONFIGS.map((c, i) => {
      const slot = gridSlot(slots[i]);
      return { distance: slot.distance, lateral: slot.lateral, speed: 0, variant: c.variant };
    });
  }

  update(dt: number, speedMultiplier = 1): void {
    this.time += dt;
    this.cars.forEach((car, i) => {
      const cfg = CONFIGS[i];
      const cruise = cfg.speedMph * speedMultiplier * MPH_TO_MS;
      if (this.launching && car.speed < cruise) {
        car.speed = Math.min(cruise, car.speed + LAUNCH_ACCEL * dt);
      } else {
        car.speed = cruise;
      }
      car.distance += car.speed * dt;
      const weave = Math.sin(this.time * cfg.weaveHz * Math.PI * 2 + (i * Math.PI * 2) / AI_COUNT);
      // Spread from the grid column into the assigned racing lane once moving.
      const target = cfg.lane + weave * cfg.weaveAmplitude;
      car.lateral += (target - car.lateral) * Math.min(1, dt * 0.8);
    });
  }
}
