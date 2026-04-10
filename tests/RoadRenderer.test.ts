import { describe, it, expect } from 'vitest';
import {
  RoadRenderer,
  HORIZON_Y,
  CAMERA_DEPTH,
  ROAD_HALF_WIDTH,
  SEGMENT_LENGTH,
  RUMBLE_WIDTH,
  GRASS_COLORS,
  ROAD_COLORS,
  RUMBLE_COLORS,
  segmentIndex,
} from '../src/renderer/RoadRenderer';

const WIDTH = 256;
const HEIGHT = 224;

describe('RoadRenderer', () => {
  const renderer = new RoadRenderer(WIDTH, HEIGHT);

  describe('constructor defaults', () => {
    it('stores the supplied width and height', () => {
      expect(renderer.width).toBe(WIDTH);
      expect(renderer.height).toBe(HEIGHT);
    });

    it('uses the exported default constants', () => {
      expect(renderer.horizonY).toBe(HORIZON_Y);
      expect(renderer.cameraDepth).toBe(CAMERA_DEPTH);
      expect(renderer.roadHalfWidth).toBe(ROAD_HALF_WIDTH);
    });
  });

  describe('projectScanline — scale', () => {
    it('returns scale = 0 exactly at the horizon line', () => {
      const strip = renderer.projectScanline(HORIZON_Y);
      expect(strip.scale).toBe(0);
    });

    it('returns scale ≈ 1 at the bottom of the screen', () => {
      // depth = HEIGHT - 1 - HORIZON_Y = 111, maxDepth = HEIGHT - HORIZON_Y = 112
      // scale = 111 / 112 ≈ 0.991
      const strip = renderer.projectScanline(HEIGHT - 1);
      expect(strip.scale).toBeCloseTo(111 / 112, 6);
    });

    it('scale is strictly monotonically increasing from horizon to bottom', () => {
      const ys = [HORIZON_Y + 5, HORIZON_Y + 20, HORIZON_Y + 50, HEIGHT - 20, HEIGHT - 1];
      const scales = ys.map((y) => renderer.projectScanline(y).scale);
      for (let i = 1; i < scales.length; i++) {
        expect(scales[i]).toBeGreaterThan(scales[i - 1]);
      }
    });

    it('satisfies screen_scale = cameraDepth / z_distance at an arbitrary scanline', () => {
      const y = 150;
      const { scale } = renderer.projectScanline(y);

      const depth = y - HORIZON_Y;
      const maxDepth = HEIGHT - HORIZON_Y;
      const z = (CAMERA_DEPTH * maxDepth) / depth;
      const expected = CAMERA_DEPTH / z;

      expect(scale).toBeCloseTo(expected, 10);
    });

    it('scale equals depth/maxDepth (simplified form of the projection formula)', () => {
      const testYs = [120, 140, 160, 180, 200, 220];
      const maxDepth = HEIGHT - HORIZON_Y;
      for (const y of testYs) {
        const { scale } = renderer.projectScanline(y);
        expect(scale).toBeCloseTo((y - HORIZON_Y) / maxDepth, 10);
      }
    });
  });

  describe('projectScanline — road width', () => {
    it('road width increases toward the bottom of the screen (narrowing toward horizon)', () => {
      const near = renderer.projectScanline(HEIGHT - 1);
      const far = renderer.projectScanline(HORIZON_Y + 10);
      const nearWidth = near.roadRight - near.roadLeft;
      const farWidth = far.roadRight - far.roadLeft;
      expect(nearWidth).toBeGreaterThan(farWidth);
    });

    it('road width = 2 * roadHalfWidth * scale at every scanline', () => {
      const testYs = [130, 150, 175, 200];
      for (const y of testYs) {
        const strip = renderer.projectScanline(y);
        const width = strip.roadRight - strip.roadLeft;
        expect(width).toBeCloseTo(2 * ROAD_HALF_WIDTH * strip.scale, 6);
      }
    });

    it('road width is 0 at the horizon', () => {
      const { roadLeft, roadRight } = renderer.projectScanline(HORIZON_Y);
      expect(roadRight - roadLeft).toBe(0);
    });
  });

  describe('projectScanline — lateral centering', () => {
    it('road is centred on the screen when cameraX = 0', () => {
      const testYs = [130, 160, 190, HEIGHT - 1];
      for (const y of testYs) {
        const { roadLeft, roadRight } = renderer.projectScanline(y, 0);
        const centre = (roadLeft + roadRight) / 2;
        expect(centre).toBeCloseTo(WIDTH / 2, 6);
      }
    });

    it('positive cameraX shifts road centre to the right', () => {
      const y = 180;
      const baseline = renderer.projectScanline(y, 0);
      const shifted = renderer.projectScanline(y, 100);
      const baseCentre = (baseline.roadLeft + baseline.roadRight) / 2;
      const shiftedCentre = (shifted.roadLeft + shifted.roadRight) / 2;
      expect(shiftedCentre).toBeGreaterThan(baseCentre);
    });

    it('lateral shift diminishes toward the horizon (proportional to scale)', () => {
      const cameraX = 100;
      const near = renderer.projectScanline(HEIGHT - 10, cameraX);
      const far = renderer.projectScanline(HORIZON_Y + 5, cameraX);

      const nearShift = Math.abs((near.roadLeft + near.roadRight) / 2 - WIDTH / 2);
      const farShift = Math.abs((far.roadLeft + far.roadRight) / 2 - WIDTH / 2);

      expect(nearShift).toBeGreaterThan(farShift);
    });
  });

  describe('projectScanline — returned screenY', () => {
    it('echoes the supplied screenY back in the result', () => {
      expect(renderer.projectScanline(130).screenY).toBe(130);
      expect(renderer.projectScanline(200).screenY).toBe(200);
    });
  });

  describe('custom constructor parameters', () => {
    it('allows a custom horizonY', () => {
      const r = new RoadRenderer(WIDTH, HEIGHT, 100);
      expect(r.projectScanline(100).scale).toBe(0);
    });

    it('allows a custom roadHalfWidth', () => {
      const r = new RoadRenderer(WIDTH, HEIGHT, HORIZON_Y, CAMERA_DEPTH, 50);
      const strip = r.projectScanline(HEIGHT - 1);
      const w = strip.roadRight - strip.roadLeft;
      expect(w).toBeCloseTo(2 * 50 * strip.scale, 6);
    });
  });
});

describe('surface detail constants', () => {
  it('SEGMENT_LENGTH is a positive number', () => {
    expect(SEGMENT_LENGTH).toBeGreaterThan(0);
    expect(typeof SEGMENT_LENGTH).toBe('number');
  });

  it('RUMBLE_WIDTH is a positive integer', () => {
    expect(RUMBLE_WIDTH).toBeGreaterThan(0);
    expect(Number.isInteger(RUMBLE_WIDTH)).toBe(true);
  });

  it('GRASS_COLORS contains exactly two distinct colour strings', () => {
    expect(GRASS_COLORS).toHaveLength(2);
    expect(typeof GRASS_COLORS[0]).toBe('string');
    expect(typeof GRASS_COLORS[1]).toBe('string');
    expect(GRASS_COLORS[0]).not.toBe(GRASS_COLORS[1]);
  });

  it('ROAD_COLORS contains exactly two distinct colour strings', () => {
    expect(ROAD_COLORS).toHaveLength(2);
    expect(typeof ROAD_COLORS[0]).toBe('string');
    expect(typeof ROAD_COLORS[1]).toBe('string');
    expect(ROAD_COLORS[0]).not.toBe(ROAD_COLORS[1]);
  });

  it('RUMBLE_COLORS contains exactly two distinct colour strings', () => {
    expect(RUMBLE_COLORS).toHaveLength(2);
    expect(typeof RUMBLE_COLORS[0]).toBe('string');
    expect(typeof RUMBLE_COLORS[1]).toBe('string');
    expect(RUMBLE_COLORS[0]).not.toBe(RUMBLE_COLORS[1]);
  });
});

describe('segmentIndex', () => {
  it('returns 0 or 1', () => {
    const results = [0, 0.1, 0.5, 1.0, 1.5, 2.0, 3.7].map((z) => segmentIndex(z));
    for (const r of results) {
      expect(r === 0 || r === 1).toBe(true);
    }
  });

  it('returns 0 for Infinity (horizon)', () => {
    expect(segmentIndex(Infinity)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(segmentIndex(NaN)).toBe(0);
  });

  it('alternates at segment boundaries', () => {
    const seg0 = segmentIndex(0);
    const seg1 = segmentIndex(SEGMENT_LENGTH * 1.5);
    const seg2 = segmentIndex(SEGMENT_LENGTH * 2.5);
    expect(seg1).not.toBe(seg0);
    expect(seg2).toBe(seg0);
  });

  it('is consistent: same worldZ always gives same result', () => {
    expect(segmentIndex(0.7)).toBe(segmentIndex(0.7));
    expect(segmentIndex(1.4)).toBe(segmentIndex(1.4));
  });

  it('accepts a custom segmentLength', () => {
    // With segmentLength=1.0, worldZ=0.5 → index 0; worldZ=1.5 → index 1
    expect(segmentIndex(0.5, 1.0)).toBe(0);
    expect(segmentIndex(1.5, 1.0)).toBe(1);
    expect(segmentIndex(2.5, 1.0)).toBe(0);
  });
});
