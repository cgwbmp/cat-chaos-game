// The cat on the title screen and in the shop: it lies in the bottom right corner, cut off by the
// screen edges as if peeking in, and looks at the player. It is a second instance of the cat
// model, hung on the camera so that it keeps its place on screen wherever the camera is. It stays
// in the scene behind the other menus (they are opaque) and leaves when a level loads.
import { findCosmetic } from '../core/cosmetics';
import type { Services, System } from '../core/services';
import { createCatModel } from './model';

/** Share of the screen area taken by the box around the visible part of the cat. */
export const PEEK_AREA = 1 / 6;
// The box around the visible part, measured on screen for the pose below: its width for a
// height of 1, and its height in meters at the cat's distance.
export const PEEK_BOX = { aspect: 1.05, height: 0.297 };
// The model's origin (on the floor under the cat) from the bottom right corner of the screen:
// meters to the left and up. A negative `up` drops the paws just under the edge.
const INSET = { left: 0.14, up: -0.02 };
const TURN = 0.22; // rad away from facing the camera, toward the middle of the screen
const LEAN = -0.2; // rad nose up: the camera sees the cat from above

export interface PeekPlacement {
  /** Position in the camera's space: x right, y up, z ahead. */
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/**
 * Pure helper: where the cat goes for a screen of this `aspect` (width / height) and a camera
 * with this vertical `fov`, so that the box around its visible part covers PEEK_AREA.
 */
export function peekPlacement(aspect: number, fov: number): PeekPlacement {
  const boxShare = Math.sqrt((PEEK_AREA * aspect) / PEEK_BOX.aspect); // of the screen's height
  const halfHeight = PEEK_BOX.height / boxShare / 2; // half of the screen in meters at the cat
  const x = halfHeight * aspect - INSET.left;
  const z = halfHeight / Math.tan(fov / 2);
  // Facing the camera from where it lies, not along the camera's axis.
  return { x, y: INSET.up - halfHeight, z, yaw: Math.PI + Math.atan2(x, z) + TURN };
}

export function createTitleCat(services: Services): System {
  const { bus, save } = services;
  const { scene, engine } = services.scene;

  const model = createCatModel(services, 'title-cat');
  let worn = '';

  /** Once per rendered frame while the cat is out. */
  function render(): void {
    const camera = scene.activeCamera;
    if (!camera || !model.root.isEnabled(false)) return;
    model.root.parent = camera;
    const aspect = engine.getRenderWidth() / engine.getRenderHeight();
    const { x, y, z, yaw } = peekPlacement(aspect, camera.fov);
    model.root.position.set(x, y, z);
    model.root.rotation.set(LEAN, yaw, 0);
    model.update('loaf', 0);

    // The shop changes what the cat wears while this cat is on screen.
    const { fur, collar, hat } = save.get().cosmetics.equipped;
    const wearing = `${fur}/${collar}/${hat}`;
    if (wearing === worn) return;
    worn = wearing;
    model.setCosmetics({
      fur: findCosmetic(fur)?.color,
      collar: findCosmetic(collar)?.color,
      hat,
    });
  }
  const beforeRender = scene.onBeforeRenderObservable.add(render);

  const unsubscribe = [
    bus.on('level/loaded', () => model.root.setEnabled(false)),
    bus.on('level/quit', () => model.root.setEnabled(true)),
  ];

  return {
    dispose() {
      for (const off of unsubscribe) off();
      scene.onBeforeRenderObservable.remove(beforeRender);
      model.dispose();
    },
  };
}
