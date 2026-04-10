/**
 * NameEntryState — manages 3-initial name entry for the high score screen.
 *
 * Letter selection is controlled with left/right inputs; a separate confirm
 * input advances to the next slot.  After all three slots are confirmed the
 * state reports `isDone = true` and exposes the completed `initials` string.
 *
 * Key repeat is supported: holding a direction key first fires after
 * INITIAL_DELAY_MS, then repeats every REPEAT_RATE_MS.
 *
 * Usage:
 *   const nes = new NameEntryState();
 *   nes.reset();
 *   // each frame:
 *   nes.update(dt, input.left, input.right, input.isKeyDown('Enter'));
 *   if (nes.isDone) { console.log(nes.initials); }
 */

/** Characters available for each initial slot (A–Z). */
export const NAME_ENTRY_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHAR_COUNT = 3;

export class NameEntryState {
  /** Delay before key-repeat begins (ms). */
  static readonly INITIAL_DELAY_MS = 350;
  /** Repeat rate once repeat has started (ms per step). */
  static readonly REPEAT_RATE_MS = 120;

  private _slot = 0;
  private _letterIndices: number[] = [0, 0, 0];
  private _done = false;

  // Key-repeat state for left/right
  private _leftHeld = 0; // ms the left key has been held continuously
  private _rightHeld = 0;
  private _leftFired = false; // whether the initial press event was fired
  private _rightFired = false;

  // Edge-detection for confirm
  private _prevConfirm = false;

  // ─── Public getters ─────────────────────────────────────────────────────────

  /** 0-based index of the character slot currently being edited (0, 1, or 2). */
  get currentSlot(): number {
    return this._slot;
  }

  /** True once all three initials have been confirmed. */
  get isDone(): boolean {
    return this._done;
  }

  /** The 3-character initials string built from current selections. */
  get initials(): string {
    return this._letterIndices
      .slice(0, CHAR_COUNT)
      .map((i) => NAME_ENTRY_LETTERS[i] ?? 'A')
      .join('');
  }

  /** Letter index (0–25) selected for each slot. */
  get letterIndices(): readonly number[] {
    return this._letterIndices;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  /** Reset to the initial state ready for a new name entry session. */
  reset(): void {
    this._slot = 0;
    this._letterIndices = [0, 0, 0];
    this._done = false;
    this._leftHeld = 0;
    this._rightHeld = 0;
    this._leftFired = false;
    this._rightFired = false;
    this._prevConfirm = false;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  /**
   * Advance name-entry logic by one frame.
   *
   * @param dt      Delta time in milliseconds since the last frame.
   * @param left    True while the "previous letter" key is held.
   * @param right   True while the "next letter" key is held.
   * @param confirm True while the "confirm letter" key is held.
   */
  update(dt: number, left: boolean, right: boolean, confirm: boolean): void {
    if (this._done) return;

    const leftStep = this._repeatStep(dt, left, '_leftHeld', '_leftFired');
    const rightStep = this._repeatStep(dt, right, '_rightHeld', '_rightFired');
    const confirmPress = confirm && !this._prevConfirm;
    this._prevConfirm = confirm;

    const len = NAME_ENTRY_LETTERS.length;
    if (leftStep) {
      this._letterIndices[this._slot] = ((this._letterIndices[this._slot] ?? 0) - 1 + len) % len;
    }
    if (rightStep) {
      this._letterIndices[this._slot] = ((this._letterIndices[this._slot] ?? 0) + 1) % len;
    }
    if (confirmPress) {
      this._slot++;
      if (this._slot >= CHAR_COUNT) {
        this._slot = CHAR_COUNT;
        this._done = true;
      }
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Compute whether this direction key should fire a step this frame.
   * Implements initial-delay + repeat behaviour.
   *
   * @param dt         Frame delta time (ms).
   * @param held       Whether the key is currently down.
   * @param heldField  Name of the held-time accumulator field on `this`.
   * @param firedField Name of the initial-fire flag field on `this`.
   */
  private _repeatStep(
    dt: number,
    held: boolean,
    heldField: '_leftHeld' | '_rightHeld',
    firedField: '_leftFired' | '_rightFired'
  ): boolean {
    if (!held) {
      this[heldField] = 0;
      this[firedField] = false;
      return false;
    }

    const prev = this[heldField];
    this[heldField] += dt;
    const curr = this[heldField];

    // First press — fire immediately
    if (!this[firedField]) {
      this[firedField] = true;
      return true;
    }

    // After initial delay, fire at repeat rate
    if (prev < NameEntryState.INITIAL_DELAY_MS && curr >= NameEntryState.INITIAL_DELAY_MS) {
      return true;
    }
    if (curr >= NameEntryState.INITIAL_DELAY_MS) {
      const prevRepeats = Math.floor(
        (prev - NameEntryState.INITIAL_DELAY_MS) / NameEntryState.REPEAT_RATE_MS
      );
      const currRepeats = Math.floor(
        (curr - NameEntryState.INITIAL_DELAY_MS) / NameEntryState.REPEAT_RATE_MS
      );
      return currRepeats > prevRepeats;
    }

    return false;
  }
}
