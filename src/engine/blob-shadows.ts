// Blob shadows for the low quality tier: one dark disc under the cat and under each breakable,
// all instances of a single mesh (one draw call). Each disc is dropped onto whatever is below
// its owner with a physics raycast, and only re-cast when the owner has moved.
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import '@babylonjs/core/Meshes/instancedMesh';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import type { PhysicsEngine } from '@babylonjs/core/Physics/v2/physicsEngine';
import type { Scene } from '@babylonjs/core/scene';

const MAX_DROP = 3; // m; no shadow for anything higher above a surface
const LIFT = 0.012; // m above the surface, to avoid z-fighting
const MOVED = 0.002; // m

export interface BlobShadows {
  /** Follow a node. `mesh` gives the footprint and the underside; the cat passes its root only. */
  add(owner: TransformNode, mesh?: AbstractMesh, radius?: number): void;
  update(): void;
  dispose(): void;
}

interface Blob {
  owner: TransformNode;
  mesh?: AbstractMesh;
  radius: number;
  disc: InstancedMesh;
  last: Vector3;
}

export function createBlobShadows(scene: Scene): BlobShadows {
  const source = CreateDisc('blob-shadow', { radius: 1, tessellation: 16 }, scene);
  source.rotation.x = Math.PI / 2; // lie flat, facing up
  const material = new StandardMaterial('blob-shadow', scene);
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.alpha = 0.22;
  material.disableLighting = true;
  material.backFaceCulling = false;
  source.material = material;
  source.isVisible = false;
  source.isPickable = false;

  const blobs: Blob[] = [];
  const from = new Vector3();
  const to = new Vector3();
  const hit = new PhysicsRaycastResult();

  function place(blob: Blob): void {
    const { owner, mesh, disc } = blob;
    const position = owner.getAbsolutePosition();
    let underside = position.y + 0.02;
    if (mesh) {
      mesh.computeWorldMatrix(true);
      underside = mesh.getBoundingInfo().boundingBox.minimumWorld.y + 0.01;
    }
    from.set(position.x, underside, position.z);
    to.set(position.x, underside - MAX_DROP, position.z);
    const physics = scene.getPhysicsEngine() as PhysicsEngine | null;
    // The ray starts just inside the owner, so its own body is skipped.
    physics?.raycastToRef(from, to, hit, { ignoreBody: mesh?.physicsBody ?? undefined });
    if (!hit.hasHit) {
      disc.setEnabled(false);
      return;
    }
    disc.setEnabled(true);
    // Smaller the higher the owner is above the surface.
    const size = blob.radius * (1 - Math.min(hit.hitDistance / MAX_DROP, 0.7));
    disc.scaling.set(size, size, 1);
    disc.position.copyFrom(hit.hitPointWorld).y += LIFT;
  }

  return {
    add(owner, mesh, radius) {
      let size = radius ?? 0.15;
      if (mesh && radius === undefined) {
        const half = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        size = Math.max(half.x, half.z) * 1.1;
      }
      const disc = source.createInstance(`blob-shadow-${blobs.length}`);
      disc.rotation.x = Math.PI / 2;
      disc.isPickable = false;
      blobs.push({ owner, mesh, radius: size, disc, last: new Vector3(Infinity, 0, 0) });
    },

    update() {
      for (const blob of blobs) {
        if (!blob.owner.isEnabled()) {
          blob.disc.setEnabled(false);
          continue;
        }
        const position = blob.owner.getAbsolutePosition();
        if (Vector3.DistanceSquared(position, blob.last) < MOVED * MOVED) continue;
        blob.last.copyFrom(position);
        place(blob);
      }
    },

    dispose() {
      for (const blob of blobs) blob.disc.dispose();
      blobs.length = 0;
      source.dispose(false, true);
    },
  };
}
