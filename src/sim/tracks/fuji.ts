// Fuji Speedway - the Pole Position circuit (research.md section 5), ~4.36 km per lap.
// Order: main straight, sharp right, quick left, medium right, left hairpin, long gradual right.
// Layout was solved numerically so the lap closes on itself (heading and position) and never crosses
// itself: the turn angles sum to +360 degrees and the centreline returns to the start line.
// A back straight and a closing right-hander follow the long right to make it close.

import { buildClosedTrack } from './builder';

export const FUJI = buildClosedTrack('Fuji Speedway', 14, [
  ['Main Straight', 1100.074, 0],
  ['Sharp Right', 356.758, 110.641, 0.012],
  ['Quick Left', 146.27, -29.367, -0.01],
  ['Medium Right', 503.274, 143.985, 0.015],
  ['Left Hairpin', 210.451, -127.587, -0.02],
  ['Long Gradual Right', 531.049, 101.449, 0.004],
  ['Back Straight', 506.723, 0],
  ['Final Right', 1005.401, 160.879, -0.003],
]);
