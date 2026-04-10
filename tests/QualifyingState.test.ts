import { describe, it, expect, beforeEach } from 'vitest';
import {
  QualifyingState,
  QualifyingOutcome,
  computeGridPosition,
  POSITION_THRESHOLDS,
} from '../src/state/QualifyingState';

const TRACK_LENGTH = 4360; // metres (matches fujiSpeedway TRACK_LENGTH)

// ─── computeGridPosition ─────────────────────────────────────────────────────

describe('computeGridPosition', () => {
  it('returns 1 for a lap time below 58.5s', () => {
    expect(computeGridPosition(58.49)).toBe(1);
  });

  it('returns 2 for a lap time of 58.5s (not strictly less than 1st threshold)', () => {
    expect(computeGridPosition(58.5)).toBe(2);
  });

  it('returns 2 for a lap time just below 60.0s', () => {
    expect(computeGridPosition(59.99)).toBe(2);
  });

  it('returns 3 for a lap time of 60.0s', () => {
    expect(computeGridPosition(60.0)).toBe(3);
  });

  it('returns 4 for a lap time just below 64.0s', () => {
    expect(computeGridPosition(63.99)).toBe(4);
  });

  it('returns 8 for a lap time just below 73.0s', () => {
    expect(computeGridPosition(72.99)).toBe(8);
  });

  it('returns 0 for a lap time exactly 73.0s (not qualified)', () => {
    expect(computeGridPosition(73.0)).toBe(0);
  });

  it('returns 0 for a lap time greater than 73.0s', () => {
    expect(computeGridPosition(90.0)).toBe(0);
  });

  it('covers all 8 thresholds correctly', () => {
    const expected = [1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = 0; i < POSITION_THRESHOLDS.length; i++) {
      const justBelow = POSITION_THRESHOLDS[i] - 0.01;
      expect(computeGridPosition(justBelow)).toBe(expected[i]);
    }
  });
});

// ─── QualifyingState — construction ─────────────────────────────────────────

describe('QualifyingState — construction', () => {
  it('starts in PENDING outcome', () => {
    const qs = new QualifyingState();
    expect(qs.outcome).toBe(QualifyingOutcome.PENDING);
  });

  it('starts with the default 90s timer', () => {
    const qs = new QualifyingState();
    expect(qs.timerMs).toBe(90_000);
  });

  it('accepts a custom timer option (120s)', () => {
    const qs = new QualifyingState(120);
    expect(qs.timerMs).toBe(120_000);
  });

  it('starts with zero elapsed time', () => {
    const qs = new QualifyingState();
    expect(qs.elapsed).toBe(0);
  });

  it('starts with gridPosition 0 (not yet determined)', () => {
    const qs = new QualifyingState();
    expect(qs.gridPosition).toBe(0);
  });

  it('starts with lapTimeSecs 0', () => {
    const qs = new QualifyingState();
    expect(qs.lapTimeSecs).toBe(0);
  });
});

// ─── QualifyingState — announcement ─────────────────────────────────────────

describe('QualifyingState — showAnnouncement', () => {
  it('shows announcement at the start', () => {
    const qs = new QualifyingState();
    expect(qs.showAnnouncement).toBe(true);
  });

  it('still shows announcement just before ANNOUNCE_DURATION_MS', () => {
    const qs = new QualifyingState();
    qs.update(QualifyingState.ANNOUNCE_DURATION_MS - 1, 0, TRACK_LENGTH);
    expect(qs.showAnnouncement).toBe(true);
  });

  it('hides announcement at ANNOUNCE_DURATION_MS', () => {
    const qs = new QualifyingState();
    qs.update(QualifyingState.ANNOUNCE_DURATION_MS, 0, TRACK_LENGTH);
    expect(qs.showAnnouncement).toBe(false);
  });
});

// ─── QualifyingState — timer countdown ──────────────────────────────────────

describe('QualifyingState — timer countdown', () => {
  let qs: QualifyingState;

  beforeEach(() => {
    qs = new QualifyingState(90);
  });

  it('decrements timerMs each frame', () => {
    qs.update(1000, 0, TRACK_LENGTH);
    expect(qs.timerMs).toBe(89_000);
  });

  it('timerMs does not go below 0', () => {
    qs.update(200_000, 0, TRACK_LENGTH);
    expect(qs.timerMs).toBe(0);
  });

  it('timerSeconds returns truncated whole seconds', () => {
    qs.update(500, 0, TRACK_LENGTH); // 89.5s remaining
    expect(qs.timerSeconds).toBe(89);
  });

  it('tracks elapsed time across multiple updates', () => {
    qs.update(1000, 0, TRACK_LENGTH);
    qs.update(2000, 100, TRACK_LENGTH);
    expect(qs.elapsed).toBe(3000);
  });
});

// ─── QualifyingState — FAILED (timer expired) ───────────────────────────────

describe('QualifyingState — timer expiry → FAILED', () => {
  it('transitions to FAILED when timer reaches 0 without lap completion', () => {
    const qs = new QualifyingState(90);
    qs.update(90_001, 0, TRACK_LENGTH);
    expect(qs.outcome).toBe(QualifyingOutcome.FAILED);
  });

  it('stays FAILED after further updates', () => {
    const qs = new QualifyingState(90);
    qs.update(90_001, 0, TRACK_LENGTH);
    qs.update(1000, 0, TRACK_LENGTH);
    expect(qs.outcome).toBe(QualifyingOutcome.FAILED);
  });

  it('gridPosition remains 0 on FAILED', () => {
    const qs = new QualifyingState(90);
    qs.update(90_001, 0, TRACK_LENGTH);
    expect(qs.gridPosition).toBe(0);
  });

  it('elapsed does not advance after FAILED', () => {
    const qs = new QualifyingState(90);
    qs.update(90_001, 0, TRACK_LENGTH);
    const elapsedAtFail = qs.elapsed;
    qs.update(1000, 0, TRACK_LENGTH);
    expect(qs.elapsed).toBe(elapsedAtFail);
  });
});

// ─── QualifyingState — QUALIFIED (lap complete) ──────────────────────────────

describe('QualifyingState — lap completion → QUALIFIED', () => {
  it('transitions to QUALIFIED when playerZ reaches trackLength', () => {
    const qs = new QualifyingState(90);
    qs.update(57_000, TRACK_LENGTH, TRACK_LENGTH); // 57s elapsed
    expect(qs.outcome).toBe(QualifyingOutcome.QUALIFIED);
  });

  it('records the lap time at completion', () => {
    const qs = new QualifyingState(90);
    qs.update(57_000, TRACK_LENGTH, TRACK_LENGTH);
    expect(qs.lapTimeSecs).toBeCloseTo(57.0, 2);
  });

  it('assigns grid position 1 for a sub-58.5s lap', () => {
    const qs = new QualifyingState(90);
    qs.update(58_000, TRACK_LENGTH, TRACK_LENGTH); // 58.0s
    expect(qs.gridPosition).toBe(1);
  });

  it('assigns grid position 8 for a 72.9s lap', () => {
    const qs = new QualifyingState(90);
    qs.update(72_900, TRACK_LENGTH, TRACK_LENGTH);
    expect(qs.gridPosition).toBe(8);
  });

  it('assigns grid position 0 for a 73.0s+ lap (did not qualify)', () => {
    const qs = new QualifyingState(90);
    qs.update(73_000, TRACK_LENGTH, TRACK_LENGTH);
    expect(qs.gridPosition).toBe(0);
  });

  it('qualifies when playerZ exceeds trackLength (overshoots finish)', () => {
    const qs = new QualifyingState(90);
    qs.update(60_000, TRACK_LENGTH + 100, TRACK_LENGTH);
    expect(qs.outcome).toBe(QualifyingOutcome.QUALIFIED);
  });

  it('stays QUALIFIED after further updates', () => {
    const qs = new QualifyingState(90);
    qs.update(57_000, TRACK_LENGTH, TRACK_LENGTH);
    qs.update(1000, TRACK_LENGTH + 100, TRACK_LENGTH);
    expect(qs.outcome).toBe(QualifyingOutcome.QUALIFIED);
  });

  it('elapsed does not advance after QUALIFIED', () => {
    const qs = new QualifyingState(90);
    qs.update(57_000, TRACK_LENGTH, TRACK_LENGTH);
    const elapsedAtFinish = qs.elapsed;
    qs.update(1000, TRACK_LENGTH + 100, TRACK_LENGTH);
    expect(qs.elapsed).toBe(elapsedAtFinish);
  });
});

// ─── QualifyingState — lap takes priority over timer expiry ─────────────────

describe('QualifyingState — lap completion takes priority over timer expiry', () => {
  it('QUALIFIED if playerZ reaches trackLength exactly when timer hits 0', () => {
    const qs = new QualifyingState(90);
    // Update with exactly 90s elapsed and playerZ at finish — lap wins.
    qs.update(90_000, TRACK_LENGTH, TRACK_LENGTH);
    expect(qs.outcome).toBe(QualifyingOutcome.QUALIFIED);
  });
});

// ─── QualifyingState — reset ─────────────────────────────────────────────────

describe('QualifyingState — reset', () => {
  it('resets to PENDING after qualifying', () => {
    const qs = new QualifyingState(90);
    qs.update(57_000, TRACK_LENGTH, TRACK_LENGTH);
    qs.reset();
    expect(qs.outcome).toBe(QualifyingOutcome.PENDING);
  });

  it('restores timer to default on reset', () => {
    const qs = new QualifyingState(90);
    qs.update(10_000, 0, TRACK_LENGTH);
    qs.reset();
    expect(qs.timerMs).toBe(90_000);
  });

  it('restores timer to specified duration on reset', () => {
    const qs = new QualifyingState(90);
    qs.reset(120);
    expect(qs.timerMs).toBe(120_000);
  });

  it('clears elapsed, gridPosition, and lapTimeSecs on reset', () => {
    const qs = new QualifyingState(90);
    qs.update(57_000, TRACK_LENGTH, TRACK_LENGTH);
    qs.reset();
    expect(qs.elapsed).toBe(0);
    expect(qs.gridPosition).toBe(0);
    expect(qs.lapTimeSecs).toBe(0);
  });
});
