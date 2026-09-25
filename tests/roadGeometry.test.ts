import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { FUJI } from '../src/sim/tracks/fuji';
import { buildRoadArrays } from '../src/remaster/roadGeometry';

describe('Fuji track data', () => {
  const track = new Track(FUJI);
  const pts = track.buildCenterline(4);
  const end = pts[pts.length - 1];

  it('is 4.36 km long', () => {
    expect(track.length).toBeCloseTo(4360, 2);
  });

  it('closes: heading turns a net 360 degrees and the lap ends where it started', () => {
    expect(end.heading).toBeCloseTo(2 * Math.PI, 2);
    expect(Math.hypot(end.x, end.z)).toBeLessThan(3);
    expect(Math.abs(end.y)).toBeLessThan(0.5);
  });

  it('never runs close to another part of the lap', () => {
    let min = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const along = pts[j].s - pts[i].s;
        if (along < 250 || track.length - along < 250) continue;
        min = Math.min(min, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z));
      }
    }
    expect(min).toBeGreaterThan(120);
  });

  it('has the original six sections in order, with the hairpin turning left', () => {
    const names = FUJI.segments.map((s) => s.name);
    expect(names.slice(0, 6)).toEqual([
      'Main Straight',
      'Sharp Right',
      'Quick Left',
      'Medium Right',
      'Left Hairpin',
      'Long Gradual Right',
    ]);
    expect(FUJI.segments[4].curvature).toBeLessThan(0);
  });
});

describe('buildRoadArrays', () => {
  const pts = new Track({
    name: 'flat',
    roadWidth: 10,
    segments: [{ name: 's', length: 20, curvature: 0, slope: 0 }],
  }).buildCenterline(10);

  it('produces 5 bands of 4 vertices per row', () => {
    const { positions, colors, indices } = buildRoadArrays(pts, 10);
    expect(positions.length).toBe(2 * 5 * 4 * 3);
    expect(colors.length).toBe(positions.length);
    expect(indices.length).toBe(2 * 5 * 6);
  });

  it('places the right kerb at -x when heading +z (driver right)', () => {
    const { positions } = buildRoadArrays(pts, 10);
    const xs = Array.from(positions).filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBeCloseTo(-6.2, 4);
    expect(Math.max(...xs)).toBeCloseTo(6.2, 4);
  });

  it('winds faces upward', () => {
    const { positions, indices } = buildRoadArrays(pts, 10);
    const p = (i: number) => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    const [a, b, c] = [p(indices[0]), p(indices[1]), p(indices[2])];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const ny = u[2] * w[0] - u[0] * w[2];
    expect(ny).toBeGreaterThan(0);
  });
});
