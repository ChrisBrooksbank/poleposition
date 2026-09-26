// bannerPlane - the little plane that tows a banner across the sky before each race.
// It is drawn as one camera-facing textured quad so it always reads left to right on screen.
import * as THREE from 'three';

const TEX_W = 1024;
const TEX_H = 256;
/** Distance ahead of the camera and size of the quad, in metres. */
const DISTANCE = 40;
const QUAD_W = 56;
const QUAD_H = (QUAD_W * TEX_H) / TEX_W;
/** How high above the view centre the plane flies, and how far it must travel to clear the screen. */
const HEIGHT = 9;
const TRAVEL = 60;

function drawBanner(ctx: CanvasRenderingContext2D, label: string): void {
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  // Tow rope from the plane's tail to the banner.
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(792, 132);
  ctx.lineTo(720, 118);
  ctx.moveTo(792, 132);
  ctx.lineTo(720, 150);
  ctx.stroke();

  // Banner with a wavy trailing edge.
  ctx.fillStyle = '#fdfaf0';
  ctx.strokeStyle = '#c8102e';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(720, 96);
  for (let x = 720; x >= 24; x -= 8) {
    ctx.lineTo(x, 96 + Math.sin(x / 38) * 5);
  }
  for (let x = 24; x <= 720; x += 8) {
    ctx.lineTo(x, 172 + Math.sin(x / 38) * 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c8102e';
  ctx.font = 'bold 54px Arial Black, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 372, 136, 660);

  // Plane, flying right: fuselage, wing, tail fin, cockpit and propeller.
  ctx.fillStyle = '#d22020';
  ctx.beginPath();
  ctx.ellipse(880, 132, 92, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(800, 128);
  ctx.lineTo(786, 92);
  ctx.lineTo(828, 118);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(852, 60, 84, 10);
  ctx.fillRect(852, 100, 84, 10);
  ctx.fillStyle = '#444';
  ctx.fillRect(858, 66, 4, 40);
  ctx.fillRect(926, 66, 4, 40);
  ctx.fillStyle = '#9fd6ff';
  ctx.beginPath();
  ctx.ellipse(890, 118, 16, 11, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(968, 108, 6, 48);
}

export class BannerPlane {
  readonly mesh: THREE.Mesh;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;
  private label = '';

  constructor() {
    this.canvas.width = TEX_W;
    this.canvas.height = TEX_H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(QUAD_W, QUAD_H),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
      })
    );
    this.mesh.renderOrder = 10;
    this.mesh.visible = false;
  }

  /** Repaints the banner text if it changed. */
  setLabel(label: string): void {
    if (label === this.label) return;
    this.label = label;
    drawBanner(this.canvas.getContext('2d') as CanvasRenderingContext2D, label);
    this.texture.needsUpdate = true;
  }

  /** Places the plane in front of the camera; progress runs 0 (off left) to 1 (off right). */
  update(camera: THREE.Camera, progress: number, visible: boolean): void {
    this.mesh.visible = visible;
    if (!visible) return;
    const x = THREE.MathUtils.lerp(-TRAVEL, TRAVEL, progress);
    const bob = Math.sin(progress * Math.PI * 6) * 0.6;
    this.mesh.quaternion.copy(camera.quaternion);
    const offset = new THREE.Vector3(x, HEIGHT + bob, -DISTANCE).applyQuaternion(camera.quaternion);
    this.mesh.position.copy(camera.position).add(offset);
  }
}
