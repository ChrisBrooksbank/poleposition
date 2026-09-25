// PlayerCar - pure player simulation in SI units (metres, seconds).
// Longitudinal model follows the arcade's low/high gear behaviour (research.md sections 1 and 2);
// lateral position is metres from the road centreline, positive to the driver's right.

import type { Track } from './Track';

export type Gear = 'low' | 'high';

export interface CarInput {
  left: boolean;
  right: boolean;
  throttle: boolean;
  brake: boolean;
  gear: Gear;
}

export const MPH_TO_MS = 1609.34 / 3600;

export class PlayerCar {
  /** Acceleration in mph/s. */
  static readonly LOW_ACCEL = 60;
  static readonly HIGH_ACCEL = 30;
  static readonly COAST_DECEL = 20;
  static readonly BRAKE_DECEL = 80;
  static readonly OFF_ROAD_CAP = 30;
  static readonly OFF_ROAD_DECEL = 120;
  /** Lateral steering speed (m/s) at top speed. */
  static readonly MAX_STEER_SPEED = 9;
  /** Outward drift (m/s) per m/s of forward speed per unit curvature (1/m). */
  static readonly CURVE_PUSH = 10;

  /** Distance along the lap in metres (unwrapped; increases every lap). */
  distance = 0;
  /** Lateral offset from the centreline in metres, positive to the right. */
  lateral = 0;
  /** Speed in m/s. */
  speed = 0;

  constructor(
    private readonly track: Track,
    readonly topSpeedMph = 225
  ) {}

  get speedMph(): number {
    return this.speed / MPH_TO_MS;
  }

  get lap(): number {
    return Math.floor(this.distance / this.track.length);
  }

  /** True when the car's centre is beyond the road edge. */
  get offRoad(): boolean {
    return Math.abs(this.lateral) > this.track.def.roadWidth / 2;
  }

  step(dt: number, input: CarInput): void {
    const top = input.gear === 'low' ? this.topSpeedMph / 2 : this.topSpeedMph;
    let mph = this.speedMph;

    if (input.brake) {
      mph = Math.max(0, mph - PlayerCar.BRAKE_DECEL * dt);
    } else if (mph > top) {
      mph = Math.max(top, mph - PlayerCar.COAST_DECEL * dt);
    } else if (input.throttle) {
      const accel = input.gear === 'low' ? PlayerCar.LOW_ACCEL : PlayerCar.HIGH_ACCEL;
      mph = Math.min(mph + accel * dt, top);
    } else {
      mph = Math.max(0, mph - PlayerCar.COAST_DECEL * dt);
    }

    if (this.offRoad) {
      mph = Math.min(Math.max(0, mph - PlayerCar.OFF_ROAD_DECEL * dt), PlayerCar.OFF_ROAD_CAP);
    }
    this.speed = mph * MPH_TO_MS;

    const speedFraction = Math.min(this.speedMph / this.topSpeedMph, 1);
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const push = this.track.curvatureAt(this.distance) * this.speed * PlayerCar.CURVE_PUSH;
    // A right-hand curve (positive curvature) throws the car to the left, and vice versa.
    this.lateral += (steer * PlayerCar.MAX_STEER_SPEED * speedFraction - push) * dt;
    this.distance += this.speed * dt;
  }

  /** Put the car back on the road centre at rest (after a crash). */
  respawn(): void {
    this.speed = 0;
    this.lateral = 0;
  }
}
