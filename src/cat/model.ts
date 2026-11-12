// The cat model: assets/shared/cat.glb, a low poly skinned cat with one animation clip per
// animator state. The file is made by a script in tools/blender/ (see assets/CREDITS.md).
//
// What the game expects from the file, whichever cat it holds:
//   - a material named `fur` (the coat; its color is the default fur color) and any others
//     for parts that keep their vertex colors;
//   - one animation per clip name in CLIPS;
//   - a `head` bone, and `hat_anchor` and `collar_anchor` bones: the accessory sits at the
//     bone, points along it and is as wide as the bone's `size` property, in meters.
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import catUrl from '../../assets/shared/cat.glb?url';
import type { Services } from '../core/services';
import type { CatClip } from './animation';

type Rgb = readonly [number, number, number];

export interface CatModel {
  /** Node named 'cat', placed at the cat's feet and turned to its facing. */
  readonly root: TransformNode;
  /** Plays the clip for the animator's state. `speed` (m/s) paces the walk and run cycles. */
  update(clip: CatClip, speed: number): void;
  /** Shows the equipped cosmetics; a missing color takes that item off (fur: default color). */
  setCosmetics(colors: { fur?: Rgb; collar?: Rgb; hat?: Rgb }): void;
  dispose(): void;
}

const CLIPS: readonly CatClip[] = [
  'idle',
  'walk',
  'run',
  'jump',
  'land',
  'swat',
  'pounce',
  'loaf',
  'celebrate',
];
/** Clips that play once and hold their last pose. */
const ONE_SHOTS: ReadonlySet<CatClip> = new Set(['land', 'swat']);
const BLEND_SPEED = 0.18; // share of the way to the new clip covered per frame
// Ground speed at which a cycle plays at its authored pace.
const WALK_PACE = 1.1;
const RUN_PACE = 2.6;
// Accessory shapes for an anchor of size 1: height as a share of the diameter.
const COLLAR_HEIGHT = 0.15;
const HAT_HEIGHT = 1.1;

export function createCatModel(services: Services): CatModel {
  const { scene } = services.scene;
  const root = new TransformNode('cat', scene);

  // The game tints `fur` (the coat); `detail` (everything else) keeps its vertex colors.
  const fur = new StandardMaterial('cat-fur', scene);
  fur.specularColor = Color3.Black();
  const detail = new StandardMaterial('cat-detail', scene);
  detail.specularColor = Color3.Black();
  let defaultFur = Color3.White(); // until the model tells
  let furColor: Rgb | undefined;
  const applyFur = () => {
    fur.diffuseColor = furColor ? new Color3(...furColor) : defaultFur;
  };

  function accessory(name: string, mesh: Mesh): { mesh: Mesh; material: StandardMaterial } {
    const material = new StandardMaterial(name, scene);
    material.specularColor = Color3.Black();
    mesh.material = material;
    mesh.parent = root;
    mesh.isVisible = false; // until the model loads and it is put on its anchor
    mesh.setEnabled(false);
    return { mesh, material };
  }
  const collar = accessory(
    'cat-collar',
    CreateCylinder('cat-collar', { height: COLLAR_HEIGHT, diameter: 1 }, scene),
  );
  const hat = accessory(
    'cat-hat',
    CreateCylinder(
      'cat-hat',
      { height: HAT_HEIGHT, diameterTop: 0, diameterBottom: 1, tessellation: 8 },
      scene,
    ),
  );
  /** Puts an accessory on its anchor bone; `lift` raises it along the bone, in its own sizes. */
  function attach(mesh: Mesh, anchor: TransformNode | undefined, lift: number): void {
    const size: unknown = (anchor?.metadata as { gltf?: { extras?: { size?: unknown } } } | null)
      ?.gltf?.extras?.size;
    if (!anchor || typeof size !== 'number') {
      console.error(`[cat] the cat model has no anchor for ${mesh.name}`);
      return;
    }
    mesh.parent = anchor;
    mesh.position.set(0, lift * size, 0);
    mesh.scaling.setAll(size);
    mesh.isVisible = true;
  }

  const clips = new Map<CatClip, AnimationGroup>();
  let playing: CatClip | undefined;
  let disposed = false;

  void services.assets
    .loadModel(catUrl)
    .then((model) => {
      if (disposed) {
        model.dispose();
        return;
      }
      model.parent = root;
      for (const mesh of model.getChildMeshes()) {
        const source = mesh.material;
        const isFur = source?.name === 'fur';
        if (isFur && 'albedoColor' in source && source.albedoColor instanceof Color3) {
          defaultFur = source.albedoColor.clone();
        }
        mesh.material = isFur ? fur : detail;
        // The vertex colors have an alpha channel (always 1), which makes the loader mark the
        // mesh as see-through: it would be drawn blended, without writing depth.
        mesh.hasVertexAlpha = false;
      }
      const bone = (name: string) => model.getChildTransformNodes(false, (n) => n.name === name)[0];

      // Turn the model so that it faces the root's forward (+z), whichever way it was exported.
      const head = bone('head');
      if (head) {
        root.computeWorldMatrix(true);
        head.computeWorldMatrix(true);
        const local = Vector3.TransformCoordinates(
          head.getAbsolutePosition(),
          root.getWorldMatrix().clone().invert(),
        );
        if (local.z < 0) model.rotation.y += Math.PI;
      }
      applyFur();
      attach(collar.mesh, bone('collar_anchor'), 0);
      attach(hat.mesh, bone('hat_anchor'), HAT_HEIGHT / 2);

      for (const group of scene.animationGroups) {
        const target: unknown = group.targetedAnimations[0]?.target;
        const name = CLIPS.find((clip) => clip === group.name);
        if (!name || !(target instanceof TransformNode) || !target.isDescendantOf(model)) continue;
        group.stop();
        group.enableBlending = true;
        group.blendingSpeed = BLEND_SPEED;
        clips.set(name, group);
      }
    })
    .catch((error: unknown) => console.error('[cat] could not load the cat model', error));

  return {
    root,
    update(clip, speed) {
      const group = clips.get(clip);
      if (!group) return; // still loading
      if (clip !== playing) {
        if (playing) clips.get(playing)?.stop();
        group.start(!ONE_SHOTS.has(clip));
        playing = clip;
      }
      if (clip === 'walk') group.speedRatio = Math.min(2.2, Math.max(0.7, speed / WALK_PACE));
      else if (clip === 'run') group.speedRatio = Math.min(2, Math.max(0.9, speed / RUN_PACE));
    },
    setCosmetics({ fur: nextFur, collar: collarColor, hat: hatColor }) {
      furColor = nextFur;
      applyFur();
      collar.mesh.setEnabled(collarColor !== undefined);
      if (collarColor) collar.material.diffuseColor = new Color3(...collarColor);
      hat.mesh.setEnabled(hatColor !== undefined);
      if (hatColor) hat.material.diffuseColor = new Color3(...hatColor);
    },
    dispose() {
      disposed = true;
      for (const group of clips.values()) group.dispose();
      root.dispose(false, true);
    },
  };
}
