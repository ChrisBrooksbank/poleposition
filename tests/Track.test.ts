import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';

const def = {
  name: 'test',
  roadWidth: 12,
  segments: [
    { name: 'straight', length: 100, curvature: 0, slope: 0 },
    { name: 'right', length: 50, curvature: 0.02, slope: 0.01 },
  ],
};

describe('Track', () => {
  it('sums length and wraps distances', () => {
    const t = new Track(def);
    expect(t.length).toBe(150);
    expect(t.wrap(-10)).toBe(140);
    expect(t.wrap(160)).toBe(10);
  });

  it('samples curvature and slope by segment', () => {
    const t = new Track(def);
    expect(t.curvatureAt(50)).toBe(0);
    expect(t.curvatureAt(120)).toBe(0.02);
    expect(t.slopeAt(120)).toBe(0.01);
    expect(t.curvatureAt(270)).toBe(0.02);
  });

  it('integrates a centreline that turns right and climbs', () => {
    const pts = new Track(def).buildCenterline(1);
    const end = pts[pts.length - 1];
    expect(pts[0]).toMatchObject({ s: 0, x: 0, z: 0 });
    expect(pts[100].z).toBeCloseTo(100, 5);
    expect(end.heading).toBeCloseTo(0.02 * 50, 5);
    expect(end.x).toBeLessThan(0);
    expect(end.y).toBeCloseTo(0.5, 5);
  });

  it('rejects empty or zero-length tracks', () => {
    expect(() => new Track({ ...def, segments: [] })).toThrow();
    expect(
      () => new Track({ ...def, segments: [{ name: 'x', length: 0, curvature: 0, slope: 0 }] })
    ).toThrow();
  });
});
