// GameLoop - 60 FPS game loop with delta time tracking

type UpdateCallback = (dt: number) => void;
type RequestAnimationFrameFn = (callback: FrameRequestCallback) => number;
type CancelAnimationFrameFn = (id: number) => void;

export class GameLoop {
  /** Maximum allowed delta time in ms to prevent spiral of death */
  static readonly MAX_DT_MS = 100;

  private running = false;
  private lastTimestamp: number | null = null;
  private frameId: number | null = null;

  constructor(
    private readonly onUpdate: UpdateCallback,
    private readonly raf: RequestAnimationFrameFn = requestAnimationFrame.bind(globalThis),
    private readonly caf: CancelAnimationFrameFn = cancelAnimationFrame.bind(globalThis)
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = null;
    this.frameId = this.raf((ts) => this.tick(ts));
  }

  stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      this.caf(this.frameId);
      this.frameId = null;
    }
    this.lastTimestamp = null;
  }

  private tick(timestamp: number): void {
    if (!this.running) return;

    if (this.lastTimestamp !== null) {
      const rawDt = timestamp - this.lastTimestamp;
      const dt = Math.min(rawDt, GameLoop.MAX_DT_MS);
      this.onUpdate(dt);
    }

    this.lastTimestamp = timestamp;
    this.frameId = this.raf((ts) => this.tick(ts));
  }
}
