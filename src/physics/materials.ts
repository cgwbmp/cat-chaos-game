import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Material, ObjectTier } from '../core/types';

export interface MaterialProps {
  friction: number;
  restitution: number;
  /** Shard color when the mesh has no plain diffuse color to copy. */
  color: Color3;
}

export const MATERIALS: Record<Material, MaterialProps> = {
  ceramic: { friction: 0.6, restitution: 0.15, color: new Color3(0.96, 0.94, 0.9) },
  glass: { friction: 0.5, restitution: 0.1, color: new Color3(0.78, 0.92, 0.96) },
  wood: { friction: 0.7, restitution: 0.2, color: new Color3(0.76, 0.6, 0.45) },
  plastic: { friction: 0.5, restitution: 0.3, color: new Color3(0.98, 0.72, 0.76) },
  paper: { friction: 0.8, restitution: 0.05, color: new Color3(0.98, 0.95, 0.85) },
  metal: { friction: 0.4, restitution: 0.2, color: new Color3(0.78, 0.8, 0.84) },
  fabric: { friction: 0.9, restitution: 0, color: new Color3(0.95, 0.8, 0.85) },
  electronic: { friction: 0.6, restitution: 0.1, color: new Color3(0.4, 0.42, 0.5) },
};

/** Generic shards per break when the object has no fracture set. */
export const SHARDS_PER_TIER: Record<ObjectTier, number> = {
  light: 4,
  medium: 6,
  heavy: 10,
  trick: 8,
  treasure: 14,
};

export const LIQUID_COLOR = new Color3(0.55, 0.8, 0.98);
export const SPARK_COLOR = new Color3(1, 0.9, 0.35);
