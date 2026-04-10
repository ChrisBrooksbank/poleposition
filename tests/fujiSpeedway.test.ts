import { describe, it, expect } from 'vitest';
import {
  FUJI_SECTIONS,
  TRACK_LENGTH,
  SECTION_STARTS,
  getTrackCurve,
  getTrackHill,
} from '../src/track/fujiSpeedway';

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

describe('FUJI_SECTIONS', () => {
  it('contains exactly 6 sections', () => {
    expect(FUJI_SECTIONS).toHaveLength(6);
  });

  it('sections are named as expected (in order)', () => {
    const names = FUJI_SECTIONS.map((s) => s.name);
    expect(names[0]).toMatch(/main straight/i);
    expect(names[1]).toMatch(/sharp right/i);
    expect(names[2]).toMatch(/quick left/i);
    expect(names[3]).toMatch(/medium right/i);
    expect(names[4]).toMatch(/hairpin/i);
    expect(names[5]).toMatch(/gradual right/i);
  });

  it('all sections have positive lengths', () => {
    for (const s of FUJI_SECTIONS) {
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('main straight has zero curve (straight section)', () => {
    expect(FUJI_SECTIONS[0].curve).toBe(0);
  });

  it('sharp right turn has positive curve (right = positive)', () => {
    expect(FUJI_SECTIONS[1].curve).toBeGreaterThan(0);
  });

  it('quick left turn has negative curve (left = negative)', () => {
    expect(FUJI_SECTIONS[2].curve).toBeLessThan(0);
  });

  it('medium right turn has positive curve', () => {
    expect(FUJI_SECTIONS[3].curve).toBeGreaterThan(0);
  });

  it('left hairpin has negative curve', () => {
    expect(FUJI_SECTIONS[4].curve).toBeLessThan(0);
  });

  it('long gradual right has positive curve', () => {
    expect(FUJI_SECTIONS[5].curve).toBeGreaterThan(0);
  });

  it('left hairpin has the largest magnitude curve (tightest turn)', () => {
    const magnitudes = FUJI_SECTIONS.map((s) => Math.abs(s.curve));
    const hairpinMag = Math.abs(FUJI_SECTIONS[4].curve);
    for (const m of magnitudes) {
      expect(hairpinMag).toBeGreaterThanOrEqual(m);
    }
  });

  it('long gradual right is the longest section (sweeping back half of circuit)', () => {
    const maxLength = Math.max(...FUJI_SECTIONS.map((s) => s.length));
    expect(FUJI_SECTIONS[5].length).toBe(maxLength);
  });

  it('main straight is the second longest section', () => {
    const sorted = [...FUJI_SECTIONS].sort((a, b) => b.length - a.length);
    expect(sorted[1].name).toMatch(/main straight/i);
  });
});

// ---------------------------------------------------------------------------
// TRACK_LENGTH
// ---------------------------------------------------------------------------

describe('TRACK_LENGTH', () => {
  it('equals the sum of all section lengths', () => {
    const sum = FUJI_SECTIONS.reduce((acc, s) => acc + s.length, 0);
    expect(TRACK_LENGTH).toBe(sum);
  });

  it('is approximately 4360 metres (±50 m tolerance)', () => {
    expect(TRACK_LENGTH).toBeGreaterThanOrEqual(4310);
    expect(TRACK_LENGTH).toBeLessThanOrEqual(4410);
  });

  it('is a positive finite number', () => {
    expect(TRACK_LENGTH).toBeGreaterThan(0);
    expect(isFinite(TRACK_LENGTH)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SECTION_STARTS
// ---------------------------------------------------------------------------

describe('SECTION_STARTS', () => {
  it('has the same length as FUJI_SECTIONS', () => {
    expect(SECTION_STARTS).toHaveLength(FUJI_SECTIONS.length);
  });

  it('first section starts at 0', () => {
    expect(SECTION_STARTS[0]).toBe(0);
  });

  it('each start equals the cumulative sum of prior section lengths', () => {
    let acc = 0;
    for (let i = 0; i < FUJI_SECTIONS.length; i++) {
      expect(SECTION_STARTS[i]).toBe(acc);
      acc += FUJI_SECTIONS[i].length;
    }
  });

  it('starts are strictly increasing', () => {
    for (let i = 1; i < SECTION_STARTS.length; i++) {
      expect(SECTION_STARTS[i]).toBeGreaterThan(SECTION_STARTS[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// getTrackCurve
// ---------------------------------------------------------------------------

describe('getTrackCurve', () => {
  it('returns 0 at the very start of the track (main straight)', () => {
    expect(getTrackCurve(0)).toBe(0);
  });

  it('returns 0 midway through the main straight', () => {
    const mid = FUJI_SECTIONS[0].length / 2;
    expect(getTrackCurve(mid)).toBe(0);
  });

  it('returns the sharp-right curve value just inside that section', () => {
    const pos = SECTION_STARTS[1] + 1; // 1 m into sharp right
    expect(getTrackCurve(pos)).toBe(FUJI_SECTIONS[1].curve);
  });

  it('returns the quick-left curve value just inside that section', () => {
    const pos = SECTION_STARTS[2] + 1;
    expect(getTrackCurve(pos)).toBe(FUJI_SECTIONS[2].curve);
  });

  it('returns the medium-right curve value inside that section', () => {
    const pos = SECTION_STARTS[3] + 50;
    expect(getTrackCurve(pos)).toBe(FUJI_SECTIONS[3].curve);
  });

  it('returns the left-hairpin curve value inside that section', () => {
    const pos = SECTION_STARTS[4] + 10;
    expect(getTrackCurve(pos)).toBe(FUJI_SECTIONS[4].curve);
  });

  it('returns the long-gradual-right curve value inside that section', () => {
    const pos = SECTION_STARTS[5] + 500;
    expect(getTrackCurve(pos)).toBe(FUJI_SECTIONS[5].curve);
  });

  it('wraps correctly: position exactly at TRACK_LENGTH maps to section 0', () => {
    expect(getTrackCurve(TRACK_LENGTH)).toBe(FUJI_SECTIONS[0].curve);
  });

  it('wraps correctly: second lap position mirrors first lap', () => {
    const positions = [0, 100, 1200, 1500, 3000, 4000];
    for (const pos of positions) {
      expect(getTrackCurve(pos + TRACK_LENGTH)).toBe(getTrackCurve(pos));
    }
  });

  it('wraps correctly: multiple laps ahead still return correct value', () => {
    const pos = SECTION_STARTS[4] + 50; // inside hairpin
    const expected = getTrackCurve(pos);
    expect(getTrackCurve(pos + TRACK_LENGTH * 3)).toBe(expected);
  });

  it('handles negative positions (wraps into last lap)', () => {
    // -1 m should be in the last section (long gradual right)
    const curve = getTrackCurve(-1);
    expect(curve).toBe(FUJI_SECTIONS[5].curve);
  });

  it('returns a finite number for any position', () => {
    const positions = [0, 1, 500, 1200, 2000, 4359, TRACK_LENGTH, TRACK_LENGTH * 5];
    for (const pos of positions) {
      expect(isFinite(getTrackCurve(pos))).toBe(true);
    }
  });

  it('sharp right has stronger curve than long gradual right', () => {
    const sharpCurve = Math.abs(getTrackCurve(SECTION_STARTS[1] + 1));
    const gradualCurve = Math.abs(getTrackCurve(SECTION_STARTS[5] + 1));
    expect(sharpCurve).toBeGreaterThan(gradualCurve);
  });
});

// ---------------------------------------------------------------------------
// FUJI_SECTIONS — hill property
// ---------------------------------------------------------------------------

describe('FUJI_SECTIONS hill values', () => {
  it('all sections have a finite hill value', () => {
    for (const s of FUJI_SECTIONS) {
      expect(typeof s.hill).toBe('number');
      expect(isFinite(s.hill)).toBe(true);
    }
  });

  it('main straight is flat (hill = 0)', () => {
    expect(FUJI_SECTIONS[0].hill).toBe(0);
  });

  it('at least one section has a positive hill (uphill)', () => {
    const hasUphill = FUJI_SECTIONS.some((s) => s.hill > 0);
    expect(hasUphill).toBe(true);
  });

  it('at least one section has a negative hill (downhill)', () => {
    const hasDownhill = FUJI_SECTIONS.some((s) => s.hill < 0);
    expect(hasDownhill).toBe(true);
  });

  it('hill magnitudes are within a reasonable range (0 to 0.1)', () => {
    for (const s of FUJI_SECTIONS) {
      expect(Math.abs(s.hill)).toBeLessThanOrEqual(0.1);
    }
  });
});

// ---------------------------------------------------------------------------
// getTrackHill
// ---------------------------------------------------------------------------

describe('getTrackHill', () => {
  it('returns 0 at the start of the main straight', () => {
    expect(getTrackHill(0)).toBe(0);
  });

  it('returns 0 midway through the main straight', () => {
    const mid = FUJI_SECTIONS[0].length / 2;
    expect(getTrackHill(mid)).toBe(0);
  });

  it('returns the sharp-right hill value just inside that section', () => {
    const pos = SECTION_STARTS[1] + 1;
    expect(getTrackHill(pos)).toBe(FUJI_SECTIONS[1].hill);
  });

  it('returns the quick-left hill value just inside that section', () => {
    const pos = SECTION_STARTS[2] + 1;
    expect(getTrackHill(pos)).toBe(FUJI_SECTIONS[2].hill);
  });

  it('returns the medium-right hill value inside that section', () => {
    const pos = SECTION_STARTS[3] + 50;
    expect(getTrackHill(pos)).toBe(FUJI_SECTIONS[3].hill);
  });

  it('returns the left-hairpin hill value inside that section', () => {
    const pos = SECTION_STARTS[4] + 10;
    expect(getTrackHill(pos)).toBe(FUJI_SECTIONS[4].hill);
  });

  it('returns the long-gradual-right hill value inside that section', () => {
    const pos = SECTION_STARTS[5] + 500;
    expect(getTrackHill(pos)).toBe(FUJI_SECTIONS[5].hill);
  });

  it('wraps correctly: position at TRACK_LENGTH maps to section 0', () => {
    expect(getTrackHill(TRACK_LENGTH)).toBe(FUJI_SECTIONS[0].hill);
  });

  it('wraps correctly: second lap mirrors first lap', () => {
    const positions = [0, 100, 1200, 1500, 3000, 4000];
    for (const pos of positions) {
      expect(getTrackHill(pos + TRACK_LENGTH)).toBe(getTrackHill(pos));
    }
  });

  it('handles negative positions (wraps into last lap)', () => {
    const hill = getTrackHill(-1);
    expect(hill).toBe(FUJI_SECTIONS[5].hill);
  });

  it('returns a finite number for any position', () => {
    const positions = [0, 1, 500, 1200, 2000, 4359, TRACK_LENGTH, TRACK_LENGTH * 5];
    for (const pos of positions) {
      expect(isFinite(getTrackHill(pos))).toBe(true);
    }
  });
});
