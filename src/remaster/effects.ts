// effects - crash explosion particles, puddle decals and spray.
import * as THREE from 'three';
import type { Track } from '../sim/Track';
import { PUDDLE_HALF_LENGTH, PUDDLE_HALF_WIDTH, type Puddle } from '../sim/hazards';
import { seededRandom } from '../sim/scenery';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startScale: number;
  fire: boolean;
}

const FIRE = [new THREE.Color(0xfff2a0), new THREE.Color(0xff9d1c), new THREE.Color(0xe0400c)];
const SMOKE = new THREE.Color(0x2a2a2a);

/** A burst of fire and smoke for a crash. Pool-based: create once, call start() per crash. */
export class Explosion {
  readonly group = new THREE.Group();
  private readonly particles: Particle[] = [];
  private readonly light = new THREE.PointLight(0xffa040, 0, 60);
  private readonly rand = seededRandom(1234);
  private age = 0;
  private running = false;

  static readonly DURATION = 2.5;

  constructor(count = 48) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false })
      );
      mesh.visible = false;
      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        startScale: 1,
        fire: true,
      });
    }
    this.group.add(this.light);
  }

  get active(): boolean {
    return this.running;
  }

  start(position: THREE.Vector3): void {
    this.running = true;
    this.age = 0;
    this.group.position.copy(position);
    for (const p of this.particles) {
      const r = this.rand;
      p.fire = r() < 0.6;
      p.maxLife = p.fire ? 0.6 + r() * 0.8 : 1.4 + r() * 1.1;
      p.life = 0;
      p.startScale = p.fire ? 0.18 + r() * 0.3 : 0.25 + r() * 0.35;
      p.velocity.set((r() - 0.5) * 7, 1.5 + r() * 5, (r() - 0.5) * 7);
      p.mesh.position.set((r() - 0.5) * 1.4, 0.4 + r() * 0.8, (r() - 0.5) * 3);
      p.mesh.visible = true;
    }
  }

  update(dt: number): void {
    if (!this.running) return;
    this.age += dt;
    this.light.intensity = Math.max(0, 1 - this.age / 0.5) * 400;
    let alive = false;
    for (const p of this.particles) {
      if (!p.mesh.visible) continue;
      p.life += dt;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.mesh.visible = false;
        continue;
      }
      alive = true;
      p.velocity.y += (p.fire ? 1 : 3) * dt;
      p.velocity.multiplyScalar(1 - 0.8 * dt);
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.scale.setScalar(p.startScale * (1 + t * (p.fire ? 2 : 3.5)));
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (p.fire) {
        const stage = t * (FIRE.length - 1);
        const i = Math.min(FIRE.length - 2, Math.floor(stage));
        mat.color.copy(FIRE[i]).lerp(FIRE[i + 1], stage - i);
        mat.opacity = 1 - t * 0.5;
      } else {
        mat.color.copy(SMOKE);
        mat.opacity = 0.75 * (1 - t);
      }
    }
    if (!alive && this.age > Explosion.DURATION) this.running = false;
  }
}

/** Dark water patches lying on the road surface. */
export function createPuddleMeshes(track: Track, puddles: readonly Puddle[]): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.CircleGeometry(1, 28);
  const water = new THREE.MeshBasicMaterial({
    color: 0x24425e,
    transparent: true,
    opacity: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const shine = new THREE.MeshBasicMaterial({
    color: 0x9cc4e8,
    transparent: true,
    opacity: 0.35,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  for (const p of puddles) {
    const pose = track.poseAt(p.s, p.lateral);
    const holder = new THREE.Group();
    const body = new THREE.Mesh(geo, water);
    body.scale.set(PUDDLE_HALF_WIDTH, PUDDLE_HALF_LENGTH, 1);
    const glint = new THREE.Mesh(geo, shine);
    glint.scale.set(PUDDLE_HALF_WIDTH * 0.55, PUDDLE_HALF_LENGTH * 0.5, 1);
    glint.position.set(-0.3, 0.8, 0);
    const flat = new THREE.Group();
    flat.rotation.x = -Math.PI / 2;
    flat.add(body, glint);
    holder.add(flat);
    holder.position.set(pose.x, pose.y + 0.04, pose.z);
    holder.rotation.y = -pose.heading;
    group.add(holder);
  }
  return group;
}
