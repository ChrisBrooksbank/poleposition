// InputHandler - Keyboard input for steering, throttle, brake, and gear shift

export type Gear = 'low' | 'high';

export class InputHandler {
  private keys: Set<string> = new Set();
  private _gear: Gear = 'low';

  private readonly _onKeyDown: EventListener;
  private readonly _onKeyUp: EventListener;

  constructor(target?: EventTarget) {
    this._onKeyDown = (e: Event) => {
      this.pressKey((e as KeyboardEvent).code ?? '');
    };
    this._onKeyUp = (e: Event) => {
      this.releaseKey((e as KeyboardEvent).code ?? '');
    };

    if (target) {
      target.addEventListener('keydown', this._onKeyDown);
      target.addEventListener('keyup', this._onKeyUp);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
    }
  }

  /** Detach event listeners. Pass the same target used in the constructor. */
  destroy(target?: EventTarget): void {
    const t = target ?? (typeof window !== 'undefined' ? window : null);
    if (!t) return;
    t.removeEventListener('keydown', this._onKeyDown);
    t.removeEventListener('keyup', this._onKeyUp);
  }

  /** Simulate a key press — useful for testing without a DOM environment. */
  pressKey(code: string): void {
    this.keys.add(code);
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this._gear = this._gear === 'low' ? 'high' : 'low';
    }
  }

  /** Simulate a key release — useful for testing without a DOM environment. */
  releaseKey(code: string): void {
    this.keys.delete(code);
  }

  get left(): boolean {
    return this.keys.has('ArrowLeft');
  }

  get right(): boolean {
    return this.keys.has('ArrowRight');
  }

  get throttle(): boolean {
    return this.keys.has('ArrowUp');
  }

  get brake(): boolean {
    return this.keys.has('ArrowDown');
  }

  get gear(): Gear {
    return this._gear;
  }

  /** Check raw key state by code. */
  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }
}
