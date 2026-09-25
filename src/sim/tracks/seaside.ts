// Seaside Speedway - a coastal circuit of long sweeping bends along the shoreline: a wide bay,
// a headland, a big cliff-top right, a harbour turn and a final point. Layout solved numerically
// (closed, no crossings).

import { buildClosedTrack } from './builder';

export const SEASIDE = buildClosedTrack('Seaside Speedway', 14, [
  ['Start Straight', 609.468, 0],
  ['Bay Right', 398.903, 67.54, 0.004],
  ['Headland Left', 150.229, -32.418, 0.01],
  ['Cliff Right', 820.613, 168.222, 0.006],
  ['Rocks Left', 356.749, -55.879, -0.008],
  ['Harbour Right', 485.752, 93.115, -0.006],
  ['Sea Straight', 408.281, 0, 0],
  ['Point Right', 526.558, 119.419, 0.002],
]);
