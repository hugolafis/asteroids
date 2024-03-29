import * as THREE from 'three';
import { AsteroidsMaterial } from './AsteroidsMaterial';

export class AsteroidsMesh extends THREE.InstancedMesh {
  readonly rotationRate: THREE.Euler;
  readonly velocity: THREE.Vector3;

  constructor(geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>, material: AsteroidsMaterial) {
    super(geometry, material, 9);

    this.rotationRate = new THREE.Euler();
    this.velocity = new THREE.Vector3();
  }
}
