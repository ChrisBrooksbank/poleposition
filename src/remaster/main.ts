// Remaster entry point (Three.js). Served by remaster.html while the old Canvas 2D game stays at index.html.
// Currently a drivable test: placeholder car on the Fuji road mesh with a chase camera.
// Controls: arrows to steer/accelerate/brake, Shift toggles low/high gear.
import * as THREE from 'three';
import { Stage } from './Stage';
import { createRoadMesh } from './RoadMesh';
import { createScenery } from './scenery';
import { createCarModel, animateCar } from './carModel';
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

// Debug: ?s=<metres>&v=<m/s> starts the car part-way round the lap.
const query = new URLSearchParams(location.search);
car.distance = Number(query.get('s') ?? 20);
car.speed = Number(query.get('v') ?? 0);

stage.scene.add(new THREE.HemisphereLight(0xffffff, 0x557755, 1.5));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(-300, 500, -200);
stage.scene.add(sun);
stage.scene.add(createRoadMesh(track));

const scenery = createScenery(track);
stage.scene.add(scenery.group);

const carModel = createCarModel({ body: 0xd22020, accent: 0xf5f5f5 });
const carMesh = carModel.group;
stage.scene.add(carMesh);

const hud = document.createElement('div');
hud.style.cssText =
  'position:fixed;top:8px;left:8px;color:#fff;font:16px monospace;text-shadow:1px 1px #000';
document.body.appendChild(hud);

let prevDistance = car.distance;
let prevLateral = 0;

function place(distance: number, lateral: number): void {
  const pose = track.poseAt(distance, lateral);
  carMesh.position.set(pose.x, pose.y, pose.z);
  carMesh.rotation.y = -pose.heading;
  animateCar(carModel, distance, (input.right ? 1 : 0) - (input.left ? 1 : 0));

  // Camera sits behind the car on the road line and looks down the road ahead.
  // Step back along the car's heading (not along the lap) so the start line does not wrap.
  const base = track.poseAt(distance, lateral * 0.6);
  const cam = {
    x: base.x + Math.sin(base.heading) * CAMERA_BACK,
    y: base.y,
    z: base.z - Math.cos(base.heading) * CAMERA_BACK,
  };
  const look = track.poseAt(distance + CAMERA_LOOK_AHEAD, lateral * 0.3);
  stage.camera.position.set(cam.x, cam.y + CAMERA_HEIGHT, cam.z);
  stage.camera.lookAt(look.x, look.y + 1, look.z);
  scenery.update(stage.camera.position);
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
