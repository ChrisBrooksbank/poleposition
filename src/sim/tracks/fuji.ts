// Fuji Speedway - the Pole Position circuit (research.md section 5).
// Lap is ~4.36 km: main straight, sharp right, quick left, right, left hairpin, long gradual right.
// Turn angles sum to +360 degrees (net clockwise) so the heading returns to the start direction.

import type { TrackDef, TrackSegment } from '../Track';

const DEG = Math.PI / 180;

/** Builds a segment from a total turn angle in degrees (positive = right). */
function seg(name: string, length: number, turnDeg: number, slope = 0): TrackSegment {
  return { name, length, curvature: (turnDeg * DEG) / length, slope };
}

export const FUJI: TrackDef = {
  name: 'Fuji Speedway',
  roadWidth: 14,
  segments: [
    seg('Main Straight', 1000, 0),
    seg('Sharp Right', 250, 100, 0.01),
    seg('Quick Left', 200, -60, -0.005),
    seg('Medium Right', 300, 90, 0.01),
    seg('Left Hairpin', 250, -150, -0.02),
    seg('Long Gradual Right', 2360, 380, 0),
  ],
};
