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
    sun.position.copy(new THREE.Vector3(0.75, 1, 0.5).normalize());
    const ambient = new THREE.AmbientLight(undefined, 0.25);
    this.scene.add(sun);
    this.scene.add(ambient);

    const mesh = new AsteroidsMesh(new THREE.BoxGeometry(), new AsteroidsMaterial());

    this.scene.add(mesh);
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

    this.renderer.render(this.scene, this.camera);
  };
}
