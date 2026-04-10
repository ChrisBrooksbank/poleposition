import { describe, it, expect, vi } from 'vitest';
import {
  PlayerCarRenderer,
  CAR_BOTTOM_Y,
  CAR_WIDTH,
  CAR_HEIGHT,
  type SteerState,
} from '../src/renderer/PlayerCarRenderer';

const LOGICAL_WIDTH = 256;
const LOGICAL_HEIGHT = 224;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCtx() {
  return {
    fillStyle: '',
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('PlayerCarRenderer — constants', () => {
  it('CAR_BOTTOM_Y is near the bottom of the screen', () => {
    expect(CAR_BOTTOM_Y).toBeGreaterThan(LOGICAL_HEIGHT / 2);
    expect(CAR_BOTTOM_Y).toBeLessThanOrEqual(LOGICAL_HEIGHT);
  });

  it('CAR_WIDTH is a positive integer', () => {
    expect(CAR_WIDTH).toBeGreaterThan(0);
    expect(Number.isInteger(CAR_WIDTH)).toBe(true);
  });

  it('CAR_HEIGHT is a positive integer', () => {
    expect(CAR_HEIGHT).toBeGreaterThan(0);
    expect(Number.isInteger(CAR_HEIGHT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('PlayerCarRenderer — constructor', () => {
  it('stores width and height with defaults', () => {
    const r = new PlayerCarRenderer();
    expect(r.width).toBe(LOGICAL_WIDTH);
    expect(r.height).toBe(LOGICAL_HEIGHT);
  });

  it('stores custom width and height', () => {
    const r = new PlayerCarRenderer(320, 240);
    expect(r.width).toBe(320);
    expect(r.height).toBe(240);
  });
});

// ---------------------------------------------------------------------------
// steerState static helper
// ---------------------------------------------------------------------------

describe('PlayerCarRenderer.steerState', () => {
  it('returns "left" when only left is pressed', () => {
    expect(PlayerCarRenderer.steerState(true, false)).toBe('left');
  });

  it('returns "right" when only right is pressed', () => {
    expect(PlayerCarRenderer.steerState(false, true)).toBe('right');
  });

  it('returns "straight" when neither key is pressed', () => {
    expect(PlayerCarRenderer.steerState(false, false)).toBe('straight');
  });

  it('returns "straight" when both keys are pressed simultaneously', () => {
    expect(PlayerCarRenderer.steerState(true, true)).toBe('straight');
  });
});

// ---------------------------------------------------------------------------
// render — smoke tests via mock canvas
// ---------------------------------------------------------------------------

describe('PlayerCarRenderer.render — smoke tests', () => {
  const renderer = new PlayerCarRenderer();

  const states: SteerState[] = ['straight', 'left', 'right'];

  for (const steer of states) {
    it(`renders "${steer}" without throwing`, () => {
      const ctx = makeMockCtx();
      expect(() => renderer.render(ctx, 0, steer)).not.toThrow();
    });

    it(`calls fillRect at least once for "${steer}"`, () => {
      const ctx = makeMockCtx();
      renderer.render(ctx, 0, steer);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it(`wraps render in save/restore for "${steer}"`, () => {
      const ctx = makeMockCtx();
      renderer.render(ctx, 0, steer);
      expect(ctx.save).toHaveBeenCalledOnce();
      expect(ctx.restore).toHaveBeenCalledOnce();
    });
  }

  it('shifts car right when playerX is positive', () => {
    const ctxCentre = makeMockCtx();
    const ctxRight = makeMockCtx();
    renderer.render(ctxCentre, 0, 'straight');
    renderer.render(ctxRight, 50, 'straight');

    // The first fillRect argument (x) for the main body should be 50px further right.
    const centreX = (ctxCentre.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as number;
    const rightX = (ctxRight.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as number;
    expect(rightX).toBeGreaterThan(centreX);
  });

  it('shifts car left when playerX is negative', () => {
    const ctxCentre = makeMockCtx();
    const ctxLeft = makeMockCtx();
    renderer.render(ctxCentre, 0, 'straight');
    renderer.render(ctxLeft, -50, 'straight');

    const centreX = (ctxCentre.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as number;
    const leftX = (ctxLeft.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as number;
    expect(leftX).toBeLessThan(centreX);
  });

  it('all fillRect calls use negative or zero relative Y (car drawn above bottom)', () => {
    const ctx = makeMockCtx();
    renderer.render(ctx, 0, 'straight');
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls as number[][];
    // Each call: [x, y, w, h]. The y + h should be <= CAR_BOTTOM_Y
    for (const [, y, , h] of calls) {
      expect(y + h).toBeLessThanOrEqual(CAR_BOTTOM_Y + 1); // +1 for rounding
    }
  });
});
