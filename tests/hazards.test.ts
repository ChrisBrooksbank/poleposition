import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { FUJI } from '../src/sim/tracks/fuji';
import { buildSceneryLayout } from '../src/sim/scenery';
import {
  FUJI_PUDDLES,
  PUDDLE_HALF_WIDTH,
  billboardBoxes,
  boxesOverlap,
  anyOverlap,
  carBox,
  puddleBox,
  wrapDelta,
} from '../src/sim/hazards';

const track = new Track(FUJI);

describe('hazards', () => {
  it('keeps every puddle on the tarmac and inside the lap', () => {
    for (const p of FUJI_PUDDLES) {
      expect(p.s).toBeGreaterThan(0);
      expect(p.s).toBeLessThan(track.length);
      expect(Math.abs(p.lateral) + PUDDLE_HALF_WIDTH).toBeLessThan(FUJI.roadWidth / 2 + 1);
    }
  });

  it('wraps along-track deltas the short way round', () => {
    expect(wrapDelta(track, 10, track.length - 10)).toBeCloseTo(20, 5);
    expect(wrapDelta(track, track.length - 10, 10)).toBeCloseTo(-20, 5);
    expect(wrapDelta(track, 100, 50)).toBe(50);
  });

  it('detects overlaps across the lap seam', () => {
    expect(boxesOverlap(track, carBox(track.length - 1, 0), carBox(1, 0.5))).toBe(true);
    expect(boxesOverlap(track, carBox(100, 0), carBox(110, 0))).toBe(false);
    expect(boxesOverlap(track, carBox(100, 0), carBox(101, 5))).toBe(false);
  });

  it('crashes into billboards only when off the road edge, not on the racing line', () => {
    const boards = billboardBoxes(buildSceneryLayout(track));
    expect(boards.length).toBeGreaterThan(30);
    const b = boards[0];
    expect(anyOverlap(track, carBox(b.s, 0), boards)).toBe(false);
    expect(anyOverlap(track, carBox(b.s, b.lateral), boards)).toBe(true);
  });

  it('hits a puddle when driving through it', () => {
    const p = FUJI_PUDDLES[0];
    expect(boxesOverlap(track, carBox(p.s, p.lateral), puddleBox(p))).toBe(true);
    expect(boxesOverlap(track, carBox(p.s + 50, p.lateral), puddleBox(p))).toBe(false);
  });
});
