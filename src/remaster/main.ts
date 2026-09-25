// Remaster entry point (Three.js). Served by remaster.html while the old Canvas 2D game stays at index.html.
// Currently a track viewer: an overhead orbit of the Fuji road mesh.
import * as THREE from 'three';
import { Stage } from './Stage';
import { createRoadMesh } from './RoadMesh';
import { FixedStepLoop } from '../sim/FixedStepLoop';
import { Track } from '../sim/Track';
import { FUJI } from '../sim/tracks/fuji';

const stage = new Stage(document.body);
const track = new Track(FUJI);

stage.scene.add(new THREE.HemisphereLight(0xffffff, 0x446644, 1.4));
stage.scene.add(createRoadMesh(track));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20000, 20000),
  new THREE.MeshLambertMaterial({ color: 0x2f8f3a })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.3;
stage.scene.add(ground);

const points = track.buildCenterline(20);
const centre = new THREE.Vector3();
for (const p of points) centre.add(new THREE.Vector3(p.x, p.y, p.z));
centre.divideScalar(points.length);
stage.scene.fog = null;

let t = 0;
new FixedStepLoop(
  (dt) => {
    t += dt * 0.1;
  },
  () => {
    stage.camera.far = 20000;
    stage.camera.updateProjectionMatrix();
    stage.camera.position.set(centre.x + Math.cos(t) * 1600, 1400, centre.z + Math.sin(t) * 1600);
    stage.camera.lookAt(centre);
    stage.render();
  }
).start();
