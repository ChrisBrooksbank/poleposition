// builder - turns a list of sections (length, turn angle) into a closed TrackDef.
// Layouts are solved offline so the centreline returns to its start; here the first section
// (the start/finish straight) takes whatever slope cancels the others' climbs, so the lap also
// ends at the height it started.

import type { TrackDef, TrackSegment } from '../Track';

const DEG = Math.PI / 180;

/** [name, length in metres, total turn in degrees (+ right), slope (rise over run)]. */
export type Section = readonly [name: string, length: number, turnDeg: number, slope?: number];

export function buildClosedTrack(
  name: string,
  roadWidth: number,
  sections: readonly Section[]
): TrackDef {
  const [first, ...rest] = sections;
  const climb = rest.reduce((sum, s) => sum + s[1] * (s[3] ?? 0), 0);
  const segments: TrackSegment[] = [
    {
      name: first[0],
      length: first[1],
      curvature: (first[2] * DEG) / first[1],
      slope: -climb / first[1],
    },
    ...rest.map(([n, length, turn, slope = 0]) => ({
      name: n,
      length,
      curvature: (turn * DEG) / length,
      slope,
    })),
  ];
  return { name, roadWidth, closed: true, segments };
}
