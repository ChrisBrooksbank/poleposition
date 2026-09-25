/**
 * GrandPrixState — manages the Grand Prix race timer, lap counting, and
 * bonus time on lap completion.
 *
 * The Grand Prix is a multi-lap race (default 4 laps) with a countdown timer.
 * The race begins with 75 seconds; completing each intermediate lap adds bonus
 * time so the player can continue.  The race ends when all laps are finished
 * (COMPLETE) or the timer expires before completing a lap (FAILED).
 *
 * Bonus seconds added on crossing the lap boundary:
 *   Lap 1 → 2:  +51 s
 *   Lap 2 → 3:  +57 s
 *   Lap 3 → 4:  +61 s
 *   Lap N → N+1 (N ≥ 4):  +61 s  (last value repeated for extra laps)
 */

export const GP_LAP_COUNT_OPTIONS = [3, 4, 5, 6] as const;
export type GPLapCountOption = (typeof GP_LAP_COUNT_OPTIONS)[number];

export const enum GrandPrixOutcome {
  /** Race not yet complete and timer has not expired. */
  PENDING = 'PENDING',
  /** All laps were completed within the time limit. */
  COMPLETE = 'COMPLETE',
  /** Timer expired before the current lap was completed. */
  FAILED = 'FAILED',
}

export class GrandPrixState {
  /** Duration (ms) for which the "GRAND PRIX START" banner is displayed. */
  static readonly ANNOUNCE_DURATION_MS = 3000;
  /** Starting countdown at the beginning of the race (ms). */
  static readonly INITIAL_TIMER_MS = 75_000;
  /** Default lap count (DIP switch default). */
  static readonly DEFAULT_LAPS: GPLapCountOption = 4;
  /**
   * Bonus milliseconds added to the timer when transitioning between laps.
   * Index 0 → completing lap 1 (start lap 2), index 1 → lap 2→3, index 2 → lap 3→4.
   * For any lap beyond index 2 the last entry (61 s) is repeated.
   */
  static readonly LAP_BONUS_MS: readonly number[] = [51_000, 57_000, 61_000];

  /** Scales the starting time and lap bonuses for circuits longer or shorter than Fuji. */
  private _timeScale = 1;
  private _timerMs: number;
  private _elapsed: number = 0;
  private _currentLap: number = 1;
  private _totalLaps: number;
  private _outcome: GrandPrixOutcome = GrandPrixOutcome.PENDING;

  constructor(totalLaps: GPLapCountOption = GrandPrixState.DEFAULT_LAPS) {
    this._totalLaps = totalLaps;
    this._timerMs = GrandPrixState.INITIAL_TIMER_MS;
  }

  /** Remaining countdown time in milliseconds (clamped to 0 — never negative). */
  get timerMs(): number {
    return this._timerMs;
  }

  /** Remaining countdown in whole seconds (truncated, not rounded). */
  get timerSeconds(): number {
    return Math.floor(this._timerMs / 1000);
  }

  /** Total elapsed time in ms since the race began. */
  get elapsed(): number {
    return this._elapsed;
  }

  /** Current lap number (1-based). */
  get currentLap(): number {
    return this._currentLap;
  }

  /** Total number of laps in this race. */
  get totalLaps(): number {
    return this._totalLaps;
  }

  /** Current race outcome. */
  get outcome(): GrandPrixOutcome {
    return this._outcome;
  }

  /**
   * True while the "GRAND PRIX START" announcement banner should be displayed
   * (first ANNOUNCE_DURATION_MS of the race).
   */
  get showAnnouncement(): boolean {
    return this._elapsed < GrandPrixState.ANNOUNCE_DURATION_MS;
  }

  /**
   * Advance the Grand Prix state by `dt` milliseconds.
   *
   * Returns `true` when the player crosses a lap boundary (including the final
   * lap).  On an intermediate lap crossing the caller should wrap playerZ back
   * by trackLength.  On the final crossing the outcome becomes COMPLETE and
   * the caller should transition to RACE_COMPLETE.
   *
   * After calling update(), check `outcome` to determine whether the race is
   * complete (COMPLETE), timed out (FAILED), or still in progress (PENDING).
   *
   * @param dt          - Frame delta time in milliseconds.
   * @param playerZ     - Player's current world-Z position in metres.
   * @param trackLength - Total lap distance in metres.
   */
  update(dt: number, playerZ: number, trackLength: number): boolean {
    if (this._outcome !== GrandPrixOutcome.PENDING) return false;

    this._elapsed += dt;
    this._timerMs = Math.max(0, this._timerMs - dt);

    // Lap boundary crossed
    if (playerZ >= trackLength) {
      if (this._currentLap >= this._totalLaps) {
        // Final lap complete — race over
        this._outcome = GrandPrixOutcome.COMPLETE;
        return true;
      }

      // Intermediate lap: add bonus time and advance lap counter
      const bonusIndex = Math.min(this._currentLap - 1, GrandPrixState.LAP_BONUS_MS.length - 1);
      this._timerMs += GrandPrixState.LAP_BONUS_MS[bonusIndex] * this._timeScale;
      this._currentLap++;
      return true;
    }

    // Timer expired without completing the current lap
    if (this._timerMs <= 0) {
      this._outcome = GrandPrixOutcome.FAILED;
    }

    return false;
  }

  /** Reset to initial state with the given (or default) lap count. */
  reset(totalLaps: GPLapCountOption = GrandPrixState.DEFAULT_LAPS, timeScale = 1): void {
    this._totalLaps = totalLaps;
    this._timeScale = timeScale;
    this._timerMs = GrandPrixState.INITIAL_TIMER_MS * timeScale;
    this._elapsed = 0;
    this._currentLap = 1;
    this._outcome = GrandPrixOutcome.PENDING;
  }
}
