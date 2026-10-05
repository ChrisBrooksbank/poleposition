// InputHandler - Keyboard input for steering, throttle, brake, and gear shift

export type Gear = 'low' | 'high';

export class InputHandler {
  private keys: Set<string> = new Set();
  /** Keys pressed since the last `endStep`, so a tap released before the next sim step still counts. */
  private tapped: Set<string> = new Set();
  private _gear: Gear = 'low';

  private readonly _onKeyDown: EventListener;
  private readonly _onKeyUp: EventListener;
  private readonly _onBlur: EventListener;

  constructor(target?: EventTarget) {
    this._onKeyDown = (e: Event) => {
      // Auto-repeat would otherwise flip the gear back and forth while Shift is held.
      if ((e as KeyboardEvent).repeat) return;
      this.pressKey((e as KeyboardEvent).code ?? '');
    };
    this._onKeyUp = (e: Event) => {
      this.releaseKey((e as KeyboardEvent).code ?? '');
    };

    // Keys released while the window is unfocused never send keyup, so forget them all.
    this._onBlur = () => this.releaseAll();

    if (target) {
      target.addEventListener('keydown', this._onKeyDown);
      target.addEventListener('keyup', this._onKeyUp);
      target.addEventListener('blur', this._onBlur);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
      window.addEventListener('blur', this._onBlur);
    }
  }

  /** Detach event listeners. Pass the same target used in the constructor. */
  destroy(target?: EventTarget): void {
    const t = target ?? (typeof window !== 'undefined' ? window : null);
    if (!t) return;
    t.removeEventListener('keydown', this._onKeyDown);
    t.removeEventListener('keyup', this._onKeyUp);
    t.removeEventListener('blur', this._onBlur);
  }

  /** Simulate a key press — useful for testing without a DOM environment. */
  pressKey(code: string): void {
    if (this.keys.has(code)) return;
    this.keys.add(code);
    this.tapped.add(code);
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this._gear = this._gear === 'low' ? 'high' : 'low';
    }
  }

  /** Simulate a key release — useful for testing without a DOM environment. */
  releaseKey(code: string): void {
    this.keys.delete(code);
  }

  /** Release every key (e.g. when the window loses focus). */
  releaseAll(): void {
    this.keys.clear();
    this.tapped.clear();
  }

  /** Call after each simulation step: taps that have since been released stop counting. */
  endStep(): void {
    this.tapped.clear();
  }

  private down(code: string): boolean {
    return this.keys.has(code) || this.tapped.has(code);
  }

  get left(): boolean {
    return this.down('ArrowLeft') || this.down('KeyA');
  }

  get right(): boolean {
    return this.down('ArrowRight') || this.down('KeyD');
  }

  get throttle(): boolean {
    return this.down('ArrowUp') || this.down('KeyW');
  }

  get brake(): boolean {
    return this.down('ArrowDown') || this.down('KeyS');
  }

  get gear(): Gear {
    return this._gear;
  }

  /** Check raw key state by code. */
  isKeyDown(code: string): boolean {
    return this.down(code);
  }
}
