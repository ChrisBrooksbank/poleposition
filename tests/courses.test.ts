import { describe, it, expect } from 'vitest';
import { Track } from '../src/sim/Track';
import { COURSES, REFERENCE_LAP_LENGTH, courseById } from '../src/sim/courses';
import { buildSceneryLayout, KERB_WIDTH, TERRAIN_HALF_WIDTH } from '../src/sim/scenery';
import { PUDDLE_HALF_WIDTH } from '../src/sim/hazards';

describe.each(COURSES.map((c) => [c.name, c] as const))('%s', (_name, course) => {
  const track = new Track(course.def);
  const pts = track.buildCenterline(4);
  const end = pts[pts.length - 1];

  it('has a sensible lap length', () => {
    expect(track.length).toBeGreaterThan(2500);
    expect(track.length).toBeLessThan(5500);
  });

  it('closes on itself: net 360 degree turn, ends where it started, same height', () => {
    expect(end.heading).toBeCloseTo(2 * Math.PI, 2);
    expect(Math.hypot(end.x, end.z)).toBeLessThan(0.01);
    expect(Math.abs(end.y)).toBeLessThan(0.01);
  });

  it('never runs within 120 m of another part of the lap (so scenery and terrain never overlap)', () => {
    let min = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const along = pts[j].s - pts[i].s;
        if (along < 250 || track.length - along < 250) continue;
        min = Math.min(min, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z));
      }
    }
    expect(min).toBeGreaterThan(120);
  });

  it('keeps every curve at a radius a car can hold at low speed (>= 60 m)', () => {
    for (const seg of course.def.segments) {
      if (seg.curvature !== 0) expect(1 / Math.abs(seg.curvature)).toBeGreaterThan(60);
    }
  });

  it('has puddles on the tarmac and scenery clear of the road', () => {
    for (const p of course.puddles) {
      expect(p.s).toBeGreaterThan(0);
      expect(p.s).toBeLessThan(track.length);
      expect(Math.abs(p.lateral) + PUDDLE_HALF_WIDTH).toBeLessThan(course.def.roadWidth / 2 + 1);
    }
    const half = course.def.roadWidth / 2 + KERB_WIDTH;
    for (const it of buildSceneryLayout(track)) {
      if (it.kind === 'gantry' || it.kind === 'startline') continue;
      expect(Math.abs(it.lateral)).toBeGreaterThan(half);
      expect(Math.abs(it.lateral)).toBeLessThan(TERRAIN_HALF_WIDTH);
    }
  });
});

describe('courses', () => {
  it('lists Fuji first and looks courses up by id', () => {
    expect(COURSES[0].id).toBe('fuji');
    expect(COURSES.map((c) => c.id)).toEqual(['fuji', 'test', 'suzuka', 'seaside']);
    expect(courseById('suzuka').name).toBe('SUZUKA');
    expect(REFERENCE_LAP_LENGTH).toBe(4360);
  });
});
