/**
 * ScoreTracker — accumulates points according to the Pole Position scoring rules.
 *
 * Scoring rules (from spec game-flow.md):
 *   - Distance:            10 points per metre driven
 *   - Overtake bonus:      50 points per AI car fully overtaken
 *   - Qualifying bonus:    1st=4000, 2nd=2000, 3rd=1400, 4th=1000,
 *                          5th=800, 6th=600, 7th=400, 8th=200
 *   - Time bonus:          200 points per whole second remaining at race end
 *
 * Overtake detection:
 *   An AI car is considered "overtaken" when the player's world-Z transitions
 *   from being behind the AI car to being ahead of it.  Positions are
 *   normalised to a [-trackLength/2, trackLength/2] window so wrap-arounds at
 *   the lap boundary are handled correctly.
 */

export const QUALIFYING_POSITION_BONUSES: readonly number[] = [
  4000, // 1st
  2000, // 2nd
  1400, // 3rd
  1000, // 4th
  800, // 5th
  600, // 6th
  400, // 7th
  200, // 8th
];

export class ScoreTracker {
  static readonly PTS_PER_METER = 10;
  static readonly PTS_PER_OVERTAKE = 50;
  static readonly PTS_PER_SECOND_REMAINING = 200;

  private _score: number = 0;
  /** Fractional distance points not yet added to the score. */
  private _distancePts = 0;
  /**
   * For each AI car index, stores whether the player was ahead of that car at
   * the end of the last `recordOvertakes` call.
   * `null` means not yet initialised (first call will set the baseline).
   */
  private _playerWasAhead: (boolean | null)[] = [];

  /** Current accumulated score. */
  get score(): number {
    return this._score;
  }

  /**
   * Award points for distance driven.
   * @param meters - Metres driven this frame (must be non-negative).
   */
  addDistance(meters: number): void {
    if (meters <= 0) return;
    // Carry the fraction over: per-frame distances are small, and flooring each one would
    // throw away most of a point every frame.
    this._distancePts += meters * ScoreTracker.PTS_PER_METER;
    const whole = Math.floor(this._distancePts);
    this._distancePts -= whole;
    this._score += whole;
  }

  /**
   * Detect AI cars that the player has just overtaken and award 50 pts each.
   *
   * @param playerZ   - Player's world-Z position in metres.
   * @param aiZs      - Array of AI car world-Z positions in metres.
   * @param trackLength - Total lap length in metres.
   */
  recordOvertakes(playerZ: number, aiZs: readonly number[], trackLength: number): void {
    // Grow the per-car state array if new AI cars have been added.
    while (this._playerWasAhead.length < aiZs.length) {
      this._playerWasAhead.push(null);
    }

    const half = trackLength / 2;

    for (let i = 0; i < aiZs.length; i++) {
      // Compute the AI car position relative to the player, normalised to
      // the range [-trackLength/2, trackLength/2].
      let rel = aiZs[i] - playerZ;
      if (rel > half) rel -= trackLength;
      if (rel < -half) rel += trackLength;

      // rel < 0  →  player is ahead of this AI car
      // rel > 0  →  AI car is ahead of the player
      const playerIsAhead = rel < 0;

      if (this._playerWasAhead[i] === null) {
        // First call: just record the baseline, no overtake counted.
        this._playerWasAhead[i] = playerIsAhead;
      } else if (!this._playerWasAhead[i] && playerIsAhead) {
        // Transition: AI was ahead, player is now ahead → overtake!
        this._score += ScoreTracker.PTS_PER_OVERTAKE;
        this._playerWasAhead[i] = true;
      } else {
        this._playerWasAhead[i] = playerIsAhead;
      }
    }
  }

  /**
   * Award the qualifying position bonus.
   * @param gridPosition - 1-based grid position (1–8). Values outside this range are ignored.
   */
  addQualifyingBonus(gridPosition: number): void {
    if (gridPosition >= 1 && gridPosition <= QUALIFYING_POSITION_BONUSES.length) {
      this._score += QUALIFYING_POSITION_BONUSES[gridPosition - 1];
    }
  }

  /**
   * Award the time bonus (200 pts per whole second remaining).
   * @param remainingMs - Milliseconds remaining on the race timer.
   */
  addTimeBonus(remainingMs: number): void {
    if (remainingMs <= 0) return;
    this._score += Math.floor(remainingMs / 1000) * ScoreTracker.PTS_PER_SECOND_REMAINING;
  }

  /**
   * Reset the score to zero and clear overtake tracking state.
   * Call this when starting a new game.
   */
  reset(): void {
    this._score = 0;
    this._distancePts = 0;
    this._playerWasAhead = [];
  }
}
