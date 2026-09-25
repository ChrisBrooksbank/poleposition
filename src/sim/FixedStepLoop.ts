// FixedStepLoop - deterministic fixed-timestep simulation with a variable-rate render callback.
// The sim advances in constant steps; render receives the interpolation alpha in [0, 1).

type RequestAnimationFrameFn = (callback: FrameRequestCallback) => number;
type CancelAnimationFrameFn = (id: number) => void;

export class FixedStepLoop {
  /** Simulation rate in Hz. */
  static readonly STEP_HZ = 60;
  /** Simulation step in seconds. */
  static readonly STEP = 1 / FixedStepLoop.STEP_HZ;
  /** Largest real frame time honoured, in seconds (avoids the spiral of death). */
  static readonly MAX_FRAME = 0.25;

  private running = false;
  private lastTimestamp: number | null = null;
  private accumulator = 0;
  private frameId: number | null = null;

  constructor(
    private readonly onStep: (dt: number) => void,
    private readonly onRender: (alpha: number) => void,
    private readonly raf: RequestAnimationFrameFn = requestAnimationFrame.bind(globalThis),
    private readonly caf: CancelAnimationFrameFn = cancelAnimationFrame.bind(globalThis)
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = null;
    this.accumulator = 0;
    this.frameId = this.raf((ts) => this.tick(ts));
  }

  stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      this.caf(this.frameId);
      this.frameId = null;
    }
  }

  private tick(timestamp: number): void {
    if (!this.running) return;

    if (this.lastTimestamp !== null) {
      const frame = Math.min((timestamp - this.lastTimestamp) / 1000, FixedStepLoop.MAX_FRAME);
      this.accumulator += frame;
      while (this.accumulator >= FixedStepLoop.STEP) {
        this.onStep(FixedStepLoop.STEP);
        this.accumulator -= FixedStepLoop.STEP;
      }
      this.onRender(this.accumulator / FixedStepLoop.STEP);
    }

    this.lastTimestamp = timestamp;
    this.frameId = this.raf((ts) => this.tick(ts));
  }
}
