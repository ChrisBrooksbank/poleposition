// Test Course - a short, forgiving circuit: two long straights joined by wide turns, with a kink and
// a chicane to keep it interesting. Layout solved numerically (closed, no crossings).

import { buildClosedTrack } from './builder';

export const TEST_COURSE = buildClosedTrack('Test Course', 14, [
  ['Start Straight', 691.443, 0],
  ['Turn One', 271.693, 79.286, 0.006],
  ['Kink Left', 108.999, -10.834, 0.004],
  ['Kink Right', 254.468, 42.288, -0.004],
  ['Turn Two', 257.942, 78.253, -0.006],
  ['Back Straight', 723.463, 0, 0.002],
  ['Turn Three', 272.317, 100.04, -0.004],
  ['Chicane Left', 121.692, -38.026, 0],
  ['Chicane Right', 190.283, 72.061, 0.004],
  ['Turn Four', 80.701, 36.931, 0],
]);
