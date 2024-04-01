import * as THREE from 'three';
import { AsteroidsMesh } from './AsteroidsMesh';

export class Projectile extends AsteroidsMesh {
  mass = 0.25;
  health = 1;
  damage = 5;
}
