// Walker behavior, scene side: the walker's body, a robot vacuum. It is an animated physics body,
// so it shoves objects (and the cat) out of its way as it drives.
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import {
  PhysicsMotionType,
  PhysicsShapeType,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { Scene } from '@babylonjs/core/scene';
import { BODY_HEIGHT, BODY_RADIUS, type WalkerPose } from './walker';

type Rgb = readonly [number, number, number];

const SHELL: Rgb = [0.96, 0.95, 0.93];
const TRIM: Rgb = [0.3, 0.3, 0.36];
const LIGHT: Rgb = [0.5, 0.85, 1];

export interface WalkerView {
  moveTo(pose: WalkerPose): void;
  dispose(): void;
}

/** One flat-shaded part carrying its color on the vertices, its base at `y`. */
function part(mesh: Mesh, color: Rgb, x: number, y: number, z: number, height: number): Mesh {
  mesh.convertToFlatShadedMesh();
  mesh.position.set(x, y + height / 2, z);
  const colors = new Float32Array(mesh.getTotalVertices() * 4);
  for (let index = 0; index < colors.length; index += 4) colors.set([...color, 1], index);
  mesh.setVerticesData(VertexBuffer.ColorKind, colors);
  return mesh;
}

function disc(scene: Scene, diameter: number, height: number, color: Rgb, y: number, z = 0): Mesh {
  const mesh = CreateCylinder('part', { diameter, height, tessellation: 14 }, scene);
  return part(mesh, color, 0, y, z, height);
}

export function createWalkerView(scene: Scene, id: string, pose: WalkerPose): WalkerView {
  const diameter = BODY_RADIUS * 2;
  const lid = BODY_HEIGHT - 0.03;
  const mesh = Mesh.MergeMeshes(
    [
      disc(scene, diameter, lid, SHELL, 0),
      // Bumper band around the bottom, and the dark lid on top.
      disc(scene, diameter + 0.01, 0.04, TRIM, 0.015),
      disc(scene, diameter - 0.06, 0.01, TRIM, lid - 0.005),
      // The sensor turret sits towards the front, and a light shows where the front is.
      disc(scene, 0.09, 0.03, SHELL, lid, 0.03),
      part(
        CreateBox('part', { width: 0.08, height: 0.012, depth: 0.025 }, scene),
        LIGHT,
        0,
        lid,
        0.12,
        0.012,
      ),
    ],
    true,
    true,
  );
  if (!mesh) throw new Error('Could not build the walker');
  mesh.name = `walker-${id}`;
  const material = new StandardMaterial(`walker-${id}`, scene);
  material.specularColor = Color3.Black();
  mesh.material = material;
  mesh.position.set(pose.position.x, pose.position.y, pose.position.z);
  const rotation = Quaternion.Identity();
  mesh.rotationQuaternion = rotation;

  const aggregate = new PhysicsAggregate(
    mesh,
    PhysicsShapeType.CYLINDER,
    {
      mass: 0,
      radius: BODY_RADIUS,
      pointA: new Vector3(0, 0, 0),
      pointB: new Vector3(0, BODY_HEIGHT, 0),
    },
    scene,
  );
  aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
  // The body follows the mesh: it is moved to where the mesh is before every physics step. A
  // target transform instead overshoots and swings back on every frame longer than 1/60 s,
  // which throws the objects around the walker.
  aggregate.body.disablePreStep = false;

  const last = mesh.position.clone();
  const velocity = new Vector3();

  return {
    moveTo({ position, heading }) {
      mesh.position.set(position.x, position.y, position.z);
      Quaternion.FromEulerAnglesToRef(0, Math.atan2(heading.x, heading.z), 0, rotation);
      // The speed it drives at, so that it shoves what is in its way instead of passing through.
      const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
      mesh.position.subtractToRef(last, velocity);
      if (dt > 0) velocity.scaleInPlace(1 / dt);
      aggregate.body.setLinearVelocity(velocity);
      last.copyFrom(mesh.position);
    },
    dispose() {
      aggregate.dispose();
      mesh.dispose(false, true);
    },
  };
}
