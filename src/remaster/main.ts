// Remaster entry point (Three.js). Served by remaster.html while the old Canvas 2D game stays at index.html.
import * as THREE from 'three';
import { Stage } from './Stage';
import { FixedStepLoop } from '../sim/FixedStepLoop';

const stage = new Stage(document.body);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshLambertMaterial({ color: 0x2f8f3a })
);
ground.rotation.x = -Math.PI / 2;
stage.scene.add(ground);
stage.scene.add(new THREE.HemisphereLight(0xffffff, 0x446644, 1.2));

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 1, 4),
  new THREE.MeshLambertMaterial({ color: 0xd22020 })
);
cube.position.y = 0.5;
stage.scene.add(cube);
stage.camera.position.set(0, 3, -9);
stage.camera.lookAt(0, 1, 10);

let angle = 0;
let prev = 0;
new FixedStepLoop(
  (dt) => {
    prev = angle;
    angle += dt;
  },
  (alpha) => {
    cube.rotation.y = prev + (angle - prev) * alpha;
    stage.render();
  }
).start();
