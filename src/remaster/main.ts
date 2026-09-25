// Remaster entry point (Three.js). Served by remaster.html while the old Canvas 2D game stays at index.html.
// Currently a drivable test: placeholder car on the Fuji road mesh with a chase camera.
// Controls: arrows to steer/accelerate/brake, Shift toggles low/high gear.
import * as THREE from 'three';
import { Stage } from './Stage';
import { createRoadMesh } from './RoadMesh';
import { FixedStepLoop } from '../sim/FixedStepLoop';
import { Track } from '../sim/Track';
import { FUJI } from '../sim/tracks/fuji';
import { PlayerCar } from '../sim/PlayerCar';
import { InputHandler } from '../input/InputHandler';

const CAMERA_BACK = 7;
const CAMERA_HEIGHT = 2.6;
const CAMERA_LOOK_AHEAD = 30;

const stage = new Stage(document.body);
const track = new Track(FUJI);
const car = new PlayerCar(track);
const input = new InputHandler();

stage.scene.add(new THREE.HemisphereLight(0xffffff, 0x446644, 1.4));
stage.scene.add(createRoadMesh(track));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20000, 20000),
  new THREE.MeshLambertMaterial({ color: 0x2f8f3a })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.3;
stage.scene.add(ground);

const carMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.8, 4),
  new THREE.MeshLambertMaterial({ color: 0xd22020 })
);
stage.scene.add(carMesh);

const hud = document.createElement('div');
hud.style.cssText =
  'position:fixed;top:8px;left:8px;color:#fff;font:16px monospace;text-shadow:1px 1px #000';
document.body.appendChild(hud);

let prevDistance = 0;
let prevLateral = 0;

function place(distance: number, lateral: number): void {
  const pose = track.poseAt(distance, lateral);
  carMesh.position.set(pose.x, pose.y + 0.4, pose.z);
  carMesh.rotation.y = -pose.heading;

  // Camera sits behind the car on the road line and looks down the road ahead.
  const cam = track.poseAt(distance - CAMERA_BACK, lateral * 0.6);
  const look = track.poseAt(distance + CAMERA_LOOK_AHEAD, lateral * 0.3);
  stage.camera.position.set(cam.x, cam.y + CAMERA_HEIGHT, cam.z);
  stage.camera.lookAt(look.x, look.y + 1, look.z);
}

new FixedStepLoop(
  (dt) => {
    prevDistance = car.distance;
    prevLateral = car.lateral;
    car.step(dt, {
      left: input.left,
      right: input.right,
      throttle: input.throttle,
      brake: input.brake,
      gear: input.gear,
    });
  },
  (alpha) => {
    place(
      prevDistance + (car.distance - prevDistance) * alpha,
      prevLateral + (car.lateral - prevLateral) * alpha
    );
    hud.textContent = `${Math.round(car.speedMph)} MPH  ${input.gear.toUpperCase()}  LAP ${car.lap + 1}`;
    stage.render();
  }
).start();
