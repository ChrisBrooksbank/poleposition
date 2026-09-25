import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCarModel, animateCar } from '../src/remaster/carModel';

describe('carModel', () => {
  const model = createCarModel({ body: 0xd22020, accent: 0xffffff });

  it('has four wheels, two of them steerable', () => {
    expect(model.spinners).toHaveLength(4);
    expect(model.steerers).toHaveLength(2);
  });

  it('is a plausible F1 size, facing +z and sitting on the ground', () => {
    const size = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3());
    expect(size.z).toBeGreaterThan(4);
    expect(size.z).toBeLessThan(5.5);
    expect(size.x).toBeGreaterThan(1.7);
    expect(size.x).toBeLessThan(2.3);
    const box = new THREE.Box3().setFromObject(model.group);
    expect(box.min.y).toBeCloseTo(0, 1);
    // Nose (front wing) extends further forward than the rear wing extends back.
    expect(box.max.z).toBeGreaterThan(2.5);
    expect(box.min.z).toBeLessThan(-2);
  });

  it('spins wheels by distance over radius and steers the front pair only', () => {
    animateCar(model, 10, 1);
    for (const s of model.spinners) expect(s.pivot.rotation.x).toBeCloseTo(10 / s.radius, 5);
    for (const f of model.steerers) expect(f.rotation.y).not.toBe(0);
    animateCar(model, 0, 0);
    for (const f of model.steerers) expect(f.rotation.y).toBeCloseTo(0, 5);
  });
});
