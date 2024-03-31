import { AsteroidsMaterial } from './AsteroidsMaterial';
import { AsteroidsMesh } from './AsteroidsMesh';
import * as THREE from 'three';

export class Player extends AsteroidsMesh {
  constructor(geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>, material: AsteroidsMaterial) {
    super(geometry, material);
  }
}
