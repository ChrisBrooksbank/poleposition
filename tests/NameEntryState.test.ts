import { describe, it, expect, beforeEach } from 'vitest';
import { NameEntryState, NAME_ENTRY_LETTERS } from '../src/state/NameEntryState';

// ─── Construction ─────────────────────────────────────────────────────────────

describe('NameEntryState — construction', () => {
  it('starts at slot 0', () => {
    const nes = new NameEntryState();
    expect(nes.currentSlot).toBe(0);
  });

  it('starts with initials AAA', () => {
    const nes = new NameEntryState();
    expect(nes.initials).toBe('AAA');
  });

  it('is not done on construction', () => {
    const nes = new NameEntryState();
    expect(nes.isDone).toBe(false);
  });

  it('all letter indices start at 0', () => {
    const nes = new NameEntryState();
    expect([...nes.letterIndices]).toEqual([0, 0, 0]);
  });
});

// ─── Letter navigation ────────────────────────────────────────────────────────

describe('NameEntryState — right key advances letter', () => {
  let nes: NameEntryState;

  beforeEach(() => {
    nes = new NameEntryState();
  });

  it('pressing right once selects B (index 1)', () => {
    nes.update(16, false, true, false); // first press fires immediately
    expect(nes.letterIndices[0]).toBe(1);
    expect(nes.initials[0]).toBe('B');
  });

  it('pressing right twice selects C (index 2)', () => {
    nes.update(16, false, true, false);
    nes.update(16, false, false, false); // release
    nes.update(16, false, true, false); // press again
    expect(nes.letterIndices[0]).toBe(2);
  });

  it('wraps from Z back to A', () => {
    const nes2 = new NameEntryState();
    // Set to Z by advancing 25 times
    for (let i = 0; i < 25; i++) {
      nes2.update(16, false, true, false);
      nes2.update(16, false, false, false);
    }
    expect(nes2.letterIndices[0]).toBe(25); // Z
    nes2.update(16, false, true, false);
    nes2.update(16, false, false, false);
    expect(nes2.letterIndices[0]).toBe(0); // wraps to A
  });
});

describe('NameEntryState — left key reverses letter', () => {
  let nes: NameEntryState;

  beforeEach(() => {
    nes = new NameEntryState();
  });

  it('pressing left wraps from A to Z', () => {
    nes.update(16, true, false, false);
    expect(nes.letterIndices[0]).toBe(NAME_ENTRY_LETTERS.length - 1); // Z
  });

  it('pressing left from B selects A', () => {
    nes.update(16, false, true, false); // A → B
    nes.update(16, false, false, false);
    nes.update(16, true, false, false); // B → A
    expect(nes.letterIndices[0]).toBe(0); // A
  });
});

// ─── Confirm / slot advancement ───────────────────────────────────────────────

describe('NameEntryState — confirm advances slot', () => {
  let nes: NameEntryState;

  beforeEach(() => {
    nes = new NameEntryState();
  });

  it('confirm key moves from slot 0 to slot 1', () => {
    nes.update(16, false, false, true); // confirm
    expect(nes.currentSlot).toBe(1);
  });

  it('confirm key moves from slot 1 to slot 2', () => {
    nes.update(16, false, false, true);
    nes.update(16, false, false, false); // release
    nes.update(16, false, false, true);
    expect(nes.currentSlot).toBe(2);
  });

  it('confirming slot 2 sets isDone=true', () => {
    for (let i = 0; i < 3; i++) {
      nes.update(16, false, false, true);
      nes.update(16, false, false, false);
    }
    expect(nes.isDone).toBe(true);
  });

  it('does not fire multiple confirms on one key hold', () => {
    // Holding confirm for 3 frames should only advance once (edge detection)
    nes.update(16, false, false, true);
    nes.update(16, false, false, true);
    nes.update(16, false, false, true);
    expect(nes.currentSlot).toBe(1);
  });
});

// ─── Initials built correctly ─────────────────────────────────────────────────

describe('NameEntryState — initials', () => {
  it('builds initials from all three slots', () => {
    const nes = new NameEntryState();
    // Slot 0 → B (right once)
    nes.update(16, false, true, false);
    nes.update(16, false, false, false);
    nes.update(16, false, false, true); // confirm B
    nes.update(16, false, false, false);

    // Slot 1 → C (right twice)
    nes.update(16, false, true, false);
    nes.update(16, false, false, false);
    nes.update(16, false, true, false);
    nes.update(16, false, false, false);
    nes.update(16, false, false, true); // confirm C
    nes.update(16, false, false, false);

    // Slot 2 → A (default, confirm directly)
    nes.update(16, false, false, true); // confirm A
    nes.update(16, false, false, false);

    expect(nes.initials).toBe('BCA');
    expect(nes.isDone).toBe(true);
  });
});

// ─── Key-repeat behaviour ─────────────────────────────────────────────────────

describe('NameEntryState — key repeat', () => {
  it('fires once on the first press frame (no delay)', () => {
    const nes = new NameEntryState();
    nes.update(16, false, true, false); // first frame with key held
    expect(nes.letterIndices[0]).toBe(1); // one step taken
  });

  it('does not fire between initial press and INITIAL_DELAY_MS', () => {
    const nes = new NameEntryState();
    nes.update(16, false, true, false); // fires on first press
    // Hold right for 100 ms total (less than INITIAL_DELAY_MS 350)
    nes.update(100, false, true, false);
    expect(nes.letterIndices[0]).toBe(1); // no extra step
  });

  it('fires again after INITIAL_DELAY_MS when held', () => {
    const nes = new NameEntryState();
    nes.update(16, false, true, false); // initial press fires step
    // Advance through the initial delay
    nes.update(NameEntryState.INITIAL_DELAY_MS, false, true, false);
    expect(nes.letterIndices[0]).toBe(2); // repeat fired
  });

  it('fires at REPEAT_RATE_MS intervals after initial delay', () => {
    const nes = new NameEntryState();
    nes.update(16, false, true, false); // initial press → index 1
    nes.update(NameEntryState.INITIAL_DELAY_MS, false, true, false); // repeat → index 2
    nes.update(NameEntryState.REPEAT_RATE_MS, false, true, false); // repeat → index 3
    expect(nes.letterIndices[0]).toBe(3);
  });

  it('resets repeat state when key is released', () => {
    const nes = new NameEntryState();
    nes.update(16, false, true, false); // initial press
    nes.update(16, false, false, false); // release
    nes.update(16, false, true, false); // press again — should fire immediately
    expect(nes.letterIndices[0]).toBe(2);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('NameEntryState — reset', () => {
  it('resets slot to 0', () => {
    const nes = new NameEntryState();
    nes.update(16, false, false, true);
    nes.reset();
    expect(nes.currentSlot).toBe(0);
  });

  it('resets initials to AAA', () => {
    const nes = new NameEntryState();
    nes.update(16, false, true, false); // select B
    nes.reset();
    expect(nes.initials).toBe('AAA');
  });

  it('resets isDone to false', () => {
    const nes = new NameEntryState();
    for (let i = 0; i < 3; i++) {
      nes.update(16, false, false, true);
      nes.update(16, false, false, false);
    }
    expect(nes.isDone).toBe(true);
    nes.reset();
    expect(nes.isDone).toBe(false);
  });

  it('clears key-repeat state after reset', () => {
    const nes = new NameEntryState();
    // Hold right key for a while
    nes.update(400, false, true, false);
    nes.reset();
    // After reset the first frame with key held should fire just once
    nes.update(16, false, true, false);
    expect(nes.letterIndices[0]).toBe(1); // only one step, no leftover repeat
  });
});

// ─── isDone prevents further updates ─────────────────────────────────────────

describe('NameEntryState — isDone prevents changes', () => {
  it('ignores inputs after isDone is true', () => {
    const nes = new NameEntryState();
    for (let i = 0; i < 3; i++) {
      nes.update(16, false, false, true);
      nes.update(16, false, false, false);
    }
    expect(nes.isDone).toBe(true);
    const initialsBefore = nes.initials;
    nes.update(16, false, true, false); // try to change letter
    expect(nes.initials).toBe(initialsBefore);
  });
});

// ─── NAME_ENTRY_LETTERS export ────────────────────────────────────────────────

describe('NAME_ENTRY_LETTERS', () => {
  it('contains 26 characters', () => {
    expect(NAME_ENTRY_LETTERS).toHaveLength(26);
  });

  it('starts with A and ends with Z', () => {
    expect(NAME_ENTRY_LETTERS[0]).toBe('A');
    expect(NAME_ENTRY_LETTERS[25]).toBe('Z');
  });

  it('contains no duplicates', () => {
    const unique = new Set(NAME_ENTRY_LETTERS);
    expect(unique.size).toBe(NAME_ENTRY_LETTERS.length);
  });
});
