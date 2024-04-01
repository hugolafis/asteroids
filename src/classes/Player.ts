import { AsteroidsMaterial } from './AsteroidsMaterial';
import { AsteroidsMesh } from './AsteroidsMesh';
import * as THREE from 'three';
import { Projectile } from './Projectile';

export class Player extends AsteroidsMesh {
  fireDelay = 0.1; // ms
  timeSinceLastShot = 0;

  constructor(geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>, material: AsteroidsMaterial) {
    super(geometry, material);
  }

  update(dt: number) {
    this.timeSinceLastShot += dt;
  }

  // Should this be responsible for spawning bullets?
  fire(): Projectile | void {
    if (this.timeSinceLastShot < this.fireDelay) {
      return;
    }

    this.timeSinceLastShot = 0;

    const projectile = new Projectile(
      new THREE.SphereGeometry(0.1),
      new AsteroidsMaterial({ emissive: 0xffff00, emissiveIntensity: 1 })
    );

    // todo move into projectile class definitions
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    projectile.position.copy(this.position).add(direction);
    projectile.velocity.copy(direction.multiplyScalar(10));
    projectile.quaternion.copy(this.quaternion);

    return projectile;
  }
}
