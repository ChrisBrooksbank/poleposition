import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { buildTerrainArrays } from '../src/remaster/terrainGeometry';
import { TERRAIN_HALF_WIDTH } from '../src/sim/scenery';

const pts = new Track({
  name: 'flat',
  roadWidth: 10,
  segments: [{ name: 's', length: 20, curvature: 0, slope: 0 }],
}).buildCenterline(10);

describe('buildTerrainArrays', () => {
  const { positions, colors, indices } = buildTerrainArrays(pts, 10, -5);

  it('makes four spans per row', () => {
    expect(positions.length).toBe(2 * 4 * 4 * 3);
    expect(colors.length).toBe(positions.length);
    expect(indices.length).toBe(2 * 4 * 6);
  });

  it('reaches the ribbon half width and drops to the plane at the outer edge', () => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      xs.push(positions[i]);
      ys.push(positions[i + 1]);
    }
    expect(Math.max(...xs)).toBeCloseTo(TERRAIN_HALF_WIDTH, 4);
    expect(Math.min(...ys)).toBeCloseTo(-5, 5);
    expect(Math.max(...ys)).toBeCloseTo(0, 5);
  });

  it('leaves the road surface uncovered', () => {
    for (let i = 0; i < positions.length; i += 3) {
      expect(Math.abs(positions[i])).toBeGreaterThanOrEqual(6.2 - 1e-6);
    }
  });
});
