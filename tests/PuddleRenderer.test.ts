import { describe, it, expect, vi } from 'vitest';
import { PuddleRenderer, PUDDLE_DRAW_DISTANCE } from '../src/renderer/PuddleRenderer';
import { HORIZON_Y, CAMERA_DEPTH, ROAD_HALF_WIDTH } from '../src/renderer/RoadRenderer';

// Minimal canvas mock used by other renderer tests in this project.
function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('PuddleRenderer', () => {
  const W = 256;
  const H = 224;

  it('instantiates with defaults', () => {
    const r = new PuddleRenderer(W, H);
    expect(r.width).toBe(W);
    expect(r.height).toBe(H);
    expect(r.horizonY).toBe(HORIZON_Y);
    expect(r.cameraDepth).toBe(CAMERA_DEPTH);
    expect(r.roadHalfWidth).toBe(ROAD_HALF_WIDTH);
  });

  it('accepts custom horizonY and cameraDepth', () => {
    const r = new PuddleRenderer(W, H, 100, 1.0, 90);
    expect(r.horizonY).toBe(100);
    expect(r.cameraDepth).toBe(1.0);
    expect(r.roadHalfWidth).toBe(90);
  });

  it('render() does not throw when called with no getCurve', () => {
    const r = new PuddleRenderer(W, H);
    const ctx = makeCtx();
    expect(() => r.render(ctx, 0)).not.toThrow();
  });

  it('render() does not throw when getCurve is supplied', () => {
    const r = new PuddleRenderer(W, H);
    const ctx = makeCtx();
    expect(() => r.render(ctx, 0, () => 0, 0)).not.toThrow();
  });

  it('render() skips puddles beyond PUDDLE_DRAW_DISTANCE (no draw calls)', () => {
    // Place the player very far past all puddles so none are within draw distance.
    // The furthest puddle is ~3500 m; set playerZ so all are more than PUDDLE_DRAW_DISTANCE behind.
    const r = new PuddleRenderer(W, H);
    const ctx = makeCtx();
    // playerZ far ahead → all puddles have negative relZ → skipped
    r.render(ctx, 10000, undefined, 0);
    // ellipse and fillRect should not be called for any puddle panel
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });

  it('PUDDLE_DRAW_DISTANCE is a positive number', () => {
    expect(PUDDLE_DRAW_DISTANCE).toBeGreaterThan(0);
  });
});
