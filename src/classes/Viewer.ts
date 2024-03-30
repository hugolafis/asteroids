import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AsteroidsMesh } from './AsteroidsMesh';
import { AsteroidsMaterial } from './AsteroidsMaterial';

export class Viewer {
  private camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  private cameraRange = 12;

  private readonly canvasSize: THREE.Vector2;
  private readonly renderSize: THREE.Vector2;

  private readonly keys: Set<string>;

  private readonly player: AsteroidsMesh;
  private readonly velocity: THREE.Vector3;

  private readonly rocks: Set<AsteroidsMesh>;

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly canvas: HTMLCanvasElement) {
    this.canvasSize = new THREE.Vector2();
    this.renderSize = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.rocks = new Set();

    this.camera = new THREE.OrthographicCamera(
      -this.cameraRange,
      this.cameraRange,
      this.cameraRange,
      -this.cameraRange
    );
    this.camera.rotation.x = -Math.PI / 2;
    this.camera.position.set(0, 5, 0);

    const sun = new THREE.DirectionalLight(undefined, Math.PI); // undo physically correct changes
    sun.position.copy(new THREE.Vector3(0.75, 0.25, 0.5).normalize());
    const ambient = new THREE.AmbientLight(undefined, 0.05);
    this.scene.add(sun);
    this.scene.add(ambient);

    this.player = new AsteroidsMesh(new THREE.BoxGeometry(), new AsteroidsMaterial());
    const arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), undefined, 1.25, undefined, 0.5, 1);
    this.player.add(arrowHelper);

    this.scene.add(this.player);

    for (let i = 0; i < 25; i++) {
      const rand = 0.5 + Math.random() * 0.5;
      const color = new THREE.Color().setHSL(0, 0, rand);
      const rock = new AsteroidsMesh(new THREE.BoxGeometry(), new AsteroidsMaterial({ color }));

      rock.position.set(
        -this.cameraRange + Math.random() * this.cameraRange * 2,
        0,
        -this.cameraRange + Math.random() * this.cameraRange * 2
      );

      rock.rotationRate.x = -1 + Math.random();
      //rock.rotationRate.y = -1 + Math.random();
      rock.rotationRate.z = -1 + Math.random();

      rock.velocity.randomDirection();
      rock.velocity.y = 0;
      rock.velocity.normalize().multiplyScalar(Math.random() * 5);

      this.rocks.add(rock);
      this.scene.add(rock);
    }

    // Event listeners
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.canvas.addEventListener('keydown', this.onKeyPress);
    this.canvas.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('focusout', this.focusLoss);
  }

  readonly update = (dt: number) => {
    // Do we need to resize the renderer?
    this.canvasSize.set(
      Math.floor(this.canvas.parentElement!.clientWidth),
      Math.floor(this.canvas.parentElement!.clientHeight)
    );
    if (!this.renderSize.equals(this.canvasSize)) {
      this.renderSize.copy(this.canvasSize);
      this.renderer.setSize(this.renderSize.x, this.renderSize.y, false);

      const aspect = this.canvasSize.x / this.canvasSize.y;
      this.camera.left = -this.cameraRange * aspect;
      this.camera.right = this.cameraRange * aspect;

      this.camera.updateProjectionMatrix();
    }

    const motionDir = new THREE.Vector3();
    this.getMovement(motionDir, dt);
    motionDir.applyQuaternion(this.player.quaternion);
    this.velocity.add(motionDir);

    const rotation = this.player.rotationRate;
    this.getRotation(rotation, dt);
    this.player.rotation.y += rotation.y * dt;

    this.player.position.add(this.velocity);
    this.velocity.multiplyScalar(1 - 0.995 * dt);
    this.player.rotationRate.x *= 1 - 0.995 * dt;
    this.player.rotationRate.y *= 1 - 0.995 * dt;
    this.player.rotationRate.z *= 1 - 0.995 * dt;

    this.wrapPosition(this.player);

    this.rocks.forEach(rock => {
      rock.position.add(rock.velocity.clone().multiplyScalar(dt));
      rock.rotation.set(
        rock.rotation.x + rock.rotationRate.x * dt,
        rock.rotation.y + rock.rotationRate.y * dt,
        rock.rotation.z + rock.rotationRate.z * dt
      );
      this.wrapPosition(rock);
    });

    // Collision checks
    this.collisionChecks(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private readonly onKeyPress = (ev: KeyboardEvent) => {
    this.keys.add(ev.key.toLowerCase());
  };

  private readonly onKeyUp = (key: KeyboardEvent) => {
    this.keys.delete(key.key.toLowerCase());
  };

  private readonly focusLoss = () => {
    // Force loss of all keys
    this.keys.clear();
  };

  private getMovement(vec: THREE.Vector3, dt: number): THREE.Vector3 {
    if (this.keys.has('w')) {
      vec.add({ x: 0, y: 0, z: -1 });
    }

    if (this.keys.has('s')) {
      vec.add({ x: 0, y: 0, z: 1 });
    }

    return vec.normalize().multiplyScalar(dt * 0.1);
  }

  private getRotation(rot: THREE.Euler, dt: number): THREE.Euler {
    if (this.keys.has('a')) {
      rot.y += 0.025;
    }

    if (this.keys.has('d')) {
      rot.y -= 0.025;
    }

    return rot;
  }

  private wrapPosition(object: THREE.Mesh) {
    // If player is outside NDC space, wrap them
    const NDCPosition = object.position;
    NDCPosition.applyMatrix4(this.camera.matrixWorldInverse);
    NDCPosition.applyMatrix4(this.camera.projectionMatrix);

    // Calculate the difference and add it back
    if (NDCPosition.x > 1.0) {
      NDCPosition.x -= 2;
    } else if (NDCPosition.x < -1.0) {
      NDCPosition.x += 2;
    }

    if (NDCPosition.y > 1.0) {
      NDCPosition.y -= 2;
    } else if (NDCPosition.y < -1.0) {
      NDCPosition.y += 2;
    }

    NDCPosition.applyMatrix4(this.camera.projectionMatrixInverse);
    NDCPosition.applyMatrix4(this.camera.matrixWorld);
    object.position.copy(NDCPosition);
  }

  private collisionChecks(dt: number) {
    const rocks = Array.from(this.rocks);

    for (let i = 0; i < rocks.length; i++) {
      // Ensure we don't get double checking
      for (let j = i + 1; j < rocks.length; j++) {
        const a = rocks[i];
        const b = rocks[j];

        let distance = a.position.distanceTo(b.position);

        // Subtract both the spherical radii from this distance
        distance -= a.boundingSphere!.radius;
        distance -= b.boundingSphere!.radius;

        // If negative, we have a collision
        if (distance < 0) {
          //console.log('collision!', distance);

          const direction = a.position.clone().sub(b.position).normalize();

          const aVel = a.velocity.clone();
          const bVel = b.velocity.clone();

          const aFinal = aVel.add(bVel).multiplyScalar(0.5);
          const bFinal = bVel.add(a.velocity).multiplyScalar(0.5);

          a.velocity.copy(aFinal);
          b.velocity.copy(bFinal);

          // Separate the two objects
          direction.multiplyScalar(-distance * 0.5);
          a.position.add(direction);
          b.position.add(direction.multiplyScalar(-1));
        }
      }
    }
  }
}
