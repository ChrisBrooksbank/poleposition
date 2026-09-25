// Fuji Speedway - the Pole Position circuit (research.md section 5), ~4.36 km per lap.
// Order: main straight, sharp right, quick left, medium right, left hairpin, long gradual right.
// Layout was solved numerically so the lap closes on itself (heading and position) and never crosses
// itself: the turn angles sum to +360 degrees and the centreline returns to the start line.
// A short straight and a closing right-hander were added after the long right to make it close.

import type { TrackDef, TrackSegment } from '../Track';

const DEG = Math.PI / 180;

/** Builds a segment from a total turn angle in degrees (positive = right). */
function seg(name: string, length: number, turnDeg: number, slope = 0): TrackSegment {
  return { name, length, curvature: (turnDeg * DEG) / length, slope };
}

const CLIMBS: Array<[string, number, number, number]> = [
  ['Sharp Right', 291.001, 163.756, 0.012],
  ['Quick Left', 274.628, -21.175, -0.01],
  ['Medium Right', 263.08, 53.833, 0.015],
  ['Left Hairpin', 331.967, -101.386, -0.02],
  ['Long Gradual Right', 873.581, 141.535, 0.004],
  ['Back Straight', 453.578, 0, 0],
  ['Final Right', 441.516, 123.437, -0.003],
];

const MAIN_STRAIGHT_LENGTH = 4360 - CLIMBS.reduce((sum, c) => sum + c[1], 0);
/** Net climb of the other sections, cancelled by the main straight so the lap ends at the same height. */
const MAIN_STRAIGHT_SLOPE = -CLIMBS.reduce((sum, c) => sum + c[1] * c[3], 0) / MAIN_STRAIGHT_LENGTH;

export const FUJI: TrackDef = {
  name: 'Fuji Speedway',
  roadWidth: 14,
  segments: [
    seg('Main Straight', MAIN_STRAIGHT_LENGTH, 0, MAIN_STRAIGHT_SLOPE),
    ...CLIMBS.map(([name, length, turn, slope]) => seg(name, length, turn, slope)),
  ],
};
