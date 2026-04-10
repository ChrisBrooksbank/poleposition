import { describe, it, expect, vi } from 'vitest';
import { GameLoop } from '../src/GameLoop';

/** Build a manually-controlled fake RAF scheduler */
function makeFakeScheduler() {
  const pending: Array<(ts: number) => void> = [];
  let idCounter = 0;

  const raf = (cb: FrameRequestCallback): number => {
    pending.push(cb);
    return ++idCounter;
  };

  const caf = (_id: number): void => {
    // For simplicity, just clear all pending (tests stop the loop explicitly)
    pending.length = 0;
  };

  const flush = (timestamp: number): void => {
    const callbacks = pending.splice(0);
    for (const cb of callbacks) {
      cb(timestamp);
    }
  };

  return { raf, caf, flush, pending };
}

describe('GameLoop', () => {
  it('calls onUpdate with delta time on each frame after the first', () => {
    const updates: number[] = [];
    const { raf, caf, flush } = makeFakeScheduler();
    const loop = new GameLoop((dt) => updates.push(dt), raf, caf);

    loop.start();
    flush(0); // first frame — no update, captures lastTimestamp
    flush(16.67); // second frame — dt = 16.67ms
    flush(33.34); // third frame — dt = 16.67ms

    expect(updates).toHaveLength(2);
    expect(updates[0]).toBeCloseTo(16.67);
    expect(updates[1]).toBeCloseTo(16.67);
  });

  it('clamps delta time to MAX_DT_MS when frames are very slow', () => {
    const updates: number[] = [];
    const { raf, caf, flush } = makeFakeScheduler();
    const loop = new GameLoop((dt) => updates.push(dt), raf, caf);

    loop.start();
    flush(0);
    flush(500); // 500ms gap — should be clamped to MAX_DT_MS

    expect(updates[0]).toBe(GameLoop.MAX_DT_MS);
  });

  it('stops scheduling new frames after stop() is called', () => {
    const onUpdate = vi.fn();
    const { raf, caf, flush, pending } = makeFakeScheduler();
    const loop = new GameLoop(onUpdate, raf, caf);

    loop.start();
    flush(0);
    flush(16);
    loop.stop();

    const callsBefore = onUpdate.mock.calls.length;
    flush(32); // should not trigger onUpdate — loop is stopped
    expect(onUpdate.mock.calls.length).toBe(callsBefore);
    expect(pending).toHaveLength(0);
  });

  it('does not start twice if start() is called when already running', () => {
    const onUpdate = vi.fn();
    const { raf, caf, flush } = makeFakeScheduler();
    const loop = new GameLoop(onUpdate, raf, caf);

    loop.start();
    loop.start(); // second call should be a no-op
    flush(0);
    flush(16);

    // Only one update expected (from a single running loop)
    expect(onUpdate.mock.calls.length).toBe(1);
  });

  it('resets lastTimestamp on restart so dt is not stale', () => {
    const updates: number[] = [];
    const { raf, caf, flush } = makeFakeScheduler();
    const loop = new GameLoop((dt) => updates.push(dt), raf, caf);

    loop.start();
    flush(0);
    flush(16);
    loop.stop();

    // Restart — first frame after restart should NOT carry old timestamp
    loop.start();
    flush(10000); // large timestamp — but this is the first tick after restart, no update yet
    flush(10016); // dt should be 16, not 10016

    expect(updates).toHaveLength(2); // 1 from before stop + 1 after restart
    expect(updates[1]).toBeCloseTo(16);
  });

  it('has MAX_DT_MS set to 100', () => {
    expect(GameLoop.MAX_DT_MS).toBe(100);
  });
});
