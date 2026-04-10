import { describe, it, expect, vi } from 'vitest';
import { HUDRenderer, MPH_TO_KPH } from '../src/renderer/HUDRenderer';

const LOGICAL_WIDTH = 256;
const LOGICAL_HEIGHT = 224;
const TRACK_LENGTH = 4360; // metres (matches fujiSpeedway TRACK_LENGTH)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCtx() {
  return {
    fillStyle: '',
    font: '',
    textAlign: '',
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function allTextArgs(ctx: CanvasRenderingContext2D): string[] {
  return (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map(
    (c: unknown[]) => c[0] as string
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('HUDRenderer — MPH_TO_KPH constant', () => {
  it('is approximately 1.609', () => {
    expect(MPH_TO_KPH).toBeCloseTo(1.60934, 3);
  });
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('HUDRenderer — constructor', () => {
  it('stores default width and height', () => {
    const r = new HUDRenderer();
    expect(r.width).toBe(LOGICAL_WIDTH);
    expect(r.height).toBe(LOGICAL_HEIGHT);
  });

  it('stores custom width and height', () => {
    const r = new HUDRenderer(320, 240);
    expect(r.width).toBe(320);
    expect(r.height).toBe(240);
  });
});

// ---------------------------------------------------------------------------
// computeRacePosition
// ---------------------------------------------------------------------------

describe('HUDRenderer.computeRacePosition', () => {
  it('returns 1 when player is ahead of all AI cars', () => {
    // Player at 2000m, AI cars all behind at 500m
    const aiZs = [500, 600, 700, 800, 900, 1000, 1100];
    expect(HUDRenderer.computeRacePosition(2000, aiZs, TRACK_LENGTH)).toBe(1);
  });

  it('returns 8 when player is behind all AI cars', () => {
    // Player at 100m, 7 AI cars all ahead within the half-track window (< 2180m gap each)
    const aiZs = [200, 400, 600, 800, 1000, 1200, 1400];
    expect(HUDRenderer.computeRacePosition(100, aiZs, TRACK_LENGTH)).toBe(8);
  });

  it('returns 4 when three AI cars are ahead', () => {
    // Player at 1000m; 3 AI cars ahead (1500, 2000, 2500), 4 behind (100-600)
    const aiZs = [100, 200, 400, 600, 1500, 2000, 2500];
    expect(HUDRenderer.computeRacePosition(1000, aiZs, TRACK_LENGTH)).toBe(4);
  });

  it('handles wrap-around correctly — AI car just past lap boundary', () => {
    // Player at 4300m (near end), AI car at 50m (has wrapped around, now "behind")
    // rel = 50 - 4300 = -4250 → + 4360 = 110 > 0 → AI car is AHEAD
    // So player is in position 2 (1 AI car ahead)
    const aiZs = [50];
    expect(HUDRenderer.computeRacePosition(4300, aiZs, TRACK_LENGTH)).toBe(2);
  });

  it('handles wrap-around correctly — player just past lap boundary', () => {
    // Player at 50m (just started lap), AI car at 4300m (near end of previous lap)
    // rel = 4300 - 50 = 4250 → - 4360 = -110 < 0 → AI car is BEHIND player
    // So player is in position 1 (0 AI cars ahead)
    const aiZs = [4300];
    expect(HUDRenderer.computeRacePosition(50, aiZs, TRACK_LENGTH)).toBe(1);
  });

  it('returns 1 with an empty AI array', () => {
    expect(HUDRenderer.computeRacePosition(1000, [], TRACK_LENGTH)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// render — smoke tests
// ---------------------------------------------------------------------------

describe('HUDRenderer.render — smoke tests', () => {
  const renderer = new HUDRenderer();

  it('renders without throwing', () => {
    const ctx = makeMockCtx();
    expect(() =>
      renderer.render(ctx, {
        score: 1234,
        timerSeconds: 45,
        speedMph: 180,
        racePosition: 3,
      })
    ).not.toThrow();
  });

  it('wraps render in save/restore', () => {
    const ctx = makeMockCtx();
    renderer.render(ctx, { score: 0, timerSeconds: 90, speedMph: 0, racePosition: 1 });
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// render — score display
// ---------------------------------------------------------------------------

describe('HUDRenderer.render — score display', () => {
  it('displays score zero-padded to 6 digits', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, { score: 42, timerSeconds: 90, speedMph: 0, racePosition: 1 });
    expect(allTextArgs(ctx)).toContain('000042');
  });

  it('displays a 6-digit score without padding', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, {
      score: 123456,
      timerSeconds: 90,
      speedMph: 0,
      racePosition: 1,
    });
    expect(allTextArgs(ctx)).toContain('123456');
  });
});

// ---------------------------------------------------------------------------
// render — timer display
// ---------------------------------------------------------------------------

describe('HUDRenderer.render — timer display', () => {
  it('displays the timer value with TIME prefix', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 75, speedMph: 0, racePosition: 1 });
    const texts = allTextArgs(ctx);
    expect(texts.some((t) => t.includes('TIME') && t.includes('75'))).toBe(true);
  });

  it('turns red (fillStyle) when timer is ≤ 10', () => {
    const ctx = makeMockCtx();
    const fillStyleValues: string[] = [];
    Object.defineProperty(ctx, 'fillStyle', {
      set(v: string) {
        fillStyleValues.push(v);
      },
      get() {
        return '';
      },
    });
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 10, speedMph: 0, racePosition: 1 });
    expect(fillStyleValues).toContain('#ff4444');
  });

  it('does not turn red when timer is > 10', () => {
    const ctx = makeMockCtx();
    const fillStyleValues: string[] = [];
    Object.defineProperty(ctx, 'fillStyle', {
      set(v: string) {
        fillStyleValues.push(v);
      },
      get() {
        return '';
      },
    });
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 11, speedMph: 0, racePosition: 1 });
    expect(fillStyleValues).not.toContain('#ff4444');
  });
});

// ---------------------------------------------------------------------------
// render — speed display
// ---------------------------------------------------------------------------

describe('HUDRenderer.render — speed display', () => {
  it('displays speed in MPH by default', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 90, speedMph: 180, racePosition: 1 });
    const texts = allTextArgs(ctx);
    expect(texts.some((t) => t.includes('180') && t.includes('MPH'))).toBe(true);
  });

  it('converts and displays speed in KPH when useKph is true', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, {
      score: 0,
      timerSeconds: 90,
      speedMph: 100,
      useKph: true,
      racePosition: 1,
    });
    const texts = allTextArgs(ctx);
    const expectedKph = Math.round(100 * MPH_TO_KPH); // 161
    expect(texts.some((t) => t.includes(String(expectedKph)) && t.includes('KPH'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// render — lap display
// ---------------------------------------------------------------------------

describe('HUDRenderer.render — lap display', () => {
  it('shows lap counter when lapCurrent and lapTotal are provided', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, {
      score: 0,
      timerSeconds: 90,
      speedMph: 0,
      lapCurrent: 2,
      lapTotal: 4,
      racePosition: 1,
    });
    const texts = allTextArgs(ctx);
    expect(texts.some((t) => t.includes('LAP') && t.includes('2') && t.includes('4'))).toBe(true);
  });

  it('omits lap counter when lap fields are not provided', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 90, speedMph: 0, racePosition: 1 });
    const texts = allTextArgs(ctx);
    expect(texts.some((t) => t.startsWith('LAP'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// render — race position display
// ---------------------------------------------------------------------------

describe('HUDRenderer.render — race position display', () => {
  it('shows "YOU ARE IN 1st" when position is 1', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 90, speedMph: 0, racePosition: 1 });
    const texts = allTextArgs(ctx);
    expect(texts.some((t) => t.includes('YOU ARE IN') && t.includes('1st'))).toBe(true);
  });

  it('shows "YOU ARE IN 3rd" when position is 3', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 90, speedMph: 0, racePosition: 3 });
    const texts = allTextArgs(ctx);
    expect(texts.some((t) => t.includes('YOU ARE IN') && t.includes('3rd'))).toBe(true);
  });

  it('shows "YOU ARE IN 8th" when position is 8', () => {
    const ctx = makeMockCtx();
    new HUDRenderer().render(ctx, { score: 0, timerSeconds: 90, speedMph: 0, racePosition: 8 });
    const texts = allTextArgs(ctx);
    expect(texts.some((t) => t.includes('YOU ARE IN') && t.includes('8th'))).toBe(true);
  });
});
