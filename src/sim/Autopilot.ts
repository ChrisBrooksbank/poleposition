// Autopilot - a simple competent driver: holds the racing line, brakes early for corners and
// steers around slower traffic. Used for the attract-mode demo lap, automated play-tests and as
// the drivability check for every course.

import { PlayerCar, MPH_TO_MS, type CarInput } from './PlayerCar';
import { wrapDelta } from './hazards';
import type { Track } from './Track';

const BRAKE_MS2 = PlayerCar.BRAKE_DECEL * MPH_TO_MS;
const TOP_SPEED_MS = 225 * MPH_TO_MS;

/** Something on the road the driver should go around. */
export interface Obstacle {
  s: number;
  lateral: number;
}

/** Highest speed (m/s) at which steering can just hold the line through a curve of this curvature. */
export function cornerSpeed(curvature: number): number {
  const k = Math.abs(curvature) * PlayerCar.CURVE_PUSH * 1.1;
  const steerBase = PlayerCar.MAX_STEER_SPEED * PlayerCar.MIN_STEER_AUTHORITY;
  const steerPerMs =
    (PlayerCar.MAX_STEER_SPEED * (1 - PlayerCar.MIN_STEER_AUTHORITY)) / TOP_SPEED_MS;
  if (k < 1e-9) return Infinity;
  return (steerPerMs + Math.sqrt(steerPerMs ** 2 + 4 * k * steerBase)) / (2 * k);
}

export interface AutopilotOptions {
  /** 1 = flat out where possible; lower values brake earlier and take corners slower. */
  skill?: number;
  /** Cars and other objects to steer around. */
  obstacles?: readonly Obstacle[];
}

export function autopilotInput(
  track: Track,
  car: PlayerCar,
  { skill = 1, obstacles = [] }: AutopilotOptions = {}
): CarInput {
  const distance = track.wrap(car.distance);

  // Braking: look ahead for the speed each upcoming point allows.
  let brake = false;
  for (let d = 0; d <= 450; d += 10) {
    const allowed = cornerSpeed(track.curvatureAt(distance + d)) * skill;
    if (car.speed ** 2 > allowed ** 2 + 2 * BRAKE_MS2 * d * 0.85) brake = true;
  }

  // Lateral target: the centreline, nudged away from any car close ahead in our lane.
  let target = 0;
  for (const o of obstacles) {
    const ahead = wrapDelta(track, o.s, distance);
    const closing = 8 + car.speed * 0.9;
    if (ahead > 0 && ahead < closing && Math.abs(o.lateral - car.lateral) < 2.6) {
      target = o.lateral > car.lateral ? o.lateral - 3.4 : o.lateral + 3.4;
      target = Math.max(-5, Math.min(5, target));
      // Cars too close and in our way: lift as well.
      if (ahead < 25 && car.speed > 25) brake = true;
    }
  }

  const want = (target - car.lateral) * 1.5;
  return {
    left: want < -0.3,
    right: want > 0.3,
    throttle: !brake,
    brake,
    gear: car.speedMph > 55 ? 'high' : 'low',
  };
}
