// Walker behavior, scene side: the walker's body. It is an animated physics body, so it shoves
// objects (and the cat) out of its way as it walks.
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import {
  PhysicsMotionType,
  PhysicsShapeType,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { Scene } from '@babylonjs/core/scene';
import type { WalkerPose } from './walker';

const HEIGHT = 1.5;

export interface WalkerView {
  moveTo(pose: WalkerPose): void;
  dispose(): void;
}

export function createWalkerView(scene: Scene, id: string, pose: WalkerPose): WalkerView {
  const body = CreateCapsule(
    `walker-${id}`,
    { radius: 0.22, height: HEIGHT - 0.3, tessellation: 8 },
    scene,
  );
  body.position.y = (HEIGHT - 0.3) / 2;
  const head = CreateSphere(`walker-${id}-head`, { diameter: 0.34, segments: 4 }, scene);
  head.position.y = HEIGHT - 0.17;
  // A nose, so the facing reads from above.
  const nose = CreateSphere(`walker-${id}-nose`, { diameter: 0.1, segments: 2 }, scene);
  nose.position.set(0, HEIGHT - 0.2, 0.18);
  const mesh = Mesh.MergeMeshes([body, head, nose], true);
  if (!mesh) throw new Error('Could not build the walker');
  mesh.name = `walker-${id}`;
  mesh.convertToFlatShadedMesh();
  const material = new StandardMaterial(`walker-${id}`, scene);
  material.diffuseColor = new Color3(0.36, 0.38, 0.5);
  material.specularColor = Color3.Black();
  mesh.material = material;
  mesh.position.set(pose.position.x, pose.position.y, pose.position.z);
  mesh.rotationQuaternion = Quaternion.Identity();

  const aggregate = new PhysicsAggregate(
    mesh,
    PhysicsShapeType.CAPSULE,
    {
      mass: 0,
      radius: 0.24,
      pointA: new Vector3(0, 0.26, 0),
      pointB: new Vector3(0, HEIGHT - 0.26, 0),
    },
    scene,
  );
  aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
  aggregate.body.disablePreStep = false;

  const target = new Vector3();
  const rotation = Quaternion.Identity();

  return {
    moveTo({ position, heading }) {
      target.set(position.x, position.y, position.z);
      Quaternion.FromEulerAnglesToRef(0, Math.atan2(heading.x, heading.z), 0, rotation);
      aggregate.body.setTargetTransform(target, rotation);
    },
    dispose() {
      aggregate.dispose();
      mesh.dispose(false, true);
    },
  };
}
