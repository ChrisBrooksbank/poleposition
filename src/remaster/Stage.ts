// Stage - Three.js renderer, scene and camera locked to a 4:3 letterboxed viewport.
// The WebGL canvas lives in a wrapper div so a 2D overlay canvas can sit exactly on top of it.
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
  readonly camera = new THREE.PerspectiveCamera(60, ASPECT, 0.5, 30000);
  /** Sized to the 4:3 play area; overlays are children of this element. */
  readonly wrapper: HTMLDivElement;

  constructor(host: HTMLElement) {
    this.wrapper = document.createElement('div');
    this.wrapper.style.position = 'relative';
    host.appendChild(this.wrapper);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0xcfe6ff);
    this.scene.fog = new THREE.Fog(0xcfe6ff, 400, 3500);
    this.wrapper.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    const { width, height } = fitAspect(window.innerWidth, window.innerHeight);
    this.wrapper.style.width = `${width}px`;
    this.wrapper.style.height = `${height}px`;
    this.renderer.setSize(width, height);
    this.camera.aspect = ASPECT;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
