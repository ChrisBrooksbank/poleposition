import { describe, it, expect } from 'vitest';
import { PUDDLES, PUDDLE_WORLD_HALF_WIDTH, PUDDLE_WORLD_HALF_DEPTH } from '../src/track/puddles';
import { TRACK_LENGTH } from '../src/track/fujiSpeedway';
import { ROAD_HALF_WIDTH } from '../src/renderer/RoadRenderer';

describe('PUDDLES', () => {
  it('has at least one puddle defined', () => {
    expect(PUDDLES.length).toBeGreaterThan(0);
  });

  it('all puddle trackZ values are within [0, TRACK_LENGTH)', () => {
    for (const puddle of PUDDLES) {
      expect(puddle.trackZ).toBeGreaterThanOrEqual(0);
      expect(puddle.trackZ).toBeLessThan(TRACK_LENGTH);
    }
  });

  it('all puddle lateral offsets are within the road boundaries', () => {
    for (const puddle of PUDDLES) {
      expect(Math.abs(puddle.lateralOffset)).toBeLessThanOrEqual(ROAD_HALF_WIDTH);
    }
  });

  it('PUDDLE_WORLD_HALF_WIDTH is a positive number', () => {
    expect(PUDDLE_WORLD_HALF_WIDTH).toBeGreaterThan(0);
  });

  it('PUDDLE_WORLD_HALF_DEPTH is a positive number', () => {
    expect(PUDDLE_WORLD_HALF_DEPTH).toBeGreaterThan(0);
  });

  it('all puddles have a numeric trackZ and lateralOffset', () => {
    for (const puddle of PUDDLES) {
      expect(typeof puddle.trackZ).toBe('number');
      expect(typeof puddle.lateralOffset).toBe('number');
    }
  });
});
