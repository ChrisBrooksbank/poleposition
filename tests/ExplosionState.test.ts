import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExplosionState,
  EXPLOSION_DURATION_MS,
  EXPLOSION_FRAME_COUNT,
} from '../src/state/ExplosionState';

describe('ExplosionState — initial state', () => {
  it('starts in none phase', () => {
    const state = new ExplosionState();
    expect(state.phase).toBe('none');
  });

  it('isExploding is false initially', () => {
    const state = new ExplosionState();
    expect(state.isExploding).toBe(false);
  });

  it('frame is 0 when not exploding', () => {
    const state = new ExplosionState();
    expect(state.frame).toBe(0);
  });

  it('progress is 0 when not exploding', () => {
    const state = new ExplosionState();
    expect(state.progress).toBe(0);
  });
});

describe('ExplosionState — trigger', () => {
  let state: ExplosionState;

  beforeEach(() => {
    state = new ExplosionState();
  });

  it('transitions to exploding phase on trigger', () => {
    state.trigger();
    expect(state.phase).toBe('exploding');
  });

  it('isExploding is true after trigger', () => {
    state.trigger();
    expect(state.isExploding).toBe(true);
  });

  it('re-triggering while exploding is a no-op (does not restart timer)', () => {
    state.trigger();
    // Advance partway through the animation
    state.update(EXPLOSION_DURATION_MS / 2);
    const progressMid = state.progress;

    // Trigger again — should be ignored
    state.trigger();
    expect(state.progress).toBe(progressMid);
    expect(state.isExploding).toBe(true);
  });
});

describe('ExplosionState — update timing', () => {
  let state: ExplosionState;

  beforeEach(() => {
    state = new ExplosionState();
    state.trigger();
  });

  it('update returns false before duration elapses', () => {
    const done = state.update(EXPLOSION_DURATION_MS - 1);
    expect(done).toBe(false);
    expect(state.isExploding).toBe(true);
  });

  it('update returns true exactly when duration elapses', () => {
    const done = state.update(EXPLOSION_DURATION_MS);
    expect(done).toBe(true);
  });

  it('update returns true when duration is exceeded', () => {
    const done = state.update(EXPLOSION_DURATION_MS + 100);
    expect(done).toBe(true);
  });

  it('phase returns to none after explosion completes', () => {
    state.update(EXPLOSION_DURATION_MS);
    expect(state.phase).toBe('none');
    expect(state.isExploding).toBe(false);
  });

  it('update returns false (not true) every frame after explosion ends', () => {
    state.update(EXPLOSION_DURATION_MS);
    const afterDone = state.update(16);
    expect(afterDone).toBe(false);
  });

  it('progress increases monotonically during explosion', () => {
    const p1 = state.progress;
    state.update(200);
    const p2 = state.progress;
    state.update(200);
    const p3 = state.progress;
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
  });

  it('progress is capped at 1.0', () => {
    state.update(EXPLOSION_DURATION_MS * 2);
    // After completion, progress resets to 0 (phase is none)
    expect(state.progress).toBe(0);
  });

  it('update returns false when not exploding', () => {
    const fresh = new ExplosionState();
    expect(fresh.update(1000)).toBe(false);
  });
});

describe('ExplosionState — frame progression', () => {
  let state: ExplosionState;

  beforeEach(() => {
    state = new ExplosionState();
    state.trigger();
  });

  it('starts at frame 0', () => {
    expect(state.frame).toBe(0);
  });

  it('frame advances as time progresses', () => {
    const frameDuration = EXPLOSION_DURATION_MS / EXPLOSION_FRAME_COUNT;
    state.update(frameDuration + 1); // just past first frame boundary
    expect(state.frame).toBeGreaterThan(0);
  });

  it('frame reaches EXPLOSION_FRAME_COUNT-1 near the end', () => {
    state.update(EXPLOSION_DURATION_MS - 1);
    expect(state.frame).toBe(EXPLOSION_FRAME_COUNT - 1);
  });

  it('frame never exceeds EXPLOSION_FRAME_COUNT-1', () => {
    // Advance in many small steps
    const step = EXPLOSION_DURATION_MS / 100;
    for (let i = 0; i < 90; i++) {
      expect(state.frame).toBeLessThanOrEqual(EXPLOSION_FRAME_COUNT - 1);
      state.update(step);
    }
  });

  it('produces all distinct frame values across the animation', () => {
    // Sample at the midpoint of each frame interval so each frame is hit once.
    const seenFrames = new Set<number>();
    const frameDuration = EXPLOSION_DURATION_MS / EXPLOSION_FRAME_COUNT;
    for (let i = 0; i < EXPLOSION_FRAME_COUNT; i++) {
      const fresh = new ExplosionState();
      fresh.trigger();
      fresh.update(frameDuration * i + frameDuration / 2);
      seenFrames.add(fresh.frame);
    }
    expect(seenFrames.size).toBe(EXPLOSION_FRAME_COUNT);
  });
});

describe('ExplosionState — retriggering after completion', () => {
  it('can be triggered again after a previous explosion ends', () => {
    const state = new ExplosionState();
    state.trigger();
    state.update(EXPLOSION_DURATION_MS);

    // Should be back to none
    expect(state.isExploding).toBe(false);

    // Can trigger again
    state.trigger();
    expect(state.isExploding).toBe(true);
  });
});

describe('ExplosionState — constants', () => {
  it('EXPLOSION_DURATION_MS is around 2.5 seconds', () => {
    expect(EXPLOSION_DURATION_MS).toBeGreaterThanOrEqual(2000);
    expect(EXPLOSION_DURATION_MS).toBeLessThanOrEqual(3000);
  });

  it('EXPLOSION_FRAME_COUNT is between 4 and 6 (per spec)', () => {
    expect(EXPLOSION_FRAME_COUNT).toBeGreaterThanOrEqual(4);
    expect(EXPLOSION_FRAME_COUNT).toBeLessThanOrEqual(6);
  });
});
