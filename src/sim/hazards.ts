// hazards - puddles and collision boxes in track space (metres). Pure; no rendering.

import type { Track } from './Track';
import type { SceneryItem } from './scenery';

/** A puddle on the tarmac. `lateral` is metres from the centreline, positive to the right. */
export interface Puddle {
  s: number;
  lateral: number;
}

export const PUDDLE_HALF_LENGTH = 5;
export const PUDDLE_HALF_WIDTH = 2.4;

/**
 * Fuji puddles, spread around the lap: spaced so each corner section has one, and set close
 * enough to the racing line that they are unavoidable at speed but dodgeable with steering.
 */
export const FUJI_PUDDLES: readonly Puddle[] = [
  { s: 700, lateral: -2.5 },
  { s: 1900, lateral: 2.5 },
  { s: 2450, lateral: -2 },
  { s: 2950, lateral: 3 },
  { s: 3400, lateral: 0 },
  { s: 3950, lateral: -3 },
];

/** An axis-aligned box in track space: along-track half length and lateral half width. */
export interface Box {
  s: number;
  lateral: number;
  halfLength: number;
  halfWidth: number;
}

export const CAR_HALF_LENGTH = 2.2;
export const CAR_HALF_WIDTH = 1.0;
export const BILLBOARD_HALF_LENGTH = 0.6;

export function carBox(s: number, lateral: number): Box {
  return { s, lateral, halfLength: CAR_HALF_LENGTH, halfWidth: CAR_HALF_WIDTH };
}

export function puddleBox(p: Puddle): Box {
  return {
    s: p.s,
    lateral: p.lateral,
    halfLength: PUDDLE_HALF_LENGTH,
    halfWidth: PUDDLE_HALF_WIDTH,
  };
}

/** Collision boxes for the solid roadside signs. */
export function billboardBoxes(items: readonly SceneryItem[]): Box[] {
  return items
    .filter((i) => i.kind === 'billboard')
    .map((i) => ({
      s: i.s,
      lateral: i.lateral,
      halfLength: BILLBOARD_HALF_LENGTH,
      halfWidth: (i.width ?? 8) / 2,
    }));
}

/** Signed along-track distance a - b, taking the shorter way round the lap. */
export function wrapDelta(track: Track, a: number, b: number): number {
  const half = track.length / 2;
  let d = (a - b) % track.length;
  if (d > half) d -= track.length;
  if (d < -half) d += track.length;
  return d;
}

export function boxesOverlap(track: Track, a: Box, b: Box): boolean {
  return (
    Math.abs(wrapDelta(track, a.s, b.s)) < a.halfLength + b.halfLength &&
    Math.abs(a.lateral - b.lateral) < a.halfWidth + b.halfWidth
  );
}

export function anyOverlap(track: Track, box: Box, others: readonly Box[]): boolean {
  return others.some((o) => boxesOverlap(track, box, o));
}
