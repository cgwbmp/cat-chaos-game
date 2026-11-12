// Rendering system: lights, shadows (real on medium and high, blobs on low), bloom on high, the
// follow camera, and the juice helpers other systems call through events (`juice/shake`,
// `juice/hitPause`, `juice/squash`).
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { readExtras } from '../core/extras';
import type { SystemFactory } from '../core/services';
import { createBlobShadows, type BlobShadows } from './blob-shadows';
import { createFollowCamera } from './camera';
import { hasAutoDetected } from './quality';

const SKY_COLOR = new Color4(0.97, 0.91, 0.87, 1);
const SUN_DIRECTION = new Vector3(-0.45, -1, 0.35).normalize();
const SQUASH_SEC = 0.25;

/** Meshes that never cast or receive shadows. */
function isEffectMesh(name: string): boolean {
  return name.startsWith('debris') || name.startsWith('blob-shadow');
}

export const startRendering: SystemFactory = (services) => {
  const { bus, quality, save } = services;
  const { scene, engine } = services.scene;
  scene.clearColor = SKY_COLOR;
  scene.ambientColor = new Color3(1, 1, 1);

  const sky = new HemisphericLight('sky-light', new Vector3(0.2, 1, -0.3), scene);
  sky.intensity = 0.68;
  sky.diffuse = new Color3(1, 0.98, 0.95);
  sky.groundColor = new Color3(0.62, 0.56, 0.6);
  sky.specular = Color3.Black();

  const sun = new DirectionalLight('sun-light', SUN_DIRECTION, scene);
  sun.position = SUN_DIRECTION.scale(-14);
  sun.intensity = 0.45;
  sun.diffuse = new Color3(1, 0.95, 0.88);
  sun.specular = Color3.Black();

  const camera = createFollowCamera(services);

  let shadows: ShadowGenerator | undefined;
  let blobs: BlobShadows | undefined;
  let pipeline: DefaultRenderingPipeline | undefined;
  let pipelineWanted = false;

  /** (Re)builds the shadows for the meshes now in the scene, for the current quality tier. */
  function refreshShadows(): void {
    shadows?.dispose();
    shadows = undefined;
    blobs?.dispose();
    blobs = undefined;

    if (quality.settings.shadows) {
      shadows = new ShadowGenerator(quality.tier === 'high' ? 2048 : 1024, sun);
      shadows.usePercentageCloserFiltering = true;
      shadows.bias = 0.002;
      shadows.normalBias = 0.015;
      shadows.setDarkness(0.45);
      for (const mesh of scene.meshes) {
        if (isEffectMesh(mesh.name) || mesh.getTotalVertices() === 0) continue;
        mesh.receiveShadows = true;
        shadows.addShadowCaster(mesh, false);
      }
      return;
    }

    blobs = createBlobShadows(scene);
    const cat = scene.getTransformNodeByName('cat');
    if (cat) blobs.add(cat, undefined, 0.22);
    for (const mesh of scene.meshes) {
      if (readExtras(mesh).obj !== undefined && mesh.isEnabled()) blobs.add(mesh, mesh);
    }
  }

  async function refreshPostEffects(): Promise<void> {
    pipelineWanted = quality.settings.postEffects;
    if (!pipelineWanted) {
      pipeline?.dispose();
      pipeline = undefined;
      return;
    }
    if (pipeline) return;
    const { DefaultRenderingPipeline } =
      await import('@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline');
    if (!pipelineWanted || pipeline || !scene.activeCamera) return;
    pipeline = new DefaultRenderingPipeline('post', false, scene, [scene.activeCamera]);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.92;
    pipeline.bloomWeight = 0.18;
    pipeline.bloomKernel = 32;
    pipeline.bloomScale = 0.5;
  }

  // --- Juice -----------------------------------------------------------------------------------
  let paused = false;
  let benchmarking = false;
  let hitPauseUntil = 0;
  const squashes: { node: TransformNode; amount: number; age: number }[] = [];

  function update(): void {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
    if (hitPauseUntil > 0 && performance.now() >= hitPauseUntil) {
      hitPauseUntil = 0;
      if (!paused) scene.physicsEnabled = true;
    }
    for (let index = squashes.length - 1; index >= 0; index--) {
      const squash = squashes[index];
      if (!squash) continue;
      squash.age += dt;
      const left = Math.max(0, 1 - squash.age / SQUASH_SEC);
      const height = 1 - squash.amount * left;
      const width = 1 / Math.sqrt(height);
      squash.node.scaling.set(width, height, width);
      if (left === 0) squashes.splice(index, 1);
    }
    camera.update(dt);
    blobs?.update();
  }
  const beforeRender = scene.onBeforeRenderObservable.add(update);

  const unsubscribe = [
    bus.on('level/loaded', () => {
      camera.reset();
      refreshShadows();
      // First level on this device: benchmark with a real room on screen and keep the result.
      if (!hasAutoDetected() && !benchmarking) {
        benchmarking = true;
        void quality.autoDetect().then((tier) => {
          save.update((data) => {
            data.settings.quality = tier;
          });
        });
      }
    }),
    bus.on('level/quit', () => {
      camera.reset();
      refreshShadows();
    }),
    bus.on('quality/changed', () => {
      refreshShadows();
      void refreshPostEffects();
    }),
    bus.on('settings/changed', ({ settings }) => quality.setTier(settings.quality)),
    bus.on('game/paused', (event) => {
      paused = event.paused;
    }),
    bus.on('juice/shake', ({ intensity, durationMs }) => camera.shake(intensity, durationMs)),
    bus.on('juice/hitPause', ({ durationMs }) => {
      if (paused) return;
      scene.physicsEnabled = false;
      hitPauseUntil = performance.now() + durationMs;
    }),
    bus.on('juice/squash', ({ nodeName, amount }) => {
      const node = scene.getTransformNodeByName(nodeName) ?? scene.getMeshByName(nodeName);
      if (node) squashes.push({ node, amount: Math.min(Math.max(amount, 0), 0.6), age: 0 });
    }),
  ];

  quality.setTier(hasAutoDetected() ? save.get().settings.quality : 'medium');
  refreshShadows();
  void refreshPostEffects();

  return {
    dispose() {
      for (const off of unsubscribe) off();
      scene.onBeforeRenderObservable.remove(beforeRender);
      shadows?.dispose();
      blobs?.dispose();
      pipeline?.dispose();
      camera.dispose();
      sky.dispose();
      sun.dispose();
    },
  };
};
