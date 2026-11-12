import { describe, expect, it } from 'vitest';
import { createRoomRegistry } from '../../src/core/rooms';
import type { RoomDef } from '../../src/core/types';

function room(id: string, order: number): RoomDef {
  return {
    id,
    name: id,
    order,
    glb: `${id}.glb`,
    objectsJson: `${id}.json`,
    mission: { timeLimitSec: 90, targetCoins: 1200 },
    unlock: { requiresStars: 0 },
    music: '',
  };
}

describe('room registry', () => {
  const cafe = room('cozy-cafe', 3);
  const studio = room('tiny-studio', 1);
  const graybox = room('_graybox', 0);

  it('lists rooms sorted by order, without dev rooms', () => {
    const registry = createRoomRegistry([cafe, graybox, studio]);
    expect(registry.list()).toEqual([studio, cafe]);
  });

  it('lists dev rooms on request', () => {
    const registry = createRoomRegistry([cafe, graybox, studio]);
    expect(registry.list({ includeDev: true })).toEqual([graybox, studio, cafe]);
  });

  it('finds a room by id, dev rooms included', () => {
    const registry = createRoomRegistry([cafe, graybox]);
    expect(registry.get('cozy-cafe')).toBe(cafe);
    expect(registry.get('_graybox')).toBe(graybox);
    expect(registry.get('bathhouse')).toBeUndefined();
  });

  it('returns a copy, so changing the list does not change the registry', () => {
    const registry = createRoomRegistry([studio, cafe]);
    registry.list().pop();
    registry.list({ includeDev: true }).pop();
    expect(registry.list()).toEqual([studio, cafe]);
  });

  it('is empty when no rooms are registered', () => {
    expect(createRoomRegistry([]).list({ includeDev: true })).toEqual([]);
  });

  it('throws on a duplicate id', () => {
    expect(() => createRoomRegistry([cafe, room('cozy-cafe', 9)])).toThrow(
      "Duplicate room id 'cozy-cafe'",
    );
  });
});
