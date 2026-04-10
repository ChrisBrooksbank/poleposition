/**
 * ExplosionState — tracks the crash explosion / respawn cycle.
 *
 * State machine:
 *   none  ──trigger()──►  exploding  ──(2.5 s elapses)──►  none + respawn signal
 *
 * The caller should:
 *   - Call trigger() when a collision is detected.
 *   - Call update(dt) every frame; it returns true exactly once when the
 *     explosion finishes (i.e. it's time to respawn the car).
 *   - Suppress normal physics and car rendering while isExploding is true.
 */

/** Total duration of the explosion animation in milliseconds. */
export const EXPLOSION_DURATION_MS = 2500;

/** Number of discrete animation frames in the explosion sequence. */
export const EXPLOSION_FRAME_COUNT = 6;

export type ExplosionPhase = 'none' | 'exploding';

export class ExplosionState {
  private _phase: ExplosionPhase = 'none';
  private _elapsed = 0;

  /** Whether an explosion is currently in progress. */
  get isExploding(): boolean {
    return this._phase === 'exploding';
  }

  /** Current phase of the explosion state machine. */
  get phase(): ExplosionPhase {
    return this._phase;
  }

  /**
   * Current animation frame index (0 to EXPLOSION_FRAME_COUNT-1).
   * Only meaningful while isExploding is true.
   */
  get frame(): number {
    if (this._phase !== 'exploding') return 0;
    const frac = Math.min(this._elapsed / EXPLOSION_DURATION_MS, 1);
    return Math.min(Math.floor(frac * EXPLOSION_FRAME_COUNT), EXPLOSION_FRAME_COUNT - 1);
  }

  /** Fraction of the explosion complete, 0.0–1.0. */
  get progress(): number {
    if (this._phase !== 'exploding') return 0;
    return Math.min(this._elapsed / EXPLOSION_DURATION_MS, 1);
  }

  /**
   * Trigger an explosion.  No-op if one is already in progress (prevents
   * re-triggering while the animation plays out).
   */
  trigger(): void {
    if (this._phase !== 'none') return;
    this._phase = 'exploding';
    this._elapsed = 0;
  }

  /**
   * Advance the explosion timer by dt milliseconds.
   *
   * @returns true exactly once — the frame when the explosion ends and
   *          the car should respawn.  Returns false at all other times.
   */
  update(dt: number): boolean {
    if (this._phase !== 'exploding') return false;

    this._elapsed += dt;
    if (this._elapsed >= EXPLOSION_DURATION_MS) {
      this._phase = 'none';
      this._elapsed = 0;
      return true; // signal: time to respawn
    }
    return false;
  }
}
