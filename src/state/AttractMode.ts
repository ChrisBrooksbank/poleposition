/**
 * AttractMode — manages cycling between title and demo phases in the ATTRACT state.
 *
 * Phases:
 *   TITLE — shows "POLE POSITION" title with blinking "PRESS ENTER" prompt
 *   DEMO  — shows the road scrolling with a simulated driver (no player input)
 *
 * The mode cycles TITLE → DEMO → TITLE → … until the caller detects input
 * and transitions to the next game state.
 */

/** Metres per second equivalent of 1 MPH (matches SteeringPhysics constant). */
const MPH_TO_MS = 1609.34 / 3600;

export const enum AttractPhase {
  TITLE = 'TITLE',
  DEMO = 'DEMO',
}

export class AttractMode {
  /** How long the TITLE phase lasts before switching to DEMO. */
  static readonly TITLE_DURATION_MS = 4000;
  /** How long the DEMO phase lasts before cycling back to TITLE. */
  static readonly DEMO_DURATION_MS = 6000;
  /** Simulated demo driver speed in MPH. */
  static readonly DEMO_SPEED_MPH = 120;

  private _phase: AttractPhase = AttractPhase.TITLE;
  private _phaseElapsed = 0;
  /** Total elapsed ms since the attract mode started / was reset. */
  private _elapsed = 0;
  /** World-Z position (metres) of the simulated demo car. */
  private _demoZ = 0;

  get phase(): AttractPhase {
    return this._phase;
  }

  /** Total elapsed time in ms since reset. */
  get elapsed(): number {
    return this._elapsed;
  }

  /** Time elapsed in the current phase (ms). */
  get phaseElapsed(): number {
    return this._phaseElapsed;
  }

  /** World-Z track position for the demo backdrop (metres). */
  get demoZ(): number {
    return this._demoZ;
  }

  /** Reset to initial state (TITLE phase, zero elapsed). */
  reset(): void {
    this._phase = AttractPhase.TITLE;
    this._phaseElapsed = 0;
    this._elapsed = 0;
    this._demoZ = 0;
  }

  /**
   * Advance the attract mode by `dt` milliseconds.
   * Handles automatic phase cycling (TITLE → DEMO → TITLE → …).
   */
  update(dt: number): void {
    this._elapsed += dt;
    this._phaseElapsed += dt;

    if (this._phase === AttractPhase.TITLE) {
      if (this._phaseElapsed >= AttractMode.TITLE_DURATION_MS) {
        this._phase = AttractPhase.DEMO;
        this._phaseElapsed = 0;
      }
    } else {
      // DEMO phase: advance the simulated car position
      this._demoZ += AttractMode.DEMO_SPEED_MPH * MPH_TO_MS * (dt / 1000);

      if (this._phaseElapsed >= AttractMode.DEMO_DURATION_MS) {
        this._phase = AttractPhase.TITLE;
        this._phaseElapsed = 0;
      }
    }
  }
}
