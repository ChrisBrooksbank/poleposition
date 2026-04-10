/**
 * RaceCompleteState — manages the post-race results screen.
 *
 * When all Grand Prix laps are finished, this state captures the remaining
 * countdown timer and computes the time bonus (200 pts per second remaining).
 * After DISPLAY_DURATION_MS the caller should transition to NAME_ENTRY.
 *
 * Usage:
 *   const rcs = new RaceCompleteState();
 *   // In GRAND_PRIX update when outcome === COMPLETE:
 *   rcs.reset(grandPrixState.timerMs);
 *   stateMachine.transition(GameState.RACE_COMPLETE);
 *   // In RACE_COMPLETE update:
 *   rcs.update(dt);
 *   if (rcs.isDone) stateMachine.transition(GameState.NAME_ENTRY);
 *   // In RACE_COMPLETE render:
 *   ctx.fillText(`TIME BONUS  ${rcs.timeBonus}`, ...);
 */

export class RaceCompleteState {
  /** How long the race complete screen is displayed before transitioning (ms). */
  static readonly DISPLAY_DURATION_MS = 5000;
  /** Points awarded per whole second remaining on the timer at race completion. */
  static readonly PTS_PER_SECOND = 200;

  private _remainingTimerMs: number = 0;
  private _elapsed: number = 0;

  constructor(remainingTimerMs = 0) {
    this._remainingTimerMs = remainingTimerMs;
  }

  /** Remaining timer captured at race completion (ms). */
  get remainingTimerMs(): number {
    return this._remainingTimerMs;
  }

  /** Remaining timer in whole seconds (truncated, not rounded). */
  get remainingTimerSeconds(): number {
    return Math.floor(this._remainingTimerMs / 1000);
  }

  /** Time bonus in points: remainingTimerSeconds × PTS_PER_SECOND. */
  get timeBonus(): number {
    return this.remainingTimerSeconds * RaceCompleteState.PTS_PER_SECOND;
  }

  /** Elapsed time since reset (ms), capped at DISPLAY_DURATION_MS. */
  get elapsed(): number {
    return this._elapsed;
  }

  /**
   * True once DISPLAY_DURATION_MS has been reached — caller should transition
   * to the next state.
   */
  get isDone(): boolean {
    return this._elapsed >= RaceCompleteState.DISPLAY_DURATION_MS;
  }

  /**
   * Advance the display timer by `dt` milliseconds.
   * Elapsed is capped at DISPLAY_DURATION_MS.
   */
  update(dt: number): void {
    this._elapsed = Math.min(this._elapsed + dt, RaceCompleteState.DISPLAY_DURATION_MS);
  }

  /**
   * Reset the display timer and capture the remaining countdown from the race.
   * Call this before transitioning to RACE_COMPLETE.
   */
  reset(remainingTimerMs = 0): void {
    this._remainingTimerMs = remainingTimerMs;
    this._elapsed = 0;
  }
}
