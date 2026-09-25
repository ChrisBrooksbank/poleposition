// carModel - procedural low-poly 1980s Formula One car. The car faces +z, y is up, width along x.
import * as THREE from 'three';

export interface CarModelOptions {
  body: number;
  accent: number;
  helmet?: number;
}

export interface CarModel {
  group: THREE.Group;
  /** Rolling pivots (rotate about x to spin), one per wheel. */
  spinners: Array<{ pivot: THREE.Object3D; radius: number }>;
  /** Groups the front wheels are steered by (rotate about y). */
  steerers: THREE.Object3D[];
}

const TYRE = new THREE.MeshLambertMaterial({ color: 0x151515 });
const RIM = new THREE.MeshLambertMaterial({ color: 0xb8b8c0 });
const CARBON = new THREE.MeshLambertMaterial({ color: 0x222226 });

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function makeWheel(
  radius: number,
  width: number
): { steer: THREE.Group; pivot: THREE.Group; radius: number } {
  const steer = new THREE.Group();
  const pivot = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), TYRE);
  tyre.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width + 0.02, 10),
    RIM
  );
  rim.rotation.z = Math.PI / 2;
  // A single off-centre spoke block makes the spin visible.
  const spoke = box(width + 0.04, radius * 0.9, 0.08, CARBON, 0, 0, 0);
  pivot.add(tyre, rim, spoke);
  steer.add(pivot);
  return { steer, pivot, radius };
}

export function createCarModel(opts: CarModelOptions): CarModel {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: opts.body });
  const accent = new THREE.MeshLambertMaterial({ color: opts.accent });
  const helmet = new THREE.MeshLambertMaterial({ color: opts.helmet ?? 0xf0f0f0 });

  // Monocoque, nose and sidepods.
  group.add(box(0.7, 0.5, 2.6, paint, 0, 0.5, 0.2));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 12), paint);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.42, 2.25);
  group.add(nose);
  group.add(box(0.5, 0.42, 1.5, paint, -0.7, 0.42, -0.1));
  group.add(box(0.5, 0.42, 1.5, paint, 0.7, 0.42, -0.1));
  group.add(box(0.15, 0.04, 2.4, accent, 0, 0.77, 0.4));

  // Engine cover and airbox.
  group.add(box(0.55, 0.5, 1.4, paint, 0, 0.72, -1.15));
  group.add(box(0.3, 0.35, 0.5, accent, 0, 1.05, -0.65));

  // Cockpit and driver.
  group.add(box(0.5, 0.12, 0.7, CARBON, 0, 0.78, 0.35));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), helmet);
  head.position.set(0, 0.98, 0.3);
  group.add(head);

  // Front wing with endplates.
  group.add(box(2.0, 0.06, 0.5, accent, 0, 0.16, 2.55));
  group.add(box(0.05, 0.22, 0.55, paint, -1.0, 0.24, 2.55));
  group.add(box(0.05, 0.22, 0.55, paint, 1.0, 0.24, 2.55));

  // Rear wing with endplates and supports.
  group.add(box(1.6, 0.08, 0.5, accent, 0, 1.2, -2.05));
  group.add(box(0.05, 0.5, 0.6, paint, -0.8, 1.05, -2.05));
  group.add(box(0.05, 0.5, 0.6, paint, 0.8, 1.05, -2.05));
  group.add(box(0.08, 0.5, 0.15, CARBON, 0, 0.92, -1.9));

  // Soft blob shadow to seat the car on the road.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    })
  );
  shadow.scale.set(1.0, 2.4, 1);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, 0);
  group.add(shadow);

  const spinners: CarModel['spinners'] = [];
  const steerers: THREE.Object3D[] = [];
  const wheelSpecs = [
    { x: -0.85, z: 1.5, r: 0.33, w: 0.36, front: true },
    { x: 0.85, z: 1.5, r: 0.33, w: 0.36, front: true },
    { x: -0.85, z: -1.35, r: 0.37, w: 0.5, front: false },
    { x: 0.85, z: -1.35, r: 0.37, w: 0.5, front: false },
  ];
  for (const spec of wheelSpecs) {
    const wheel = makeWheel(spec.r, spec.w);
    wheel.steer.position.set(spec.x, spec.r, spec.z);
    group.add(wheel.steer);
    spinners.push({ pivot: wheel.pivot, radius: wheel.radius });
    if (spec.front) steerers.push(wheel.steer);
  }

  return { group, spinners, steerers };
}

/** Spin the wheels for the distance travelled and turn the front wheels. */
export function animateCar(model: CarModel, distance: number, steer: number): void {
  for (const s of model.spinners) s.pivot.rotation.x = distance / s.radius;
  for (const f of model.steerers) f.rotation.y = -steer * 0.35;
}
