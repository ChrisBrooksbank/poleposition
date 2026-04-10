/**
 * HUDRenderer — draws the in-game heads-up display overlay.
 *
 * Elements rendered:
 *   - Score (top-left, 6 zero-padded digits)
 *   - Countdown timer (top-right, turns red at ≤10 s)
 *   - Speed in MPH or KPH (second row, right)
 *   - Lap counter "LAP X/Y" (second row, left — Grand Prix only)
 *   - Race position "YOU ARE IN Xth" (bottom centre)
 */

export const MPH_TO_KPH = 1.60934;

export interface HUDRenderOptions {
  /** Accumulated score to display. */
  score: number;
  /** Remaining countdown time in whole seconds. */
  timerSeconds: number;
  /** Player speed in MPH. */
  speedMph: number;
  /** When true, speed is displayed in KPH instead of MPH. */
  useKph?: boolean;
  /** Current lap (1-based). Omit for qualifying. */
  lapCurrent?: number;
  /** Total laps in race. Omit for qualifying. */
  lapTotal?: number;
  /** 1-based race/qualifying position. */
  racePosition: number;
}

export class HUDRenderer {
  constructor(
    readonly width: number = 256,
    readonly height: number = 224
  ) {}

  /**
   * Compute the 1-based race position of the player relative to AI cars.
   *
   * Position = (number of AI cars strictly ahead of the player) + 1.
   * "Ahead" is computed in relative Z space, accounting for lap wrapping.
   *
   * @param playerZ     Player's world-Z position in metres.
   * @param aiZs        World-Z positions of all AI cars in metres.
   * @param trackLength Total lap distance in metres.
   */
  static computeRacePosition(
    playerZ: number,
    aiZs: readonly number[],
    trackLength: number
  ): number {
    const half = trackLength / 2;
    let ahead = 0;

    for (const aiZ of aiZs) {
      let rel = aiZ - playerZ;
      // Normalise to [-half, half] so wrap-arounds are handled correctly.
      if (rel > half) rel -= trackLength;
      if (rel < -half) rel += trackLength;
      // Positive rel means the AI car is ahead (higher Z) of the player.
      if (rel > 0) ahead++;
    }

    return ahead + 1;
  }

  /**
   * Render the HUD overlay onto the given canvas context.
   *
   * Assumes the road/game scene has already been rendered beneath.
   */
  render(ctx: CanvasRenderingContext2D, opts: HUDRenderOptions): void {
    const {
      score,
      timerSeconds,
      speedMph,
      useKph = false,
      lapCurrent,
      lapTotal,
      racePosition,
    } = opts;

    ctx.save();
    ctx.font = 'bold 8px monospace';

    // ── Row 1: Score (left) and Timer (right) ──────────────────────────────

    // Score — 6 zero-padded digits
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(String(score).padStart(6, '0'), 4, 12);

    // Timer — turns red when ≤ 10 seconds remain
    ctx.fillStyle = timerSeconds <= 10 ? '#ff4444' : '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME ${String(timerSeconds).padStart(3, ' ')}`, this.width - 4, 12);

    // ── Row 2: Lap counter (left) and Speed (right) ────────────────────────

    ctx.fillStyle = '#ffffff';

    if (lapCurrent !== undefined && lapTotal !== undefined) {
      ctx.textAlign = 'left';
      ctx.fillText(`LAP ${lapCurrent}/${lapTotal}`, 4, 22);
    }

    // Speed — convert if KPH is requested
    const displaySpeed = useKph ? Math.round(speedMph * MPH_TO_KPH) : Math.round(speedMph);
    const unit = useKph ? 'KPH' : 'MPH';
    ctx.textAlign = 'right';
    ctx.fillText(`${String(displaySpeed).padStart(3, ' ')} ${unit}`, this.width - 4, 22);

    // ── Race position — bottom centre ──────────────────────────────────────

    if (racePosition >= 1) {
      const posText = `YOU ARE IN ${ordinal(racePosition)}`;
      ctx.fillStyle = '#ffdd00';
      ctx.textAlign = 'center';
      ctx.fillText(posText, this.width / 2, this.height - 8);
    }

    ctx.restore();
  }
}

/** Return the English ordinal string for a positive integer (1→"1st", 2→"2nd", …). */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
