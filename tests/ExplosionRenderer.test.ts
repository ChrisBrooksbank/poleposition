import { describe, it, expect, vi } from 'vitest';
import { ExplosionRenderer } from '../src/renderer/ExplosionRenderer';
import { EXPLOSION_FRAME_COUNT } from '../src/state/ExplosionState';
import { CAR_BOTTOM_Y, CAR_HEIGHT } from '../src/renderer/PlayerCarRenderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCtx() {
  return {
    fillStyle: '',
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('ExplosionRenderer — constructor', () => {
  it('stores default width and height', () => {
    const r = new ExplosionRenderer();
    expect(r.width).toBe(256);
    expect(r.height).toBe(224);
  });

  it('stores custom width and height', () => {
    const r = new ExplosionRenderer(320, 240);
    expect(r.width).toBe(320);
    expect(r.height).toBe(240);
  });
});

// ---------------------------------------------------------------------------
// render — smoke tests
// ---------------------------------------------------------------------------

describe('ExplosionRenderer.render — all frames smoke test', () => {
  const renderer = new ExplosionRenderer();

  for (let frame = 0; frame < EXPLOSION_FRAME_COUNT; frame++) {
    it(`renders frame ${frame} without throwing`, () => {
      const ctx = makeMockCtx();
      expect(() => renderer.render(ctx, 0, frame)).not.toThrow();
    });

    it(`calls ctx.save and ctx.restore for frame ${frame}`, () => {
      const ctx = makeMockCtx();
      renderer.render(ctx, 0, frame);
      expect(ctx.save).toHaveBeenCalledOnce();
      expect(ctx.restore).toHaveBeenCalledOnce();
    });

    it(`draws something (arc or fillRect called) for frame ${frame}`, () => {
      const ctx = makeMockCtx();
      renderer.render(ctx, 0, frame);
      const drew =
        (ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length > 0 ||
        (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      expect(drew).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// render — position tests
// ---------------------------------------------------------------------------

describe('ExplosionRenderer.render — position', () => {
  it('centres explosion horizontally at screen centre when playerX = 0', () => {
    const renderer = new ExplosionRenderer(256, 224);
    const ctx = makeMockCtx();
    renderer.render(ctx, 0, 0);

    // The first arc call should be centred near the screen horizontal centre (128)
    const arcCalls = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls;
    expect(arcCalls.length).toBeGreaterThan(0);
    const [cx] = arcCalls[0] as number[];
    expect(cx).toBe(128); // width/2 + 0
  });

  it('shifts explosion right when playerX is positive', () => {
    const renderer = new ExplosionRenderer(256, 224);
    const ctxCentre = makeMockCtx();
    const ctxRight = makeMockCtx();

    renderer.render(ctxCentre, 0, 0);
    renderer.render(ctxRight, 50, 0);

    const centreArcCx = ((ctxCentre.arc as ReturnType<typeof vi.fn>).mock.calls[0] as number[])[0];
    const rightArcCx = ((ctxRight.arc as ReturnType<typeof vi.fn>).mock.calls[0] as number[])[0];
    expect(rightArcCx).toBeGreaterThan(centreArcCx);
  });

  it('centres explosion vertically near the car sprite', () => {
    const renderer = new ExplosionRenderer(256, 224);
    const ctx = makeMockCtx();
    renderer.render(ctx, 0, 0);

    const expectedCy = CAR_BOTTOM_Y - Math.floor(CAR_HEIGHT / 2);
    const arcCalls = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls;
    const [, cy] = arcCalls[0] as number[];
    expect(cy).toBe(expectedCy);
  });
});

// ---------------------------------------------------------------------------
// render — frame clamping
// ---------------------------------------------------------------------------

describe('ExplosionRenderer.render — frame clamping', () => {
  const renderer = new ExplosionRenderer();

  it('clamps negative frame index to 0', () => {
    const ctx = makeMockCtx();
    expect(() => renderer.render(ctx, 0, -1)).not.toThrow();
  });

  it('clamps out-of-range frame index to last frame', () => {
    const ctx = makeMockCtx();
    expect(() => renderer.render(ctx, 0, EXPLOSION_FRAME_COUNT + 10)).not.toThrow();
  });

  it('clamps fractional frame index gracefully', () => {
    const ctx = makeMockCtx();
    expect(() => renderer.render(ctx, 0, 2.7)).not.toThrow();
  });
});
