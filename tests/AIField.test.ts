import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { FUJI } from '../src/sim/tracks/fuji';
import { AIField, AI_COUNT, gridSlot } from '../src/sim/AIField';
import { MPH_TO_MS } from '../src/sim/PlayerCar';

const track = new Track(FUJI);

describe('AIField', () => {
  it('has seven cars at speeds below the player top speed', () => {
    const field = new AIField(track);
    expect(field.all).toHaveLength(AI_COUNT);
    for (const c of field.all) expect(c.speed).toBeLessThan(225 * MPH_TO_MS);
  });

  it('moves cars at constant speed with no rubber-banding', () => {
    const field = new AIField(track);
    const before = field.all.map((c) => c.distance);
    for (let i = 0; i < 60; i++) field.update(1 / 60);
    field.all.forEach((c, i) => expect(c.distance - before[i]).toBeCloseTo(c.speed, 1));
  });

  it('scales speed with the AI multiplier', () => {
    const a = new AIField(track);
    const b = new AIField(track);
    for (let i = 0; i < 60; i++) {
      a.update(1 / 60, 1);
      b.update(1 / 60, 0.5);
    }
    expect(b.all[0].speed).toBeCloseTo(a.all[0].speed / 2, 3);
  });

  it('lays out a grid that leaves the player slot free, behind the start line', () => {
    const field = new AIField(track);
    field.startGrid(3);
    expect(field.all).toHaveLength(AI_COUNT);
    const player = gridSlot(3);
    for (const c of field.all) {
      expect(c.distance).toBeLessThan(0);
      expect(c.speed).toBe(0);
      expect(c.distance === player.distance && c.lateral === player.lateral).toBe(false);
    }
    const slots = new Set(field.all.map((c) => `${c.distance}:${c.lateral}`));
    expect(slots.size).toBe(AI_COUNT);
  });

  it('launches from the grid up to cruise speed', () => {
    const field = new AIField(track);
    field.startGrid(0);
    for (let i = 0; i < 60 * 15; i++) field.update(1 / 60);
    expect(field.all[0].speed).toBeGreaterThan(150 * MPH_TO_MS);
    expect(field.all[0].distance).toBeGreaterThan(0);
  });

  it('reports lap-relative positions', () => {
    const field = new AIField(track);
    field.startGrid(0);
    expect(field.sOf(field.all[0])).toBeGreaterThan(track.length - 100);
  });
});
