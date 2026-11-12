// Room kit, Babylon side: turns a RoomLayout into meshes. Static parts are merged into one mesh
// (one draw call, one collider); each breakable is its own mesh tagged with its ObjectDef id,
// the way a Blender-authored .glb would carry it in glTF extras. Colors are vertex colors, so
// the whole room shares one material.
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { setExtras } from '../../core/extras';
import type { Part, RoomLayout } from './parts';
import { PROPS } from './props';

/** Breakables start this far above their surface and settle, instead of starting in contact. */
const SETTLE_LIFT = 0.01;

function partMesh(part: Part, scene: Scene): Mesh {
  const [a, b, c] = part.size;
  let mesh: Mesh;
  if (part.shape === 'box') {
    mesh = CreateBox('part', { width: a, height: b, depth: c }, scene);
  } else if (part.shape === 'cyl') {
    mesh = CreateCylinder(
      'part',
      { diameterBottom: a, height: b, diameterTop: c, tessellation: part.sides },
      scene,
    );
    mesh.convertToFlatShadedMesh();
  } else {
    mesh = CreateSphere('part', { diameter: a, segments: 3 }, scene);
    mesh.convertToFlatShadedMesh();
  }
  mesh.position.set(part.at[0], part.at[1] + b / 2, part.at[2]);
  mesh.rotation.set(...part.rot);

  const [red, green, blue] = part.color;
  const colors = new Float32Array(mesh.getTotalVertices() * 4);
  for (let index = 0; index < colors.length; index += 4) {
    colors.set([red, green, blue, 1], index);
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors);
  return mesh;
}

function mergeParts(name: string, parts: readonly Part[], scene: Scene): Mesh {
  const merged = Mesh.MergeMeshes(
    parts.map((part) => partMesh(part, scene)),
    true,
    true,
  );
  if (!merged) throw new Error(`Could not build '${name}': it has no parts`);
  merged.name = name;
  return merged;
}

/**
 * Builds a room under one root node. `defs` are the room's object definitions; a placement's
 * `def` picks the definition and that definition's `meshNode` picks the prop.
 */
export function buildRoom(
  scene: Scene,
  id: string,
  layout: RoomLayout,
  defs: readonly { id: string; meshNode: string }[],
): TransformNode {
  const root = new TransformNode(id, scene);
  const material = new StandardMaterial(`${id}-palette`, scene);
  material.specularColor = Color3.Black();

  const statics = mergeParts('room_static', layout.statics, scene);
  statics.material = material;
  statics.parent = root;

  const templates = new Map<string, Mesh>();
  const counts = new Map<string, number>();
  for (const placement of layout.objects) {
    const def = defs.find((entry) => entry.id === placement.def);
    if (!def) throw new Error(`Room '${id}' places unknown object '${placement.def}'`);
    const parts = PROPS[def.meshNode];
    if (!parts) throw new Error(`Object '${def.id}' uses unknown prop '${def.meshNode}'`);

    const number = (counts.get(def.id) ?? 0) + 1;
    counts.set(def.id, number);
    const name = `${def.id}_${number}`;
    let mesh = templates.get(def.meshNode);
    if (mesh) {
      mesh = mesh.clone(name);
    } else {
      mesh = mergeParts(name, parts, scene);
      mesh.material = material;
      templates.set(def.meshNode, mesh);
    }
    mesh.name = name;
    mesh.parent = root;
    mesh.position.set(placement.at[0], placement.at[1] + SETTLE_LIFT, placement.at[2]);
    mesh.rotation.set(0, placement.rotY ?? 0, 0);
    setExtras(mesh, { obj: def.id });
  }

  for (const { marker, at, scale } of layout.markers) {
    const node = new TransformNode(marker, scene);
    node.position.set(...at);
    if (scale) node.scaling.set(...scale);
    node.parent = root;
    setExtras(node, { marker });
  }
  return root;
}
