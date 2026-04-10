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
  CHECKER_COLORS,
  CHECKER_ZONE_LENGTH,
  CHECKER_COLS,
  HILL_SKY_COLOR,
  segmentIndex,
  computeCurveOffsets,
  computeHillOffsets,
  isInCheckerZone,
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

describe('computeCurveOffsets', () => {
  const HEIGHT = 224;
  const horizonY = HORIZON_Y; // 112

  it('returns all-zero offsets when getCurve always returns 0', () => {
    const offsets = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0);
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsets[y]).toBe(0);
    }
  });

  it('entries at or above the horizon are always zero', () => {
    const offsets = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 1);
    for (let y = 0; y <= horizonY; y++) {
      expect(offsets[y]).toBe(0);
    }
  });

  it('returns a Float32Array of length equal to height', () => {
    const offsets = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 1);
    expect(offsets).toBeInstanceOf(Float32Array);
    expect(offsets.length).toBe(HEIGHT);
  });

  it('positive curve: far strips (near horizon) have larger offset than near strips (bottom)', () => {
    const offsets = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    const nearOffset = offsets[HEIGHT - 1]; // closest scanline
    const farOffset = offsets[horizonY + 1]; // farthest visible scanline
    expect(farOffset).toBeGreaterThan(nearOffset);
  });

  it('positive curve produces positive offsets throughout the road area', () => {
    const offsets = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    expect(offsets[HEIGHT - 1]).toBeGreaterThan(0);
    expect(offsets[horizonY + 1]).toBeGreaterThan(0);
  });

  it('negative curve produces negative offsets (left curve)', () => {
    const offsets = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => -0.01);
    expect(offsets[horizonY + 1]).toBeLessThan(0);
    expect(offsets[HEIGHT - 1]).toBeLessThan(0);
  });

  it('offsets are monotonically increasing in magnitude from bottom to horizon for constant curve', () => {
    const offsets = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    // Sample a few scanlines; each should have a smaller offset than the one above it.
    const ys = [HEIGHT - 2, HEIGHT - 20, HEIGHT - 50, horizonY + 20, horizonY + 2];
    for (let i = 1; i < ys.length; i++) {
      // ys[i] is higher (farther) than ys[i-1], so offset should be larger
      expect(offsets[ys[i]]).toBeGreaterThan(offsets[ys[i - 1]]);
    }
  });

  it('playerZ shifts which segment curve values are sampled', () => {
    // Curve function returns +1 for worldZ < threshold, 0 otherwise.
    const threshold = 5;
    const curve = (wz: number) => (wz < threshold ? 1 : 0);
    const offsetsAt0 = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, curve);
    // With playerZ = 100, all worldZ + 100 > threshold → curve = 0 everywhere
    const offsetsAt100 = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 100, curve);
    // At playerZ=100, curve is always 0, so offsets should be all zero
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsetsAt100[y]).toBe(0);
    }
    // At playerZ=0, near strips (small worldZ < 5) should contribute
    expect(offsetsAt0[HEIGHT - 1]).toBeGreaterThan(0);
  });

  it('doubled curve strength doubles the offsets', () => {
    const offsets1 = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    const offsets2 = computeCurveOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.02);
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsets2[y]).toBeCloseTo(offsets1[y] * 2, 5);
    }
  });
});

describe('checker constants', () => {
  it('CHECKER_COLORS contains exactly two distinct colour strings', () => {
    expect(CHECKER_COLORS).toHaveLength(2);
    expect(typeof CHECKER_COLORS[0]).toBe('string');
    expect(typeof CHECKER_COLORS[1]).toBe('string');
    expect(CHECKER_COLORS[0]).not.toBe(CHECKER_COLORS[1]);
  });

  it('CHECKER_ZONE_LENGTH is a positive multiple of SEGMENT_LENGTH', () => {
    expect(CHECKER_ZONE_LENGTH).toBeGreaterThan(0);
    expect(CHECKER_ZONE_LENGTH % SEGMENT_LENGTH).toBeCloseTo(0, 10);
  });

  it('CHECKER_COLS is a positive even integer (so columns pair neatly)', () => {
    expect(CHECKER_COLS).toBeGreaterThan(0);
    expect(Number.isInteger(CHECKER_COLS)).toBe(true);
    expect(CHECKER_COLS % 2).toBe(0);
  });
});

describe('isInCheckerZone', () => {
  const LAP = 10; // arbitrary lap length for tests

  it('returns false when lapLength <= 0', () => {
    expect(isInCheckerZone(0, 0)).toBe(false);
    expect(isInCheckerZone(0, -1)).toBe(false);
  });

  it('returns true for worldZ = 0 (start of lap)', () => {
    expect(isInCheckerZone(0, LAP)).toBe(true);
  });

  it('returns true for worldZ just inside the zone', () => {
    expect(isInCheckerZone(CHECKER_ZONE_LENGTH - 0.001, LAP)).toBe(true);
  });

  it('returns false for worldZ at the zone boundary', () => {
    expect(isInCheckerZone(CHECKER_ZONE_LENGTH, LAP)).toBe(false);
  });

  it('returns false for worldZ well past the zone', () => {
    expect(isInCheckerZone(CHECKER_ZONE_LENGTH + 0.1, LAP)).toBe(false);
  });

  it('returns true for worldZ at the start of a subsequent lap', () => {
    // worldZ = LAP (exactly one lap ahead) should wrap to 0 and be in zone.
    expect(isInCheckerZone(LAP, LAP)).toBe(true);
  });

  it('returns true for worldZ just before the lap boundary (wraps correctly)', () => {
    // LAP * 2 is also a lap boundary
    expect(isInCheckerZone(LAP * 2 + CHECKER_ZONE_LENGTH * 0.5, LAP)).toBe(true);
  });

  it('returns false for negative worldZ outside the zone', () => {
    // -CHECKER_ZONE_LENGTH wraps to LAP - CHECKER_ZONE_LENGTH, which is outside
    expect(isInCheckerZone(-CHECKER_ZONE_LENGTH, LAP)).toBe(false);
  });

  it('returns true for small negative worldZ (wraps near lap end → within zone on next lap)', () => {
    // worldZ = -0.001 wraps to LAP - 0.001, which is NOT in the zone [0, CHECKER_ZONE_LENGTH)
    expect(isInCheckerZone(-0.001, LAP)).toBe(false);
  });
});

describe('HILL_SKY_COLOR', () => {
  it('is a non-empty CSS colour string', () => {
    expect(typeof HILL_SKY_COLOR).toBe('string');
    expect(HILL_SKY_COLOR.length).toBeGreaterThan(0);
  });
});

describe('computeHillOffsets', () => {
  const HEIGHT = 224;
  const horizonY = HORIZON_Y; // 112

  it('returns a Float32Array of length equal to height', () => {
    const offsets = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0);
    expect(offsets).toBeInstanceOf(Float32Array);
    expect(offsets.length).toBe(HEIGHT);
  });

  it('returns all-zero offsets when getHill always returns 0', () => {
    const offsets = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0);
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsets[y]).toBeCloseTo(0, 10);
    }
  });

  it('entries at or above the horizon are always zero', () => {
    const offsets = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    for (let y = 0; y <= horizonY; y++) {
      expect(offsets[y]).toBe(0);
    }
  });

  it('positive hill: far strips (near horizon) have larger negative offset than near strips', () => {
    const offsets = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    // Far strips (small y, near horizon) should have larger magnitude negative offset
    const nearOffset = offsets[HEIGHT - 1]; // closest scanline — small H accumulated
    const farOffset = offsets[horizonY + 1]; // farthest — large H accumulated
    expect(farOffset).toBeLessThan(nearOffset); // farther = more negative
  });

  it('positive hill produces negative offsets (strips shift toward horizon)', () => {
    const offsets = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    // All offsets in the road area should be ≤ 0 (uphill shifts strips upward on screen)
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsets[y]).toBeLessThanOrEqual(0);
    }
  });

  it('negative hill produces non-negative offsets (strips shift away from horizon)', () => {
    const offsets = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => -0.01);
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsets[y]).toBeGreaterThanOrEqual(0);
    }
  });

  it('doubled hill strength doubles the offsets', () => {
    const offsets1 = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.01);
    const offsets2 = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.02);
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsets2[y]).toBeCloseTo(offsets1[y] * 2, 5);
    }
  });

  it('a large uphill gradient causes the farthest strip to shift above the horizon', () => {
    // With large enough hill, the farthest strip (y = horizonY + 1) should have
    // effectiveY = y + offset < horizonY (i.e. offset < -(y - horizonY) = -1)
    const offsets = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, () => 0.1);
    const farthestY = horizonY + 1;
    const effectiveY = farthestY + offsets[farthestY];
    expect(effectiveY).toBeLessThan(horizonY);
  });

  it('playerZ shifts which segment hill values are sampled', () => {
    // Hill returns 1 for worldZ < 5, 0 otherwise
    const threshold = 5;
    const hill = (wz: number) => (wz < threshold ? 1 : 0);
    // At playerZ=100, all worldZ + 100 > threshold → hill = 0 everywhere → all zero
    const offsetsAt100 = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 100, hill);
    for (let y = horizonY + 1; y < HEIGHT; y++) {
      expect(offsetsAt100[y]).toBeCloseTo(0, 10);
    }
    // At playerZ=0, near strips have worldZ < 5 → non-zero offsets
    const offsetsAt0 = computeHillOffsets(HEIGHT, horizonY, CAMERA_DEPTH, 0, hill);
    expect(offsetsAt0[HEIGHT - 1]).toBeLessThan(0); // some accumulation even at near strip
  });
});
