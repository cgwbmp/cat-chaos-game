// Room lighting: the time-of-day look (sky, sun or moon) and the lamps of the loaded room.
// Every lamp glows through a brighter copy of its material; a few of them, by quality tier, also
// carry a point light that lights the room around them.
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Scene } from '@babylonjs/core/scene';
import { readExtras } from '../core/extras';
import type { LightingMood, LightTone, QualityTier, RoomLighting, Vec3 } from '../core/types';

type Rgb = readonly [r: number, g: number, b: number];

export interface MoodLook {
  background: Rgb;
  sky: { intensity: number; color: Rgb; ground: Rgb };
  /** The sun, or the moon at night. `direction` is the way its light travels. */
  sun: { direction: Rgb; intensity: number; color: Rgb };
  /** Lamp brightness, 0 (off) to 1. */
  lamps: number;
}

// Rooms are open toward -z, so a low sun shines in through the open side (+z in `direction`);
// from behind a wall it would leave the whole room in shadow.
export const MOODS: Record<LightingMood, MoodLook> = {
  day: {
    background: [0.97, 0.91, 0.87],
    sky: { intensity: 0.68, color: [1, 0.98, 0.95], ground: [0.62, 0.56, 0.6] },
    sun: { direction: [-0.45, -1, 0.35], intensity: 0.45, color: [1, 0.95, 0.88] },
    lamps: 0,
  },
  sunrise: {
    background: [1, 0.86, 0.8],
    sky: { intensity: 0.58, color: [1, 0.92, 0.92], ground: [0.7, 0.58, 0.62] },
    sun: { direction: [-0.35, -0.55, 0.75], intensity: 0.6, color: [1, 0.84, 0.64] },
    lamps: 0.4,
  },
  sunset: {
    background: [0.99, 0.76, 0.64],
    sky: { intensity: 0.56, color: [1, 0.86, 0.82], ground: [0.6, 0.48, 0.6] },
    sun: { direction: [0.4, -0.5, 0.77], intensity: 0.62, color: [1, 0.68, 0.44] },
    lamps: 0.5,
  },
  night: {
    background: [0.14, 0.13, 0.28],
    sky: { intensity: 0.5, color: [0.7, 0.72, 1], ground: [0.32, 0.27, 0.44] },
    sun: { direction: [-0.3, -1, 0.4], intensity: 0.2, color: [0.7, 0.78, 1] },
    lamps: 1,
  },
};

const TONES: Record<LightTone, Rgb> = {
  warm: [1, 0.74, 0.45],
  cool: [0.6, 0.78, 1],
};

/** Lamps that carry a real light at once; the other lamps of the room only glow. */
export const LAMP_LIGHTS: Record<QualityTier, number> = { low: 2, medium: 4, high: 4 };

const BASE_LIGHTS = 2; // sky and sun
const SUN_DISTANCE = 14; // m
const LAMP_INTENSITY = 1;
const LAMP_RANGE = 6; // m
const LAMP_GLOW = 0.8; // how much of its own color a lamp at full brightness shows unlit
const LAMP_HEIGHT = 0.8; // the light sits this far up the lamp, where the shade is

/**
 * Which `count` more of the lamps at `points` to light: each one as far as possible from the
 * lamps lit already (`lit` and the picks before it), so the lights spread over the room.
 */
export function pickSpread(
  points: readonly Vec3[],
  lit: readonly number[],
  count: number,
): number[] {
  const chosen = [...lit];
  const picked: number[] = [];
  while (picked.length < count) {
    let best = -1;
    let bestDistance = -1;
    points.forEach((point, index) => {
      if (chosen.includes(index)) return;
      const distance = Math.min(
        ...chosen.map((other) => {
          const from = points[other] ?? point;
          return Math.hypot(point.x - from.x, point.y - from.y, point.z - from.z);
        }),
      );
      if (distance > bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    if (best === -1) break;
    chosen.push(best);
    picked.push(best);
  }
  return picked;
}

interface Source {
  tone: LightTone;
  /** The lamp the light rides on; a fixture has none. */
  mesh?: AbstractMesh;
  /** Where it is in the room when the room loads. */
  at: Vec3;
  /** Where the light sits: in the lamp's own space, or in the world for a fixture. */
  position: Vector3;
  light?: PointLight;
}

export interface RoomLights {
  /** The light that casts the shadows. */
  readonly sun: DirectionalLight;
  /** Lights the scene for the room now loaded; neutral daylight without an argument. */
  enter(lighting?: RoomLighting): void;
  /** Hands out the lamp lights for the current quality tier. */
  relight(): void;
  /** A breakable broke; a lamp goes dark. */
  broken(objectId: string): void;
  dispose(): void;
}

export function createRoomLights(scene: Scene, getTier: () => QualityTier): RoomLights {
  const sky = new HemisphericLight('sky-light', new Vector3(0.2, 1, -0.3), scene);
  sky.specular = Color3.Black();
  const sun = new DirectionalLight('sun-light', Vector3.Down(), scene);
  sun.specular = Color3.Black();

  let sources: Source[] = [];
  let brightness = 0;
  const glows = new Map<StandardMaterial, StandardMaterial>(); // a lamp's material, glowing copy
  let glowing: { mesh: AbstractMesh; material: StandardMaterial }[] = [];

  function glow(mesh: AbstractMesh): void {
    const { material } = mesh;
    if (!(material instanceof StandardMaterial)) return;
    let lit = glows.get(material);
    if (!lit) {
      lit = material.clone(`${material.name}-glow`);
      // Emissive is multiplied by the vertex colors, so the lamp shows its own colors unlit.
      lit.emissiveColor = Color3.White().scale(brightness * LAMP_GLOW);
      glows.set(material, lit);
    }
    mesh.material = lit;
    glowing.push({ mesh, material });
  }

  function clear(): void {
    // After a room unload the lamps, and the lights riding on them, are already disposed.
    for (const { light } of sources) {
      if (light && !light.isDisposed()) light.dispose();
    }
    sources = [];
    for (const { mesh, material } of glowing) {
      if (!mesh.isDisposed()) mesh.material = material;
    }
    glowing = [];
    for (const lit of glows.values()) lit.dispose();
    glows.clear();
  }

  function relight(): void {
    const budget = LAMP_LIGHTS[getTier()];
    const lit = sources.filter((source) => source.light);
    for (const source of lit.slice(budget)) {
      source.light?.dispose();
      source.light = undefined;
    }
    const points = sources.map(({ at }) => at);
    const kept = sources.flatMap((source, index) => (source.light ? [index] : []));
    for (const index of pickSpread(points, kept, budget - kept.length)) {
      const source = sources[index];
      if (!source) continue;
      const light = new PointLight('lamp-light', source.position, scene);
      light.parent = source.mesh ?? null;
      light.diffuse = new Color3(...TONES[source.tone]);
      light.specular = Color3.Black();
      light.intensity = brightness * LAMP_INTENSITY;
      light.range = LAMP_RANGE;
      source.light = light;
    }
  }

  function enter(lighting?: RoomLighting): void {
    clear();
    const look = MOODS[lighting?.mood ?? 'day'];
    scene.clearColor = new Color4(...look.background, 1);
    sky.intensity = look.sky.intensity;
    sky.diffuse = new Color3(...look.sky.color);
    sky.groundColor = new Color3(...look.sky.ground);
    sun.direction = new Vector3(...look.sun.direction).normalize();
    sun.position = sun.direction.scale(-SUN_DISTANCE);
    sun.intensity = look.sun.intensity;
    sun.diffuse = new Color3(...look.sun.color);

    brightness = look.lamps;
    if (!lighting || brightness === 0) return;
    for (const { at, tone } of lighting.fixtures ?? []) {
      sources.push({ tone, at, position: new Vector3(at.x, at.y, at.z) });
    }
    const lamps = new Map(Object.entries(lighting.lamps ?? {}));
    for (const mesh of scene.meshes) {
      const tone = lamps.get(readExtras(mesh).obj ?? '');
      if (!tone || !mesh.isEnabled()) continue;
      const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
      const position = Vector3.Center(minimum, maximum);
      position.y = minimum.y + (maximum.y - minimum.y) * LAMP_HEIGHT;
      sources.push({ tone, mesh, at: mesh.getAbsolutePosition().clone(), position });
      glow(mesh);
    }
    if (sources.length === 0) return;
    // Every material has to take the lamp lights on top of the sky and the sun.
    for (const material of scene.materials) {
      if ('maxSimultaneousLights' in material) {
        material.maxSimultaneousLights = BASE_LIGHTS + LAMP_LIGHTS.high;
      }
    }
    relight();
  }

  enter();

  return {
    sun,
    enter,
    relight,
    broken(objectId) {
      const index = sources.findIndex(({ mesh }) => mesh?.name === objectId);
      if (index === -1) return;
      sources[index]?.light?.dispose();
      sources.splice(index, 1);
      relight();
    },
    dispose() {
      clear();
      sky.dispose();
      sun.dispose();
    },
  };
}
