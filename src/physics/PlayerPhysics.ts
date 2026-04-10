// PlayerPhysics - Speed and acceleration model for the player car
// Implements low/high gear mechanics matching the original Pole Position arcade game.

import type { Gear } from '../input/InputHandler';

export const DEFAULT_TOP_SPEED_MPH = 225;

export class PlayerPhysics {
  /** Acceleration rate in MPH/s while in low gear */
  static readonly LOW_GEAR_ACCEL = 60;
  /** Acceleration rate in MPH/s while in high gear */
  static readonly HIGH_GEAR_ACCEL = 30;
  /** Deceleration rate in MPH/s when coasting (throttle off, no brake) */
  static readonly COAST_DECEL = 20;
  /** Deceleration rate in MPH/s when braking */
  static readonly BRAKE_DECEL = 80;
  /** Maximum speed allowed while driving on grass, in MPH. */
  static readonly OFF_ROAD_SPEED_CAP = 30;
  /** Additional deceleration rate applied each frame when on grass, in MPH/s. */
  static readonly OFF_ROAD_DECEL = 120;

  private _speed = 0;

  /**
   * @param topSpeedHighGear Top speed in MPH for high gear (default: 225).
   *   Low gear cap is automatically set to half this value.
   */
  constructor(readonly topSpeedHighGear: number = DEFAULT_TOP_SPEED_MPH) {}

  /** Top speed cap for low gear — roughly half the high-gear top speed. */
  get topSpeedLowGear(): number {
    return this.topSpeedHighGear / 2;
  }

  /** Current speed in MPH. Always >= 0. */
  get speed(): number {
    return this._speed;
  }

  /**
   * Advance the speed model by one frame.
   *
   * Priority order:
   * 1. Brake — always decelerates, overrides throttle.
   * 2. Over gear cap — decelerate to cap (happens when shifting down at high speed).
   * 3. Throttle — accelerate up to the current gear's top speed.
   * 4. Coasting — gradual deceleration.
   *
   * @param dt Delta time in milliseconds.
   * @param throttle Whether the throttle key is held.
   * @param brake Whether the brake key is held.
   * @param gear Current gear selection.
   */
  update(dt: number, throttle: boolean, brake: boolean, gear: Gear): void {
    const dtSec = dt / 1000;
    const topSpeed = gear === 'low' ? this.topSpeedLowGear : this.topSpeedHighGear;

    if (brake) {
      // Brake overrides throttle
      this._speed = Math.max(0, this._speed - PlayerPhysics.BRAKE_DECEL * dtSec);
    } else if (this._speed > topSpeed) {
      // Over the current gear's cap (e.g. shifted from high → low at full speed).
      // Shed excess speed at coast rate until we reach the cap.
      this._speed = Math.max(topSpeed, this._speed - PlayerPhysics.COAST_DECEL * dtSec);
    } else if (throttle) {
      const accel = gear === 'low' ? PlayerPhysics.LOW_GEAR_ACCEL : PlayerPhysics.HIGH_GEAR_ACCEL;
      this._speed = Math.min(this._speed + accel * dtSec, topSpeed);
    } else {
      // Coasting — gradual deceleration to a stop
      this._speed = Math.max(0, this._speed - PlayerPhysics.COAST_DECEL * dtSec);
    }
  }

  /**
   * Apply off-road (grass) speed penalty.
   * Call this AFTER the normal update() when the car is detected to be off-road.
   * Rapidly decelerates the car and enforces a low speed cap.
   *
   * @param dt Delta time in milliseconds.
   */
  applyOffRoadPenalty(dt: number): void {
    const dtSec = dt / 1000;
    const decelerated = Math.max(0, this._speed - PlayerPhysics.OFF_ROAD_DECEL * dtSec);
    this._speed = Math.min(decelerated, PlayerPhysics.OFF_ROAD_SPEED_CAP);
  }

  /** Reset speed to zero (used on respawn after crash). */
  reset(): void {
    this._speed = 0;
  }
}
