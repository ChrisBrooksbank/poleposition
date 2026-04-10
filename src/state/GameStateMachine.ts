/**
 * GameStateMachine — top-level game state management.
 *
 * States:
 *   ATTRACT      — idle demo/title screen shown while no game is active
 *   COIN_INSERT  — credit screen shown after player starts
 *   QUALIFYING   — timed single lap to earn a grid position
 *   GRID_DISPLAY — show earned starting position after qualifying
 *   GRAND_PRIX   — multi-lap race with countdown timer
 *   RACE_COMPLETE — all laps finished, show results
 *   GAME_OVER    — timer expired before lap/race was completed
 *   NAME_ENTRY   — high-score initial entry screen
 *
 * Usage:
 *   const sm = new GameStateMachine();
 *   sm.register(GameState.ATTRACT, { update, render, onEnter, onExit });
 *   // … register remaining states …
 *   // in game loop:
 *   sm.update(dt);
 *   sm.render(ctx);
 *   // to change state from inside a handler:
 *   sm.transition(GameState.QUALIFYING);
 */

export enum GameState {
  ATTRACT = 'ATTRACT',
  COIN_INSERT = 'COIN_INSERT',
  QUALIFYING = 'QUALIFYING',
  GRID_DISPLAY = 'GRID_DISPLAY',
  GRAND_PRIX = 'GRAND_PRIX',
  RACE_COMPLETE = 'RACE_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  NAME_ENTRY = 'NAME_ENTRY',
  SETTINGS = 'SETTINGS',
}

export interface StateHandlers {
  /** Called once when the state machine enters this state. */
  onEnter?: () => void;
  /** Called once when the state machine exits this state. */
  onExit?: () => void;
  /** Called every frame while this state is active. */
  update: (dt: number) => void;
  /** Called every frame while this state is active. */
  render: (ctx: CanvasRenderingContext2D) => void;
}

export class GameStateMachine {
  private _current: GameState;
  private readonly _handlers = new Map<GameState, StateHandlers>();

  constructor(initial: GameState = GameState.ATTRACT) {
    this._current = initial;
  }

  /** The currently active game state. */
  get state(): GameState {
    return this._current;
  }

  /**
   * Register update/render (and optional lifecycle) handlers for a state.
   * Calling register() a second time for the same state replaces the handlers.
   */
  register(state: GameState, handlers: StateHandlers): void {
    this._handlers.set(state, handlers);
  }

  /**
   * Transition to a new state.
   *  1. Calls onExit() on the current state (if registered).
   *  2. Switches the active state.
   *  3. Calls onEnter() on the new state (if registered).
   *
   * Transitioning to the same state calls onExit then onEnter again —
   * useful for restarting a state without special-casing.
   */
  transition(next: GameState): void {
    const currentHandlers = this._handlers.get(this._current);
    currentHandlers?.onExit?.();
    this._current = next;
    const nextHandlers = this._handlers.get(this._current);
    nextHandlers?.onEnter?.();
  }

  /**
   * Dispatch update to the current state's handler.
   * No-op if no handler has been registered for the current state.
   */
  update(dt: number): void {
    this._handlers.get(this._current)?.update(dt);
  }

  /**
   * Dispatch render to the current state's handler.
   * No-op if no handler has been registered for the current state.
   */
  render(ctx: CanvasRenderingContext2D): void {
    this._handlers.get(this._current)?.render(ctx);
  }
}
