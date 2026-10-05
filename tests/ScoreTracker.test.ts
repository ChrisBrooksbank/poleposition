import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreTracker, QUALIFYING_POSITION_BONUSES } from '../src/state/ScoreTracker';

const TRACK_LENGTH = 4360; // metres (matches fujiSpeedway TRACK_LENGTH)

// ─── Construction ────────────────────────────────────────────────────────────

describe('ScoreTracker — construction', () => {
  it('starts at zero', () => {
    const st = new ScoreTracker();
    expect(st.score).toBe(0);
  });
});

// ─── Distance scoring ─────────────────────────────────────────────────────────

describe('ScoreTracker — addDistance', () => {
  let st: ScoreTracker;
  beforeEach(() => {
    st = new ScoreTracker();
  });

  it('awards 10 pts per metre', () => {
    st.addDistance(1);
    expect(st.score).toBe(10);
  });

  it('awards 50 pts per 5 metres', () => {
    st.addDistance(5);
    expect(st.score).toBe(50);
  });

  it('floors fractional points', () => {
    // 1.5 metres × 10 = 15.0 → 15
    st.addDistance(1.5);
    expect(st.score).toBe(15);
  });

  it('floors sub-whole-metre drives', () => {
    // 0.9 metres × 10 = 9.0 → 9
    st.addDistance(0.9);
    expect(st.score).toBe(9);
  });

  it('accumulates across multiple calls', () => {
    st.addDistance(100);
    st.addDistance(50);
    expect(st.score).toBe(1500);
  });

  it('ignores zero metres', () => {
    st.addDistance(0);
    expect(st.score).toBe(0);
  });

  it('ignores negative metres', () => {
    st.addDistance(-10);
    expect(st.score).toBe(0);
  });

  it('one full lap ≈ 10,000 pts (4360 m × 10)', () => {
    st.addDistance(4360);
    expect(st.score).toBe(43_600);
    // The spec says "approximately 10,000 points" — with 10 pts/m on a 4360m
    // track that is ~43,600. The spec quote of 10,000 assumed a shorter lap;
    // the 10 pts/m rate from the spec takes precedence.
  });
});

// ─── Qualifying bonus ─────────────────────────────────────────────────────────

describe('ScoreTracker — addQualifyingBonus', () => {
  let st: ScoreTracker;
  beforeEach(() => {
    st = new ScoreTracker();
  });

  it('awards 4000 pts for 1st place', () => {
    st.addQualifyingBonus(1);
    expect(st.score).toBe(4000);
  });

  it('awards 2000 pts for 2nd place', () => {
    st.addQualifyingBonus(2);
    expect(st.score).toBe(2000);
  });

  it('awards 1400 pts for 3rd place', () => {
    st.addQualifyingBonus(3);
    expect(st.score).toBe(1400);
  });

  it('awards 1000 pts for 4th place', () => {
    st.addQualifyingBonus(4);
    expect(st.score).toBe(1000);
  });

  it('awards 800 pts for 5th place', () => {
    st.addQualifyingBonus(5);
    expect(st.score).toBe(800);
  });

  it('awards 600 pts for 6th place', () => {
    st.addQualifyingBonus(6);
    expect(st.score).toBe(600);
  });

  it('awards 400 pts for 7th place', () => {
    st.addQualifyingBonus(7);
    expect(st.score).toBe(400);
  });

  it('awards 200 pts for 8th place', () => {
    st.addQualifyingBonus(8);
    expect(st.score).toBe(200);
  });

  it('ignores position 0 (did not qualify)', () => {
    st.addQualifyingBonus(0);
    expect(st.score).toBe(0);
  });

  it('ignores position 9 (out of range)', () => {
    st.addQualifyingBonus(9);
    expect(st.score).toBe(0);
  });

  it('exports QUALIFYING_POSITION_BONUSES with 8 entries', () => {
    expect(QUALIFYING_POSITION_BONUSES).toHaveLength(8);
  });

  it('QUALIFYING_POSITION_BONUSES matches expected values', () => {
    expect([...QUALIFYING_POSITION_BONUSES]).toEqual([4000, 2000, 1400, 1000, 800, 600, 400, 200]);
  });
});

// ─── Time bonus ───────────────────────────────────────────────────────────────

describe('ScoreTracker — addTimeBonus', () => {
  let st: ScoreTracker;
  beforeEach(() => {
    st = new ScoreTracker();
  });

  it('awards 200 pts per whole second remaining', () => {
    st.addTimeBonus(10_000); // 10 s
    expect(st.score).toBe(2000);
  });

  it('truncates fractional seconds', () => {
    st.addTimeBonus(10_999); // 10.999 s → 10 whole seconds
    expect(st.score).toBe(2000);
  });

  it('awards nothing for 0 ms remaining', () => {
    st.addTimeBonus(0);
    expect(st.score).toBe(0);
  });

  it('ignores negative remaining time', () => {
    st.addTimeBonus(-5000);
    expect(st.score).toBe(0);
  });

  it('awards 200 pts for exactly 1 second remaining', () => {
    st.addTimeBonus(1000);
    expect(st.score).toBe(200);
  });
});

// ─── Overtake detection ───────────────────────────────────────────────────────

describe('ScoreTracker — recordOvertakes', () => {
  let st: ScoreTracker;
  beforeEach(() => {
    st = new ScoreTracker();
  });

  it('no overtake on first call (baseline recorded)', () => {
    // Player behind AI car — set baseline
    st.recordOvertakes(0, [200], TRACK_LENGTH);
    expect(st.score).toBe(0);
  });

  it('awards 50 pts when player passes an AI car', () => {
    // Frame 1: AI at 200, player at 0 → AI is ahead
    st.recordOvertakes(0, [200], TRACK_LENGTH);
    // Frame 2: AI at 200, player at 300 → player is now ahead → overtake!
    st.recordOvertakes(300, [200], TRACK_LENGTH);
    expect(st.score).toBe(50);
  });

  it('does not double-count a single pass', () => {
    st.recordOvertakes(0, [200], TRACK_LENGTH);
    st.recordOvertakes(300, [200], TRACK_LENGTH);
    st.recordOvertakes(500, [200], TRACK_LENGTH); // still ahead
    expect(st.score).toBe(50);
  });

  it('awards 50 pts per overtaken car', () => {
    // Two AI cars both ahead of player
    st.recordOvertakes(0, [200, 400], TRACK_LENGTH);
    // Player overtakes both
    st.recordOvertakes(500, [200, 400], TRACK_LENGTH);
    expect(st.score).toBe(100);
  });

  it('handles overtake at lap wrap (player near end, AI near start)', () => {
    // Player at 4300, AI at 100 — AI has wrapped; player is still behind
    // (100 - 4300 = -4200; -4200 < -TRACK_LENGTH/2 so add TRACK_LENGTH → 160)
    // → rel = 160 > 0 → AI is ahead
    st.recordOvertakes(4300, [100], TRACK_LENGTH);
    expect(st.score).toBe(0); // baseline, no overtake yet

    // Player at 4350 (almost done), AI at 100 → still AI ahead in next-lap sense
    st.recordOvertakes(4350, [100], TRACK_LENGTH);
    expect(st.score).toBe(0); // AI is still ahead (lap-wise)
  });

  it('does not award overtake when starting ahead', () => {
    // Player already ahead of AI on first call
    st.recordOvertakes(500, [100], TRACK_LENGTH);
    // Stays ahead
    st.recordOvertakes(600, [100], TRACK_LENGTH);
    expect(st.score).toBe(0);
  });

  it('handles empty AI array gracefully', () => {
    st.recordOvertakes(500, [], TRACK_LENGTH);
    expect(st.score).toBe(0);
  });

  it('no overtake if AI car is exactly at same position', () => {
    // rel = 0 → not strictly negative → not ahead
    st.recordOvertakes(100, [100], TRACK_LENGTH);
    st.recordOvertakes(100, [100], TRACK_LENGTH);
    expect(st.score).toBe(0);
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

describe('ScoreTracker — reset', () => {
  it('resets score to zero', () => {
    const st = new ScoreTracker();
    st.addDistance(1000);
    st.addQualifyingBonus(1);
    st.reset();
    expect(st.score).toBe(0);
  });

  it('clears overtake state so next call is a fresh baseline', () => {
    const st = new ScoreTracker();
    // Establish baseline: AI ahead
    st.recordOvertakes(0, [200], TRACK_LENGTH);
    // Overtake
    st.recordOvertakes(300, [200], TRACK_LENGTH);
    expect(st.score).toBe(50);

    st.reset();

    // After reset: first call is a new baseline
    st.recordOvertakes(300, [200], TRACK_LENGTH); // player still ahead of AI
    expect(st.score).toBe(0); // baseline, no overtake awarded
    // Another frame — no transition
    st.recordOvertakes(400, [200], TRACK_LENGTH);
    expect(st.score).toBe(0);
  });
});

// ─── Combined scenario ────────────────────────────────────────────────────────

describe('ScoreTracker — combined scenario', () => {
  it('accumulates distance + qualifying bonus + time bonus', () => {
    const st = new ScoreTracker();
    st.addDistance(100); // 1,000 pts
    st.addQualifyingBonus(1); // 4,000 pts
    st.addTimeBonus(30_000); // 6,000 pts (30 s × 200)
    expect(st.score).toBe(11_000);
  });
});

describe('ScoreTracker — fractional distance', () => {
  it('carries fractions between frames instead of dropping them', () => {
    const st = new ScoreTracker();
    for (let i = 0; i < 60; i++) st.addDistance(0.05);
    expect(st.score).toBe(30);
  });
});
