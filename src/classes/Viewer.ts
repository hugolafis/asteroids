import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AsteroidsMesh } from './AsteroidsMesh';
import { AsteroidsMaterial } from './AsteroidsMaterial';

export class Viewer {
  private camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  private cameraRange = 5;

  private readonly canvasSize: THREE.Vector2;
  private readonly renderSize: THREE.Vector2;

  private readonly keys: Set<string>;

  private readonly player: THREE.Mesh;
  private readonly velocity: THREE.Vector3;

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly canvas: HTMLCanvasElement) {
    this.canvasSize = new THREE.Vector2();
    this.renderSize = new THREE.Vector2();

    this.scene = new THREE.Scene();

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
    const ambient = new THREE.AmbientLight(undefined, 0.25);
    this.scene.add(sun);
    this.scene.add(ambient);

    this.player = new AsteroidsMesh(new THREE.BoxGeometry(), new AsteroidsMaterial());

    this.scene.add(this.player);

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
    this.velocity.add(motionDir);

    this.player.position.add(this.velocity);

    // If player is outside NDC space, wrap them
    const NDCPosition = this.player.position;
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
    this.player.position.copy(NDCPosition);

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

    if (this.keys.has('a')) {
      vec.add({ x: -1, y: 0, z: 0 });
    }

    if (this.keys.has('d')) {
      vec.add({ x: 1, y: 0, z: 0 });
    }

    return vec.normalize().multiplyScalar(0.1 * dt);
  }
}
