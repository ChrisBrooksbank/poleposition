// courses - the selectable circuits and their per-course data (hazards, theme, scoring scale).

import type { TrackDef } from './Track';
import { FUJI } from './tracks/fuji';
import { TEST_COURSE } from './tracks/testCourse';
import { SUZUKA } from './tracks/suzuka';
import { SEASIDE } from './tracks/seaside';
import { FUJI_PUDDLES, type Puddle } from './hazards';

export type CourseId = 'fuji' | 'test' | 'suzuka' | 'seaside';

export interface Course {
  id: CourseId;
  name: string;
  def: TrackDef;
  puddles: readonly Puddle[];
}

/** The lap length the arcade qualifying thresholds were written for (Fuji, ~4.36 km). */
export const REFERENCE_LAP_LENGTH = 4360;

/** Puddles spread around a lap at fixed fractions, alternating sides of the racing line. */
export function spreadPuddles(length: number): Puddle[] {
  const fractions = [0.14, 0.31, 0.46, 0.6, 0.76, 0.9];
  const laterals = [-2.5, 2.5, -2, 3, 0, -3];
  return fractions.map((f, i) => ({ s: Math.round(length * f), lateral: laterals[i] }));
}

function total(def: TrackDef): number {
  return def.segments.reduce((sum, s) => sum + s.length, 0);
}

export const COURSES: readonly Course[] = [
  { id: 'fuji', name: 'FUJI SPEEDWAY', def: FUJI, puddles: FUJI_PUDDLES },
  { id: 'test', name: 'TEST COURSE', def: TEST_COURSE, puddles: spreadPuddles(total(TEST_COURSE)) },
  { id: 'suzuka', name: 'SUZUKA', def: SUZUKA, puddles: spreadPuddles(total(SUZUKA)) },
  { id: 'seaside', name: 'SEASIDE SPEEDWAY', def: SEASIDE, puddles: spreadPuddles(total(SEASIDE)) },
];

export function courseById(id: CourseId): Course {
  return COURSES.find((c) => c.id === id) ?? COURSES[0];
}
