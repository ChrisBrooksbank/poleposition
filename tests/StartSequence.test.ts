import { describe, it, expect } from 'vitest';
import { StartSequence } from '../src/state/StartSequence';

function at(ms: number): StartSequence {
  const seq = new StartSequence();
  seq.update(ms);
  return seq;
}

describe('StartSequence', () => {
  it('holds the car and flies the banner before any light comes on', () => {
    const seq = at(100);
    expect(seq.isHolding).toBe(true);
    expect(seq.isFlyingBy).toBe(true);
    expect(seq.redLights).toBe(0);
    expect(seq.showLights).toBe(false);
  });

  it('lights the reds one at a time after the flyby', () => {
    const t = StartSequence.FLYBY_MS;
    expect(at(t + 10).redLights).toBe(1);
    expect(at(t + StartSequence.LIGHT_MS + 10).redLights).toBe(2);
    expect(at(t + 2 * StartSequence.LIGHT_MS + 10).redLights).toBe(3);
    expect(at(t + 2 * StartSequence.LIGHT_MS + 10).isHolding).toBe(true);
    expect(at(t + 10).showLights).toBe(true);
  });

  it('goes green and releases the car, then hides the lights', () => {
    const go = at(StartSequence.GO_MS);
    expect(go.isHolding).toBe(false);
    expect(go.redLights).toBe(0);
    expect(go.showGreen).toBe(true);
    expect(go.showLights).toBe(true);
    const later = at(StartSequence.GO_MS + StartSequence.GREEN_HOLD_MS);
    expect(later.showGreen).toBe(false);
    expect(later.showLights).toBe(false);
  });

  it('reports flyby progress from 0 to 1', () => {
    expect(at(0).flybyProgress).toBe(0);
    expect(at(StartSequence.FLYBY_MS / 2).flybyProgress).toBeCloseTo(0.5);
    expect(at(99999).flybyProgress).toBe(1);
  });

  it('can be reset', () => {
    const seq = at(99999);
    seq.reset();
    expect(seq.isHolding).toBe(true);
  });
});
