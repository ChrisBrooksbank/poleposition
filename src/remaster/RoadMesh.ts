// RoadMesh - wraps the road ribbon arrays in a Three.js mesh.
import * as THREE from 'three';
import type { Track } from '../sim/Track';
import { buildRoadArrays } from './roadGeometry';

export function createRoadMesh(track: Track, step = 2): THREE.Mesh {
  const { positions, colors, indices } = buildRoadArrays(
    track.buildCenterline(step),
    track.def.roadWidth
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
}
