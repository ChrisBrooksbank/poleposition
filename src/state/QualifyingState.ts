/**
 * QualifyingState — manages the qualifying lap timer, lap detection, and
 * grid position calculation.
 *
 * The qualifying lap is a single timed lap of Fuji Speedway.  The player
 * must complete the lap before the countdown timer expires.  The elapsed
 * lap time determines the player's starting grid position (1st–8th) for the
 * Grand Prix race.
 *
 * Timer setting is configurable to 90, 100, 110, or 120 seconds (DIP switch).
 * Position thresholds are fixed by the spec and match the original arcade game.
 */

/** Configurable timer options in seconds (matches DIP switch settings). */
export const QUALIFYING_TIMER_OPTIONS = [90, 100, 110, 120] as const;
export type QualifyingTimerOption = (typeof QUALIFYING_TIMER_OPTIONS)[number];

/**
 * Lap time thresholds in seconds for each grid position.
 *
 * A lap time strictly less than the threshold earns that grid slot.
 * POSITION_THRESHOLDS[0] → 1st place, …, POSITION_THRESHOLDS[7] → 8th place.
 * A lap time >= 73.0s means the player did not qualify.
 */
export const POSITION_THRESHOLDS: readonly number[] = [
  58.5, // 1st
  60.0, // 2nd
  62.0, // 3rd
  64.0, // 4th
  66.0, // 5th
  68.0, // 6th
  70.0, // 7th
  73.0, // 8th
];

export const enum QualifyingOutcome {
  /** Lap not yet complete and timer has not expired. */
  PENDING = 'PENDING',
  /** Player crossed the finish line fast enough to earn a grid slot. */
  QUALIFIED = 'QUALIFIED',
  /** Timer expired before the lap was completed, or the lap was too slow to qualify. */
  FAILED = 'FAILED',
}

/**
 * Returns the 1-based grid position (1–8) earned for the given lap time, or
 * 0 if the player failed to qualify (lap time >= 73.0 seconds).
 */
export function computeGridPosition(lapTimeSeconds: number): number {
  for (let i = 0; i < POSITION_THRESHOLDS.length; i++) {
    if (lapTimeSeconds < POSITION_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 0; // did not qualify
}

export class QualifyingState {
  /**
   * Multiplies the lap time before grid thresholds are applied, so shorter or longer circuits
   * are judged against the arcade's Fuji-length thresholds proportionally.
   */
  private _timeScale = 1;

  /** Duration (ms) for which the "QUALIFYING START" banner is displayed. */
  static readonly ANNOUNCE_DURATION_MS = 3000;
  /** Default countdown timer duration (seconds). */
  static readonly DEFAULT_TIMER_S: QualifyingTimerOption = 90;

  private _timerMs: number;
  private _elapsed: number = 0;
  private _outcome: QualifyingOutcome = QualifyingOutcome.PENDING;
  private _gridPosition: number = 0;
  private _lapTimeSecs: number = 0;

  constructor(timeLimitSeconds: QualifyingTimerOption = QualifyingState.DEFAULT_TIMER_S) {
    this._timerMs = timeLimitSeconds * 1000;
  }

  /** Remaining countdown time in milliseconds (clamped to 0 — never negative). */
  get timerMs(): number {
    return this._timerMs;
  }

  /** Remaining countdown in whole seconds (truncated, not rounded). */
  get timerSeconds(): number {
    return Math.floor(this._timerMs / 1000);
  }

  /** Total elapsed time in ms since qualifying began. */
  get elapsed(): number {
    return this._elapsed;
  }

  /** Current qualifying outcome. */
  get outcome(): QualifyingOutcome {
    return this._outcome;
  }

  /** Grid position (1–8) earned after qualifying, or 0 while PENDING / FAILED. */
  get gridPosition(): number {
    return this._gridPosition;
  }

  /**
   * Lap time in seconds recorded at the moment of crossing the finish line.
   * Zero while still PENDING.
   */
  get lapTimeSecs(): number {
    return this._lapTimeSecs;
  }

  /**
   * True while the "QUALIFYING START" announcement banner should be displayed
   * (first ANNOUNCE_DURATION_MS of the qualifying lap).
   */
  get showAnnouncement(): boolean {
    return this._elapsed < QualifyingState.ANNOUNCE_DURATION_MS;
  }

  /**
   * Advance the qualifying state by `dt` milliseconds.
   *
   * After calling update(), check `outcome` to determine whether the player
   * qualified (QUALIFIED), ran out of time (FAILED), or is still racing (PENDING).
   *
   * @param dt          - Frame delta time in milliseconds.
   * @param playerZ     - Player's current world-Z position in metres.
   * @param trackLength - Total lap distance in metres.
   */
  update(dt: number, playerZ: number, trackLength: number): void {
    if (this._outcome !== QualifyingOutcome.PENDING) return;

    this._elapsed += dt;
    this._timerMs = Math.max(0, this._timerMs - dt);

    // Lap complete: player has reached or passed the finish line.
    if (playerZ >= trackLength) {
      const lapTimeSecs = this._elapsed / 1000;
      this._lapTimeSecs = lapTimeSecs;
      this._gridPosition = computeGridPosition(lapTimeSecs * this._timeScale);
      // Too slow for the grid (73 s or more at Fuji): the game ends, as in the arcade.
      this._outcome =
        this._gridPosition > 0 ? QualifyingOutcome.QUALIFIED : QualifyingOutcome.FAILED;
      return;
    }

    // Timer expired without completing the lap.
    if (this._timerMs <= 0) {
      this._outcome = QualifyingOutcome.FAILED;
    }
  }

  /** Reset to initial state with the given (or default) time limit. */
  reset(
    timeLimitSeconds: QualifyingTimerOption = QualifyingState.DEFAULT_TIMER_S,
    timeScale = 1
  ): void {
    this._timeScale = timeScale;
    this._timerMs = timeLimitSeconds * 1000;
    this._elapsed = 0;
    this._outcome = QualifyingOutcome.PENDING;
    this._gridPosition = 0;
    this._lapTimeSecs = 0;
  }
}
