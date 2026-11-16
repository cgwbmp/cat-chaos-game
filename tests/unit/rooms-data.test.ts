// Room checklist, from data alone: every room's layout and objects.json against its brief in
// SPEC.md (breakable count, total coin value, treasure, mission, unlock).
import { describe, expect, it } from 'vitest';
import type { ObjectDef, ObjectTier, RoomDef } from '../../src/core/types';
import { validateObjectDefs } from '../../src/core/validate';
import { summarizeRoom } from '../../src/rooms/_kit/checks';
import type { Part, RoomLayout } from '../../src/rooms/_kit/parts';
import { layout as bathhouse } from '../../src/rooms/bathhouse/layout';
import bathhouseObjects from '../../src/rooms/bathhouse/objects.json';
import { layout as store } from '../../src/rooms/convenience-store/layout';
import storeObjects from '../../src/rooms/convenience-store/objects.json';
import { layout as cafe } from '../../src/rooms/cozy-cafe/layout';
import cafeObjects from '../../src/rooms/cozy-cafe/objects.json';
import { layout as gaming } from '../../src/rooms/gaming-cafe/layout';
import gamingObjects from '../../src/rooms/gaming-cafe/objects.json';
import { layout as grandma } from '../../src/rooms/grandmas-house/layout';
import grandmaObjects from '../../src/rooms/grandmas-house/objects.json';
import { layout as dorm, PATROL } from '../../src/rooms/pop-star-dorm/layout';
import dormObjects from '../../src/rooms/pop-star-dorm/objects.json';
import { layout as studio } from '../../src/rooms/tiny-studio/layout';
import studioObjects from '../../src/rooms/tiny-studio/objects.json';
import { layout as wooden } from '../../src/rooms/wooden-house/layout';
import woodenObjects from '../../src/rooms/wooden-house/objects.json';

interface Brief {
  id: string;
  layout: RoomLayout;
  objects: unknown;
  /** Allowed number of breakables, inclusive. */
  breakables: [min: number, max: number];
  /** Room total in coins from the brief ("about"); the test allows 15% either way. */
  total: number;
  targetCoins: number;
}

const BRIEFS: Brief[] = [
  {
    id: 'tiny-studio',
    layout: studio,
    objects: studioObjects,
    breakables: [25, 35],
    total: 3000,
    targetCoins: 1200,
  },
  {
    id: 'convenience-store',
    layout: store,
    objects: storeObjects,
    breakables: [40, 60],
    total: 5000,
    targetCoins: 2000,
  },
  {
    id: 'cozy-cafe',
    layout: cafe,
    objects: cafeObjects,
    breakables: [40, 55],
    total: 7000,
    targetCoins: 3000,
  },
  {
    id: 'gaming-cafe',
    layout: gaming,
    objects: gamingObjects,
    breakables: [45, 60],
    total: 9000,
    targetCoins: 4000,
  },
  {
    id: 'grandmas-house',
    layout: grandma,
    objects: grandmaObjects,
    breakables: [35, 50],
    total: 12000,
    targetCoins: 5500,
  },
  {
    id: 'pop-star-dorm',
    layout: dorm,
    objects: dormObjects,
    breakables: [50, 65],
    total: 15000,
    targetCoins: 7000,
  },
  {
    id: 'wooden-house',
    layout: wooden,
    objects: woodenObjects,
    breakables: [40, 55],
    total: 19000,
    targetCoins: 9000,
  },
  {
    id: 'bathhouse',
    layout: bathhouse,
    objects: bathhouseObjects,
    breakables: [60, 80],
    total: 26000,
    targetCoins: 12000,
  },
];

const ALL_TIERS: ObjectTier[] = ['light', 'medium', 'heavy', 'trick', 'treasure'];

/** Clear height between stacked shelf boards: the cat is 0.43 m tall and needs room to jump in. */
const SHELF_HEADROOM = 0.6;

/** Boards up off the floor that the cat can stand on, such as shelf boards: thin level boxes. */
function boards(layout: RoomLayout): Part[] {
  return layout.statics.filter(
    (part) =>
      part.shape === 'box' &&
      part.size[1] <= 0.05 &&
      part.size[0] >= 0.25 &&
      part.size[2] >= 0.25 &&
      part.at[1] > 0.1 &&
      part.rot[0] === 0 &&
      part.rot[2] === 0,
  );
}

/** Half extents along x and z of a part turned about y (a quarter turn swaps them). */
function halfExtents(part: Part): [number, number] {
  const quarter = Math.abs(Math.sin(part.rot[1])) > 0.5;
  const [width, , depth] = part.size;
  return quarter ? [depth / 2, width / 2] : [width / 2, depth / 2];
}

function overlap(a: Part, b: Part): boolean {
  const [ax, az] = halfExtents(a);
  const [bx, bz] = halfExtents(b);
  return Math.abs(a.at[0] - b.at[0]) < ax + bx && Math.abs(a.at[2] - b.at[2]) < az + bz;
}

const ROOM_DEFS = Object.values(
  import.meta.glob<RoomDef>('../../src/rooms/*/index.ts', { eager: true, import: 'default' }),
);

describe.each(BRIEFS)('room $id', ({ id, layout, objects, breakables, total, targetCoins }) => {
  const validation = validateObjectDefs(objects);
  const defs: ObjectDef[] = validation.ok ? validation.objects : [];
  const summary = summarizeRoom(layout, defs);

  it('has a valid objects.json', () => {
    expect(validation).toMatchObject({ ok: true });
  });

  it('places only defined objects, built from known props, and uses every definition', () => {
    expect(summary.unknownDefs).toEqual([]);
    expect(summary.unknownProps).toEqual([]);
    expect(summary.unusedDefs).toEqual([]);
  });

  it('has a trigger marker for every trigger break rule', () => {
    expect(summary.missingTriggers).toEqual([]);
  });

  it('spawns the cat inside the room zone that keeps it in', () => {
    const zone = layout.markers.find(({ marker }) => marker === 'trigger:zone_room');
    const spawn = layout.markers.find(({ marker }) => marker === 'cat_spawn');
    expect(zone?.scale).toBeDefined();
    expect(spawn).toBeDefined();
    if (!zone?.scale || !spawn) return;
    for (const axis of [0, 1, 2] as const) {
      expect(Math.abs(spawn.at[axis] - zone.at[axis])).toBeLessThanOrEqual(zone.scale[axis] / 2);
    }
  });

  it('lights only lamps it places, and keeps its fixed lights inside the room', () => {
    const lighting = ROOM_DEFS.find((def) => def.id === id)?.lighting;
    const zone = layout.markers.find(({ marker }) => marker === 'trigger:zone_room');
    expect(lighting).toBeDefined();
    expect(zone?.scale).toBeDefined();
    if (!lighting || !zone?.scale) return;

    const placed = new Set(layout.objects.map(({ def }) => def));
    expect(Object.keys(lighting.lamps ?? {}).filter((lamp) => !placed.has(lamp))).toEqual([]);
    for (const { at } of lighting.fixtures ?? []) {
      for (const [axis, value] of [at.x, at.y, at.z].entries()) {
        const center = zone.at[axis] ?? 0;
        expect(Math.abs(value - center)).toBeLessThanOrEqual((zone.scale[axis] ?? 0) / 2);
      }
    }
  });

  it(`has ${breakables[0]} to ${breakables[1]} breakables`, () => {
    expect(summary.breakables).toBeGreaterThanOrEqual(breakables[0]);
    expect(summary.breakables).toBeLessThanOrEqual(breakables[1]);
  });

  it(`is worth about ${total} coins in total`, () => {
    expect(summary.totalCoins).toBeGreaterThanOrEqual(total * 0.85);
    expect(summary.totalCoins).toBeLessThanOrEqual(total * 1.15);
  });

  it('has exactly one treasure and every tier', () => {
    expect(summary.treasures).toBe(1);
    expect([...summary.tiers].sort()).toEqual([...ALL_TIERS].sort());
  });

  it('can reach the Mission target without the treasure, with a 20% margin', () => {
    // Before combo multipliers. Two stars (150%) then take combos or the treasure.
    const treasure = defs.find((def) => def.tier === 'treasure')?.coins ?? 0;
    expect(summary.totalCoins - treasure).toBeGreaterThanOrEqual(targetCoins * 1.2);
  });

  it('has a spawn point, a door and camera bounds', () => {
    const markers = layout.markers.map(({ marker }) => marker);
    expect(markers).toEqual(expect.arrayContaining(['cat_spawn', 'owner_door', 'camera_bounds']));
  });

  it(`leaves ${SHELF_HEADROOM} m between stacked shelf boards, so the cat fits`, () => {
    const flat = boards(layout);
    for (const lower of flat) {
      for (const upper of flat) {
        const gap = upper.at[1] - (lower.at[1] + lower.size[1]);
        if (gap <= 0 || !overlap(lower, upper)) continue;
        expect(gap, `board at ${upper.at.join(', ')}`).toBeGreaterThanOrEqual(
          SHELF_HEADROOM - 1e-6,
        );
      }
    }
  });

  it('keeps every breakable inside the room', () => {
    const bounds = layout.markers.find(({ marker }) => marker === 'camera_bounds');
    const halfWidth = (bounds?.scale?.[0] ?? 0) / 2;
    for (const { def, at } of layout.objects) {
      expect(Math.abs(at[0]), `${def} x`).toBeLessThan(halfWidth);
      expect(at[1], `${def} y`).toBeGreaterThanOrEqual(0);
      expect(at[1], `${def} y`).toBeLessThan(2.6);
    }
  });
});

describe('pop star dorm patrol', () => {
  it('is a loop of at least three corners on the floor', () => {
    expect(PATROL.length).toBeGreaterThanOrEqual(3);
    expect(PATROL.every(([, y]) => y === 0)).toBe(true);
  });
});
