// glTF extras helpers. The Babylon glTF loader stores a node's extras at `metadata.gltf.extras`;
// code-built rooms (graybox) write the same shape with `setExtras`.
import type { Node } from '@babylonjs/core/node';
import type { MarkerKind, NodeExtras } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMarkerKind(value: string): value is MarkerKind {
  return (
    value === 'cat_spawn' ||
    value === 'camera_bounds' ||
    value === 'owner_door' ||
    (value.startsWith('trigger:') && value.length > 'trigger:'.length)
  );
}

/** Reads the `obj` and `marker` extras of a node; unknown or malformed values are ignored. */
export function readExtras(node: Node): NodeExtras {
  const metadata: unknown = node.metadata;
  const gltf = isRecord(metadata) ? metadata.gltf : undefined;
  const extras = isRecord(gltf) ? gltf.extras : undefined;
  if (!isRecord(extras)) return {};

  const result: NodeExtras = {};
  if (typeof extras.obj === 'string' && extras.obj !== '') result.obj = extras.obj;
  if (typeof extras.marker === 'string' && isMarkerKind(extras.marker)) {
    result.marker = extras.marker;
  }
  return result;
}

/** Writes extras the way the glTF loader would, for rooms built in code. */
export function setExtras(node: Node, extras: NodeExtras): void {
  const metadata: unknown = node.metadata;
  node.metadata = { ...(isRecord(metadata) ? metadata : {}), gltf: { extras: { ...extras } } };
}
