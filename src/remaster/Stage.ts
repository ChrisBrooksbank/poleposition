// Stage - Three.js renderer, scene and camera locked to a 4:3 letterboxed viewport.
import * as THREE from 'three';

export const ASPECT = 4 / 3;

/** Largest 4:3 rectangle that fits inside the given size. */
export function fitAspect(width: number, height: number): { width: number; height: number } {
  if (width / height > ASPECT) return { width: Math.floor(height * ASPECT), height };
  return { width, height: Math.floor(width / ASPECT) };
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, ASPECT, 0.1, 5000);

  constructor(host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x6ab7ff);
    this.scene.fog = new THREE.Fog(0x6ab7ff, 200, 1800);
    host.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    const { width, height } = fitAspect(window.innerWidth, window.innerHeight);
    this.renderer.setSize(width, height);
    this.camera.aspect = ASPECT;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
