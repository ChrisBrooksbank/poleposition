import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { PlayerCar, MPH_TO_MS, type CarInput } from '../src/sim/PlayerCar';

const straight = new Track({
  name: 's',
  roadWidth: 14,
  segments: [{ name: 's', length: 5000, curvature: 0, slope: 0 }],
});
const rightCurve = new Track({
  name: 'r',
  roadWidth: 14,
  segments: [{ name: 'r', length: 5000, curvature: 0.005, slope: 0 }],
});

const idle: CarInput = { left: false, right: false, throttle: false, brake: false, gear: 'high' };
const run = (car: PlayerCar, input: CarInput, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) car.step(1 / 60, input);
};

describe('PlayerCar', () => {
  it('accelerates faster in low gear but caps at half top speed', () => {
    const low = new PlayerCar(straight);
    const high = new PlayerCar(straight);
    run(low, { ...idle, throttle: true, gear: 'low' }, 1);
    run(high, { ...idle, throttle: true, gear: 'high' }, 1);
    expect(low.speedMph).toBeCloseTo(60, 0);
    expect(high.speedMph).toBeCloseTo(30, 0);
    run(low, { ...idle, throttle: true, gear: 'low' }, 10);
    expect(low.speedMph).toBeCloseTo(112.5, 1);
  });

  it('reaches the configured top speed in high gear', () => {
    const car = new PlayerCar(straight, 195);
    car.speed = 100 * MPH_TO_MS;
    run(car, { ...idle, throttle: true }, 10);
    expect(car.speedMph).toBeCloseTo(195, 1);
  });

  it('brakes to a stop and never goes negative', () => {
    const car = new PlayerCar(straight);
    car.speed = 50 * MPH_TO_MS;
    run(car, { ...idle, brake: true }, 5);
    expect(car.speed).toBe(0);
  });

  it('sheds speed above the gear cap after shifting down', () => {
    const car = new PlayerCar(straight);
    car.speed = 200 * MPH_TO_MS;
    run(car, { ...idle, gear: 'low', throttle: true }, 1);
    expect(car.speedMph).toBeCloseTo(180, 0);
  });

  it('steers right with positive lateral and scales with speed', () => {
    const slow = new PlayerCar(straight);
    const fast = new PlayerCar(straight);
    slow.speed = 20 * MPH_TO_MS;
    fast.speed = 200 * MPH_TO_MS;
    run(slow, { ...idle, right: true, gear: 'low' }, 0.5);
    run(fast, { ...idle, right: true }, 0.5);
    expect(fast.lateral).toBeGreaterThan(slow.lateral);
    expect(slow.lateral).toBeGreaterThan(0);
  });

  it('pushes the car outward (left) in a right-hand curve', () => {
    const car = new PlayerCar(rightCurve);
    car.speed = 100 * MPH_TO_MS;
    run(car, { ...idle, throttle: true }, 1);
    expect(car.lateral).toBeLessThan(0);
  });

  it('slows and caps speed on grass', () => {
    const car = new PlayerCar(straight);
    car.speed = 150 * MPH_TO_MS;
    car.lateral = 10;
    expect(car.offRoad).toBe(true);
    run(car, { ...idle, throttle: true }, 2);
    expect(car.speedMph).toBeLessThanOrEqual(PlayerCar.OFF_ROAD_CAP + 0.001);
  });

  it('advances distance, counts laps, and respawns at rest', () => {
    const car = new PlayerCar(straight);
    car.speed = 100;
    run(car, idle, 1);
    expect(car.distance).toBeGreaterThan(50);
    car.distance = straight.length + 1;
    expect(car.lap).toBe(1);
    car.lateral = 5;
    car.respawn();
    expect(car.speed).toBe(0);
    expect(car.lateral).toBe(0);
  });
});

describe('PlayerCar off-road recovery', () => {
  it('can accelerate up to the grass cap from a standstill instead of sticking', () => {
    const car = new PlayerCar(straight);
    car.lateral = 12;
    run(car, { ...idle, throttle: true }, 2);
    expect(car.speedMph).toBeGreaterThan(20);
    expect(car.speedMph).toBeLessThanOrEqual(PlayerCar.OFF_ROAD_CAP + 0.001);
  });

  it('can steer back onto the road from the grass', () => {
    const car = new PlayerCar(straight);
    car.lateral = 8;
    run(car, { ...idle, throttle: true, left: true }, 2);
    expect(car.lateral).toBeLessThan(6);
    expect(car.offRoad).toBe(false);
  });
});
