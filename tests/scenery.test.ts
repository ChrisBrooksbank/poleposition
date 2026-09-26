import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { FUJI } from '../src/sim/tracks/fuji';
import {
  buildSceneryLayout,
  groundHeight,
  seededRandom,
  CUSTOM_SIGNS,
  KERB_WIDTH,
  TERRAIN_HALF_WIDTH,
} from '../src/sim/scenery';

const track = new Track(FUJI);
const half = FUJI.roadWidth / 2 + KERB_WIDTH;

describe('scenery layout', () => {
  const items = buildSceneryLayout(track);

  it('is deterministic', () => {
    expect(buildSceneryLayout(track)).toEqual(items);
    const a = seededRandom(5);
    const b = seededRandom(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('keeps every solid object off the road surface', () => {
    for (const it of items) {
      if (it.kind === 'gantry' || it.kind === 'startline') continue;
      expect(Math.abs(it.lateral)).toBeGreaterThan(half);
    }
  });

  it('keeps everything within the terrain ribbon and the lap', () => {
    for (const it of items) {
      expect(Math.abs(it.lateral)).toBeLessThan(TERRAIN_HALF_WIDTH);
      expect(it.s).toBeGreaterThanOrEqual(0);
      expect(it.s).toBeLessThan(track.length);
    }
  });

  it('places billboards on both sides with brands and widths', () => {
    const boards = items.filter((i) => i.kind === 'billboard');
    expect(boards.length).toBeGreaterThan(30);
    expect(boards.some((b) => b.lateral > 0)).toBe(true);
    expect(boards.some((b) => b.lateral < 0)).toBe(true);
    expect(boards.every((b) => b.brand && b.width)).toBe(true);
  });

  it('has one start line and one gantry at the same distance', () => {
    const line = items.filter((i) => i.kind === 'startline');
    const gantry = items.filter((i) => i.kind === 'gantry');
    expect(line).toHaveLength(1);
    expect(gantry).toHaveLength(1);
    expect(gantry[0].s).toBe(line[0].s);
  });
});

describe('groundHeight', () => {
  it('matches the road under and beside it, then falls to the plane at the ribbon edge', () => {
    expect(groundHeight(5, -10, 0, 14)).toBe(5);
    expect(groundHeight(5, -10, half + 3, 14)).toBeCloseTo(4.7, 5);
    expect(groundHeight(5, -10, TERRAIN_HALF_WIDTH, 14)).toBeCloseTo(-10, 5);
    const mid = groundHeight(5, -10, 30, 14);
    expect(mid).toBeLessThan(4.7);
    expect(mid).toBeGreaterThan(-10);
  });
});

describe('custom signs', () => {
  it('places each personal sign once, early on the lap, on every course', () => {
    const boards = buildSceneryLayout(track).filter((i) => i.kind === 'billboard');
    for (const name of CUSTOM_SIGNS) {
      const matches = boards.filter((b) => b.brand === name);
      expect(matches).toHaveLength(1);
      expect(matches[0].s).toBeLessThan(1200);
    }
  });
});
