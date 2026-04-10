/**
 * PuddleSpinState — tracks the active spin-out effect triggered when the
 * player car drives over a puddle.
 *
 * The spin-out is a brief loss of lateral control: a sinusoidal lateral
 * velocity impulse is applied to the car's position for ~1.5 seconds, then
 * fades out.  Unlike a crash, the car does not explode and the player is not
 * respawned; the game continues normally once the spin subsides.
 *
 * To prevent rapid re-triggering when the car crosses the same puddle, a
 * cooldown is enforced for the full spin duration plus a short grace period.
 */

/** Duration of the spin-out effect in milliseconds. */
export const SPIN_DURATION_MS = 1500;

/**
 * Peak lateral impulse speed in screen-pixels / second.
 * Applied as a sinusoidal oscillation that fades to zero by end of duration.
 */
export const SPIN_AMPLITUDE_PX_PER_S = 80;

/**
 * Cooldown in milliseconds before the same (or another) puddle can trigger
 * a new spin-out.  Prevents instant re-trigger when the car is still
 * overlapping the puddle after the spin ends.
 */
export const SPIN_COOLDOWN_MS = SPIN_DURATION_MS + 500;

export class PuddleSpinState {
  private _elapsed = 0;
  private _cooldown = 0;
  private _active = false;

  /** Whether the spin-out effect is currently playing. */
  get isSpinning(): boolean {
    return this._active;
  }

  /**
   * Trigger a spin-out.  Ignored while a spin is already active or the
   * cooldown has not expired.
   *
   * @returns true if the spin was actually started (use to fire one-shot SFX).
   */
  trigger(): boolean {
    if (this._active || this._cooldown > 0) return false;
    this._elapsed = 0;
    this._cooldown = SPIN_COOLDOWN_MS;
    this._active = true;
    return true;
  }

  /**
   * Advance the spin-out state by one frame.
   * @param dt Delta time in milliseconds.
   */
  update(dt: number): void {
    if (this._cooldown > 0) {
      this._cooldown = Math.max(0, this._cooldown - dt);
    }
    if (!this._active) return;

    this._elapsed += dt;
    if (this._elapsed >= SPIN_DURATION_MS) {
      this._active = false;
    }
  }

  /**
   * Returns the lateral nudge (in screen-pixels) to apply to the player car
   * this frame.  Returns 0 when no spin is active.
   *
   * The nudge is a damped sinusoid: oscillates 4 full cycles over the spin
   * duration with amplitude that decays linearly to zero.
   *
   * @param dt Delta time in milliseconds (used to scale from velocity to position).
   */
  getLateralNudge(dt: number): number {
    if (!this._active) return 0;
    const t = this._elapsed / SPIN_DURATION_MS; // 0→1 over spin duration
    const decay = 1 - t;
    const velocity = Math.sin(t * Math.PI * 6) * SPIN_AMPLITUDE_PX_PER_S * decay;
    return velocity * (dt / 1000);
  }

  /** Reset spin state (e.g. on respawn). */
  reset(): void {
    this._active = false;
    this._elapsed = 0;
    this._cooldown = 0;
  }
}
