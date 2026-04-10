/**
 * GridDisplayState — manages the post-qualifying grid position display screen.
 *
 * After qualifying, the player's earned grid position (1–8) is shown for
 * DISPLAY_DURATION_MS milliseconds before the game transitions to the
 * Grand Prix race.
 *
 * Usage:
 *   const gds = new GridDisplayState();
 *   // In state onEnter:
 *   gds.reset(qualifyingGridPosition);
 *   // In state update:
 *   gds.update(dt);
 *   if (gds.isDone) stateMachine.transition(GameState.GRAND_PRIX);
 *   // In state render:
 *   if (gds.gridPosition > 0) { ... show "YOU ARE IN Xth" ... }
 */

export class GridDisplayState {
  /** How long the grid position is displayed before transitioning (ms). */
  static readonly DISPLAY_DURATION_MS = 3000;

  private _elapsed = 0;
  private _gridPosition: number;

  constructor(gridPosition = 0) {
    this._gridPosition = gridPosition;
  }

  /** 1-based grid position (1–8) to display, or 0 if player did not qualify. */
  get gridPosition(): number {
    return this._gridPosition;
  }

  /** Elapsed time since reset (ms), capped at DISPLAY_DURATION_MS. */
  get elapsed(): number {
    return this._elapsed;
  }

  /**
   * True once DISPLAY_DURATION_MS has been reached — the caller should
   * transition to the next state.
   */
  get isDone(): boolean {
    return this._elapsed >= GridDisplayState.DISPLAY_DURATION_MS;
  }

  /**
   * Advance the display timer by `dt` milliseconds.
   * Elapsed is capped at DISPLAY_DURATION_MS so it never overflows.
   */
  update(dt: number): void {
    this._elapsed = Math.min(this._elapsed + dt, GridDisplayState.DISPLAY_DURATION_MS);
  }

  /**
   * Reset the display timer and set the grid position to show.
   * Call this in the GRID_DISPLAY state's onEnter handler.
   */
  reset(gridPosition = 0): void {
    this._elapsed = 0;
    this._gridPosition = gridPosition;
  }
}
