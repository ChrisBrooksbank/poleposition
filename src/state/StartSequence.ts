/**
 * StartSequence - the pre-race ceremony: a banner plane flies across the sky, then three red
 * lights come on one at a time and go out for green. The car is held on the grid until green.
 * Times are in milliseconds.
 */
export class StartSequence {
  /** How long the banner plane takes to cross the screen. */
  static readonly FLYBY_MS = 2600;
  /** Gap between successive red lights. */
  static readonly LIGHT_MS = 800;
  static readonly RED_LIGHTS = 3;
  /** Moment the lights turn green and the race begins. */
  static readonly GO_MS =
    StartSequence.FLYBY_MS + StartSequence.RED_LIGHTS * StartSequence.LIGHT_MS;
  /** How long the green light stays up once the race is running. */
  static readonly GREEN_HOLD_MS = 1200;

  private _elapsed = 0;

  reset(): void {
    this._elapsed = 0;
  }

  update(dt: number): void {
    this._elapsed += dt;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  /** True while the car must stay on the grid (banner flyby and red lights). */
  get isHolding(): boolean {
    return this._elapsed < StartSequence.GO_MS;
  }

  /** 0 to 1 across the flyby, then clamped at 1; the plane is visible only while 0 < t < 1. */
  get flybyProgress(): number {
    return Math.min(1, this._elapsed / StartSequence.FLYBY_MS);
  }

  get isFlyingBy(): boolean {
    return this._elapsed < StartSequence.FLYBY_MS;
  }

  /** Number of red lights currently lit (0 to 3); all are out once the light goes green. */
  get redLights(): number {
    if (!this.isHolding) return 0;
    const since = this._elapsed - StartSequence.FLYBY_MS;
    if (since < 0) return 0;
    return Math.min(StartSequence.RED_LIGHTS, Math.floor(since / StartSequence.LIGHT_MS) + 1);
  }

  /** True for a short while after the start, while the green light is shown. */
  get showGreen(): boolean {
    return (
      this._elapsed >= StartSequence.GO_MS &&
      this._elapsed < StartSequence.GO_MS + StartSequence.GREEN_HOLD_MS
    );
  }

  /** True while the gantry lights should be drawn at all. */
  get showLights(): boolean {
    return !this.isFlyingBy && (this.isHolding || this.showGreen);
  }
}
