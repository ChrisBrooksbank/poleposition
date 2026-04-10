// SteeringPhysics - Lateral position model for the player car
//
// Tracks the player's road-space X position (in screen pixels at perspective
// scale=1, where ROAD_HALF_WIDTH = 110 = the road edge).
//
// Two forces act on the lateral position each frame:
//   1. Steering input  — proportional keyboard input scaled by speed
//   2. Curve drift     — road curves push the car outward if the player
//                        does not steer into the bend

/** Metres per second per MPH. */
export const MPH_TO_MS = 1609.34 / 3600;

export class SteeringPhysics {
  /**
   * Maximum lateral speed in screen-pixels/second when steering at top speed.
   * At full throttle/steer, the car crosses the full road width (~220 px) in
   * approximately one second — matching the responsive feel of the original.
   */
  static readonly MAX_STEER_RATE = 220;

  /**
   * Curve drift coefficient.  Drift speed = curvePower × speedMph × factor.
   *
   * Tuned so that on the sharpest corner (curvePower ≈ 0.08) at full speed
   * (225 MPH) the car drifts toward the outside at ~70 px/s — noticeable but
   * not immediately fatal.  Derived from: 0.08 × 225 × factor = 70 → factor ≈ 3.9.
   */
  static readonly CURVE_DRIFT_FACTOR = 3.9;

  /** Player's lateral position in screen-pixels at perspective scale=1.
   *  0 = road centre, ±110 = road edge (ROAD_HALF_WIDTH), ±130 = billboard zone. */
  private _playerX = 0;

  get playerX(): number {
    return this._playerX;
  }

  /**
   * Advance the lateral position by one frame.
   *
   * @param dt          Delta time in milliseconds.
   * @param left        Whether the left-arrow key is held.
   * @param right       Whether the right-arrow key is held.
   * @param speedMph    Current car speed in MPH.
   * @param curvePower  Road curve strength at the player's position.
   *                    Positive = right curve, negative = left curve.
   * @param topSpeedMph Top speed used to normalise speed sensitivity (default 225).
   */
  update(
    dt: number,
    left: boolean,
    right: boolean,
    speedMph: number,
    curvePower: number,
    topSpeedMph = 225
  ): void {
    const dtSec = dt / 1000;
    const speedFraction = Math.min(Math.max(speedMph / topSpeedMph, 0), 1);

    // Keyboard steering: proportional to speed fraction so control is lighter
    // at low speeds and more sensitive (harder to keep straight) at high speed.
    const steerInput = (right ? 1 : 0) - (left ? 1 : 0);
    const steerDelta = steerInput * SteeringPhysics.MAX_STEER_RATE * speedFraction * dtSec;

    // Curve drift: car is pushed toward the outside of the curve.
    // curvePower > 0 (right turn) → drift right (positive), and vice-versa.
    const driftDelta = curvePower * speedMph * SteeringPhysics.CURVE_DRIFT_FACTOR * dtSec;

    this._playerX += steerDelta + driftDelta;
  }

  /** Reset lateral position to road centre (used on respawn). */
  reset(): void {
    this._playerX = 0;
  }
}
