/**
 * Fuji Speedway track data for Pole Position.
 *
 * The circuit is based on Fuji Speedway in Oyama, Shizuoka, Japan —
 * approximately 4.36 km per lap.  Track position is measured in meters
 * (1 world unit = 1 metre).
 *
 * Curve values are signed floats consumed by {@link CurveFunction}:
 *   positive = curve to the right
 *   negative = curve to the left
 *
 * Magnitude reference (tuned so the road visually sweeps at 256×224 resolution):
 *   0        → dead straight
 *   ±0.015   → long gradual bend (barely noticeable)
 *   ±0.035   → medium corner
 *   ±0.060   → sharp turn (requires braking/reduced throttle)
 *   ±0.080   → tight hairpin (most difficult corner)
 */

/** One named section of the Fuji Speedway circuit. */
export interface TrackSection {
  /** Human-readable name for debugging and test assertions. */
  name: string;
  /** Length of this section in metres. */
  length: number;
  /**
   * Lateral curve strength.
   * Positive = right, negative = left.
   * Zero = straight.
   */
  curve: number;
}

/**
 * The six sections of the Fuji Speedway circuit in lap order, starting at the
 * start/finish line on the main straight.
 *
 * Derived from the original game's course diagram in research.md:
 *   1. Long starting straightaway (main straight, start/finish line)
 *   2. Sharp right turn
 *   3. Quick left turn (S-curve together with 2)
 *   4. Right turn (medium-speed, leads into challenging section)
 *   5. Left hairpin (tightest corner, most crashes)
 *   6. Long gradual right curve back to main straight
 */
export const FUJI_SECTIONS: readonly TrackSection[] = [
  { name: 'Main Straight', length: 1200, curve: 0.0 },
  { name: 'Sharp Right', length: 300, curve: +0.06 },
  { name: 'Quick Left', length: 200, curve: -0.05 },
  { name: 'Medium Right', length: 400, curve: +0.035 },
  { name: 'Left Hairpin', length: 260, curve: -0.08 },
  { name: 'Long Gradual Right', length: 2000, curve: +0.015 },
] as const;

/**
 * Total lap distance in metres.
 * Sum of all section lengths: approximately 4.36 km.
 */
export const TRACK_LENGTH: number = FUJI_SECTIONS.reduce((sum, s) => sum + s.length, 0);

/**
 * Pre-computed cumulative start distances for each section (in metres).
 * `SECTION_STARTS[i]` is the absolute track position where section `i` begins.
 * Used internally by {@link getTrackCurve} for O(1) lookup after a scan.
 *
 * @internal
 */
export const SECTION_STARTS: readonly number[] = (() => {
  const starts: number[] = [];
  let acc = 0;
  for (const section of FUJI_SECTIONS) {
    starts.push(acc);
    acc += section.length;
  }
  return starts;
})();

/**
 * Returns the curve strength at a given absolute world-Z position.
 *
 * This function implements the {@link CurveFunction} contract used by
 * {@link computeCurveOffsets} in RoadRenderer.  It is called once per
 * visible scanline per frame, so it is kept lightweight (linear scan over
 * six sections; no allocation).
 *
 * The position is wrapped modulo {@link TRACK_LENGTH} so the circuit loops
 * seamlessly.  Negative positions (should not occur in normal gameplay) are
 * also handled correctly.
 *
 * @param worldZ  Absolute world-Z position in metres (playerZ + scanline Z).
 * @returns       Signed curve value for that position.
 */
export function getTrackCurve(worldZ: number): number {
  // Wrap to [0, TRACK_LENGTH) — handles multi-lap and any negative values.
  const pos = ((worldZ % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;

  // Linear scan over 6 sections — trivially fast.
  for (let i = FUJI_SECTIONS.length - 1; i >= 0; i--) {
    if (pos >= SECTION_STARTS[i]) {
      return FUJI_SECTIONS[i].curve;
    }
  }

  // Should be unreachable (pos is always ≥ 0 and SECTION_STARTS[0] = 0).
  return 0;
}
