import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HighScoreManager } from '../src/state/HighScoreManager';

// ─── localStorage mock ────────────────────────────────────────────────────────

let store: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string): string | null => store[key] ?? null,
  setItem: (key: string, value: string): void => {
    store[key] = value;
  },
  removeItem: (key: string): void => {
    delete store[key];
  },
  clear: (): void => {
    store = {};
  },
};

beforeEach(() => {
  store = {};
  vi.stubGlobal('localStorage', mockLocalStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Construction ─────────────────────────────────────────────────────────────

describe('HighScoreManager — construction', () => {
  it('starts with an empty table when storage is empty', () => {
    const hsm = new HighScoreManager();
    expect(hsm.entries).toHaveLength(0);
  });

  it('loads persisted entries on construction', () => {
    const saved = JSON.stringify([{ initials: 'AAA', score: 1000 }]);
    store[HighScoreManager.STORAGE_KEY] = saved;

    const hsm = new HighScoreManager();
    expect(hsm.entries).toHaveLength(1);
    expect(hsm.entries[0]).toEqual({ initials: 'AAA', score: 1000 });
  });

  it('handles corrupt localStorage gracefully (not an array)', () => {
    store[HighScoreManager.STORAGE_KEY] = '{"not":"array"}';
    const hsm = new HighScoreManager();
    expect(hsm.entries).toHaveLength(0);
  });

  it('handles corrupt localStorage gracefully (invalid JSON)', () => {
    store[HighScoreManager.STORAGE_KEY] = 'not json at all';
    const hsm = new HighScoreManager();
    expect(hsm.entries).toHaveLength(0);
  });

  it('filters out malformed entries from storage', () => {
    const raw = JSON.stringify([
      { initials: 'AAA', score: 1000 },
      { initials: 123, score: 500 }, // invalid: initials not a string
      { score: 200 }, // missing initials
      null,
    ]);
    store[HighScoreManager.STORAGE_KEY] = raw;
    const hsm = new HighScoreManager();
    expect(hsm.entries).toHaveLength(1);
    expect(hsm.entries[0]!.initials).toBe('AAA');
  });
});

// ─── isHighScore ──────────────────────────────────────────────────────────────

describe('HighScoreManager — isHighScore', () => {
  it('returns true when table is empty', () => {
    const hsm = new HighScoreManager();
    expect(hsm.isHighScore(0)).toBe(true);
  });

  it('returns true when table is not yet full', () => {
    const hsm = new HighScoreManager();
    hsm.addEntry('AAA', 500);
    expect(hsm.isHighScore(1)).toBe(true);
  });

  it('returns true for a score higher than the lowest entry when full', () => {
    const hsm = new HighScoreManager();
    for (let i = 0; i < HighScoreManager.MAX_ENTRIES; i++) {
      hsm.addEntry('AAA', (i + 1) * 100);
    }
    const lowest = 100;
    expect(hsm.isHighScore(lowest + 1)).toBe(true);
  });

  it('returns false for a score equal to the lowest entry when full', () => {
    const hsm = new HighScoreManager();
    for (let i = 0; i < HighScoreManager.MAX_ENTRIES; i++) {
      hsm.addEntry('AAA', (i + 1) * 100);
    }
    expect(hsm.isHighScore(100)).toBe(false);
  });

  it('returns false for a score below the lowest entry when full', () => {
    const hsm = new HighScoreManager();
    for (let i = 0; i < HighScoreManager.MAX_ENTRIES; i++) {
      hsm.addEntry('AAA', (i + 1) * 100);
    }
    expect(hsm.isHighScore(50)).toBe(false);
  });
});

// ─── addEntry ─────────────────────────────────────────────────────────────────

describe('HighScoreManager — addEntry', () => {
  it('adds an entry and returns rank 1 for the only score', () => {
    const hsm = new HighScoreManager();
    const rank = hsm.addEntry('ABC', 5000);
    expect(rank).toBe(1);
    expect(hsm.entries).toHaveLength(1);
  });

  it('entries are sorted by score descending', () => {
    const hsm = new HighScoreManager();
    hsm.addEntry('LOW', 100);
    hsm.addEntry('HIG', 9000);
    hsm.addEntry('MID', 500);
    expect(hsm.entries[0]!.initials).toBe('HIG');
    expect(hsm.entries[1]!.initials).toBe('MID');
    expect(hsm.entries[2]!.initials).toBe('LOW');
  });

  it('returns the correct rank for a mid-table entry', () => {
    const hsm = new HighScoreManager();
    hsm.addEntry('HIG', 9000);
    const rank = hsm.addEntry('MID', 500);
    expect(rank).toBe(2);
  });

  it('trims to MAX_ENTRIES entries', () => {
    const hsm = new HighScoreManager();
    for (let i = 0; i < HighScoreManager.MAX_ENTRIES + 5; i++) {
      hsm.addEntry('AAA', i * 100);
    }
    expect(hsm.entries).toHaveLength(HighScoreManager.MAX_ENTRIES);
  });

  it('drops the lowest score when table overflows', () => {
    const hsm = new HighScoreManager();
    for (let i = 1; i <= HighScoreManager.MAX_ENTRIES; i++) {
      hsm.addEntry('AAA', i * 100);
    }
    // All scores: 100, 200, …, 1000.  Add 1500 → 100 should be dropped.
    hsm.addEntry('NEW', 1500);
    const scores = hsm.entries.map((e) => e.score);
    expect(scores).not.toContain(100);
    expect(scores).toContain(1500);
  });

  it('pads short initials with spaces to 3 chars', () => {
    const hsm = new HighScoreManager();
    hsm.addEntry('A', 1000);
    expect(hsm.entries[0]!.initials).toBe('A  ');
  });

  it('truncates initials longer than 3 chars', () => {
    const hsm = new HighScoreManager();
    hsm.addEntry('ABCDE', 1000);
    expect(hsm.entries[0]!.initials).toBe('ABC');
  });

  it('persists entries to localStorage', () => {
    const hsm = new HighScoreManager();
    hsm.addEntry('ABC', 1234);
    const raw = store[HighScoreManager.STORAGE_KEY];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({ initials: 'ABC', score: 1234 });
  });

  it('persisted data is loadable by a new instance', () => {
    const hsm1 = new HighScoreManager();
    hsm1.addEntry('AAA', 5000);
    hsm1.addEntry('BBB', 3000);

    const hsm2 = new HighScoreManager();
    expect(hsm2.entries).toHaveLength(2);
    expect(hsm2.entries[0]!.initials).toBe('AAA');
    expect(hsm2.entries[1]!.initials).toBe('BBB');
  });
});

// ─── rankingTier ──────────────────────────────────────────────────────────────

describe('HighScoreManager — rankingTier (static)', () => {
  it('rank 1 → tier 1', () => {
    expect(HighScoreManager.rankingTier(1)).toBe(1);
  });

  it('rank 2 → tier 2', () => {
    expect(HighScoreManager.rankingTier(2)).toBe(2);
  });

  it('rank 6 → tier 2', () => {
    expect(HighScoreManager.rankingTier(6)).toBe(2);
  });

  it('rank 7 → tier 3', () => {
    expect(HighScoreManager.rankingTier(7)).toBe(3);
  });

  it('rank 100 → tier 3', () => {
    expect(HighScoreManager.rankingTier(100)).toBe(3);
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('HighScoreManager — constants', () => {
  it('MAX_ENTRIES is a positive integer', () => {
    expect(HighScoreManager.MAX_ENTRIES).toBeGreaterThan(0);
  });

  it('STORAGE_KEY is a non-empty string', () => {
    expect(typeof HighScoreManager.STORAGE_KEY).toBe('string');
    expect(HighScoreManager.STORAGE_KEY.length).toBeGreaterThan(0);
  });
});
