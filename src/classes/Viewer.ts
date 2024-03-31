import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
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

  private readonly rocks: Set<AsteroidsMesh>;

  private readonly resources: Map<string, THREE.Mesh | THREE.Texture>;

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly canvas: HTMLCanvasElement) {
    this.canvasSize = new THREE.Vector2();
    this.renderSize = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.rocks = new Set();

    this.resources = new Map();

    this.camera = new THREE.OrthographicCamera(
      -this.cameraRange,
      this.cameraRange,
      this.cameraRange,
      -this.cameraRange
    );
    this.camera.rotation.x = -Math.PI / 2;
    this.camera.position.set(0, 25, 0);

    const sun = new THREE.DirectionalLight(undefined, Math.PI); // undo physically correct changes
    sun.position.copy(new THREE.Vector3(0.75, 0.25, 0.5).normalize());
    const ambient = new THREE.AmbientLight(undefined, 0.0);
    this.scene.add(sun);
    this.scene.add(ambient);

    this.player = new AsteroidsMesh(new THREE.BoxGeometry(), new AsteroidsMaterial());
    const arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), undefined, 1.25, undefined, 0.5, 1);
    this.player.add(arrowHelper);
    this.player.mass = 1;
    this.player.health = 9999;

    const playerSpotlight = new THREE.SpotLight();
    playerSpotlight.penumbra = 0.5;
    playerSpotlight.position.set(0, 0, -0);
    const dummyTarget = new THREE.Object3D();
    dummyTarget.position.set(0, 0, -5);
    playerSpotlight.target = dummyTarget;
    this.player.add(playerSpotlight);
    this.player.add(dummyTarget);

    this.scene.add(this.player);

    // todo functionise this
    this.loadAssets().then(() => {
      let normalMap: THREE.Texture;
      let mesh: THREE.Mesh;

      for (let i = 0; i < 25; i++) {
        if (Math.random() < 0.5) {
          normalMap = this.resources.get('asteroid_nrm') as THREE.Texture;
          mesh = this.resources.get('asteroid') as THREE.Mesh;
        } else {
          normalMap = this.resources.get('asteroid_small_nrm') as THREE.Texture;
          mesh = this.resources.get('asteroid_small') as THREE.Mesh;
        }

        const color = new THREE.Color().setHSL(0, 0, 1);
        const rock = new AsteroidsMesh(mesh.geometry, new AsteroidsMaterial({ color, normalMap }));

        const rand = 0.5 + Math.random();
        rock.scale.copy(mesh.scale);
        rock.scale.multiplyScalar(rand);
        rock.mass = (4 / 3) * Math.PI * Math.pow(rand, 3);

        rock.position.set(
          -this.cameraRange + Math.random() * this.cameraRange * 2,
          0,
          -this.cameraRange + Math.random() * this.cameraRange * 2
        );

        rock.quaternion.random();
        rock.rotationRate.x = -1 + Math.random();
        //rock.rotationRate.y = -1 + Math.random();
        rock.rotationRate.z = -1 + Math.random();

        rock.velocity.randomDirection();
        rock.velocity.y = 0;
        rock.velocity.normalize().multiplyScalar(Math.random() * 5);

        this.rocks.add(rock);
        this.scene.add(rock);
      }
    });

    // Event listeners
    this.keys = new Set();
    this.canvas.addEventListener('keydown', this.onKeyPress);
    this.canvas.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('focusout', this.focusLoss);
  }

  private async loadAssets(): Promise<void> {
    const fbxLoader = new FBXLoader();
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

    return Promise.all([
      textureLoader.loadAsync('./assets/asteroid_nrm.png'),
      textureLoader.loadAsync('./assets/asteroid_small_nrm.png'),
      fbxLoader.loadAsync('./assets/asteroids.fbx'),
      fbxLoader.loadAsync('./assets/asteroid_small.fbx'),
    ])
      .then(data => {
        const texture = data[0];
        const texture2 = data[1];
        //texture.flipY = false;a
        const mesh = data[2].children[0] as THREE.Mesh;
        const mesh2 = data[3].children[0] as THREE.Mesh;

        this.resources.set('asteroid', mesh);
        this.resources.set('asteroid_small', mesh2);
        this.resources.set('asteroid_nrm', texture);
        this.resources.set('asteroid_small_nrm', texture2);

        return Promise.resolve();
      })
      .catch(() => Promise.reject('Failure to load assets'));
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
    this.player.velocity.add(motionDir);

    const rotation = this.player.rotationRate;
    this.getRotation(rotation, dt);
    this.player.rotation.y += rotation.y * dt;

    this.player.position.add(this.player.velocity.clone().multiplyScalar(dt));
    this.player.velocity.multiplyScalar(1 - 0.995 * dt);
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
    this.collisionChecks(dt);

    // Kill dead enemies
    this.destroyObjects();

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

    return vec.normalize().multiplyScalar(0.1);
  }

  private getRotation(rot: THREE.Euler, dt: number): THREE.Euler {
    if (this.keys.has('a')) {
      rot.y += 0.04;
    }

    if (this.keys.has('d')) {
      rot.y -= 0.04;
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
  }

  private collisionChecks(dt: number) {
    const rocks = Array.from(this.rocks);
    rocks.push(this.player);

    // Todo: this will miss collisions when wrapping
    for (let i = 0; i < rocks.length; i++) {
      // Ensure we don't get double checking
      for (let j = i + 1; j < rocks.length; j++) {
        const a = rocks[i];
        const b = rocks[j];

        let distance = a.position.distanceTo(b.position);

        // Subtract both the spherical radii from this distance
        distance -= a.boundingSphere!.radius * a.scale.length() * 0.5;
        distance -= b.boundingSphere!.radius * b.scale.length() * 0.5;

        // If negative, we have a collision
        if (distance < 0) {
          //console.log('collision!', distance);

          const direction = a.position.clone().sub(b.position).normalize();

          const relativeVelocity = a.velocity.clone().sub(b.velocity);
          const impactSpeed = relativeVelocity.dot(direction);

          //console.log(impactSpeed);

          let impulse = (2 * impactSpeed) / (a.mass + b.mass);

          // Artifically lower the impulse to introduce some entropy
          // This helps prevent small objects being accelerated to high velocities
          // More energy will be provided by new spawns
          impulse *= 0.8;

          a.velocity.add(direction.clone().multiplyScalar(-impulse * b.mass));
          b.velocity.add(direction.clone().multiplyScalar(impulse * a.mass));

          a.health -= Math.abs(impulse * b.mass);
          b.health -= Math.abs(impulse * a.mass);

          // Separate the two objects
          direction.multiplyScalar(-distance * 0.5);
          a.position.add(direction);
          b.position.add(direction.multiplyScalar(-1));
        }
      }
    }
  }

  private destroyObjects() {
    const rocks = Array.from(this.rocks);
    const newMeshes: AsteroidsMesh[] = [];

    for (let i = rocks.length; i--; ) {
      if (rocks[i].health <= 0) {
        const rock = rocks[i];

        this.scene.remove(rock);
        rock.dispose();
        rock.geometry.dispose();
        (rock.material as AsteroidsMaterial).dispose();

        createChildRocks(rock, newMeshes);
        this.rocks.delete(rock);
      }
    }

    for (let i = 0; i < newMeshes.length; i++) {
      this.rocks.add(newMeshes[i]);
      this.scene.add(newMeshes[i]);
    }
  }
}

// For a destroyed rock, create two smaller asteroids
function createChildRocks(rock: AsteroidsMesh, newMeshes: AsteroidsMesh[]): void {
  const size = rock.scale.length();
  // Rock is too small, just destroy it
  if (size < 1.414 * 0.01) {
    console.log(size);
    return;
  }

  const a = new AsteroidsMesh(rock.geometry, new AsteroidsMaterial({ normalMap: rock.material.normalMap }));
  const b = new AsteroidsMesh(rock.geometry, new AsteroidsMaterial({ normalMap: rock.material.normalMap }));

  const halfScale = rock.scale.multiplyScalar(0.5);

  const up = new THREE.Vector3(0, 1, 0);
  a.position.copy(rock.position);
  a.mass = rock.mass * 0.25; // not really correct, will be heavier than it should be
  a.velocity.copy(rock.velocity);
  a.velocity.applyAxisAngle(up, -Math.PI / 8);
  a.scale.copy(halfScale);

  b.position.copy(rock.position);
  b.mass = rock.mass * 0.25;
  b.velocity.copy(rock.velocity);
  b.velocity.applyAxisAngle(up, Math.PI / 8);
  b.scale.copy(halfScale);

  const cross = rock.velocity.clone().cross(up).normalize();
  cross.multiply(halfScale);
  a.position.add(cross);
  b.position.add(cross.multiplyScalar(-1));

  a.quaternion.random();
  b.quaternion.random();

  newMeshes.push(a, b);
}
