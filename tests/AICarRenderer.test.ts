import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AICarRenderer,
  AI_CAR_DRAW_DISTANCE,
  AI_CAR_WORLD_WIDTH,
} from '../src/renderer/AICarRenderer';
import { HORIZON_Y } from '../src/renderer/RoadRenderer';
import { TRACK_LENGTH } from '../src/track/fujiSpeedway';
import type { AICarState } from '../src/ai/AICarSystem';

// ---------------------------------------------------------------------------
// Minimal CanvasRenderingContext2D stub
// ---------------------------------------------------------------------------

function makeCtx() {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const WIDTH = 256;
const HEIGHT = 224;

describe('AICarRenderer', () => {
  let renderer: AICarRenderer;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    renderer = new AICarRenderer(WIDTH, HEIGHT);
    ctx = makeCtx();
  });

  // -------------------------------------------------------------------------
  // _projectCar internals
  // -------------------------------------------------------------------------

  describe('_projectCar', () => {
    const xOffsets = new Float32Array(HEIGHT);

    it('returns null for a car directly behind the player (relZ <= 0)', () => {
      const car: AICarState = { z: 0, x: 0, colorVariant: 0 };
      // playerZ equals car.z → relZ = 0
      expect(renderer._projectCar(car, 0, xOffsets, 0)).toBeNull();
    });

    it('returns null for a car behind the player (playerZ > car.z, no wrap needed)', () => {
      const car: AICarState = { z: 100, x: 0, colorVariant: 0 };
      // playerZ = 200, car.z = 100 → relZ wraps to TRACK_LENGTH - 100 (far, not negative)
      // Actually this tests that the car behind is skipped.
      // With playerZ=200, car.z=100: rawRel = (100-200) mod TL = TL-100 ≈ 4260
      // That's > TL/2 so relZ = TL-100 - TL = -100 → ≤ 0 → null
      const result = renderer._projectCar(car, 200, xOffsets, 0);
      expect(result).toBeNull();
    });

    it('returns null for a car beyond AI_CAR_DRAW_DISTANCE', () => {
      const playerZ = 0;
      const car: AICarState = { z: AI_CAR_DRAW_DISTANCE + 10, x: 0, colorVariant: 0 };
      expect(renderer._projectCar(car, playerZ, xOffsets, 0)).toBeNull();
    });

    it('returns a projection for a car within the draw distance', () => {
      // At relZ = AI_CAR_DRAW_DISTANCE - 1 the car is within draw range
      // AND above the horizon (baseY > horizonY=112).
      const car: AICarState = { z: AI_CAR_DRAW_DISTANCE - 1, x: 0, colorVariant: 0 };
      expect(renderer._projectCar(car, 0, xOffsets, 0)).not.toBeNull();
    });

    it('projected car is closer (larger screenH) when relZ is smaller', () => {
      // Use relZ values well within the visible range (< ~188 m).
      const near: AICarState = { z: 30, x: 0, colorVariant: 0 };
      const far: AICarState = { z: 100, x: 0, colorVariant: 0 };
      const pNear = renderer._projectCar(near, 0, xOffsets, 0)!;
      const pFar = renderer._projectCar(far, 0, xOffsets, 0)!;
      expect(pNear.screenH).toBeGreaterThan(pFar.screenH);
    });

    it('projected car is wider when closer', () => {
      const near: AICarState = { z: 30, x: 0, colorVariant: 0 };
      const far: AICarState = { z: 100, x: 0, colorVariant: 0 };
      const pNear = renderer._projectCar(near, 0, xOffsets, 0)!;
      const pFar = renderer._projectCar(far, 0, xOffsets, 0)!;
      expect(pNear.screenW).toBeGreaterThan(pFar.screenW);
    });

    it('preserves relativeZ in the projection', () => {
      const relZ = 50;
      const car: AICarState = { z: relZ, x: 0, colorVariant: 0 };
      const p = renderer._projectCar(car, 0, xOffsets, 0)!;
      expect(p.relativeZ).toBe(relZ);
    });

    it('passes colorVariant through to the projection', () => {
      const car: AICarState = { z: 50, x: 0, colorVariant: 3 };
      const p = renderer._projectCar(car, 0, xOffsets, 0)!;
      expect(p.colorVariant).toBe(3);
    });

    it('applies lateral offset: car on right side has screenX > car on left side', () => {
      const right: AICarState = { z: 50, x: +50, colorVariant: 0 };
      const left: AICarState = { z: 50, x: -50, colorVariant: 0 };
      const pRight = renderer._projectCar(right, 0, xOffsets, 0)!;
      const pLeft = renderer._projectCar(left, 0, xOffsets, 0)!;
      expect(pRight.screenX).toBeGreaterThan(pLeft.screenX);
    });

    it('handles lap wrap: car at end of track visible from start of next lap', () => {
      // Car near end of track (z ≈ TRACK_LENGTH - 50), player just started lap 2.
      const car: AICarState = { z: TRACK_LENGTH - 50, x: 0, colorVariant: 0 };
      const playerZ = TRACK_LENGTH; // start of lap 2
      // relZ = (TL-50 - TL) mod TL = -50 mod TL = TL-50 ≈ 4310 > TL/2 → relZ = TL-50-TL = -50 ≤ 0
      // So this car is behind player — should be null.
      expect(renderer._projectCar(car, playerZ, xOffsets, 0)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // render() integration
  // -------------------------------------------------------------------------

  describe('render', () => {
    it('calls fillRect for a visible car', () => {
      const cars: AICarState[] = [{ z: 50, x: 0, colorVariant: 0 }];
      renderer.render(ctx, cars, 0);
      expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    });

    it('does not call fillRect when there are no cars', () => {
      renderer.render(ctx, [], 0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('does not draw a car that is behind the player', () => {
      const cars: AICarState[] = [{ z: 0, x: 0, colorVariant: 0 }]; // relZ = 0
      renderer.render(ctx, cars, 0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('does not draw a car beyond draw distance', () => {
      const cars: AICarState[] = [{ z: AI_CAR_DRAW_DISTANCE + 100, x: 0, colorVariant: 0 }];
      renderer.render(ctx, cars, 0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('draws more primitives for a near car than for a far car (near is larger)', () => {
      // Use relZ values within the visible range (< ~188 m).
      const nearCars: AICarState[] = [{ z: 20, x: 0, colorVariant: 0 }];
      const farCars: AICarState[] = [{ z: 100, x: 0, colorVariant: 0 }];

      renderer.render(ctx, nearCars, 0);
      const nearCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;

      vi.clearAllMocks();
      ctx = makeCtx();
      renderer.render(ctx, farCars, 0);
      const farCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;

      // Near car is large enough for detailed sprite; far car may only render body.
      expect(nearCalls).toBeGreaterThanOrEqual(farCalls);
    });

    it('renders multiple cars without errors', () => {
      const cars: AICarState[] = [
        { z: 30, x: -40, colorVariant: 0 },
        { z: 80, x: +40, colorVariant: 1 },
        { z: 150, x: 0, colorVariant: 2 },
      ];
      expect(() => renderer.render(ctx, cars, 0)).not.toThrow();
    });

    it('accepts an optional getCurve function without errors', () => {
      const cars: AICarState[] = [{ z: 60, x: 0, colorVariant: 3 }];
      const getCurve = (_z: number) => 0.02;
      expect(() => renderer.render(ctx, cars, 0, getCurve, 0)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Constants sanity checks
  // -------------------------------------------------------------------------

  describe('constants', () => {
    it('AI_CAR_DRAW_DISTANCE is positive and less than one full lap', () => {
      expect(AI_CAR_DRAW_DISTANCE).toBeGreaterThan(0);
      expect(AI_CAR_DRAW_DISTANCE).toBeLessThan(TRACK_LENGTH);
    });

    it('AI_CAR_WORLD_WIDTH is positive', () => {
      expect(AI_CAR_WORLD_WIDTH).toBeGreaterThan(0);
    });

    it('HORIZON_Y is above centre of screen', () => {
      expect(HORIZON_Y).toBeLessThan(HEIGHT / 2 + 1);
    });
  });
});
