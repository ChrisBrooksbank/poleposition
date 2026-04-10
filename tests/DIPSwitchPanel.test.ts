import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DIPSwitchPanel } from '../src/settings/DIPSwitchPanel';
import { DIPSwitchSettings } from '../src/settings/DIPSwitchSettings';

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

function makePanel(): { panel: DIPSwitchPanel; settings: DIPSwitchSettings } {
  const settings = new DIPSwitchSettings();
  const panel = new DIPSwitchPanel(settings);
  return { panel, settings };
}

// ─── Construction ─────────────────────────────────────────────────────────────

describe('DIPSwitchPanel — construction', () => {
  it('starts on row 0', () => {
    const { panel } = makePanel();
    expect(panel.selectedRow).toBe(0);
  });

  it('isDone starts false', () => {
    const { panel } = makePanel();
    expect(panel.isDone).toBe(false);
  });
});

// ─── Row navigation ───────────────────────────────────────────────────────────

describe('DIPSwitchPanel — row navigation', () => {
  it('down moves to next row', () => {
    const { panel } = makePanel();
    panel.update(false, true, false, false, false); // down
    expect(panel.selectedRow).toBe(1);
  });

  it('up wraps to last row from row 0', () => {
    const { panel } = makePanel();
    panel.update(true, false, false, false, false); // up
    expect(panel.selectedRow).toBe(5); // 6 rows total → wraps to 5
  });

  it('down wraps to row 0 from last row', () => {
    const { panel } = makePanel();
    // Navigate to last row (5 downs)
    for (let i = 0; i < 6; i++) {
      panel.update(false, true, false, false, false);
      panel.update(false, false, false, false, false); // release
    }
    expect(panel.selectedRow).toBe(0);
  });

  it('up and down are edge-triggered (holding does not repeat rapidly)', () => {
    const { panel } = makePanel();
    // Hold down for 5 updates without releasing
    for (let i = 0; i < 5; i++) {
      panel.update(false, true, false, false, false);
    }
    // Should only have moved once (edge-trigger on first press)
    expect(panel.selectedRow).toBe(1);
  });

  it('releasing and re-pressing moves again', () => {
    const { panel } = makePanel();
    panel.update(false, true, false, false, false); // press
    panel.update(false, false, false, false, false); // release
    panel.update(false, true, false, false, false); // press again
    expect(panel.selectedRow).toBe(2);
  });
});

// ─── Value cycling ────────────────────────────────────────────────────────────

describe('DIPSwitchPanel — value cycling (row 0 = qualifyingTime)', () => {
  it('right cycles qualifying time forward (90 → 100)', () => {
    const { panel, settings } = makePanel();
    panel.update(false, false, false, true, false); // right
    expect(settings.qualifyingTime).toBe(100);
  });

  it('left wraps qualifying time backward (90 → 120)', () => {
    const { panel, settings } = makePanel();
    panel.update(false, false, true, false, false); // left
    expect(settings.qualifyingTime).toBe(120);
  });

  it('right cycling wraps around at end of options', () => {
    const { panel, settings } = makePanel();
    // Cycle through all 4 options: 90→100→110→120→90
    for (let i = 0; i < 4; i++) {
      panel.update(false, false, false, true, false);
      panel.update(false, false, false, false, false);
    }
    expect(settings.qualifyingTime).toBe(90);
  });

  it('right is edge-triggered (holding does not cycle repeatedly)', () => {
    const { panel, settings } = makePanel();
    for (let i = 0; i < 5; i++) {
      panel.update(false, false, false, true, false); // hold right
    }
    expect(settings.qualifyingTime).toBe(100); // only advanced once
  });
});

describe('DIPSwitchPanel — value cycling (units row = row 5)', () => {
  it('right cycles units from MPH to KPH', () => {
    const { panel, settings } = makePanel();
    // Navigate to units row (5 downs)
    for (let i = 0; i < 5; i++) {
      panel.update(false, true, false, false, false);
      panel.update(false, false, false, false, false);
    }
    expect(panel.selectedRow).toBe(5);
    panel.update(false, false, false, true, false); // right
    expect(settings.units).toBe('KPH');
  });
});

// ─── Confirm / isDone ─────────────────────────────────────────────────────────

describe('DIPSwitchPanel — confirm', () => {
  it('isDone becomes true on Enter press', () => {
    const { panel } = makePanel();
    panel.update(false, false, false, false, true); // confirm
    expect(panel.isDone).toBe(true);
  });

  it('confirm is edge-triggered (holding does not re-fire)', () => {
    const { panel } = makePanel();
    panel.update(false, false, false, false, true);
    panel.update(false, false, false, false, true);
    expect(panel.isDone).toBe(true); // still true, didn't toggle
  });

  it('update is a no-op after isDone', () => {
    const { panel } = makePanel();
    panel.update(false, false, false, false, true); // confirm → done
    panel.update(false, true, false, false, false); // down (should not move row)
    expect(panel.selectedRow).toBe(0);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('DIPSwitchPanel — reset', () => {
  it('reset clears isDone', () => {
    const { panel } = makePanel();
    panel.update(false, false, false, false, true);
    panel.reset();
    expect(panel.isDone).toBe(false);
  });

  it('reset returns to row 0', () => {
    const { panel } = makePanel();
    panel.update(false, true, false, false, false); // move to row 1
    panel.reset();
    expect(panel.selectedRow).toBe(0);
  });

  it('after reset, panel accepts input again', () => {
    const { panel } = makePanel();
    panel.update(false, false, false, false, true); // done
    panel.reset();
    panel.update(false, true, false, false, false); // down
    expect(panel.selectedRow).toBe(1);
  });
});
