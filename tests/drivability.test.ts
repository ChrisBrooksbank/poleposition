import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { COURSES, REFERENCE_LAP_LENGTH } from '../src/sim/courses';
import { FUJI } from '../src/sim/tracks/fuji';
import { PlayerCar, MPH_TO_MS, type CarInput } from '../src/sim/PlayerCar';
import { computeGridPosition } from '../src/state/QualifyingState';

const BRAKE_MS2 = PlayerCar.BRAKE_DECEL * MPH_TO_MS;

/** Highest speed (m/s) at which steering can just hold the line through a curve of this curvature. */
function cornerSpeed(curvature: number): number {
  const k = Math.abs(curvature) * PlayerCar.CURVE_PUSH * 1.1;
  const steerBase = PlayerCar.MAX_STEER_SPEED * PlayerCar.MIN_STEER_AUTHORITY;
  const steerPerMs =
    (PlayerCar.MAX_STEER_SPEED * (1 - PlayerCar.MIN_STEER_AUTHORITY)) / (225 * MPH_TO_MS);
  if (k < 1e-9) return Infinity;
  return (steerPerMs + Math.sqrt(steerPerMs ** 2 + 4 * k * steerBase)) / (2 * k);
}

/** A simple competent driver: holds the centreline and brakes early enough for every corner. */
function driveLap(
  track: Track,
  startDistance = 0
): { time: number; car: PlayerCar; offRoadTime: number } {
  const car = new PlayerCar(track);
  car.distance = startDistance;
  const dt = 1 / 60;
  let time = 0;
  let offRoadTime = 0;
  while (car.distance < track.length && time < 200) {
    // Braking check: look ahead for the speed each upcoming point allows.
    let brake = false;
    for (let d = 0; d <= 400; d += 10) {
      const allowed = cornerSpeed(track.curvatureAt(car.distance + d));
      if (car.speed ** 2 > allowed ** 2 + 2 * BRAKE_MS2 * d * 0.85) brake = true;
    }
    // Steer against the outward push, plus a proportional pull back to the centreline.
    const curv = track.curvatureAt(car.distance);
    const want = -car.lateral * 1.5 + curv * car.speed * car.speed * PlayerCar.CURVE_PUSH * 0;
    const input: CarInput = {
      left: want < -0.3 || (curv < 0 && car.lateral > 0.3 && want < 0.3),
      right: want > 0.3,
      throttle: !brake,
      brake,
      gear: car.speedMph > 55 ? 'high' : 'low',
    };
    car.step(dt, input);
    if (car.offRoad) offRoadTime += dt;
    time += dt;
  }
  return { time, car, offRoadTime };
}

describe('drivability', () => {
  const track = new Track(FUJI);

  it('a competent driver completes a qualifying lap inside the time limit', () => {
    const { time, offRoadTime } = driveLap(track);
    expect(offRoadTime).toBeLessThan(3);
    expect(computeGridPosition(time)).toBeGreaterThan(0);
    expect(time).toBeLessThan(73);
    expect(time).toBeGreaterThan(44);
  });

  it('a driver who never lifts cannot take the left hairpin flat out', () => {
    const car = new PlayerCar(track);
    let off = false;
    for (let i = 0; i < 60 * 80 && car.distance < track.length; i++) {
      car.step(1 / 60, { left: false, right: false, throttle: true, brake: false, gear: 'high' });
      if (car.offRoad) off = true;
    }
    expect(off).toBe(true);
  });
});

describe.each(COURSES.map((c) => [c.name, c] as const))('%s drivability', (_name, course) => {
  const track = new Track(course.def);

  it('a competent driver stays on the road and qualifies against the scaled thresholds', () => {
    const { time, offRoadTime } = driveLap(track);
    expect(offRoadTime).toBeLessThan(4);
    expect(computeGridPosition(time * (REFERENCE_LAP_LENGTH / track.length))).toBeGreaterThan(0);
  });
});
