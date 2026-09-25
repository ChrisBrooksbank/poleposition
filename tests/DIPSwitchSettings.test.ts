import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DIPSwitchSettings,
  defaultDIPConfig,
  SPEED_TO_MPH,
  PRACTICE_RANK_CUTOFF,
  EXTENDED_RANK_AI_SPEED,
  PRACTICE_RANK_OPTIONS,
  EXTENDED_RANK_OPTIONS,
  SPEED_OPTIONS,
  UNITS_OPTIONS,
} from '../src/settings/DIPSwitchSettings';

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

// ─── defaultDIPConfig ─────────────────────────────────────────────────────────

describe('defaultDIPConfig', () => {
  it('returns a config with the expected default values', () => {
    const cfg = defaultDIPConfig();
    expect(cfg.qualifyingTime).toBe(90);
    expect(cfg.practiceRank).toBe('C');
    expect(cfg.extendedRank).toBe('E');
    expect(cfg.lapCount).toBe(4);
    expect(cfg.speed).toBe('DEFAULT');
    expect(cfg.units).toBe('MPH');
  });

  it('returns a fresh object each call (not a shared reference)', () => {
    const a = defaultDIPConfig();
    const b = defaultDIPConfig();
    expect(a).not.toBe(b);
  });
});

// ─── DIPSwitchSettings — construction ────────────────────────────────────────

describe('DIPSwitchSettings — construction', () => {
  it('loads defaults when storage is empty', () => {
    const s = new DIPSwitchSettings();
    expect(s.qualifyingTime).toBe(90);
    expect(s.practiceRank).toBe('C');
    expect(s.extendedRank).toBe('E');
    expect(s.lapCount).toBe(4);
    expect(s.speed).toBe('DEFAULT');
    expect(s.units).toBe('MPH');
  });

  it('loads previously persisted settings', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({
      qualifyingTime: 120,
      practiceRank: 'H',
      extendedRank: 'A',
      lapCount: 6,
      speed: 'HIGH',
      units: 'KPH',
    });
    const s = new DIPSwitchSettings();
    expect(s.qualifyingTime).toBe(120);
    expect(s.practiceRank).toBe('H');
    expect(s.extendedRank).toBe('A');
    expect(s.lapCount).toBe(6);
    expect(s.speed).toBe('HIGH');
    expect(s.units).toBe('KPH');
  });

  it('falls back to defaults on corrupt JSON', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = 'not valid json{{{';
    const s = new DIPSwitchSettings();
    expect(s.qualifyingTime).toBe(90);
  });

  it('falls back to defaults when stored value is not an object', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify([1, 2, 3]);
    const s = new DIPSwitchSettings();
    expect(s.qualifyingTime).toBe(90);
  });

  it('ignores unknown qualifyingTime values and keeps default', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({ qualifyingTime: 999 });
    const s = new DIPSwitchSettings();
    expect(s.qualifyingTime).toBe(90);
  });

  it('ignores unknown practiceRank values and keeps default', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({ practiceRank: 'Z' });
    const s = new DIPSwitchSettings();
    expect(s.practiceRank).toBe('C');
  });

  it('ignores unknown extendedRank values and keeps default', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({ extendedRank: 'X' });
    const s = new DIPSwitchSettings();
    expect(s.extendedRank).toBe('E');
  });

  it('ignores unknown lapCount values and keeps default', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({ lapCount: 99 });
    const s = new DIPSwitchSettings();
    expect(s.lapCount).toBe(4);
  });

  it('ignores unknown speed values and keeps default', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({ speed: 'TURBO' });
    const s = new DIPSwitchSettings();
    expect(s.speed).toBe('DEFAULT');
  });

  it('ignores unknown units values and keeps default', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({ units: 'FPS' });
    const s = new DIPSwitchSettings();
    expect(s.units).toBe('MPH');
  });

  it('applies only valid fields from a partially corrupt object', () => {
    store[DIPSwitchSettings.STORAGE_KEY] = JSON.stringify({
      qualifyingTime: 110, // valid
      practiceRank: '!!', // invalid
    });
    const s = new DIPSwitchSettings();
    expect(s.qualifyingTime).toBe(110);
    expect(s.practiceRank).toBe('C'); // falls back to default
  });
});

// ─── DIPSwitchSettings — update ──────────────────────────────────────────────

describe('DIPSwitchSettings — update', () => {
  it('updates a single setting', () => {
    const s = new DIPSwitchSettings();
    s.update({ units: 'KPH' });
    expect(s.units).toBe('KPH');
  });

  it('updates multiple settings at once', () => {
    const s = new DIPSwitchSettings();
    s.update({ qualifyingTime: 100, lapCount: 3 });
    expect(s.qualifyingTime).toBe(100);
    expect(s.lapCount).toBe(3);
  });

  it('persists updated settings to localStorage', () => {
    const s = new DIPSwitchSettings();
    s.update({ speed: 'HIGH' });
    const raw = store[DIPSwitchSettings.STORAGE_KEY];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.speed).toBe('HIGH');
  });

  it('persisted settings are loadable by a new instance', () => {
    const s1 = new DIPSwitchSettings();
    s1.update({ practiceRank: 'A', extendedRank: 'H', lapCount: 5 });

    const s2 = new DIPSwitchSettings();
    expect(s2.practiceRank).toBe('A');
    expect(s2.extendedRank).toBe('H');
    expect(s2.lapCount).toBe(5);
  });

  it('does not mutate other settings when one is updated', () => {
    const s = new DIPSwitchSettings();
    s.update({ units: 'KPH' });
    expect(s.qualifyingTime).toBe(90);
    expect(s.practiceRank).toBe('C');
    expect(s.lapCount).toBe(4);
    expect(s.speed).toBe('DEFAULT');
  });
});

// ─── DIPSwitchSettings — derived properties ──────────────────────────────────

describe('DIPSwitchSettings — topSpeedMph', () => {
  it('returns 225 for the DEFAULT speed', () => {
    const s = new DIPSwitchSettings();
    expect(s.topSpeedMph).toBe(225);
  });

  it('returns 195 for AVERAGE speed', () => {
    const s = new DIPSwitchSettings();
    s.update({ speed: 'AVERAGE' });
    expect(s.topSpeedMph).toBe(195);
  });

  it('returns 244 for HIGH speed', () => {
    const s = new DIPSwitchSettings();
    s.update({ speed: 'HIGH' });
    expect(s.topSpeedMph).toBe(244);
  });
});

describe('DIPSwitchSettings — useKph', () => {
  it('returns false for MPH units', () => {
    const s = new DIPSwitchSettings();
    expect(s.useKph).toBe(false);
  });

  it('returns true for KPH units', () => {
    const s = new DIPSwitchSettings();
    s.update({ units: 'KPH' });
    expect(s.useKph).toBe(true);
  });
});

describe('DIPSwitchSettings — qualifyingCutoffSeconds', () => {
  it('returns 73 for default rank C', () => {
    const s = new DIPSwitchSettings();
    expect(s.qualifyingCutoffSeconds).toBe(73);
  });

  it('returns a larger value for easier ranks (A)', () => {
    const s = new DIPSwitchSettings();
    s.update({ practiceRank: 'A' });
    expect(s.qualifyingCutoffSeconds).toBeGreaterThan(73);
  });

  it('returns a smaller value for harder ranks (H)', () => {
    const s = new DIPSwitchSettings();
    s.update({ practiceRank: 'H' });
    expect(s.qualifyingCutoffSeconds).toBeLessThan(73);
  });

  it('cutoff decreases monotonically from A to H', () => {
    const s = new DIPSwitchSettings();
    const cutoffs = PRACTICE_RANK_OPTIONS.map((r) => {
      s.update({ practiceRank: r });
      return s.qualifyingCutoffSeconds;
    });
    for (let i = 1; i < cutoffs.length; i++) {
      expect(cutoffs[i]).toBeLessThanOrEqual(cutoffs[i - 1]!);
    }
  });
});

describe('DIPSwitchSettings — aiSpeedMultiplier', () => {
  it('returns 1.0 for default rank E', () => {
    const s = new DIPSwitchSettings();
    expect(s.aiSpeedMultiplier).toBe(1.0);
  });

  it('returns a value < 1 for easier ranks (A)', () => {
    const s = new DIPSwitchSettings();
    s.update({ extendedRank: 'A' });
    expect(s.aiSpeedMultiplier).toBeLessThan(1.0);
  });

  it('returns a value > 1 for harder ranks (H)', () => {
    const s = new DIPSwitchSettings();
    s.update({ extendedRank: 'H' });
    expect(s.aiSpeedMultiplier).toBeGreaterThan(1.0);
  });

  it('multiplier increases monotonically from A to H', () => {
    const s = new DIPSwitchSettings();
    const mults = EXTENDED_RANK_OPTIONS.map((r) => {
      s.update({ extendedRank: r });
      return s.aiSpeedMultiplier;
    });
    for (let i = 1; i < mults.length; i++) {
      expect(mults[i]).toBeGreaterThanOrEqual(mults[i - 1]!);
    }
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('SPEED_TO_MPH', () => {
  it('covers all speed options', () => {
    for (const opt of SPEED_OPTIONS) {
      expect(typeof SPEED_TO_MPH[opt]).toBe('number');
      expect(SPEED_TO_MPH[opt]).toBeGreaterThan(0);
    }
  });
});

describe('PRACTICE_RANK_CUTOFF', () => {
  it('covers all practice rank options', () => {
    for (const r of PRACTICE_RANK_OPTIONS) {
      expect(typeof PRACTICE_RANK_CUTOFF[r]).toBe('number');
      expect(PRACTICE_RANK_CUTOFF[r]).toBeGreaterThan(0);
    }
  });
});

describe('EXTENDED_RANK_AI_SPEED', () => {
  it('covers all extended rank options', () => {
    for (const r of EXTENDED_RANK_OPTIONS) {
      expect(typeof EXTENDED_RANK_AI_SPEED[r]).toBe('number');
      expect(EXTENDED_RANK_AI_SPEED[r]).toBeGreaterThan(0);
    }
  });
});

describe('DIPSwitchSettings — STORAGE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof DIPSwitchSettings.STORAGE_KEY).toBe('string');
    expect(DIPSwitchSettings.STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

describe('DIPSwitchSettings — option arrays', () => {
  it('PRACTICE_RANK_OPTIONS has 8 entries A–H', () => {
    expect(PRACTICE_RANK_OPTIONS).toHaveLength(8);
    expect(PRACTICE_RANK_OPTIONS[0]).toBe('A');
    expect(PRACTICE_RANK_OPTIONS[7]).toBe('H');
  });

  it('EXTENDED_RANK_OPTIONS has 8 entries A–H', () => {
    expect(EXTENDED_RANK_OPTIONS).toHaveLength(8);
    expect(EXTENDED_RANK_OPTIONS[0]).toBe('A');
    expect(EXTENDED_RANK_OPTIONS[7]).toBe('H');
  });

  it('SPEED_OPTIONS has exactly AVERAGE, DEFAULT and HIGH', () => {
    expect(SPEED_OPTIONS).toContain('AVERAGE');
    expect(SPEED_OPTIONS).toContain('DEFAULT');
    expect(SPEED_OPTIONS).toContain('HIGH');
    expect(SPEED_OPTIONS).toHaveLength(3);
  });

  it('UNITS_OPTIONS has exactly MPH and KPH', () => {
    expect(UNITS_OPTIONS).toContain('MPH');
    expect(UNITS_OPTIONS).toContain('KPH');
    expect(UNITS_OPTIONS).toHaveLength(2);
  });
});
