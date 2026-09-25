import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { COURSES, REFERENCE_LAP_LENGTH } from '../src/sim/courses';
import { FUJI } from '../src/sim/tracks/fuji';
import { PlayerCar } from '../src/sim/PlayerCar';
import { autopilotInput } from '../src/sim/Autopilot';
import { computeGridPosition } from '../src/state/QualifyingState';

/** Runs the autopilot for one lap and reports how it got on. */
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
    car.step(dt, autopilotInput(track, car));
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

describe('autopilot with traffic', () => {
  it('steers around a slower car in its lane instead of hitting it', () => {
    const track = new Track(FUJI);
    const car = new PlayerCar(track);
    car.distance = 100;
    car.speed = 60;
    const blocker = { s: 300, lateral: 0 };
    let minGap = Infinity;
    for (let i = 0; i < 60 * 8; i++) {
      blocker.s += 40 / 60;
      car.step(1 / 60, autopilotInput(track, car, { obstacles: [blocker] }));
      const along = Math.abs(blocker.s - track.wrap(car.distance));
      if (along < 4.5) minGap = Math.min(minGap, Math.abs(blocker.lateral - car.lateral));
    }
    expect(minGap).toBeGreaterThan(2);
  });
});
