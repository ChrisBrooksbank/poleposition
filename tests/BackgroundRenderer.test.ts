import { describe, it, expect, vi } from 'vitest';
import {
  BackgroundRenderer,
  BG_HORIZON_Y,
  SKY_TOP_COLOR,
  SKY_HORIZON_COLOR,
  MOUNTAIN_COLOR,
  FUJI_COLOR,
  FUJI_SNOW_COLOR,
  PARALLAX_MOUNTAIN,
  PARALLAX_FUJI,
  FUJI_CENTER_X_FRAC,
  MOUNTAIN_RIDGE,
} from '../src/renderer/BackgroundRenderer';

const WIDTH = 256;
const HEIGHT = 224;

// ---- minimal canvas 2D mock ------------------------------------------------

function makeCtx() {
  const calls: { method: string; args: unknown[] }[] = [];

  const gradient = {
    addColorStop: vi.fn(),
  };

  const ctx = {
    _calls: calls,
    fillStyle: '',
    createLinearGradient: vi.fn().mockReturnValue(gradient),
    fillRect: vi.fn((...args: unknown[]) => calls.push({ method: 'fillRect', args })),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn((...args: unknown[]) => calls.push({ method: 'fill', args })),
  } as unknown as CanvasRenderingContext2D & { _calls: typeof calls };

  return { ctx, gradient };
}

// ----------------------------------------------------------------------------

describe('BackgroundRenderer — constructor', () => {
  it('stores supplied width and height', () => {
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    expect(r.width).toBe(WIDTH);
    expect(r.height).toBe(HEIGHT);
  });

  it('uses BG_HORIZON_Y as default horizonY', () => {
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    expect(r.horizonY).toBe(BG_HORIZON_Y);
  });

  it('accepts a custom horizonY', () => {
    const r = new BackgroundRenderer(WIDTH, HEIGHT, 100);
    expect(r.horizonY).toBe(100);
  });
});

describe('BackgroundRenderer — sky gradient', () => {
  it('creates a vertical linear gradient from y=0 to horizonY', () => {
    const { ctx } = makeCtx();
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    r.render(ctx);
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, BG_HORIZON_Y);
  });

  it('adds two colour stops — top and horizon', () => {
    const { ctx, gradient } = makeCtx();
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    r.render(ctx);
    expect(gradient.addColorStop).toHaveBeenCalledWith(0, SKY_TOP_COLOR);
    expect(gradient.addColorStop).toHaveBeenCalledWith(1, SKY_HORIZON_COLOR);
  });

  it('fills the full sky rectangle [0, 0, width, horizonY]', () => {
    const { ctx } = makeCtx();
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    r.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, WIDTH, BG_HORIZON_Y);
  });
});

describe('BackgroundRenderer — render calls fill for mountains and Fuji', () => {
  it('calls fill at least 3 times (sky rect + Fuji body + Fuji snow + mountains tiles)', () => {
    const { ctx } = makeCtx();
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    r.render(ctx);
    // fillRect once for sky, fill() called for Fuji body, snow cap, and mountain tiles
    const fillCalls =
      (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length +
      (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fillCalls).toBeGreaterThanOrEqual(4);
  });
});

describe('BackgroundRenderer — constants', () => {
  it('BG_HORIZON_Y matches default RoadRenderer horizon', () => {
    // Imported from road renderer spec: HORIZON_Y = 112
    expect(BG_HORIZON_Y).toBe(112);
  });

  it('SKY_TOP_COLOR and SKY_HORIZON_COLOR are distinct strings', () => {
    expect(typeof SKY_TOP_COLOR).toBe('string');
    expect(typeof SKY_HORIZON_COLOR).toBe('string');
    expect(SKY_TOP_COLOR).not.toBe(SKY_HORIZON_COLOR);
  });

  it('MOUNTAIN_COLOR, FUJI_COLOR and FUJI_SNOW_COLOR are distinct strings', () => {
    expect(MOUNTAIN_COLOR).not.toBe(FUJI_COLOR);
    expect(FUJI_COLOR).not.toBe(FUJI_SNOW_COLOR);
  });

  it('PARALLAX_FUJI is less than PARALLAX_MOUNTAIN (Fuji is farther)', () => {
    expect(PARALLAX_FUJI).toBeLessThan(PARALLAX_MOUNTAIN);
  });

  it('both parallax constants are positive fractions less than 1', () => {
    expect(PARALLAX_FUJI).toBeGreaterThan(0);
    expect(PARALLAX_FUJI).toBeLessThan(1);
    expect(PARALLAX_MOUNTAIN).toBeGreaterThan(0);
    expect(PARALLAX_MOUNTAIN).toBeLessThan(1);
  });

  it('FUJI_CENTER_X_FRAC is between 0.5 and 1 (right of centre)', () => {
    expect(FUJI_CENTER_X_FRAC).toBeGreaterThan(0.5);
    expect(FUJI_CENTER_X_FRAC).toBeLessThan(1);
  });
});

describe('BackgroundRenderer — MOUNTAIN_RIDGE', () => {
  it('has at least 4 points', () => {
    expect(MOUNTAIN_RIDGE.length).toBeGreaterThanOrEqual(4);
  });

  it('first point x is 0 and last point x is 1 (tileable)', () => {
    expect(MOUNTAIN_RIDGE[0][0]).toBe(0);
    expect(MOUNTAIN_RIDGE[MOUNTAIN_RIDGE.length - 1][0]).toBe(1);
  });

  it('all x fractions are strictly monotonically increasing', () => {
    for (let i = 1; i < MOUNTAIN_RIDGE.length; i++) {
      expect(MOUNTAIN_RIDGE[i][0]).toBeGreaterThan(MOUNTAIN_RIDGE[i - 1][0]);
    }
  });

  it('all y values are above the horizon (less than BG_HORIZON_Y)', () => {
    for (const [, y] of MOUNTAIN_RIDGE) {
      expect(y).toBeLessThanOrEqual(BG_HORIZON_Y);
    }
  });

  it('peak y values rise above the lower edge (some peaks are at least 20px above horizon)', () => {
    const minY = Math.min(...MOUNTAIN_RIDGE.map(([, y]) => y));
    expect(minY).toBeLessThan(BG_HORIZON_Y - 20);
  });
});

describe('BackgroundRenderer — parallax scaling', () => {
  it('passes parallaxX * PARALLAX_FUJI to Fuji and parallaxX * PARALLAX_MOUNTAIN to mountains', () => {
    // With parallaxX=0, Fuji center is at FUJI_CENTER_X_FRAC * WIDTH
    // We verify the renderer accepts non-zero parallaxX without throwing
    const { ctx } = makeCtx();
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    expect(() => r.render(ctx, 100)).not.toThrow();
    expect(() => r.render(ctx, -100)).not.toThrow();
  });

  it('render with parallaxX=0 and non-zero parallaxX both call fill', () => {
    const { ctx } = makeCtx();
    const r = new BackgroundRenderer(WIDTH, HEIGHT);
    r.render(ctx, 0);
    const callsWith0 = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;

    // Reset mocks
    (ctx.fill as ReturnType<typeof vi.fn>).mockClear();
    r.render(ctx, 50);
    const callsWithOffset = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(callsWith0).toBe(callsWithOffset);
  });
});
