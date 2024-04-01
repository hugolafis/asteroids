import { Viewer } from './classes/Viewer';
import './style.css';
import * as THREE from 'three';

// Canvas
const canvas = document.querySelector<HTMLCanvasElement>('canvas.webgl');
const clock = new THREE.Clock();

if (!canvas) {
  throw new Error('Canvas not found!');
}

/**
 * Renderer
 */
THREE.ColorManagement.enabled = true;
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true, // MSAA
});
renderer.setPixelRatio(1); // for DPI scaling set to window.devicePixelRatio
renderer.setSize(1, 1, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;

const viewer = new Viewer(renderer, canvas);

function init() {
  clock.start();

  update();
}

let animationFrame: number | undefined = undefined;
let slowDown = 1;
let slowDownElapsed = 0;
let slowDownDuration = 2;
function update() {
  // Calculate delta
  const delta = clock.getDelta();

  // Update the viewer
  const state = viewer.update(delta * slowDown);

  animationFrame = window.requestAnimationFrame(update);

  if (state.isDead) {
    slowDownElapsed += delta;
    slowDown = lerp(1, 0, easeOutCubic(slowDownElapsed / slowDownDuration));
    canvas!.style.filter = `blur(5px) brightness(1.25)`;
  }

  if (slowDown <= 0.01) {
    window.cancelAnimationFrame(animationFrame);
  }

  console.log(state.playerHealth);
}

init();

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
