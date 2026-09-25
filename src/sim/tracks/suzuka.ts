// Suzuka - a technical circuit inspired by the Japanese grand prix track: a first curve, the S-curve
// esses, Degner, a tight hairpin, Spoon, a fast 130R and a chicane. (The real track crosses over
// itself; this flat layout does not.) Layout solved numerically (closed, no crossings).

import { buildClosedTrack } from './builder';

export const SUZUKA = buildClosedTrack('Suzuka', 13, [
  ['Start Straight', 1051.864, 0],
  ['First Curve', 181.052, 92.664, 0.01],
  ['S Curve One', 257.458, -74.509, 0.008],
  ['S Curve Two', 244.228, 90.646, -0.006],
  ['S Curve Three', 220.635, -60.242, 0.004],
  ['Dunlop', 62.808, -14.376, 0.012],
  ['Degner One', 240.269, 69.839, -0.01],
  ['Degner Two', 272.114, 79.73, -0.012],
  ['Hairpin', 135.834, 118.647, 0.006],
  ['Spoon', 346.254, -108.878, -0.008],
  ['Back Straight', 909.955, 0, 0.004],
  ['One Thirty R', 153.06, -18.124, -0.002],
  ['Chicane In', 225.404, 70.526, 0],
  ['Chicane Out', 107.005, -36.357, 0],
  ['Final Corner', 465.778, 150.433, -0.004],
]);
