import * as THREE from 'three';

export class AsteroidsMaterial extends THREE.MeshPhysicalMaterial {
  private readonly NDCOffset: THREE.Vector2[];

  constructor(params?: THREE.MeshPhysicalMaterialParameters) {
    super(params);

    // Add our 9 offsets that the InstancedMeshes will reference by their instanceID in the vertex shader
    this.NDCOffset = [
      new THREE.Vector2(-2, 2), // Top left
      new THREE.Vector2(0, 2),
      new THREE.Vector2(2, 2),
      new THREE.Vector2(-2, 0),
      new THREE.Vector2(0, 0), // Center
      new THREE.Vector2(2, 0),
      new THREE.Vector2(-2, -2),
      new THREE.Vector2(0, -2),
      new THREE.Vector2(2, -2), // Bottom right
    ];

    this.onBeforeCompile = shader => {
      shader.uniforms.NDCOffset = { value: this.NDCOffset };

      shader.vertexShader = `
        uniform vec2 NDCOffset[9];
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `${projectOverride}\n`);
    };
  }
}

// Override the default projection chunk to add in our override
const projectOverride = `
  vec4 mvPosition = vec4( transformed, 1.0 );

  #ifdef USE_BATCHING

    mvPosition = batchingMatrix * mvPosition;

  #endif

  #ifdef USE_INSTANCING

    mvPosition = instanceMatrix * mvPosition;

  #endif

  mvPosition = modelViewMatrix * mvPosition;

  vec4 projectedPosition = projectionMatrix * mvPosition;

  // Add in our offset
  vec4 offset = vec4(NDCOffset[gl_InstanceID], 0.0, 0.0);
  projectedPosition += offset;

  gl_Position = projectedPosition;
`;
