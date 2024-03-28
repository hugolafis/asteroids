import * as THREE from 'three';
import { AsteroidsMaterial } from './AsteroidsMaterial';

export class AsteroidsMesh extends THREE.InstancedMesh {
  constructor(geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>, material: AsteroidsMaterial) {
    super(geometry, material, 9);
  }
}
